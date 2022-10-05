pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

// openzeppeling basics
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "base64-sol/base64.sol";

// arbitrable standard by kleros
import "@kleros/erc-792/contracts/IArbitrable.sol";
import "@kleros/erc-792/contracts/erc-1497/IEvidence.sol";
import "@kleros/erc-792/contracts/IArbitrator.sol";

contract LikInvoice is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, IArbitrable, IEvidence {
  using Counters for Counters.Counter;
  using Strings for uint256;
  using Strings for uint64;
  using Strings for uint8;

  uint256 constant numberOfRulingOptions = 2;
  Counters.Counter private _tokenIds;
  IArbitrator public publicArbitrator;
  enum Status {
    Minted,
    Invoiced,
    Accepted,
    Rejected,
    Canceled,
    Withdrawn,
    Paid,
    Disputed,
    Resolved
  }
  enum RulingOptions {
    RefusedToArbitrate,
    BuyerWins,
    VendorWins
  }
  struct Invoice {
    address vendor;
    address buyer;
    uint256 amount;
    uint256 arbitrationFee;
    uint8 paymentDays;
    uint64 paymentDate;
    uint256 disputeId;
    Status status;
    RulingOptions rule;
    IArbitrator arbitrator;
  }
  mapping(uint256 => Invoice) private invoices;
  mapping(uint256 => uint256) private disputeIdToTokenId;

  event Minted(address indexed buyer, address indexed vendor, uint256 tokenId);
  event Invoiced(uint256 indexed tokenId, uint64 paymentDate);
  event CanceledPO(uint256 indexed tokenId);
  event InvoiceWithdrawn(uint256 indexed tokenId);
  event InvoiceAccepted(uint256 indexed tokenId);
  event InvoicePaid(uint256 indexed tokenId);
  event InvoiceRejected(uint256 indexed tokenId, uint64 responseDeadline);
  event RejectionAccepted(uint256 indexed tokenId);

  constructor(IArbitrator _arbitrator) ERC721("LikInvoice", "LIN") {
    publicArbitrator = _arbitrator;
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function _burn(uint256 tokenId) internal override(ERC721) {
    super._burn(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function mintItem(address to, uint8 _paymentDays, string memory _metaEvidence) public payable returns (uint256) {
    require(to != msg.sender, "ERROR: Buyer cannot invoice themselves.");
    require(msg.value > 0, "ERROR: You cannot pay or lock a value of zero.");

    _tokenIds.increment();

    uint256 id = _tokenIds.current();

    Invoice storage newInvoice = invoices[id];
    newInvoice.amount = msg.value;
    newInvoice.buyer = msg.sender;
    newInvoice.vendor = to;
    newInvoice.paymentDays = _paymentDays;
    newInvoice.status = Status.Minted;

    _safeMint(to, id);

    emit Minted(msg.sender, to, id);
    emit MetaEvidence(id, _metaEvidence);

    return id;
  }

  function cancelPO(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Buyer or Vendor can cancel PO before invoicing.
    Invoice storage invoice = invoices[tokenId];
    require((msg.sender == invoice.vendor || msg.sender == invoice.buyer) && invoice.status == Status.Minted, "ERROR: Sender cannot cancel invoice.");

    invoice.status = Status.Canceled;
    emit CanceledPO(tokenId);
  }

  function changeToInvoice(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Vendor determines work is finished and must be paid for it
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == invoice.vendor, "ERROR: Sender does not have permissions to change the status.");
    require(invoice.status == Status.Minted, "ERROR: Incorrect Invoice State.");

    invoice.status = Status.Invoiced;
    invoice.paymentDate = uint64(block.timestamp + invoice.paymentDays * (1 days));
    emit Invoiced(tokenId, invoice.paymentDate);
  }

  function acceptInvoice(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Buyer can accept invoice within the days set when creating the purchase order, since it became an invoice
    // After that date, invoice is assumed to be accepted
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == invoice.buyer, "ERROR: Sender does not have permissions to accept invoice.");
    require(invoice.status == Status.Invoiced, "ERROR: Incorrect Invoice State.");
    require(uint64(block.timestamp) <= invoice.paymentDate, "ERROR: Acceptance Period is over.");

    invoice.status = Status.Accepted;
    emit InvoiceAccepted(tokenId);
  }

  function rejectInvoice(uint256 tokenId) public payable {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Buyer must reject invoice within the days set when creating the purchase order, since it became an invoice
    // After that date, invoice is assumed to be accepted
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == invoice.buyer, "ERROR: Sender does not have permissions to reject invoice.");
    require(invoice.status == Status.Invoiced, "ERROR: Incorrect Invoice State.");
    require(uint64(block.timestamp) <= invoice.paymentDate, "ERROR: Rejection Period is over.");

    // Buyer is required to pay the arbitration fee up front. This will be refunded if they win.
    uint256 requiredCost = arbitrationCost();
    require(msg.value >= requiredCost, "ERROR: Amount does not cover arbitration fees.");

    invoice.status = Status.Rejected;
    invoice.arbitrationFee = msg.value;
    invoice.amount += msg.value;
    // we extend the deadline, using the same terms as before
    invoice.paymentDate = uint64(block.timestamp + invoice.paymentDays * (1 days));
    emit InvoiceRejected(tokenId, invoice.paymentDate);
  }

  function acceptRejection(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Owner or Vendor can accept the Rejection, changing the status to Canceled, allowing the buyer to withdraw immediately.
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == invoice.vendor || msg.sender == ownerOf(tokenId), "ERROR: Sender does not have permissions.");
    require(invoice.status == Status.Rejected, "ERROR: Incorrect Invoice State.");

    invoice.status = Status.Canceled;
    emit RejectionAccepted(tokenId);
  }

  function disputeRejection(uint256 tokenId) public payable {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Owner or Vendor can dispute the Rejection by paying the arbitrator fees.
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == invoice.vendor || msg.sender == ownerOf(tokenId), "ERROR: Sender does not have permissions to dispute.");
    require(invoice.status == Status.Rejected, "ERROR: Incorrect Invoice State.");
    require(uint64(block.timestamp) <= invoice.paymentDate, "ERROR: Dispute Period is over.");
    require(arbitratorExists(publicArbitrator), "ERROR: Arbitrator contract is invalid.");

    // Vendor or Owner are required to pay the arbitration fee up front. This will be refunded if they win.
    uint256 requiredCost = arbitrationCost();
    require(msg.value >= requiredCost, "ERROR: Amount does not cover arbitration fees.");

    invoice.arbitrator = publicArbitrator;
    uint256 _disputeId = invoice.arbitrator.createDispute{ value: msg.value }(numberOfRulingOptions, "");

    disputeIdToTokenId[_disputeId] = tokenId;

    invoice.disputeId = _disputeId;
    invoice.status = Status.Disputed;
    emit Dispute(invoice.arbitrator, _disputeId, tokenId, tokenId);
  }

  function withdrawPayment(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist");
    // Vendor can withdraw payment
    Invoice storage invoice = invoices[tokenId];
    require(ownerOf(tokenId) == msg.sender, "ERROR: Withdrawal not allowed.");
    require(
      (uint64(block.timestamp) >= invoice.paymentDate && invoice.status == Status.Invoiced) || (invoice.status == Status.Accepted),
      "ERROR: Withdrawal not allowed."
    );

    invoice.status = Status.Paid;
    (bool success, ) = msg.sender.call{ value: invoice.amount }("");
    require(success, "Failed to send payment");
    emit InvoicePaid(tokenId);
  }

  function withdrawCancellation(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist.");
    // Buyer can withdraw payment after cancellation by either party or after rejection and deadline expired.
    Invoice storage invoice = invoices[tokenId];
    require(invoice.buyer == msg.sender, "ERROR: Sender not allowed.");
    require(
      (uint64(block.timestamp) >= invoice.paymentDate && invoice.status == Status.Rejected) || invoice.status == Status.Canceled,
      "ERROR: Incorrect Invoice State."
    );

    invoice.status = Status.Withdrawn;
    (bool success, ) = msg.sender.call{ value: invoice.amount }("");
    require(success, "Failed to send payment");
    emit InvoiceWithdrawn(tokenId);
  }

  function withdrawAfterRuling(uint256 tokenId) public {
    require(_exists(tokenId), "ERROR: Item does not exist.");
    Invoice storage invoice = invoices[tokenId];
    // After a ruling, the Buyer or the Owner can withdraw funds. These already include the arbitration fees.
    require(invoice.status == Status.Resolved, "ERROR: Incorrect Invoice State.");
    require(msg.sender == invoice.buyer || msg.sender == ownerOf(tokenId), "ERROR: Sender not allowed.");

    if (invoice.rule == RulingOptions.BuyerWins) {
      invoice.status = Status.Withdrawn;
      (bool success, ) = invoice.buyer.call{ value: invoice.amount }("");
      require(success, "Failed to send payment to buyer.");
    } else {
      invoice.status = Status.Paid;
      (bool success, ) = ownerOf(tokenId).call{ value: invoice.amount }("");
      require(success, "Failed to send payment to owner.");
    }
    emit InvoiceWithdrawn(tokenId);
  }

  // Arbitration functions

  function rule(uint256 _disputeID, uint256 _ruling) public override {
    uint256 tokenId = disputeIdToTokenId[_disputeID];
    require(_exists(tokenId), "ERROR: Dispute not found.");
    Invoice storage invoice = invoices[tokenId];
    require(msg.sender == address(invoice.arbitrator), "ERROR: Sender is not arbitrator.");
    require(invoice.status == Status.Disputed, "ERROR: Wrong status.");
    require(_ruling <= numberOfRulingOptions, "ERROR: Wrong ruling option.");

    invoice.status = Status.Resolved;

    if (_ruling == uint256(RulingOptions.BuyerWins)) invoice.rule = RulingOptions.BuyerWins;
    else invoice.rule = RulingOptions.VendorWins;
    emit Ruling(invoice.arbitrator, _disputeID, _ruling);
  }

  function submitEvidence(uint256 tokenId, string memory _evidence) public {
    require(_exists(tokenId), "ERROR: Item does not exist.");
    Invoice memory invoice = invoices[tokenId];
    require(invoice.status == Status.Disputed, "ERROR: Wrong status.");
    require(msg.sender == invoice.buyer || msg.sender == invoice.vendor || msg.sender == ownerOf(tokenId), "ERROR: No third-parties allowed.");
    emit Evidence(invoice.arbitrator, tokenId, msg.sender, _evidence);
  }

  function changeArbitrator(IArbitrator _arbitrator) public onlyOwner {
    require(arbitratorExists(_arbitrator), "ERROR: Arbitrator contract does not exist.");
    publicArbitrator = _arbitrator;
  }

  function arbitratorExists(IArbitrator _arbitrator) internal view returns (bool) {
    uint256 csize;
    address addr = address(_arbitrator);
    assembly {
        csize := extcodesize(addr)
    }
    // we optimistically assume it is a proper arbitrator contract if it exists
    if (csize == 0 )
      return false;
    else
      return true;
  }

  function arbitrationCost() public view returns (uint256) {
    if (arbitratorExists(publicArbitrator))
      return publicArbitrator.arbitrationCost("");
    else
      return 30000000000000000;
  }

  // Prepare and respond with tokenURI
  function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
    require(_exists(tokenId), "ERROR: Item does not exist");
    Invoice memory invoice = invoices[tokenId];

    return
      string(
        abi.encodePacked(
          "data:application/json;base64,",
          Base64.encode(
            bytes.concat(
              abi.encodePacked(
                '{"buyer":"0x',
                toAsciiString(invoice.buyer),
                '", "vendor":"0x',
                toAsciiString(invoice.vendor),
                '", "amount":"',
                invoice.amount.toString(),
                '", "owner":"0x',
                toAsciiString(ownerOf(tokenId)),
                '", "payment_days":"'
              ),
              abi.encodePacked(
                invoice.paymentDays.toString(),
                '", "payment_timestamp":"',
                invoice.paymentDate.toString(),
                '", "status":"',
                statusToString(invoice.status),
                '", "dispute_id":"',
                invoice.disputeId.toString(),
                '", "rule":"',
                ruleToString(invoice.rule),
                '", "image": "',
                "data:image/svg+xml;base64,",
                Base64.encode(bytes(generateSVG(tokenId))),
                '"}'
              )
            )
          )
        )
      );
  }

  // public function to get metadata
  function invoiceMetaData(uint256 tokenId) public view returns (Invoice memory) {
    require(_exists(tokenId), "ERROR: Item does not exist");
    Invoice memory invoice = invoices[tokenId];
    return invoice;
  }

  // SVG Generation

  function generateSVG(uint256 tokenId) private view returns (bytes memory) {
    require(_exists(tokenId), "ERROR: Item does not exist");
    Invoice memory invoice = invoices[tokenId];

    return
      bytes.concat(
        abi.encodePacked(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820"><text x="20" y="30">Amount: ',
          invoice.amount.toString(),
          ' wei</text><text x="20" y="50">Buyer: 0x',
          toAsciiString(invoice.buyer),
          '</text><text x="20" y="70">Vendor: 0x',
          toAsciiString(invoice.vendor)
        ),
        abi.encodePacked(
          '</text><text x="20" y="90">Owner: 0x',
          toAsciiString(ownerOf(tokenId)),
          '</text><text x="20" y="110">Status: ',
          statusToString(invoice.status),
          '</text><text x="20" y="130">Payment Timestamp: ',
          invoice.paymentDate.toString(),
          "</text></svg>"
        )
      );
  }

  // UTILS

  function statusToString(Status _status) internal pure returns (string memory) {
    if (Status.Minted == _status) return "Minted";
    if (Status.Invoiced == _status) return "Invoiced";
    if (Status.Accepted == _status) return "Accepted";
    if (Status.Rejected == _status) return "Rejected";
    if (Status.Canceled == _status) return "Canceled";
    if (Status.Withdrawn == _status) return "Withdrawn";
    if (Status.Paid == _status) return "Paid";
    if (Status.Disputed == _status) return "Disputed";
    if (Status.Resolved == _status) return "Resolved";

    return "";
  }

  function ruleToString(RulingOptions _rule) internal pure returns (string memory) {
    if (RulingOptions.RefusedToArbitrate == _rule) return "Refused";
    if (RulingOptions.BuyerWins == _rule) return "Buyer Wins";
    if (RulingOptions.VendorWins == _rule) return "Vendor Wins";

    return "";
  }

  function toAsciiString(address x) internal pure returns (string memory) {
    bytes memory s = new bytes(40);
    for (uint256 i = 0; i < 20; i++) {
      bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8 * (19 - i)))));
      bytes1 hi = bytes1(uint8(b) / 16);
      bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
      s[2 * i] = char(hi);
      s[2 * i + 1] = char(lo);
    }
    return string(s);
  }

  function char(bytes1 b) internal pure returns (bytes1 c) {
    if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
    else return bytes1(uint8(b) + 0x57);
  }
}
