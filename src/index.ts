import { Platform } from 'react-native';

// Level 1 iOS guard — module import warning (does not throw)
if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.'
  );
}

export * from './functions';
export * from './hooks/usePaymentProgress';
export type { PlugPagTransactionResult } from './types/sharedTypes';
