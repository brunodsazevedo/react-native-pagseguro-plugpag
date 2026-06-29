import { Platform } from 'react-native';

import {
  calculateInstallments,
  doAsyncPayment,
  doPayment,
  subscribeToPaymentProgress,
} from '../../functions/payment';

const mockDoPayment = jest.fn();
const mockDoAsyncPayment = jest.fn();
const mockCalculateInstallments = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    doPayment: mockDoPayment,
    doAsyncPayment: mockDoAsyncPayment,
    calculateInstallments: mockCalculateInstallments,
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

  it('rejects when type is invalid', async () => {
    await expect(
      doPayment({ ...validRequest, type: 'INVALID' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('type "INVALID" is not valid'),
      })
    );
    await expect(
      doPayment({ ...validRequest, type: 'INVALID' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('CREDIT, DEBIT, PIX'),
      })
    );
  });

  it('rejects when type is lowercase (case-sensitive)', async () => {
    await expect(
      doPayment({ ...validRequest, type: 'credit' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('type "credit" is not valid'),
      })
    );
  });

  it('doAsyncPayment rejects invalid type identically to doPayment', async () => {
    await expect(
      doAsyncPayment({ ...validRequest, type: 'INVALID' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('type "INVALID" is not valid'),
      })
    );
  });

  it('rejects when installmentType is invalid', async () => {
    await expect(
      doPayment({ ...validRequest, installmentType: 'PARCELADO' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'installmentType "PARCELADO" is not valid'
        ),
      })
    );
    await expect(
      doPayment({ ...validRequest, installmentType: 'PARCELADO' as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR'
        ),
      })
    );
  });

  it('rejects when installmentType is null', async () => {
    await expect(
      doPayment({ ...validRequest, installmentType: null as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('installmentType "null" is not valid'),
      })
    );
  });
});

// =============================================================================
// maxTimeShowPopup — doPayment validation (T004)
// =============================================================================

describe('maxTimeShowPopup — doPayment', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('iOS guard precedes maxTimeShowPopup validation', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    await expect(
      doPayment({ ...validRequest, maxTimeShowPopup: -1 } as any)
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('doPayment() is not available on iOS'),
      })
    );
  });

  it('accepts valid maxTimeShowPopup = 10', async () => {
    mockDoPayment.mockResolvedValueOnce(mockTransactionResult);
    const result = await doPayment({ ...validRequest, maxTimeShowPopup: 10 });
    expect(result).toEqual(mockTransactionResult);
    expect(mockDoPayment).toHaveBeenCalledWith(
      expect.objectContaining({ maxTimeShowPopup: 10 })
    );
  });

  it('accepts maxTimeShowPopup = 0 (imediatamente)', async () => {
    mockDoPayment.mockResolvedValueOnce(mockTransactionResult);
    await expect(
      doPayment({ ...validRequest, maxTimeShowPopup: 0 })
    ).resolves.toEqual(mockTransactionResult);
  });

  it('accepts omitted maxTimeShowPopup (comportamento atual preservado)', async () => {
    mockDoPayment.mockResolvedValueOnce(mockTransactionResult);
    await expect(doPayment(validRequest)).resolves.toEqual(
      mockTransactionResult
    );
  });

  it('rejects negative maxTimeShowPopup (-1)', async () => {
    await expect(
      doPayment({ ...validRequest, maxTimeShowPopup: -1 })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.'
    );
  });

  it('rejects non-integer maxTimeShowPopup (1.5)', async () => {
    await expect(
      doPayment({ ...validRequest, maxTimeShowPopup: 1.5 } as any)
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.'
    );
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
// maxTimeShowPopup — doAsyncPayment validation (T014)
// =============================================================================

describe('maxTimeShowPopup — doAsyncPayment', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('iOS guard precedes maxTimeShowPopup validation', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    await expect(
      doAsyncPayment({ ...validRequest, maxTimeShowPopup: -1 } as any)
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'doAsyncPayment() is not available on iOS'
        ),
      })
    );
  });

  it('accepts valid maxTimeShowPopup = 10', async () => {
    mockDoAsyncPayment.mockResolvedValueOnce(mockTransactionResult);
    const result = await doAsyncPayment({
      ...validRequest,
      maxTimeShowPopup: 10,
    });
    expect(result).toEqual(mockTransactionResult);
    expect(mockDoAsyncPayment).toHaveBeenCalledWith(
      expect.objectContaining({ maxTimeShowPopup: 10 })
    );
  });

  it('rejects negative maxTimeShowPopup (-1) identically to doPayment', async () => {
    await expect(
      doAsyncPayment({ ...validRequest, maxTimeShowPopup: -1 })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.'
    );
  });

  it('rejects non-integer maxTimeShowPopup (1.5) identically to doPayment', async () => {
    await expect(
      doAsyncPayment({ ...validRequest, maxTimeShowPopup: 1.5 } as any)
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.'
    );
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

// =============================================================================
// calculateInstallments — US1: caminho feliz (Android)
// =============================================================================

describe('calculateInstallments — US1: caminho feliz', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolve com { options: [...] } tipado quando SDK retorna lista de parcelas', async () => {
    const mockOptions = [
      { quantity: 1, amount: 10000, total: 10000 },
      { quantity: 2, amount: 5100, total: 10200 },
    ];
    mockCalculateInstallments.mockResolvedValueOnce({ options: mockOptions });

    const result = await calculateInstallments({
      amount: 10000,
      installmentType: 'PARC_COMPRADOR',
    });

    expect(result).toEqual({ options: mockOptions });
    expect(mockCalculateInstallments).toHaveBeenCalledWith({
      amount: 10000,
      installmentType: 'PARC_COMPRADOR',
    });
  });

  it('resolve com { options: [] } quando SDK retorna lista vazia', async () => {
    mockCalculateInstallments.mockResolvedValueOnce({ options: [] });

    const result = await calculateInstallments({
      amount: 10000,
      installmentType: 'A_VISTA',
    });

    expect(result).toEqual({ options: [] });
  });
});

// =============================================================================
// calculateInstallments — US2: validação fail-fast
// =============================================================================

describe('calculateInstallments — US2: validação amount', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('rejeita quando amount = 0, sem chamar o módulo nativo', async () => {
    await expect(
      calculateInstallments({ amount: 0, installmentType: 'A_VISTA' })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.'
    );
    expect(mockCalculateInstallments).not.toHaveBeenCalled();
  });

  it('rejeita quando amount é negativo, sem chamar o módulo nativo', async () => {
    await expect(
      calculateInstallments({ amount: -100, installmentType: 'A_VISTA' })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.'
    );
    expect(mockCalculateInstallments).not.toHaveBeenCalled();
  });

  it('rejeita quando amount = 10.5 (não-inteiro), sem chamar o módulo nativo', async () => {
    await expect(
      calculateInstallments({ amount: 10.5, installmentType: 'A_VISTA' })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.'
    );
    expect(mockCalculateInstallments).not.toHaveBeenCalled();
  });
});

describe('calculateInstallments — US2: validação installmentType', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('rejeita quando installmentType é inválido, sem chamar o módulo nativo', async () => {
    await expect(
      calculateInstallments({
        amount: 1000,
        installmentType: 'PARCELADO' as any,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR'
        ),
      })
    );
    expect(mockCalculateInstallments).not.toHaveBeenCalled();
  });

  it('rejeita quando installmentType é null, sem chamar o módulo nativo', async () => {
    await expect(
      calculateInstallments({ amount: 1000, installmentType: null as any })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR'
        ),
      })
    );
    expect(mockCalculateInstallments).not.toHaveBeenCalled();
  });
});

// =============================================================================
// calculateInstallments — US3: guard de plataforma (iOS)
// =============================================================================

describe('calculateInstallments — US3: guard de plataforma iOS', () => {
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

  it('rejeita com erro prefixado em iOS', async () => {
    await expect(
      calculateInstallments({ amount: 10000, installmentType: 'A_VISTA' })
    ).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR: calculateInstallments() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
    );
  });

  it('guard iOS precede validação: iOS com requisição inválida rejeita pela mensagem do guard', async () => {
    await expect(
      calculateInstallments({ amount: 0, installmentType: 'A_VISTA' })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'calculateInstallments() is not available on iOS'
        ),
      })
    );
  });
});
