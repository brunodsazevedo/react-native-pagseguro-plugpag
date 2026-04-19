import { Platform } from 'react-native';

import { doRefund } from '../../functions/refund';

const mockDoRefund = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    doRefund: mockDoRefund,
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
  transactionCode: 'TXN123',
  transactionId: 'ID456',
  voidType: 'VOID_PAYMENT' as const,
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

  it('doRefund() rejects with correct prefix on iOS', async () => {
    await expect(doRefund(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(doRefund(validRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('doRefund()'),
      })
    );
  });
});

// =============================================================================
// validateRefundRequest
// =============================================================================

describe('validateRefundRequest', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('rejects when transactionCode is empty', async () => {
    await expect(
      doRefund({ ...validRequest, transactionCode: '' })
    ).rejects.toThrow('transactionCode');
  });

  it('rejects when transactionId is empty', async () => {
    await expect(
      doRefund({ ...validRequest, transactionId: '' })
    ).rejects.toThrow('transactionId');
  });

  it('rejects when voidType is invalid', async () => {
    await expect(
      doRefund({ ...validRequest, voidType: 'INVALID' as any })
    ).rejects.toThrow('voidType');
  });
});

// =============================================================================
// doRefund — Android normal operation
// =============================================================================

describe('doRefund — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PlugPagTransactionResult on success', async () => {
    mockDoRefund.mockResolvedValueOnce(mockTransactionResult);
    const result = await doRefund(validRequest);
    expect(result).toEqual(mockTransactionResult);
    expect(mockDoRefund).toHaveBeenCalledWith(validRequest);
  });

  it('rejects with PLUGPAG_REFUND_ERROR on SDK error', async () => {
    mockDoRefund.mockRejectedValueOnce(
      Object.assign(new Error('refund failed'), {
        code: 'PLUGPAG_REFUND_ERROR',
      })
    );
    await expect(doRefund(validRequest)).rejects.toMatchObject({
      code: 'PLUGPAG_REFUND_ERROR',
    });
  });
});
