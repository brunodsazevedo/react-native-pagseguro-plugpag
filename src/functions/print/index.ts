import { Platform } from 'react-native';

import type { Spec } from '../../NativePagseguroPlugpag';
import type { PrintRequest, PrintResult } from './types';

export { MIN_PRINTER_STEPS, PrintQuality } from './types';
export type { PrintQualityValue, PrintRequest, PrintResult } from './types';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

function validatePrintRequest(data: PrintRequest): void {
  if (data.filePath.trim() === '') {
    throw new Error(
      '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — filePath must not be empty.'
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
  return getNativeModule().printFromFile(data) as Promise<PrintResult>;
}

export async function reprintCustomerReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: reprintCustomerReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().reprintCustomerReceipt() as Promise<PrintResult>;
}

export async function doAsyncReprintCustomerReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncReprintCustomerReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().doAsyncReprintCustomerReceipt() as Promise<PrintResult>;
}

export async function reprintEstablishmentReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: reprintEstablishmentReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().reprintEstablishmentReceipt() as Promise<PrintResult>;
}

export async function doAsyncReprintEstablishmentReceipt(): Promise<PrintResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncReprintEstablishmentReceipt() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().doAsyncReprintEstablishmentReceipt() as Promise<PrintResult>;
}
