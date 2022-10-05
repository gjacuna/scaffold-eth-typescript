import { Alert, Button, Card, Input } from 'antd';
import { AddressInput, EtherInput } from 'eth-components/ant';
import { TTransactorFunc } from 'eth-components/functions';
import { useSignerAddress } from 'eth-hooks';
import { useEthersAppContext } from 'eth-hooks/context';
import { TEthersAdaptor } from 'eth-hooks/models';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import React, { FC, useState } from 'react';

import { LikInvoice } from '~common/generated/contract-types';

interface IInvoiceProps {
  contract: LikInvoice | undefined;
  mainnetAdaptor: TEthersAdaptor | undefined;
  blockExplorer: string;
  ethPrice: number;
  tx: TTransactorFunc | undefined;
}

interface MetaEvidence {
  fileURI?: string;
  fileTypeExtension?: string;
  category?: string;
  title?: string;
  description?: string;
  aliases?: { [key: string]: string };
  question?: string;
  rulingOptions?: {
    type: string;
    titles: string[];
    descriptions: string[];
  };
  evidenceDisplayInterfaceURI?: string;
  evidenceDisplayInterfaceHash?: string;
  dynamicScriptURI?: string;
  dynamicScriptHash?: string;
}

const MintInvoice: FC<IInvoiceProps> = (props) => {
  const { contract, tx, mainnetAdaptor, ethPrice } = props;
  const ethersAppContext = useEthersAppContext();
  const [myAddress] = useSignerAddress(ethersAppContext.signer);

  const [toAddress, setToAddress] = useState<string>('');
  const [paymentDays, setPaymentDays] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [poAmount, setPOAmount] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleCall = async (call: string, args: any[], value?: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
    if (contract && tx && value) await tx(contract[call](...args, { value: ethers.utils.parseEther(value) }));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
    else if (contract && tx) await tx(contract[call](...args));
  };

  const handleSubmit = async (): Promise<void> => {
    const metaEvidence: MetaEvidence = {
      title: purpose,
      description,
      fileTypeExtension: 'json',
      category: 'Escrow',
      aliases: {
        [toAddress]: 'Vendor',
        [myAddress as string]: 'Buyer',
      },
      question: 'Is the service or product delivered according to description?',
      rulingOptions: {
        titles: ['BuyerWins', 'VendorWins'],
        type: 'single-select',
        descriptions: [
          'Vendor did not deliver anything or did so in bad faith',
          'Vendor delivered as expected or as best they could, deserving a payment',
        ],
      },
    };
    const projectId = '2FNHkT0PUnSddMN5J6eqg2QEVpX';
    const projectSecret = 'c684b53c56e556769087617df4f004a9';
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    const ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth,
      },
    });
    const ipfsHash = await ipfs.add(JSON.stringify(metaEvidence));
    console.log(ipfsHash);
    await handleCall('mintItem', [toAddress, paymentDays, `/ipfs/${ipfsHash.path}`], poAmount);
  };

  return (
    <div style={{ width: 900, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>
      <Card>
        Issue a new Purchase Order to a Vendor
        <br />
        <AddressInput
          ensProvider={mainnetAdaptor?.provider}
          placeholder="address or ENS"
          address={toAddress}
          onChange={(value): void => {
            setToAddress(value);
          }}
        />
        <Input
          placeholder="Payment Days after Issuance"
          type="number"
          onChange={(value): void => {
            setPaymentDays(value.target.value);
          }}
          value={paymentDays}
        />
        <EtherInput
          price={ethPrice}
          value={poAmount}
          onChange={(value): void => {
            setPOAmount(value);
          }}
          placeholder={'PO Amount'}
        />
        <Input
          placeholder="Service or product ordered to vendor..."
          type="text"
          onChange={(value): void => {
            setPurpose(value.target.value);
          }}
          value={purpose}
        />
        <Input
          placeholder="Description of the transaction... and what constitutes a satisfaying delivery."
          type="text"
          onChange={(value): void => {
            setDescription(value.target.value);
          }}
          value={description}
        />
      </Card>
      <Button
        onClick={(): void => {
          setError(false);
          if (contract && toAddress && paymentDays && poAmount && purpose) void handleSubmit();
          else setError(true);
        }}>
        Mint Purchase Order
      </Button>
      {error && (
        <Alert
          message={`Missing Fields:
          ${!toAddress && ' Vendor |'}
          ${!paymentDays && ' Payment Days |'}
          ${!poAmount && ' Amount |'}
          ${!purpose && ' Service or Product |'}`}
          type="error"
        />
      )}
    </div>
  );
};

export default MintInvoice;
