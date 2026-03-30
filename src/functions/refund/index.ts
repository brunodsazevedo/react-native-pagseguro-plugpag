import { Platform } from 'react-native';

import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagTransactionResult } from '../../types/sharedTypes';
import type { PlugPagRefundRequest } from './types';

export { PlugPagVoidType } from './types';
export type { PlugPagRefundRequest, PlugPagVoidTypeValue } from './types';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

function validateRefundRequest(data: PlugPagRefundRequest): void {
  if (data.transactionCode.trim() === '') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doRefund() — transactionCode must not be empty.'
    );
  }
  if (data.transactionId.trim() === '') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doRefund() — transactionId must not be empty.'
    );
  }
  const validVoidTypes = ['VOID_PAYMENT', 'VOID_QRCODE'];
  if (!validVoidTypes.includes(data.voidType)) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doRefund() — voidType must be PlugPagVoidType.VOID_PAYMENT or PlugPagVoidType.VOID_QRCODE.'
    );
  }
}

export async function doRefund(
  data: PlugPagRefundRequest
): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doRefund() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  validateRefundRequest(data);
  return getNativeModule().doRefund(data) as Promise<PlugPagTransactionResult>;
}
