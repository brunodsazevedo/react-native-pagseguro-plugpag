import { Platform, DeviceEventEmitter } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { usePaymentProgress, subscribeToPaymentProgress } from '../index';

const PREFIX_WARN = '[react-native-pagseguro-plugpag] WARNING:';
const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

const mockInitializeAndActivatePinPad = jest.fn();
const mockDoAsyncInitializeAndActivatePinPad = jest.fn();
const mockDoPayment = jest.fn();
const mockDoAsyncPayment = jest.fn();

// Mock the native module
jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: mockInitializeAndActivatePinPad,
    doAsyncInitializeAndActivatePinPad: mockDoAsyncInitializeAndActivatePinPad,
    doPayment: mockDoPayment,
    doAsyncPayment: mockDoAsyncPayment,
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

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

// =============================================================================
// iOS platform guard — module import
// =============================================================================

describe('iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Cenário 1
  it('emits a warning with correct prefix when imported on iOS', () => {
    jest.isolateModules(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      require('../index');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(PREFIX_WARN)
      );
    });
  });

  // Cenário 2
  it('rejects with Error containing correct prefix when initializeAndActivatePinPad() is called on iOS', async () => {
    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { initializeAndActivatePinPad } = require('../index');

      await expect(initializeAndActivatePinPad('403938')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(PREFIX_ERROR),
        })
      );
    });
  });
});

// =============================================================================
// doAsyncInitializeAndActivatePinPad — iOS platform guard
// =============================================================================

describe('doAsyncInitializeAndActivatePinPad — iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Cenário 6
  it('rejects with Error containing correct prefix when doAsyncInitializeAndActivatePinPad() is called on iOS', async () => {
    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { doAsyncInitializeAndActivatePinPad } = require('../index');

      await expect(
        doAsyncInitializeAndActivatePinPad('403938')
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(PREFIX_ERROR),
        })
      );
    });
  });
});

// =============================================================================
// doAsyncInitializeAndActivatePinPad — Android normal operation
// =============================================================================

describe('doAsyncInitializeAndActivatePinPad — Android normal operation', () => {
  beforeEach(() => {
    mockDoAsyncInitializeAndActivatePinPad.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // Cenário 7
  it('resolves with { result: "ok" } on success', async () => {
    mockDoAsyncInitializeAndActivatePinPad.mockResolvedValue({ result: 'ok' });

    const { doAsyncInitializeAndActivatePinPad } = require('../index');
    const result = await doAsyncInitializeAndActivatePinPad('403938');

    expect(result).toEqual({ result: 'ok' });
  });

  // Cenário 8
  it('rejects with PLUGPAG_INITIALIZATION_ERROR on SDK failure', async () => {
    const sdkError = Object.assign(new Error('Terminal não encontrado'), {
      code: 'PLUGPAG_INITIALIZATION_ERROR',
      userInfo: {
        result: 6,
        errorCode: 'ABC123',
        message: 'Terminal não encontrado',
      },
    });
    mockDoAsyncInitializeAndActivatePinPad.mockRejectedValue(sdkError);

    const { doAsyncInitializeAndActivatePinPad } = require('../index');

    await expect(
      doAsyncInitializeAndActivatePinPad('403938')
    ).rejects.toMatchObject({
      code: 'PLUGPAG_INITIALIZATION_ERROR',
      userInfo: {
        result: 6,
        errorCode: 'ABC123',
        message: 'Terminal não encontrado',
      },
    });
  });

  // Cenário 9
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    const internalError = Object.assign(new Error('Unexpected failure'), {
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: {
        result: -1,
        errorCode: 'INTERNAL_ERROR',
        message: 'Unexpected failure',
      },
    });
    mockDoAsyncInitializeAndActivatePinPad.mockRejectedValue(internalError);

    const { doAsyncInitializeAndActivatePinPad } = require('../index');

    await expect(
      doAsyncInitializeAndActivatePinPad('403938')
    ).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1 },
    });
  });
});

// =============================================================================
// initializeAndActivatePinPad — Android normal operation
// =============================================================================

describe('initializeAndActivatePinPad — Android normal operation', () => {
  beforeEach(() => {
    mockInitializeAndActivatePinPad.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // Cenário 3
  it('resolves with { result: "ok" } on success', async () => {
    mockInitializeAndActivatePinPad.mockResolvedValue({ result: 'ok' });

    const { initializeAndActivatePinPad } = require('../index');
    const result = await initializeAndActivatePinPad('403938');

    expect(result).toEqual({ result: 'ok' });
  });

  // Cenário 4
  it('rejects with PLUGPAG_INITIALIZATION_ERROR on SDK failure', async () => {
    const sdkError = Object.assign(new Error('Terminal não encontrado'), {
      code: 'PLUGPAG_INITIALIZATION_ERROR',
      userInfo: {
        result: 6,
        errorCode: 'ABC123',
        message: 'Terminal não encontrado',
      },
    });
    mockInitializeAndActivatePinPad.mockRejectedValue(sdkError);

    const { initializeAndActivatePinPad } = require('../index');

    await expect(initializeAndActivatePinPad('403938')).rejects.toMatchObject({
      code: 'PLUGPAG_INITIALIZATION_ERROR',
      userInfo: {
        result: 6,
        errorCode: 'ABC123',
        message: 'Terminal não encontrado',
      },
    });
  });

  // Cenário 5
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    const internalError = Object.assign(new Error('Unexpected failure'), {
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: {
        result: -1,
        errorCode: 'INTERNAL_ERROR',
        message: 'Unexpected failure',
      },
    });
    mockInitializeAndActivatePinPad.mockRejectedValue(internalError);

    const { initializeAndActivatePinPad } = require('../index');

    await expect(initializeAndActivatePinPad('403938')).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1 },
    });
  });
});

// =============================================================================
// doPayment — iOS guard (T008a)
// =============================================================================

describe('doPayment — iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('rejects with Error containing correct prefix when called on iOS', async () => {
    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { doPayment } = require('../index');

      await expect(
        doPayment({
          type: 'CREDIT',
          amount: 1000,
          installmentType: 'A_VISTA',
          installments: 1,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(PREFIX_ERROR),
        })
      );
    });
  });
});

// =============================================================================
// doPayment — Android normal operation (T008b, T008c, T008d)
// =============================================================================

describe('doPayment — Android normal operation', () => {
  beforeEach(() => {
    mockDoPayment.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // T008b — sucesso CREDIT
  it('resolves with PlugPagTransactionResult on success (CREDIT)', async () => {
    mockDoPayment.mockResolvedValue(mockTransactionResult);

    const { doPayment } = require('../index');
    const result = await doPayment({
      type: 'CREDIT',
      amount: 1000,
      installmentType: 'A_VISTA',
      installments: 1,
    });

    expect(result).toMatchObject({ transactionCode: 'TXN123' });
  });

  // T008c — erro SDK
  it('rejects with PLUGPAG_PAYMENT_ERROR on SDK failure', async () => {
    const sdkError = Object.assign(new Error('Pagamento recusado'), {
      code: 'PLUGPAG_PAYMENT_ERROR',
      userInfo: {
        result: 2,
        errorCode: 'PAY001',
        message: 'Pagamento recusado',
      },
    });
    mockDoPayment.mockRejectedValue(sdkError);

    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      })
    ).rejects.toMatchObject({
      code: 'PLUGPAG_PAYMENT_ERROR',
      userInfo: {
        result: 2,
        errorCode: 'PAY001',
        message: 'Pagamento recusado',
      },
    });
  });

  // T008d — erro interno
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    const internalError = Object.assign(new Error('Crash'), {
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message: 'Crash' },
    });
    mockDoPayment.mockRejectedValue(internalError);

    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      })
    ).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1 },
    });
  });
});

// =============================================================================
// doPayment — validações JS (T014)
// =============================================================================

describe('doPayment — JS validation', () => {
  beforeEach(() => {
    mockDoPayment.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // T014a — amount <= 0
  it('rejects before calling native when amount is 0', async () => {
    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'CREDIT',
        amount: 0,
        installmentType: 'A_VISTA',
        installments: 1,
      })
    ).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('amount') })
    );

    expect(mockDoPayment).not.toHaveBeenCalled();
  });

  // T014b — PARC_VENDEDOR + installments: 1
  it('rejects before calling native when PARC_VENDEDOR with installments < 2', async () => {
    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'PARC_VENDEDOR',
        installments: 1,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('installments'),
      })
    );

    expect(mockDoPayment).not.toHaveBeenCalled();
  });

  // T014c — PIX + PARC_VENDEDOR
  it('rejects before calling native when PIX with PARC_VENDEDOR', async () => {
    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'PIX',
        amount: 1000,
        installmentType: 'PARC_VENDEDOR',
        installments: 2,
      })
    ).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('PIX') })
    );

    expect(mockDoPayment).not.toHaveBeenCalled();
  });

  // T014d — DEBIT + PARC_COMPRADOR
  it('rejects before calling native when DEBIT with PARC_COMPRADOR', async () => {
    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'DEBIT',
        amount: 1000,
        installmentType: 'PARC_COMPRADOR',
        installments: 2,
      })
    ).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('DEBIT') })
    );

    expect(mockDoPayment).not.toHaveBeenCalled();
  });

  // T014e — userReference > 10 chars
  it('rejects before calling native when userReference exceeds 10 characters', async () => {
    const { doPayment } = require('../index');

    await expect(
      doPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
        userReference: 'TOOLONGREF01', // 12 chars
      })
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('userReference'),
      })
    );

    expect(mockDoPayment).not.toHaveBeenCalled();
  });
});

// =============================================================================
// doPayment — PIX flow (T019)
// =============================================================================

describe('doPayment — PIX flow', () => {
  beforeEach(() => {
    mockDoPayment.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  it('resolves with PlugPagTransactionResult for PIX payment (not blocked by JS validation)', async () => {
    mockDoPayment.mockResolvedValue(mockTransactionResult);

    const { doPayment } = require('../index');
    const result = await doPayment({
      type: 'PIX',
      amount: 5000,
      installmentType: 'A_VISTA',
      installments: 1,
    });

    expect(result).toMatchObject({ transactionCode: 'TXN123' });
    expect(mockDoPayment).toHaveBeenCalled();
  });
});

// =============================================================================
// doAsyncPayment — iOS guard (T029a)
// =============================================================================

describe('doAsyncPayment — iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('rejects with Error containing correct prefix when called on iOS', async () => {
    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { doAsyncPayment } = require('../index');

      await expect(
        doAsyncPayment({
          type: 'CREDIT',
          amount: 1000,
          installmentType: 'A_VISTA',
          installments: 1,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(PREFIX_ERROR),
        })
      );
    });
  });
});

// =============================================================================
// doAsyncPayment — Android normal operation (T029b, T029c, T029d)
// =============================================================================

describe('doAsyncPayment — Android normal operation', () => {
  beforeEach(() => {
    mockDoAsyncPayment.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // T029b — sucesso
  it('resolves with PlugPagTransactionResult on success', async () => {
    mockDoAsyncPayment.mockResolvedValue(mockTransactionResult);

    const { doAsyncPayment } = require('../index');
    const result = await doAsyncPayment({
      type: 'CREDIT',
      amount: 1000,
      installmentType: 'A_VISTA',
      installments: 1,
    });

    expect(result).toMatchObject({ transactionCode: 'TXN123' });
  });

  // T029c — erro SDK
  it('rejects with PLUGPAG_PAYMENT_ERROR on SDK failure', async () => {
    const sdkError = Object.assign(new Error('Pagamento recusado'), {
      code: 'PLUGPAG_PAYMENT_ERROR',
      userInfo: {
        result: 2,
        errorCode: 'PAY001',
        message: 'Pagamento recusado',
      },
    });
    mockDoAsyncPayment.mockRejectedValue(sdkError);

    const { doAsyncPayment } = require('../index');

    await expect(
      doAsyncPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      })
    ).rejects.toMatchObject({ code: 'PLUGPAG_PAYMENT_ERROR' });
  });

  // T029d — erro interno
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    const internalError = Object.assign(new Error('Crash'), {
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message: 'Crash' },
    });
    mockDoAsyncPayment.mockRejectedValue(internalError);

    const { doAsyncPayment } = require('../index');

    await expect(
      doAsyncPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      })
    ).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
      userInfo: { result: -1 },
    });
  });
});

// =============================================================================
// usePaymentProgress (T022)
// =============================================================================

describe('usePaymentProgress', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // T022a — callback invocado quando evento emitido
  it('calls callback with event data when onPaymentProgress is emitted', async () => {
    const callback = jest.fn();

    renderHook(() => usePaymentProgress(callback));

    await act(async () => {
      DeviceEventEmitter.emit('onPaymentProgress', {
        eventCode: 1,
        customMessage: 'Insert card',
      });
    });

    expect(callback).toHaveBeenCalledWith({
      eventCode: 1,
      customMessage: 'Insert card',
    });
  });

  // T022b — listener removido no unmount (sem memory leak)
  it('does not call callback after unmount (no memory leak)', async () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => usePaymentProgress(callback));
    unmount();

    await act(async () => {
      DeviceEventEmitter.emit('onPaymentProgress', {
        eventCode: 2,
        customMessage: null,
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

// =============================================================================
// subscribeToPaymentProgress (T023)
// =============================================================================

describe('subscribeToPaymentProgress', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  // T023a — callback chamado quando evento emitido
  it('calls callback when onPaymentProgress event is emitted', async () => {
    const callback = jest.fn();

    subscribeToPaymentProgress(callback);

    await act(async () => {
      DeviceEventEmitter.emit('onPaymentProgress', {
        eventCode: 3,
        customMessage: 'PIN OK',
      });
    });

    expect(callback).toHaveBeenCalledWith({
      eventCode: 3,
      customMessage: 'PIN OK',
    });
  });

  // T023b — listener removido após unsubscribe()
  it('does not call callback after unsubscribe() is called', async () => {
    const callback = jest.fn();

    const unsubscribe = subscribeToPaymentProgress(callback);
    unsubscribe();

    await act(async () => {
      DeviceEventEmitter.emit('onPaymentProgress', {
        eventCode: 4,
        customMessage: null,
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
