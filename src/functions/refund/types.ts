export const PlugPagVoidType = {
  VOID_PAYMENT: 'VOID_PAYMENT',
  VOID_QRCODE: 'VOID_QRCODE',
} as const;

export type PlugPagVoidTypeValue =
  (typeof PlugPagVoidType)[keyof typeof PlugPagVoidType];

export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;
  printReceipt?: boolean;
}
