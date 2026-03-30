import { act, renderHook } from '@testing-library/react-native';

import { usePaymentProgress } from '../../hooks/usePaymentProgress';

import type { PlugPagPaymentProgressEvent } from '../../functions/payment/types';

// Capture listener registered by subscribeToPaymentProgress
let capturedCallback: ((event: PlugPagPaymentProgressEvent) => void) | null =
  null;
const mockUnsubscribe = jest.fn();

jest.mock('../../functions/payment/index', () => ({
  subscribeToPaymentProgress: jest.fn(
    (cb: (event: PlugPagPaymentProgressEvent) => void) => {
      capturedCallback = cb;
      return mockUnsubscribe;
    }
  ),
}));

describe('usePaymentProgress', () => {
  beforeEach(() => {
    capturedCallback = null;
    jest.clearAllMocks();
  });

  it('calls callback when onPaymentProgress event is emitted', () => {
    const callback = jest.fn();
    renderHook(() => usePaymentProgress(callback));

    const event: PlugPagPaymentProgressEvent = {
      eventCode: 1,
      customMessage: 'processing',
    };

    act(() => {
      capturedCallback?.(event);
    });

    expect(callback).toHaveBeenCalledWith(event);
  });

  it('removes subscription on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => usePaymentProgress(callback));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates callback reference without re-subscribing', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: (event: PlugPagPaymentProgressEvent) => void }) =>
        usePaymentProgress(cb),
      { initialProps: { cb: callback1 } }
    );

    rerender({ cb: callback2 });

    const event: PlugPagPaymentProgressEvent = {
      eventCode: 2,
      customMessage: null,
    };

    act(() => {
      capturedCallback?.(event);
    });

    expect(callback2).toHaveBeenCalledWith(event);
    expect(callback1).not.toHaveBeenCalled();
    // subscribeToPaymentProgress was called only once (no re-subscription)
    const { subscribeToPaymentProgress } = jest.requireMock(
      '../../functions/payment/index'
    ) as { subscribeToPaymentProgress: jest.Mock };
    expect(subscribeToPaymentProgress).toHaveBeenCalledTimes(1);
  });
});
