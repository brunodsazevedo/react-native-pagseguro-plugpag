import { NativeModules, DeviceEventEmitter } from 'react-native';

export enum PaymentTypes {
  CREDIT = 1,
  DEBIT = 2,
  VOUCHER = 3,
  PIX_QR_CODE = 5,
}

export enum InstallmentTypes {
  NO_INSTALLMENT = 1,
  SELLER_INSTALLMENT = 2,
  BUYER_INSTALLMENT = 3,
}

export type InitializeAndActivatePinPadResponse = {
  result: number;
  errorCode?: string;
  errorMessage?: string;
};

export type PlugPagPaymentDataProps = {
  amount: number;
  type: PaymentTypes;
  installmentType: InstallmentTypes;
  installments: number;
  printReceipt: boolean;
  userReference?: string;
};

export type PaymentTransactionResponseProps = {
  result: number;
  errorCode?: string;
  message?: string;
  transactionCode?: string;
  transactionId?: string;
  hostNsu?: string;
  date?: string;
  time?: string;
  cardBrand?: string;
  bin?: string;
  holder?: string;
  userReference?: string;
  terminalSerialNumber?: string;
  amount?: string;
  availableBalance?: string;
  cardApplication?: string;
  label?: string;
  holderName?: string;
  extendedHolderName?: string;
};

export type PlugPagRefundPaymentDataProps = {
  transactionCode: string;
  transactionId: string;
  printReceipt: boolean;
};

export type RefundPaymentTransactionResponseProps = {
  result: number;
  errorCode?: string;
  message?: string;
  transactionCode?: string;
  transactionId?: string;
  hostNsu?: string;
  date?: string;
  time?: string;
  cardBrand?: string;
  bin?: string;
  holder?: string;
  userReference?: string;
  terminalSerialNumber?: string;
  amount?: string;
  availableBalance?: string;
  cardApplication?: string;
  label?: string;
  holderName?: string;
  extendedHolderName?: string;
};

export type TransactionPaymentEventProps = {
  code: number;
  message: string;
};

import { useEffect, useState } from 'react';

const { PagseguroPlugpag } = NativeModules;

export const plugPag = {
  installmentTypes: InstallmentTypes,
  paymentTypes: PaymentTypes,
};

export async function initializeAndActivatePinPad(
  activationCode: String
): Promise<InitializeAndActivatePinPadResponse> {
  try {
    const response: InitializeAndActivatePinPadResponse =
      await PagseguroPlugpag.initializeAndActivatePinPad(activationCode);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function doPayment({
  amount,
  installmentType,
  installments,
  printReceipt,
  type,
  userReference,
}: PlugPagPaymentDataProps) {
  try {
    const dataPayment = {
      amount,
      installmentType,
      installments,
      printReceipt,
      type,
      userReference,
    };

    const dataFormatted = JSON.stringify(dataPayment);
    const response: PaymentTransactionResponseProps =
      await PagseguroPlugpag.doPayment(dataFormatted);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function refundPayment(
  refundPaymentData: PlugPagRefundPaymentDataProps
): Promise<RefundPaymentTransactionResponseProps> {
  try {
    const data = JSON.stringify(refundPaymentData);

    const response: RefundPaymentTransactionResponseProps =
      await PagseguroPlugpag.voidPayment(data);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function print(filePath: string): Promise<any> {
  try {
    const response = await PagseguroPlugpag.print(filePath);

    // Emitir eventos para sucesso ou erro com base no resultado da impressão
    if (response.retCode === 0) {
      // 0 significa sucesso (PlugPag.RET_OK)
      DeviceEventEmitter.emit('printSuccess', {
        message: response.message,
        errorCode: response.errorCode,
      });
      return response; // Retornar o resultado de sucesso diretamente
    } else {
      DeviceEventEmitter.emit('printError', {
        message: response.message,
        errorCode: response.errorCode,
      });

      // Enriquecer o objeto de erro com errorCode e retCode
      const error = new Error(response.message);
      (error as any).errorCode = response.errorCode;
      (error as any).retCode = response.retCode;
      throw error;
    }
  } catch (error) {
    DeviceEventEmitter.emit('printError', {
      message: 'Erro ao imprimir',
      errorCode: 'PrintException',
    });

    // Enriquecer o objeto de erro com retCode padrão se não estiver presente
    if (!(error as any).retCode) {
      (error as any).retCode = 'PrintException';
    }

    throw error; // Lançar o erro para que possa ser capturado por quem chamou a função
  }
}

export function useTransactionPaymentEvent() {
  const [transactionPaymentEvent, setTransactionPaymentEvent] =
    useState<TransactionPaymentEventProps>({ code: 0, message: '' });

  useEffect(() => {
    DeviceEventEmitter.addListener('eventPayments', (event) => {
      setTransactionPaymentEvent(event);
    });
  }, []);

  return transactionPaymentEvent;
}

export default plugPag;
