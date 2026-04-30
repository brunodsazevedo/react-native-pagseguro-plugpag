import { Platform } from 'react-native';

const mockAbort = jest.fn();
const mockDoAsyncAbort = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    abort: mockAbort,
    doAsyncAbort: mockDoAsyncAbort,
  },
}));

describe('abort domain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      get: () => 'android',
      configurable: true,
    });
  });

  // --- JS-A01: abort() on iOS ---
  it('JS-A01: abort() rejects on iOS with ERROR prefix and function name', async () => {
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
    const { abort } = await import('../../functions/abort/index');
    await expect(abort()).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR:'
    );
    await expect(abort()).rejects.toThrow('abort()');
  });

  // --- JS-A02: doAsyncAbort() on iOS ---
  it('JS-A02: doAsyncAbort() rejects on iOS with ERROR prefix and function name', async () => {
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
    const { doAsyncAbort } = await import('../../functions/abort/index');
    await expect(doAsyncAbort()).rejects.toThrow(
      '[react-native-pagseguro-plugpag] ERROR:'
    );
    await expect(doAsyncAbort()).rejects.toThrow('doAsyncAbort()');
  });

  // --- JS-A03: abort() Android success ---
  it('JS-A03: abort() resolves with { result: ok } on Android when SDK succeeds', async () => {
    mockAbort.mockResolvedValueOnce({ result: 'ok' });
    const { abort } = await import('../../functions/abort/index');
    const result = await abort();
    expect(result).toEqual({ result: 'ok' });
  });

  // --- JS-A04: abort() Android PLUGPAG_ABORT_ERROR ---
  it('JS-A04: abort() rejects with PLUGPAG_ABORT_ERROR when SDK rejects', async () => {
    mockAbort.mockRejectedValueOnce(new Error('PLUGPAG_ABORT_ERROR'));
    const { abort } = await import('../../functions/abort/index');
    await expect(abort()).rejects.toThrow('PLUGPAG_ABORT_ERROR');
  });

  // --- JS-A05: doAsyncAbort() Android success ---
  it('JS-A05: doAsyncAbort() resolves with { result: ok } on Android when SDK succeeds', async () => {
    mockDoAsyncAbort.mockResolvedValueOnce({ result: 'ok' });
    const { doAsyncAbort } = await import('../../functions/abort/index');
    const result = await doAsyncAbort();
    expect(result).toEqual({ result: 'ok' });
  });

  // --- JS-A06: doAsyncAbort() Android PLUGPAG_ABORT_ERROR ---
  it('JS-A06: doAsyncAbort() rejects with PLUGPAG_ABORT_ERROR when SDK rejects', async () => {
    mockDoAsyncAbort.mockRejectedValueOnce(new Error('PLUGPAG_ABORT_ERROR'));
    const { doAsyncAbort } = await import('../../functions/abort/index');
    await expect(doAsyncAbort()).rejects.toThrow('PLUGPAG_ABORT_ERROR');
  });

  // --- JS-A07: OPERATION_ABORTED constant ---
  it('JS-A07: OPERATION_ABORTED is exported from the library and equals -1028', async () => {
    const { OPERATION_ABORTED } = await import('../../functions/abort/types');
    expect(OPERATION_ABORTED).toBe(-1028);
  });
});
