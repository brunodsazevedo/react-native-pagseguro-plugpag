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
  maxTimeShowPopup?: number /** Tempo máximo (em segundos, inteiro >= 0) para o popup de impressão fechar automaticamente. */;
}
