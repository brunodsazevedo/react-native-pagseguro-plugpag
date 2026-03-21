import { Platform } from 'react-native';

const PREFIX_WARN = '[react-native-pagseguro-plugpag] WARNING:';
const PREFIX_ERROR = '[react-native-pagseguro-plugpag] ERROR:';

// Mock the native module
jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    multiply: jest.fn((a: number, b: number) => a * b),
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

  it('emits a warning with correct prefix when imported on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    require('../index');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(PREFIX_WARN));
  });

  it('throws an Error with correct prefix when multiply() is called on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const { multiply } = require('../index');

    expect(() => multiply(2, 3)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(PREFIX_ERROR),
      })
    );
  });
});

describe('Android normal operation', () => {
  beforeEach(() => {
    jest.resetModules();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
  });

  it('returns the correct result when multiply() is called on Android', () => {
    const { multiply } = require('../index');

    expect(multiply(3, 4)).toBe(12);
  });
});
