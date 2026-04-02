import { Platform } from 'react-native';

import {
  doAsyncReprintCustomerReceipt,
  doAsyncReprintEstablishmentReceipt,
  printFromFile,
  reprintCustomerReceipt,
  reprintEstablishmentReceipt,
} from '../../functions/print';

const mockPrintFromFile = jest.fn();
const mockReprintCustomerReceipt = jest.fn();
const mockDoAsyncReprintCustomerReceipt = jest.fn();
const mockReprintEstablishmentReceipt = jest.fn();
const mockDoAsyncReprintEstablishmentReceipt = jest.fn();

jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    printFromFile: mockPrintFromFile,
    reprintCustomerReceipt: mockReprintCustomerReceipt,
    doAsyncReprintCustomerReceipt: mockDoAsyncReprintCustomerReceipt,
    reprintEstablishmentReceipt: mockReprintEstablishmentReceipt,
    doAsyncReprintEstablishmentReceipt: mockDoAsyncReprintEstablishmentReceipt,
  },
}));

const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

const mockPrintResult = { result: 'ok' as const, steps: 100 };
const validPrintRequest = { filePath: '/path/to/file.png' };

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

  it('printFromFile() rejects with correct prefix on iOS', async () => {
    await expect(printFromFile(validPrintRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(printFromFile(validPrintRequest)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('printFromFile()'),
      })
    );
  });

  it('reprintCustomerReceipt() rejects with correct prefix on iOS', async () => {
    await expect(reprintCustomerReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(reprintCustomerReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('reprintCustomerReceipt()'),
      })
    );
  });

  it('doAsyncReprintCustomerReceipt() rejects with correct prefix on iOS', async () => {
    await expect(doAsyncReprintCustomerReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
  });

  it('reprintEstablishmentReceipt() rejects with correct prefix on iOS', async () => {
    await expect(reprintEstablishmentReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
    await expect(reprintEstablishmentReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('reprintEstablishmentReceipt()'),
      })
    );
  });

  it('doAsyncReprintEstablishmentReceipt() rejects with correct prefix on iOS', async () => {
    await expect(doAsyncReprintEstablishmentReceipt()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
  });
});

// =============================================================================
// validatePrintRequest
// =============================================================================

describe('validatePrintRequest', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('rejects when filePath is empty', async () => {
    await expect(printFromFile({ filePath: '' })).rejects.toThrow('filePath');
  });

  it('rejects when filePath is whitespace only', async () => {
    await expect(printFromFile({ filePath: '   ' })).rejects.toThrow(
      'filePath'
    );
  });

  it('rejects when steps < 0', async () => {
    await expect(
      printFromFile({ filePath: '/path/to/file.png', steps: -1 })
    ).rejects.toThrow('steps');
  });

  it('rejects when printerQuality is 99', async () => {
    // EXCEPTION: type assertion required to simulate JS/untyped callers passing invalid runtime values
    await expect(
      printFromFile({
        filePath: '/path/to/file.png',
        printerQuality: 99 as unknown as 1,
      })
    ).rejects.toThrow('PLUGPAG_VALIDATION_ERROR');
  });

  it('rejects when printerQuality is 0', async () => {
    // EXCEPTION: type assertion required to simulate JS/untyped callers passing invalid runtime values
    await expect(
      printFromFile({
        filePath: '/path/to/file.png',
        printerQuality: 0 as unknown as 1,
      })
    ).rejects.toThrow('PLUGPAG_VALIDATION_ERROR');
  });

  it('rejects when printerQuality is -1', async () => {
    // EXCEPTION: type assertion required to simulate JS/untyped callers passing invalid runtime values
    await expect(
      printFromFile({
        filePath: '/path/to/file.png',
        printerQuality: -1 as unknown as 1,
      })
    ).rejects.toThrow('PLUGPAG_VALIDATION_ERROR');
  });
});

// =============================================================================
// doAsyncReprintCustomerReceipt — Android normal operation
// =============================================================================

describe('doAsyncReprintCustomerReceipt — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PrintResult on success', async () => {
    mockDoAsyncReprintCustomerReceipt.mockResolvedValueOnce(mockPrintResult);
    const result = await doAsyncReprintCustomerReceipt();
    expect(result).toEqual(mockPrintResult);
  });

  it('rejects with PLUGPAG_PRINT_ERROR on SDK error', async () => {
    mockDoAsyncReprintCustomerReceipt.mockRejectedValueOnce(
      Object.assign(new Error('reprint failed'), {
        code: 'PLUGPAG_PRINT_ERROR',
      })
    );
    await expect(doAsyncReprintCustomerReceipt()).rejects.toMatchObject({
      code: 'PLUGPAG_PRINT_ERROR',
    });
  });
});

// =============================================================================
// doAsyncReprintEstablishmentReceipt — Android normal operation
// =============================================================================

describe('doAsyncReprintEstablishmentReceipt — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PrintResult on success', async () => {
    mockDoAsyncReprintEstablishmentReceipt.mockResolvedValueOnce(
      mockPrintResult
    );
    const result = await doAsyncReprintEstablishmentReceipt();
    expect(result).toEqual(mockPrintResult);
  });

  it('rejects with PLUGPAG_PRINT_ERROR on SDK error', async () => {
    mockDoAsyncReprintEstablishmentReceipt.mockRejectedValueOnce(
      Object.assign(new Error('reprint failed'), {
        code: 'PLUGPAG_PRINT_ERROR',
      })
    );
    await expect(doAsyncReprintEstablishmentReceipt()).rejects.toMatchObject({
      code: 'PLUGPAG_PRINT_ERROR',
    });
  });
});

// =============================================================================
// printFromFile — Android normal operation
// =============================================================================

describe('printFromFile — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PrintResult on success', async () => {
    mockPrintFromFile.mockResolvedValueOnce(mockPrintResult);
    const result = await printFromFile(validPrintRequest);
    expect(result).toEqual(mockPrintResult);
    expect(mockPrintFromFile).toHaveBeenCalledWith(validPrintRequest);
  });

  it('rejects with PLUGPAG_PRINT_ERROR on SDK error', async () => {
    mockPrintFromFile.mockRejectedValueOnce(
      Object.assign(new Error('print failed'), { code: 'PLUGPAG_PRINT_ERROR' })
    );
    await expect(printFromFile(validPrintRequest)).rejects.toMatchObject({
      code: 'PLUGPAG_PRINT_ERROR',
    });
  });
});

// =============================================================================
// reprintCustomerReceipt — Android normal operation
// =============================================================================

describe('reprintCustomerReceipt — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PrintResult on success', async () => {
    mockReprintCustomerReceipt.mockResolvedValueOnce(mockPrintResult);
    const result = await reprintCustomerReceipt();
    expect(result).toEqual(mockPrintResult);
  });

  it('rejects with PLUGPAG_PRINT_ERROR on SDK failure', async () => {
    mockReprintCustomerReceipt.mockRejectedValueOnce(
      Object.assign(new Error('reprint failed'), {
        code: 'PLUGPAG_PRINT_ERROR',
      })
    );
    await expect(reprintCustomerReceipt()).rejects.toMatchObject({
      code: 'PLUGPAG_PRINT_ERROR',
    });
  });
});

// =============================================================================
// reprintEstablishmentReceipt — Android normal operation
// =============================================================================

describe('reprintEstablishmentReceipt — Android normal operation', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('resolves with PrintResult on success', async () => {
    mockReprintEstablishmentReceipt.mockResolvedValueOnce(mockPrintResult);
    const result = await reprintEstablishmentReceipt();
    expect(result).toEqual(mockPrintResult);
  });

  it('rejects with PLUGPAG_PRINT_ERROR on SDK failure', async () => {
    mockReprintEstablishmentReceipt.mockRejectedValueOnce(
      Object.assign(new Error('reprint failed'), {
        code: 'PLUGPAG_PRINT_ERROR',
      })
    );
    await expect(reprintEstablishmentReceipt()).rejects.toMatchObject({
      code: 'PLUGPAG_PRINT_ERROR',
    });
  });
});
