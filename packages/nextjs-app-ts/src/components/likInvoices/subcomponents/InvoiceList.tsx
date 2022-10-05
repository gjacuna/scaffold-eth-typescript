import { Button, Card, List, Modal, Typography } from 'antd';
import { Address, AddressInput } from 'eth-components/ant';
import { TTransactorFunc } from 'eth-components/functions';
import { useSignerAddress } from 'eth-hooks';
import { useEthersAppContext } from 'eth-hooks/context';
import { TEthersAdaptor } from 'eth-hooks/models';
import { BigNumber, ethers } from 'ethers';
import { FC, useState, useEffect, ReactNode } from 'react';

import { LikInvoice } from '~common/generated/contract-types';

const { Text } = Typography;

interface IInvoiceProps {
  contract: LikInvoice | undefined;
  nInvoices: number;
  arbitrationCost: string;
  list?: string[];
  perspective?: string;
  mainnetAdaptor?: TEthersAdaptor | undefined;
  blockExplorer?: string;
  tx?: TTransactorFunc;
}

interface RenderInvoiceProps {
  invoice: IInvoice;
  mainnetAdaptor: TEthersAdaptor | undefined;
  blockExplorer: string | undefined;
  handleCall: (call: string, args: any[]) => Promise<void>;
  showModal: (args: IComplexAction) => void;
}

interface IInvoice {
  id: number;
  vendor: string;
  buyer: string;
  amount: number;
  owner: string;
  arbitrationFee: number;
  payment_days: number;
  payment_timestamp: number;
  dispute_id: number;
  status: string;
  rule: string;
  image: string;
}

interface IComplexAction {
  action: ComplexActions;
  tokenId: number;
  target?: string;
}

enum ComplexActions {
  transfer = 'Transfer Invoice to a Third-Pary',
  dispute = 'Dispute an Invoice Rejection',
  reject = 'Reject an Invoice',
}

const renderOwnerInvoice: FC<RenderInvoiceProps> = (props) => {
  const { invoice, handleCall, mainnetAdaptor, blockExplorer, showModal } = props;
  return (
    <>
      <>
        Buyer:{' '}
        <Address
          address={invoice.buyer}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      <>
        Vendor:{' '}
        <Address
          address={invoice.vendor}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      {invoice.payment_timestamp > 0 && (
        <>
          Payment Date: {new Date(invoice.payment_timestamp * 1000).toLocaleDateString()}
          <br />
        </>
      )}
      <>
        <Text strong>Status: {invoice.status}</Text>
        <br />
      </>
      {(invoice.status === 'Accepted' && (
        <Button
          onClick={(): void => {
            void handleCall('withdrawPayment', [BigNumber.from(invoice.id)]);
          }}>
          Collect Payment
        </Button>
      )) ||
        (invoice.status === 'Rejected' && (
          <>
            <Button
              onClick={(): void => {
                void handleCall('acceptRejection', [BigNumber.from(invoice.id)]);
              }}>
              Accept Rejection
            </Button>
            <Button
              onClick={(): void => {
                void handleCall('disputeRejection', [BigNumber.from(invoice.id)]);
              }}>
              Dispute
            </Button>
          </>
        )) ||
        (invoice.status === 'Resolved' && invoice.rule === 'Vendor Wins' && (
          <Button
            onClick={(): void => {
              void handleCall('withdrawAfterRuling', [BigNumber.from(invoice.id)]);
            }}>
            Withdraw Payment
          </Button>
        )) ||
        (invoice.status === 'Resolved' && invoice.rule === 'Buyer Wins' && <Text>Lost Ruling. Buyer Won.</Text>)}
      <>
        <Button
          onClick={(): void => {
            showModal({ action: ComplexActions.transfer, tokenId: invoice.id, target: invoice.owner });
          }}>
          Transfer
        </Button>
      </>
    </>
  );
};

const renderBuyerInvoice: FC<RenderInvoiceProps> = (props) => {
  const { invoice, handleCall, mainnetAdaptor, blockExplorer, showModal } = props;
  return (
    <>
      <>
        Vendor:{' '}
        <Address
          address={invoice.vendor}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      <>
        Owner:{' '}
        <Address
          address={invoice.owner}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      {invoice.payment_timestamp > 0 && (
        <>
          Payment Date: {new Date(invoice.payment_timestamp * 1000).toLocaleDateString()}
          <br />
        </>
      )}
      <>
        <Text strong>Status: {invoice.status}</Text>
        <br />
      </>
      {(invoice.status === 'Invoiced' && (
        <>
          <Button
            onClick={(): void => {
              void handleCall('acceptInvoice', [BigNumber.from(invoice.id)]);
            }}>
            Accept
          </Button>
          <Button
            onClick={(): void => {
              showModal({ action: ComplexActions.reject, tokenId: invoice.id });
            }}>
            Reject
          </Button>
        </>
      )) ||
        (invoice.status === 'Minted' && (
          <>
            <Button
              onClick={(): void => {
                void handleCall('cancelPO', [BigNumber.from(invoice.id)]);
              }}>
              Cancel PO
            </Button>
          </>
        )) ||
        (invoice.status === 'Canceled' && (
          <>
            <Button
              onClick={(): void => {
                void handleCall('withdrawCancellation', [BigNumber.from(invoice.id)]);
              }}>
              Withdraw Cancellation
            </Button>
          </>
        )) ||
        (invoice.status === 'Resolved' && invoice.rule === 'Buyer Wins' && (
          <Button
            onClick={(): void => {
              void handleCall('withdrawAfterRuling', [BigNumber.from(invoice.id)]);
            }}>
            Withdraw Payment
          </Button>
        )) ||
        (invoice.status === 'Resolved' && invoice.rule === 'Vendor Wins' && <Text>Lost Ruling. Vendor Won.</Text>)}
    </>
  );
};

const renderVendorInvoice: FC<RenderInvoiceProps> = (props) => {
  const { invoice, handleCall, mainnetAdaptor, blockExplorer, showModal } = props;
  return (
    <>
      <>
        Buyer:{' '}
        <Address
          address={invoice.buyer}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      <>
        Owner:{' '}
        <Address
          address={invoice.owner}
          fontSize={13}
          ensProvider={mainnetAdaptor?.provider}
          blockExplorer={blockExplorer}
        />
        <br />
      </>
      {invoice.payment_timestamp > 0 && (
        <>
          Payment Date: {new Date(invoice.payment_timestamp * 1000).toLocaleDateString()}
          <br />
        </>
      )}
      <>
        <Text strong>Status: {invoice.status}</Text>
        <br />
      </>
      {(invoice.status === 'Minted' && (
        <>
          <Button
            onClick={(): void => {
              void handleCall('changeToInvoice', [BigNumber.from(invoice.id)]);
            }}>
            Invoice
          </Button>
          <Button
            onClick={(): void => {
              void handleCall('cancelPO', [BigNumber.from(invoice.id)]);
            }}>
            Cancel PO
          </Button>
        </>
      )) ||
        (invoice.status === 'Rejected' && (
          <>
            <Button
              onClick={(): void => {
                void handleCall('acceptRejection', [BigNumber.from(invoice.id)]);
              }}>
              Accept Rejection
            </Button>
            <Button
              onClick={(): void => {
                showModal({ action: ComplexActions.dispute, tokenId: invoice.id });
              }}>
              Dispute
            </Button>
          </>
        ))}
    </>
  );
};

const InvoiceList: FC<IInvoiceProps> = (props) => {
  const { contract, list, arbitrationCost, nInvoices, perspective, mainnetAdaptor, blockExplorer, tx } = props;
  const ethersAppContext = useEthersAppContext();
  const [myAddress] = useSignerAddress(ethersAppContext.signer);
  const [toAddress, setToAddress] = useState<string>('');
  const [action, setAction] = useState<ComplexActions>();
  const [tokenId, setTokenId] = useState<number>();
  const [target, setTarget] = useState<string>();

  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const handleCall = async (call: string, args: any[], value?: string): Promise<void> => {
    if (contract && tx && value) await tx(contract[call](...args, { value: ethers.utils.parseEther(value) }));
    else if (contract && tx) await tx(contract[call](...args));
  };
  useEffect(() => {
    const updateYourCollectibles = async (): Promise<void> => {
      const collectibleUpdate = [];
      for (let tokenIndex = 0; tokenIndex < nInvoices; tokenIndex++) {
        try {
          let tokenId;
          if (!list) {
            tokenId = myAddress && contract && (await contract.tokenOfOwnerByIndex(myAddress, tokenIndex));
          } else {
            tokenId = list[tokenIndex];
          }
          const tokenURI = tokenId && contract && (await contract.tokenURI(tokenId));
          const jsonManifestString: string | undefined = tokenURI && atob(tokenURI.substring(29));
          try {
            const jsonManifest = jsonManifestString && JSON.parse(jsonManifestString);
            collectibleUpdate.push({ id: tokenId?.toString(), ...jsonManifest });
          } catch (e) {
            console.log(e);
          }
        } catch (e) {
          console.log(e);
        }
      }
      setInvoices(collectibleUpdate.reverse());
    };
    void updateYourCollectibles();
  }, [contract, nInvoices, myAddress, list]);

  const [actionModalVisible, setActionModalVisible] = useState(false);

  const showModal = (args: IComplexAction): void => {
    const { action, tokenId, target } = args;
    setAction(action);
    setTokenId(tokenId);
    if (target) setTarget(target);

    setActionModalVisible(true);
  };

  const handleActionModalCancel = (): void => {
    setActionModalVisible(false);
    setAction(undefined);
    setTokenId(undefined);
    setTarget(undefined);
  };

  const complexActionModal = (
    <Modal title={action} visible={actionModalVisible} onCancel={handleActionModalCancel} footer={null}>
      {action === ComplexActions.transfer && (
        <>
          Transfer this invoice to someone else. You will not be able to collect payment from it in the future if you
          are not the owner.
          <AddressInput
            ensProvider={mainnetAdaptor?.provider}
            placeholder="to address"
            address={toAddress}
            onChange={(value): void => {
              setToAddress(value);
            }}
          />
          <Button
            onClick={(): void => {
              if (toAddress) void handleCall('transferFrom', [target, toAddress, BigNumber.from(tokenId)]);
              handleActionModalCancel();
            }}>
            Transfer
          </Button>
        </>
      )}
      {(action === ComplexActions.reject || action === ComplexActions.dispute) && (
        <>
          {(action === ComplexActions.reject &&
            'You are rejecting this Invoice. In case the Vendor or Owner dispute your decision, you need to pay any abitration fees upfront') ||
            'You are disputing the Rejection of this Invoice. This implies paying arbitration fees.'}
          <br />
          Arbitration Costs: {arbitrationCost} ETH
          <br />
          {action === ComplexActions.reject && (
            <Button
              onClick={(): void => {
                void handleCall('rejectInvoice', [BigNumber.from(tokenId)], arbitrationCost);
                handleActionModalCancel();
              }}>
              Reject
            </Button>
          )}
          {action === ComplexActions.dispute && (
            <Button
              onClick={(): void => {
                void handleCall('disputeRejection', [BigNumber.from(tokenId)], arbitrationCost);
                handleActionModalCancel();
              }}>
              Dispute Rejection
            </Button>
          )}
        </>
      )}
    </Modal>
  );

  return (
    <div style={{ width: 900, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>
      <>
        {complexActionModal}
        <List
          grid={{ column: 3 }}
          bordered
          dataSource={invoices}
          renderItem={(item: IInvoice): ReactNode => (
            <List.Item>
              <Card
                title={
                  <div>
                    <span style={{ fontSize: 16, marginRight: 8 }}>Invoice {item.id}</span>
                  </div>
                }
                extra={`${parseFloat(ethers.utils.formatEther(item.amount)).toFixed(4)} ETH`}>
                {perspective === 'owner' &&
                  renderOwnerInvoice({
                    invoice: item,
                    mainnetAdaptor,
                    blockExplorer,
                    handleCall,
                    showModal,
                  })}
                {perspective === 'vendor' &&
                  renderVendorInvoice({
                    invoice: item,
                    mainnetAdaptor,
                    blockExplorer,
                    handleCall,
                    showModal,
                  })}
                {perspective === 'buyer' &&
                  renderBuyerInvoice({
                    invoice: item,
                    mainnetAdaptor,
                    blockExplorer,
                    handleCall,
                    showModal,
                  })}
              </Card>
            </List.Item>
          )}
        />
      </>
    </div>
  );
};
export default InvoiceList;
