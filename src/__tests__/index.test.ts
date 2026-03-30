import { Platform } from 'react-native';

jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: jest.fn(),
    doAsyncInitializeAndActivatePinPad: jest.fn(),
    doPayment: jest.fn(),
    doAsyncPayment: jest.fn(),
    doRefund: jest.fn(),
    printFromFile: jest.fn(),
    reprintCustomerReceipt: jest.fn(),
    doAsyncReprintCustomerReceipt: jest.fn(),
    reprintEstablishmentReceipt: jest.fn(),
    doAsyncReprintEstablishmentReceipt: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

const PREFIX_WARN = '[react-native-pagseguro-plugpag] WARNING:';

describe('iOS platform guard — module import (Level 1)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits console.warn with correct prefix when imported on iOS', () => {
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

  it('does not throw when imported on iOS', () => {
    jest.isolateModules(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      expect(() => require('../index')).not.toThrow();
    });
  });
});
