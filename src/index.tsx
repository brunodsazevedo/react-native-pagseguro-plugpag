import { Platform } from 'react-native';
import type { Spec } from './NativePagseguroPlugpag';

if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.'
  );
}

export function multiply(a: number, b: number): number {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: multiply() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  }

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.multiply(a, b);
}
