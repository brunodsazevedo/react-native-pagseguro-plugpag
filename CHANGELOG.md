# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Abort in-progress terminal operations:** Added the `abort` domain with `abort()` and
  `doAsyncAbort()` to request cancellation of any operation currently running on the
  PagBank terminal. The synchronous variant runs the blocking SDK call on
  `Dispatchers.IO`, while the asynchronous variant uses the native SDK listener.
- **Abort result typing and detection:** Added `PlugPagAbortSuccess` and exported
  `OPERATION_ABORTED` (`-1028`) so integrations can distinguish a payment rejected
  because the terminal operation was cancelled from other `PLUGPAG_PAYMENT_ERROR`
  failures.
- **Native and JS coverage:** Added TurboModule spec entries, Android implementations,
  iOS platform guards, JS unit tests, Kotlin tests for success/error paths, and README
  documentation in English and Portuguese.
- **Community feature request:** Implemented from GitHub issue #11, suggested by
  @marcelozepn. Reference:
  https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/11#issuecomment-4353226544

## [1.0.1] - 2026-04-28

### Fixed

- **Fail-fast validation for payment and refund types:** `doPayment`/`doAsyncPayment` and refund paths now fail-fast when receiving invalid `type` or `installmentType` values instead of defaulting to credit. Integrations now receive descriptive errors (e.g. `INVALID_PAYMENT_TYPE`) to avoid silent fallbacks and improve safety. See issue: https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/10
- **Tests & validation:** Updated unit tests to cover invalid type cases and adjusted validation logic. Affected files: `src/functions/payment/index.ts`, `src/functions/refund/index.ts`, `src/__tests__/functions/payment.test.ts`, `src/__tests__/functions/refund.test.ts`.


## [1.0.0-rc.1] - 2026-04-07

### Added

- **SDK Setup & Expo Config Plugin** — integration with `PlugPagServiceWrapper 1.33.0` via
  PagSeguro Maven; Expo plugin for automatic Android dependency injection.
- **PinPad Activation** — `initializeAndActivatePinPad` (synchronous via `Dispatchers.IO`)
  and `doAsyncInitializeAndActivatePinPad` (asynchronous via native SDK listener).
- **Payment Methods** — `doPayment` and `doAsyncPayment` for Credit, Debit, and PIX payments;
  installment support (in full, seller installment, buyer installment);
  `onPaymentProgress` event via NativeEventEmitter.
- **Refund** — `doRefund` for payment reversal (`VOID_PAYMENT`) and QR Code (`VOID_QRCODE`).
- **Custom Printing** — `printFromFile` for receipt printing from file;
  `printerQuality` validation (LOW/MEDIUM/HIGH/MAX) and `steps` (minimum 70).
- **TypeScript Domain Split** — source code reorganized into domains
  (`activation`, `payment`, `refund`, `print`); full typings exported via
  `src/index.ts`; zero `any`; `strict: true` + `verbatimModuleSyntax`.
- **Full documentation** — README, API Reference, Contributing Guide, CI and coverage badges.
- **Automated CI/CD** — GitHub Actions with lint, typecheck, test, build
  (JS library + Android) and automatic npm publish with provenance on merge to `main`.
