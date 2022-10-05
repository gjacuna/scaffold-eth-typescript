import { Card } from 'antd';
import { TTransactorFunc } from 'eth-components/functions';
import { useContractReader, useEventListener, useSignerAddress } from 'eth-hooks';
import { useEthersAppContext } from 'eth-hooks/context';
import { TEthersAdaptor } from 'eth-hooks/models';
import { BigNumber, ethers } from 'ethers';
import React, { FC } from 'react';

import InvoiceList from './subcomponents/InvoiceList';

import { LikInvoice } from '~common/generated/contract-types';

interface IInvoiceProps {
  contract: LikInvoice | undefined;
  mainnetAdaptor: TEthersAdaptor | undefined;
  blockExplorer: string;
  tx?: TTransactorFunc;
}

const Invoices: FC<IInvoiceProps> = (props) => {
  const { contract, tx, mainnetAdaptor, blockExplorer } = props;

  const ethersAppContext = useEthersAppContext();
  const [myAddress] = useSignerAddress(ethersAppContext.signer);
  const [mintEvents] = useEventListener(contract, 'Minted', 0);
  const asVendor = mintEvents
    .filter((event) => {
      return event.args[1] === myAddress;
    })
    .map((item) => {
      return (item.args[2] as BigNumber).toString();
    });
  const asBuyer = mintEvents
    .filter((event) => {
      return event.args[0] === myAddress;
    })
    .map((item) => {
      return (item.args[2] as BigNumber).toString();
    });

  const [arbitrationCost] = useContractReader(contract, contract?.arbitrationCost, []);
  const [invoiceCount] = useContractReader(contract, contract?.balanceOf, [myAddress ?? '']);

  return (
    <Card>
      Invoices you own: <br />
      {(invoiceCount && parseInt(invoiceCount.toString()) > 0 && (
        <InvoiceList
          contract={contract}
          nInvoices={parseInt(invoiceCount.toString())}
          perspective={'owner'}
          tx={tx}
          mainnetAdaptor={mainnetAdaptor}
          blockExplorer={blockExplorer}
          arbitrationCost={(arbitrationCost && ethers.utils.formatEther(arbitrationCost as BigNumber)) || '0'}
        />
      )) ||
        'None'}
      <br />
      Invoices you are vendor: <br />
      {(asVendor && asVendor.length > 0 && (
        <InvoiceList
          contract={contract}
          nInvoices={asVendor.length}
          list={asVendor}
          perspective={'vendor'}
          tx={tx}
          mainnetAdaptor={mainnetAdaptor}
          blockExplorer={blockExplorer}
          arbitrationCost={(arbitrationCost && ethers.utils.formatEther(arbitrationCost as BigNumber)) || '0'}
        />
      )) ||
        'None'}
      <br />
      Invoices you are buyer: <br />
      {(asBuyer && asBuyer.length > 0 && (
        <InvoiceList
          contract={contract}
          nInvoices={asBuyer.length}
          list={asBuyer}
          perspective={'buyer'}
          tx={tx}
          mainnetAdaptor={mainnetAdaptor}
          blockExplorer={blockExplorer}
          arbitrationCost={(arbitrationCost && ethers.utils.formatEther(arbitrationCost as BigNumber)) || '0'}
        />
      )) ||
        'None'}
      <br />
    </Card>
  );
};

export default Invoices;
