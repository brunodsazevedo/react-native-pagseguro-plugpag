import { useEffect, useRef } from 'react';

import { subscribeToPaymentProgress } from '../functions/payment/index';

import type { PlugPagPaymentProgressEvent } from '../functions/payment/types';

export function usePaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = subscribeToPaymentProgress((event) => {
      callbackRef.current(event);
    });
    return unsubscribe;
  }, []);
}
