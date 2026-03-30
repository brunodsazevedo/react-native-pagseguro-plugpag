import { Platform } from 'react-native';

import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagActivationSuccess } from './types';

export type { PlugPagActivationSuccess } from './types';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

export async function initializeAndActivatePinPad(
  activationCode: string
): Promise<PlugPagActivationSuccess> {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: initializeAndActivatePinPad() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }
  return getNativeModule().initializeAndActivatePinPad(
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
  return getNativeModule().doAsyncInitializeAndActivatePinPad(
    activationCode
  ) as Promise<PlugPagActivationSuccess>;
}
