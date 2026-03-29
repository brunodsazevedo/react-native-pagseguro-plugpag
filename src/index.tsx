import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { useRef, useEffect } from 'react';
import type { Spec } from './NativePagseguroPlugpag';
import type { PrintRequest, PrintResult } from './printing';

export type { PrintQualityValue, PrintRequest, PrintResult } from './printing';
export { PrintQuality, MIN_PRINTER_STEPS } from './printing';

if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.'
  );
}

// --- Types ---

export interface PlugPagActivationSuccess {
  result: 'ok';
}

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

export const PlugPagVoidType = {
  VOID_PAYMENT: 'VOID_PAYMENT',
  VOID_QRCODE: 'VOID_QRCODE',
} as const;

export type PlugPagVoidTypeValue =
  (typeof PlugPagVoidType)[keyof typeof PlugPagVoidType];

export interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
}

export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;
  printReceipt?: boolean;
}

export interface PlugPagTransactionResult {
  transactionCode: string | null;
  transactionId: string | null;
  date: string | null;
  time: string | null;
  hostNsu: string | null;
  cardBrand: string | null;
  bin: string | null;
  holder: string | null;
  userReference: string | null;
  terminalSerialNumber: string | null;
  amount: string | null;
  availableBalance: string | null;
  nsu?: string | null;
  cardApplication?: string | null;
  label?: string | null;
  holderName?: string | null;
  extendedHolderName?: string | null;
  autoCode?: string | null;
}

export interface PlugPagPaymentProgressEvent {
  eventCode: number;
  customMessage: string | null;
}

// --- NativeEventEmitter (lazy singleton) ---
// Created on first use to avoid instantiation when module is imported on iOS.

let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (_emitter === null) {
    // EXCEPTION: NativeModules is dynamically typed. PagseguroPlugpag implements
    // the NativeEventEmitter NativeModule contract (addListener + removeListeners).
    _emitter = new NativeEventEmitter(NativeModules.PagseguroPlugpag as any); // EXCEPTION: dynamic NativeModules type
  }
  return _emitter;
}

// --- Activation (feature/002) ---

export async function initializeAndActivatePinPad(
  activationCode: string
): Promise<PlugPagActivationSuccess> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: initializeAndActivatePinPad() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.initializeAndActivatePinPad(
    activationCode
  ) as Promise<PlugPagActivationSuccess>;
}

export async function doAsyncInitializeAndActivatePinPad(
  activationCode: string
): Promise<PlugPagActivationSuccess> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncInitializeAndActivatePinPad() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doAsyncInitializeAndActivatePinPad(
    activationCode
  ) as Promise<PlugPagActivationSuccess>;
}

// --- Payment (feature/003) ---

function validatePaymentRequest(data: PlugPagPaymentRequest): void {
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

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doPayment(data) as Promise<PlugPagTransactionResult>;
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

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doAsyncPayment(
    data
  ) as Promise<PlugPagTransactionResult>;
}

// --- Printing (feature/006) ---

function validatePrintRequest(data: PrintRequest): void {
  if (data.filePath.trim() === '') {
    throw new Error(
      '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — filePath must not be empty.'
    );
  }
  if (
    data.printerQuality !== undefined &&
    (data.printerQuality < 1 || data.printerQuality > 4)
  ) {
    throw new Error(
      '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — printerQuality must be between 1 and 4.'
    );
  }
  if (data.steps !== undefined && data.steps < 0) {
    throw new Error(
      '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — steps must be >= 0.'
    );
  }
}

export async function printFromFile(data: PrintRequest): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: printFromFile() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  validatePrintRequest(data);

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.printFromFile(data) as Promise<PrintResult>;
}

export async function reprintCustomerReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: reprintCustomerReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.reprintCustomerReceipt() as Promise<PrintResult>;
}

export async function doAsyncReprintCustomerReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncReprintCustomerReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doAsyncReprintCustomerReceipt() as Promise<PrintResult>;
}

export async function reprintEstablishmentReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: reprintEstablishmentReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.reprintEstablishmentReceipt() as Promise<PrintResult>;
}

export async function doAsyncReprintEstablishmentReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncReprintEstablishmentReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doAsyncReprintEstablishmentReceipt() as Promise<PrintResult>;
}

// --- Refund (feature/005) ---

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
  if (!Object.values(PlugPagVoidType).includes(data.voidType)) {
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

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doRefund(data) as Promise<PlugPagTransactionResult>;
}

// --- Event System (feature/003) ---

export function usePaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // EXCEPTION: NativeEventEmitter.addListener uses generic Object type in RN types.
    // Cast is safe — Kotlin emits a map matching PlugPagPaymentProgressEvent exactly.
    const sub = getEmitter().addListener('onPaymentProgress', (event: any) => {
      // EXCEPTION: RN NativeEventEmitter generic Object type
      callbackRef.current(event as PlugPagPaymentProgressEvent);
    });
    return () => sub.remove();
  }, []);
}

export function subscribeToPaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): () => void {
  // EXCEPTION: NativeEventEmitter.addListener uses generic Object type in RN types.
  // Cast is safe — Kotlin emits a map matching PlugPagPaymentProgressEvent exactly.
  const sub = getEmitter().addListener('onPaymentProgress', callback as any); // EXCEPTION: RN NativeEventEmitter generic Object type
  return () => sub.remove();
}
