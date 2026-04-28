import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

import { InstallmentType, PaymentType } from './types';

import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagTransactionResult } from '../../types/sharedTypes';
import type {
  PlugPagPaymentProgressEvent,
  PlugPagPaymentRequest,
} from './types';

export type {
  PlugPagInstallmentType,
  PlugPagPaymentProgressEvent,
  PlugPagPaymentRequest,
  PlugPagPaymentType,
} from './types';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

// NativeEventEmitter lazy singleton (private)
let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (_emitter === null) {
    // EXCEPTION: NativeModules is dynamically typed. PagseguroPlugpag implements
    // the NativeEventEmitter NativeModule contract (addListener + removeListeners).
    _emitter = new NativeEventEmitter(NativeModules.PagseguroPlugpag as any); // EXCEPTION: dynamic NativeModules type
  }
  return _emitter;
}

function validatePaymentRequest(data: PlugPagPaymentRequest): void {
  const validPaymentTypes = Object.values(PaymentType);
  if (!validPaymentTypes.includes(data.type)) {
    throw new Error(
      `[react-native-pagseguro-plugpag] ERROR: doPayment() — type "${String(
        data.type
      )}" is not valid. Accepted values: ${validPaymentTypes.join(', ')}.`
    );
  }
  const validInstallmentTypes = Object.values(InstallmentType);
  if (!validInstallmentTypes.includes(data.installmentType)) {
    throw new Error(
      `[react-native-pagseguro-plugpag] ERROR: doPayment() — installmentType "${String(
        data.installmentType
      )}" is not valid. Accepted values: ${validInstallmentTypes.join(', ')}.`
    );
  }
  if (data.amount <= 0) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — amount must be > 0.'
    );
  }
  if (data.installments < 1) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — installments must be >= 1.'
    );
  }
  if (
    (data.installmentType === 'PARC_VENDEDOR' ||
      data.installmentType === 'PARC_COMPRADOR') &&
    data.installments < 2
  ) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — installments must be >= 2 when installmentType is PARC_VENDEDOR or PARC_COMPRADOR.'
    );
  }
  if (
    (data.type === 'PIX' || data.type === 'DEBIT') &&
    data.installmentType !== 'A_VISTA'
  ) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — PIX and DEBIT payments must use installmentType A_VISTA.'
    );
  }
  if (data.userReference !== undefined && data.userReference.length > 10) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — userReference must be at most 10 characters.'
    );
  }
}

export async function doPayment(
  data: PlugPagPaymentRequest
): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  validatePaymentRequest(data);
  return getNativeModule().doPayment(data) as Promise<PlugPagTransactionResult>;
}

export async function doAsyncPayment(
  data: PlugPagPaymentRequest
): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncPayment() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  validatePaymentRequest(data);
  return getNativeModule().doAsyncPayment(
    data
  ) as Promise<PlugPagTransactionResult>;
}

export function subscribeToPaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): () => void {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: subscribeToPaymentProgress() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  // EXCEPTION: NativeEventEmitter.addListener uses generic Object type in RN types.
  // Cast is safe — Kotlin emits a map matching PlugPagPaymentProgressEvent exactly.
  const sub = getEmitter().addListener(
    'onPaymentProgress',
    callback as any // EXCEPTION: RN NativeEventEmitter generic Object type
  );
  return () => sub.remove();
}

export { PaymentType, InstallmentType };
