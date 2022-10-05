import { Card, Image, Typography } from 'antd';
import React, { FC } from 'react';
const { Link, Title, Text } = Typography;

const MintInvoice: FC = () => {
  return (
    <Card style={{ width: 900, margin: 'auto', marginTop: 32, paddingBottom: 32, textAlign: 'left' }}>
      <Title>Lik Invoices</Title>
      <Title level={2}>Intro</Title>
      <Text>
        Lik means white or clear in{' '}
        <Link href="https://en.wikipedia.org/wiki/Mapuche_language" target="_blank">
          Mapudungun
        </Link>
        . We offer this POC to bring clarity and light to invoices and transactions between parties.
      </Text>
      <br />
      <br />
      <Text>
        Electronic Invoices and their regulations are powerful tools emerging markets use to empower small businesses.
        In Chile, México, and Brazil, for example, an accepted invoice becomes a promissory note, that can be used in
        court to demand payment. Rules of acceptance vary, but are essentially time- or response- based; the buyer has
        some fixed amount of days to either accept or reject the invoice, after which the invoice is considered to be
        accepted.
      </Text>
      <br />
      <br />
      <Text>
        This can be expanded to consider fines for paying late, avoiding double accounting, and, more importantly:{' '}
        <Text mark>liquidity!</Text>
      </Text>
      <br />
      <Text>
        When you have a public registry of electronic promissory notes, you can easily create rules to transfer them to
        third-parties. A typical B2B transactions implies the need for working capital, as very few companies pay
        upfront or upon delivery. Usually, they agree (or impose) payment terms.
      </Text>
      <br />
      <Text>
        Company XYZ sells shoes to company WMT. WMT issues a Purchase Order for 10 ETH, payable in 30 days after
        delivery. XYZ makes the shoes, delivers the order on time, and issues an invoice to WMT. WMT prepares to pay in
        30 days. But then company TGT engages XYZ for another order. XYZ does not have money to buy materials, but has
        an IOU from WMT. Financier CMP buys that IOU, at an agreed discount, and XYZ no has capital to fill the order.
      </Text>
      <br />
      <Text>
        If there are any issues along the way, for example WMT refusing to pay, the owner of the invoice, whether CMP or
        XYZ, can file a lawsuit demanding payment.
      </Text>
      <Title level={2}>Lik Invoices</Title>
      <Text>
        Lik invoices is a proof of concept implementing these ideas into a protocol. In its first iteration, it makes
        some assumptions that can easily be changed.
      </Text>
      <br />
      <Text>
        A Lik invoice is an NFT, an ERC-721 token. Each invoice has an owner, is easily transferrable, and stores meta
        data about the transaction: the buyer, the vendor, the amount, and the payment conditions.
      </Text>
      <br />
      <Text>
        If there are disputes about payments, the contract implements the Kleros Arbitration (ERC-792) and Evidence
        (ERC-1497) standards. Basically, disputes are raised to an Arbitrator, who rules based on the evidence
        presented. Right now, the contract is using Klero`&apos;`s decentralized contracts, but it could easily use any
        Arbitrator on the blockchain, even one implemented by a centralized authority, like a nation state.
      </Text>
      <br />
      <Text>
        To simplify, the invoice locks the amount to be paid and is fully transparent to anyone, acting as a public
        escrow contract. Further implementations could obscure the amount and meta data to third-parties (using ZK
        proofs for example) and allow Buyers to issue POs without locking funds.
      </Text>
      <br />
      <Image preview={false} src="./LikStates.png" width={400} />
      <br />
      <Text>
        For now, the process is <Text italic>simple</Text>:
        <ol>
          <li>
            A Buyer issues a PO to a Vendor, specifying days to pay and locking the payment in the contract upfront.
          </li>
          <li>After Minting, either the Vendor or Buyer can cancel the PO at any moment, freeing the funds.</li>
          <li>
            Assuming the work is done, the Vendor can turn the PO into an Invoice, setting a formal payment date to X
            days in the future, where X was set by the Buyer.
          </li>
          <li>
            The Buyer can Accept or Reject the Invoice:
            <ul>
              <li>If they accept, the Owner can withdraw the funds earlier.</li>
              <li>
                To reject it, they need to pay the arbitration fees upfront. This rejection sets a new payment date,
                which will serve as deadline for the Owner or Vendor to dispute the Rejection.
              </li>
            </ul>
          </li>
          <li>
            The Vendor or Owner has the option to either accept or dispute the rejection whithin this deadline, raising
            the dispute to the Arbitrator by paying their share of the arbitration fees.
          </li>
          <li>
            After the dispute resolution, acceptance, or cancellation, the benefited party can withdraw their funds,
            plus arbitration fees if they won, at any moment.
          </li>
        </ol>
      </Text>
      <Title level={3}>At any moment, the owner can transfer the Invoice to anyone!</Title>
      <Title>Try it out today!</Title>
      <Text>
        Contract Deployed to Goerli:{' '}
        <Link href="https://goerli.etherscan.io/address/0x63DaA4FefB49F0b5c37ee5942cA11BAB2E13F8Ad" target="_blank">
          0x63DaA4FefB49F0b5c37ee5942cA11BAB2E13F8Ad
        </Link>
      </Text>
    </Card>
  );
};

export default MintInvoice;
