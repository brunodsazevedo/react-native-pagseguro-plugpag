export const PaymentType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  PIX: 'PIX',
} as const;

export type PlugPagPaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const InstallmentType = {
  A_VISTA: 'A_VISTA',
  PARC_VENDEDOR: 'PARC_VENDEDOR',
  PARC_COMPRADOR: 'PARC_COMPRADOR',
} as const;

export type PlugPagInstallmentType =
  (typeof InstallmentType)[keyof typeof InstallmentType];

export interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
}

export interface PlugPagPaymentProgressEvent {
  eventCode: number;
  customMessage: string | null;
}
