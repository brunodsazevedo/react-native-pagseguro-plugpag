import { Platform } from 'react-native';

const mockInitializeAndActivatePinPad = jest.fn();
const mockDoAsyncInitializeAndActivatePinPad = jest.fn();
const mockIsAuthenticated = jest.fn();
const mockAsyncIsAuthenticated = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: mockInitializeAndActivatePinPad,
    doAsyncInitializeAndActivatePinPad: mockDoAsyncInitializeAndActivatePinPad,
    isAuthenticated: mockIsAuthenticated,
    asyncIsAuthenticated: mockAsyncIsAuthenticated,
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

describe('isAuthenticated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cenário 1 — iOS rejeita com prefixo correto (sem acessar nativo)
  it('rejects with Error containing correct prefix when called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { isAuthenticated } = await import('../../functions/activation');
    await expect(isAuthenticated()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(isAuthenticated()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('isAuthenticated()'),
      })
    );
  });

  // Cenário 2 — Android resolve true (terminal ativado)
  it('resolves true when terminal is authenticated', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockIsAuthenticated.mockResolvedValueOnce(true);
    jest.resetModules();
    const { isAuthenticated } = await import('../../functions/activation');
    const result = await isAuthenticated();
    expect(result).toBe(true);
    expect(mockIsAuthenticated).toHaveBeenCalled();
  });

  // Cenário 3 — Android resolve false (não rejeita — false é resultado válido)
  it('resolves false when terminal is NOT authenticated (false is NOT an error)', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockIsAuthenticated.mockResolvedValueOnce(false);
    jest.resetModules();
    const { isAuthenticated } = await import('../../functions/activation');
    const result = await isAuthenticated();
    expect(result).toBe(false);
    expect(mockIsAuthenticated).toHaveBeenCalled();
  });

  // Cenário 4 — Android exceção interna → PLUGPAG_INTERNAL_ERROR
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockIsAuthenticated.mockRejectedValueOnce(
      Object.assign(new Error('IPC failure'), {
        code: 'PLUGPAG_INTERNAL_ERROR',
      })
    );
    jest.resetModules();
    const { isAuthenticated } = await import('../../functions/activation');
    await expect(isAuthenticated()).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
    });
  });
});

describe('asyncIsAuthenticated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cenário 1 — iOS rejeita com prefixo correto
  it('rejects with Error containing correct prefix when called on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { asyncIsAuthenticated } = await import('../../functions/activation');
    await expect(asyncIsAuthenticated()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(asyncIsAuthenticated()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('asyncIsAuthenticated()'),
      })
    );
  });

  // Cenário 2 — Android resolve true
  it('resolves true when terminal is authenticated', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockAsyncIsAuthenticated.mockResolvedValueOnce(true);
    jest.resetModules();
    const { asyncIsAuthenticated } = await import('../../functions/activation');
    const result = await asyncIsAuthenticated();
    expect(result).toBe(true);
    expect(mockAsyncIsAuthenticated).toHaveBeenCalled();
  });

  // Cenário 3 — Android resolve false (não rejeita — false é resultado válido)
  it('resolves false when terminal is NOT authenticated (false is NOT an error)', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockAsyncIsAuthenticated.mockResolvedValueOnce(false);
    jest.resetModules();
    const { asyncIsAuthenticated } = await import('../../functions/activation');
    const result = await asyncIsAuthenticated();
    expect(result).toBe(false);
    expect(mockAsyncIsAuthenticated).toHaveBeenCalled();
  });

  // Cenário 4 — onError → PLUGPAG_AUTHENTICATION_ERROR
  it('rejects with PLUGPAG_AUTHENTICATION_ERROR on SDK onError', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockAsyncIsAuthenticated.mockRejectedValueOnce(
      Object.assign(new Error('Authentication error'), {
        code: 'PLUGPAG_AUTHENTICATION_ERROR',
      })
    );
    jest.resetModules();
    const { asyncIsAuthenticated } = await import('../../functions/activation');
    await expect(asyncIsAuthenticated()).rejects.toMatchObject({
      code: 'PLUGPAG_AUTHENTICATION_ERROR',
    });
  });

  // Cenário 5 — exceção interna → PLUGPAG_INTERNAL_ERROR
  it('rejects with PLUGPAG_INTERNAL_ERROR on internal exception', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    mockAsyncIsAuthenticated.mockRejectedValueOnce(
      Object.assign(new Error('IPC failure'), {
        code: 'PLUGPAG_INTERNAL_ERROR',
      })
    );
    jest.resetModules();
    const { asyncIsAuthenticated } = await import('../../functions/activation');
    await expect(asyncIsAuthenticated()).rejects.toMatchObject({
      code: 'PLUGPAG_INTERNAL_ERROR',
    });
  });
});
