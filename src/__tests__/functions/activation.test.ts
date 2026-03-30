import { Platform } from 'react-native';

const mockInitializeAndActivatePinPad = jest.fn();
const mockDoAsyncInitializeAndActivatePinPad = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: mockInitializeAndActivatePinPad,
    doAsyncInitializeAndActivatePinPad: mockDoAsyncInitializeAndActivatePinPad,
  },
}));

const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

describe('initializeAndActivatePinPad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cenário 1 — iOS rejeita com prefixo correto
  it('rejects with Error containing correct prefix when called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { initializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    await expect(initializeAndActivatePinPad('CODE')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(initializeAndActivatePinPad('CODE')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('initializeAndActivatePinPad()'),
      })
    );
  });

  // Cenário 2 — Android resolve com { result: 'ok' }
  it('resolves with { result: ok } on Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockInitializeAndActivatePinPad.mockResolvedValueOnce({ result: 'ok' });
    jest.resetModules();
    const { initializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    const result = await initializeAndActivatePinPad('CODE');
    expect(result).toEqual({ result: 'ok' });
    expect(mockInitializeAndActivatePinPad).toHaveBeenCalledWith('CODE');
  });

  // Cenário 3 — Android rejeita com PLUGPAG_ACTIVATION_ERROR
  it('rejects with PLUGPAG_ACTIVATION_ERROR on SDK error', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockInitializeAndActivatePinPad.mockRejectedValueOnce(
      Object.assign(new Error('activation failed'), {
        code: 'PLUGPAG_ACTIVATION_ERROR',
      })
    );
    jest.resetModules();
    const { initializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    await expect(initializeAndActivatePinPad('CODE')).rejects.toMatchObject({
      code: 'PLUGPAG_ACTIVATION_ERROR',
    });
  });
});

describe('doAsyncInitializeAndActivatePinPad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cenário 1 — iOS rejeita com prefixo correto
  it('rejects with Error containing correct prefix when called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { doAsyncInitializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    await expect(doAsyncInitializeAndActivatePinPad('CODE')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(doAsyncInitializeAndActivatePinPad('CODE')).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'doAsyncInitializeAndActivatePinPad()'
        ),
      })
    );
  });

  // Cenário 2 — Android resolve com { result: 'ok' }
  it('resolves with { result: ok } on Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockDoAsyncInitializeAndActivatePinPad.mockResolvedValueOnce({
      result: 'ok',
    });
    jest.resetModules();
    const { doAsyncInitializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    const result = await doAsyncInitializeAndActivatePinPad('CODE');
    expect(result).toEqual({ result: 'ok' });
    expect(mockDoAsyncInitializeAndActivatePinPad).toHaveBeenCalledWith('CODE');
  });

  // Cenário 3 — Android rejeita com PLUGPAG_ACTIVATION_ERROR
  it('rejects with PLUGPAG_ACTIVATION_ERROR on SDK error', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockDoAsyncInitializeAndActivatePinPad.mockRejectedValueOnce(
      Object.assign(new Error('activation failed'), {
        code: 'PLUGPAG_ACTIVATION_ERROR',
      })
    );
    jest.resetModules();
    const { doAsyncInitializeAndActivatePinPad } = await import(
      '../../functions/activation'
    );
    await expect(
      doAsyncInitializeAndActivatePinPad('CODE')
    ).rejects.toMatchObject({
      code: 'PLUGPAG_ACTIVATION_ERROR',
    });
  });
});
