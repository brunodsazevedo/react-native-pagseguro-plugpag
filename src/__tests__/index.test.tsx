import { Platform } from 'react-native';

const PREFIX_WARN = '[react-native-pagseguro-plugpag] WARNING:';
const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

const mockInitializeAndActivatePinPad = jest.fn();
const mockDoAsyncInitializeAndActivatePinPad = jest.fn();

// Mock the native module
jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: mockInitializeAndActivatePinPad,
    doAsyncInitializeAndActivatePinPad: mockDoAsyncInitializeAndActivatePinPad,
  },
}));

describe('iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.resetModules();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Cenário 1
  it('emits a warning with correct prefix when imported on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    require('../index');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(PREFIX_WARN));
  });

  // Cenário 2
  it('rejects with Error containing correct prefix when initializeAndActivatePinPad() is called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const { initializeAndActivatePinPad } = require('../index');

    await expect(initializeAndActivatePinPad('403938')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
  });
});

describe('doAsyncInitializeAndActivatePinPad — iOS platform guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.resetModules();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Cenário 6
  it('rejects with Error containing correct prefix when doAsyncInitializeAndActivatePinPad() is called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const { doAsyncInitializeAndActivatePinPad } = require('../index');

    await expect(doAsyncInitializeAndActivatePinPad('403938')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
  });
});

describe('doAsyncInitializeAndActivatePinPad — Android normal operation', () => {
  beforeEach(() => {
    jest.resetModules();
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

describe('initializeAndActivatePinPad — Android normal operation', () => {
  beforeEach(() => {
    jest.resetModules();
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
