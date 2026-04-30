import { Platform } from 'react-native';

import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagAbortSuccess } from './types';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

export async function abort(): Promise<PlugPagAbortSuccess> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: abort() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().abort() as Promise<PlugPagAbortSuccess>;
}

export async function doAsyncAbort(): Promise<PlugPagAbortSuccess> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: doAsyncAbort() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().doAsyncAbort() as Promise<PlugPagAbortSuccess>;
}
