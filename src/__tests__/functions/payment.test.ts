import { Platform } from 'react-native';

import {
  doAsyncPayment,
  doPayment,
  subscribeToPaymentProgress,
} from '../../functions/payment';

const mockDoPayment = jest.fn();
const mockDoAsyncPayment = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    doPayment: mockDoPayment,
    doAsyncPayment: mockDoAsyncPayment,
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

const mockTransactionResult = {
  transactionCode: 'TXN123',
  transactionId: 'ID456',
  date: '20260324',
  time: '120000',
  hostNsu: 'NSU789',
  cardBrand: 'VISA',
  bin: '411111',
  holder: 'JOHN DOE',
  userReference: null,
  terminalSerialNumber: 'SN001',
  amount: '1000',
  availableBalance: null,
};

const validRequest = {
  type: 'CREDIT' as const,
  amount: 1000,
  installmentType: 'A_VISTA' as const,
  installments: 1,
};

// =============================================================================
// iOS platform guard
// =============================================================================

describe('iOS platform guard', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  it('doPayment() rejects with correct prefix on iOS', async () => {
    await expect(doPayment(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(doPayment(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('doPayment()'),
      })
    );
  });

  it('doAsyncPayment() rejects with correct prefix on iOS', async () => {
    await expect(doAsyncPayment(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(doAsyncPayment(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('doAsyncPayment()'),
      })
    );
  });

  it('subscribeToPaymentProgress() throws with correct prefix on iOS', () => {
    expect(() => subscribeToPaymentProgress(() => {})).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    expect(() => subscribeToPaymentProgress(() => {})).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('subscribeToPaymentProgress()'),
      })
    );
  });
});

// =============================================================================
// validatePaymentRequest
// =============================================================================

describe('validatePaymentRequest', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('rejects when amount <= 0', async () => {
    await expect(doPayment({ ...validRequest, amount: 0 })).rejects.toThrow(
      'amount must be > 0'
    );
  });

  it('rejects when installments < 1', async () => {
    await expect(
      doPayment({ ...validRequest, installments: 0 })
    ).rejects.toThrow('installments must be >= 1');
  });

  it('rejects when installmentType is PARC_VENDEDOR and installments < 2', async () => {
    await expect(
      doPayment({
        ...validRequest,
        installmentType: 'PARC_VENDEDOR',
        installments: 1,
      })
    ).rejects.toThrow('installments must be >= 2');
  });

  it('rejects when PIX payment uses non-A_VISTA installment type', async () => {
    await expect(
      doPayment({
        ...validRequest,
        type: 'PIX',
        installmentType: 'PARC_COMPRADOR',
        installments: 2,
      })
    ).rejects.toThrow('A_VISTA');
  });

  it('rejects when userReference exceeds 10 characters', async () => {
    await expect(
      doPayment({ ...validRequest, userReference: '12345678901' })
    ).rejects.toThrow('userReference');
  });
});

// =============================================================================
// doPayment — Android normal operation
// =============================================================================

describe('doPayment — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PlugPagTransactionResult on success', async () => {
    mockDoPayment.mockResolvedValueOnce(mockTransactionResult);
    const result = await doPayment(validRequest);
    expect(result).toEqual(mockTransactionResult);
    expect(mockDoPayment).toHaveBeenCalledWith(validRequest);
  });

  it('rejects with PLUGPAG_PAYMENT_ERROR on SDK error', async () => {
    mockDoPayment.mockRejectedValueOnce(
      Object.assign(new Error('payment failed'), {
        code: 'PLUGPAG_PAYMENT_ERROR',
      })
    );
    await expect(doPayment(validRequest)).rejects.toMatchObject({
      code: 'PLUGPAG_PAYMENT_ERROR',
    });
  });
});

// =============================================================================
// doAsyncPayment — Android normal operation
// =============================================================================

describe('doAsyncPayment — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PlugPagTransactionResult on success', async () => {
    mockDoAsyncPayment.mockResolvedValueOnce(mockTransactionResult);
    const result = await doAsyncPayment(validRequest);
    expect(result).toEqual(mockTransactionResult);
  });

  it('rejects with PLUGPAG_PAYMENT_ERROR on SDK error', async () => {
    mockDoAsyncPayment.mockRejectedValueOnce(
      Object.assign(new Error('payment failed'), {
        code: 'PLUGPAG_PAYMENT_ERROR',
      })
    );
    await expect(doAsyncPayment(validRequest)).rejects.toMatchObject({
      code: 'PLUGPAG_PAYMENT_ERROR',
    });
  });
});

// =============================================================================
// subscribeToPaymentProgress — Android normal operation
// =============================================================================

describe('subscribeToPaymentProgress — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  it('returns an unsubscribe function', () => {
    const unsubscribe = subscribeToPaymentProgress(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
