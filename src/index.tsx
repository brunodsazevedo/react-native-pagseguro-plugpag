import { Platform } from 'react-native';
import type { Spec } from './NativePagseguroPlugpag';

if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.'
  );
}

export interface PlugPagActivationSuccess {
  result: 'ok';
}

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
