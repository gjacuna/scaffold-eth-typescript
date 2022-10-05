import { Button, Card, Input } from 'antd';
import { AddressInput, EtherInput } from 'eth-components/ant';
import { TTransactorFunc } from 'eth-components/functions';
import { TEthersAdaptor } from 'eth-hooks/models';
import { ethers } from 'ethers';
import React, { FC, useState } from 'react';

import { LikInvoice } from '~common/generated/contract-types';

interface IInvoiceProps {
  contract: LikInvoice | undefined;
  mainnetAdaptor: TEthersAdaptor | undefined;
  blockExplorer: string;
  ethPrice: number;
  tx: TTransactorFunc | undefined;
}

const MintInvoice: FC<IInvoiceProps> = (props) => {
  const { contract, tx, mainnetAdaptor, ethPrice } = props;

  const [toAddress, setToAddress] = useState<string>('');
  const [paymentDays, setPaymentDays] = useState<string>('');
  const [poAmount, setPOAmount] = useState<string>('');

  const handleCall = async (call: string, args: any[], value?: string): Promise<void> => {
    if (contract && tx && value) await tx(contract[call](...args, { value: ethers.utils.parseEther(value) }));
    else if (contract && tx) await tx(contract[call](...args));
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
      </Card>
      <Button
        onClick={(): void => {
          if (contract && toAddress && paymentDays && poAmount)
            void handleCall('mintItem', [toAddress, paymentDays], poAmount);
        }}>
        Mint Purchase Order
      </Button>
    </div>
  );
};

export default MintInvoice;
