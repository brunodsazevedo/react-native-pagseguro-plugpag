# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`calculateInstallments` — consulta opções de parcelamento antes da venda:** Nova função
  pública `calculateInstallments(data: CalculateInstallmentsRequest): Promise<CalculateInstallmentsResult>`
  no domínio `payment`. Recebe `{ amount: number, installmentType: PlugPagInstallmentType }`
  e resolve com `{ options: PlugPagInstallment[] }` (cada opção com `quantity`, `amount` e
  `total` em centavos). A lista pode ser vazia (resultado válido). Validação fail-fast no JS
  (`amount` deve ser inteiro > 0; `installmentType` no enum existente). Guard de iOS de Nível 2
  presente. Usa `Dispatchers.IO` internamente (SDK síncrono bloqueante por IPC). Novos tipos
  exportados: `CalculateInstallmentsRequest`, `PlugPagInstallment`, `CalculateInstallmentsResult`.

## [1.2.1] - 2026-06-22

### Added

- **`maxTimeShowPopup` support for payment and refund popups:** Added optional field
  `maxTimeShowPopup?: number` (integer ≥ 0, in **seconds**) to `PlugPagPaymentRequest` and
  `PlugPagRefundRequest`. When provided, the value is applied to the terminal's print popup
  layout via `PlugPagCustomPrinterLayout` immediately before `doPayment`, `doAsyncPayment`, or
  `doRefund`, causing the popup to close automatically after N seconds instead of blocking the
  Promise waiting for operator confirmation. `0` closes the popup immediately. Omitting the
  field preserves current behavior (no layout applied). JS-side validation rejects negative
  values or non-integers before any native call.
- **Community feature request:** Implemented from GitHub issue #12, suggested by @marcelozepn.
  Reference: https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/12

## [1.2.0] - 2026-06-19

### Changed

- **PlugPagServiceWrapper upgraded to 1.35.0** — drop-in compatible update (343 classes,
  zero API breaking changes in consumed symbols). Updated Gradle dependency coordinate in
  `android/build.gradle`, Expo config plugin injection in `plugin/index.ts`, and all
  documentation references. Build resolved via the existing PagSeguro Maven repository at
  `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master`.
- **Expo Config Plugin compatible with Expo SDK 56** — `@expo/config-plugins` dev dependency
  bumped from `^9.0.0` to `~56.0.9`. The plugin's internal import migrated from the private
  path (`/build/utils/generateCode`) to the public `CodeGenerator` namespace, removing
  reliance on an undocumented API that was removed in SDK 56.
- **Example app updated to Expo SDK 56 / React Native 0.85.3** — `example/` migrated from
  Expo SDK 55 + React Native 0.83.2 to Expo SDK 56 + React Native 0.85.3. The
  `babel.config.js` was simplified to `babel-preset-expo` only, removing the
  `react-native-builder-bob` `overrides` that caused build failures with the stricter
  `@babel/core` bundled in `@expo/metro-config` SDK 56. This change affects only the
  development example app and has no impact on the library's public API.

## [1.1.0] - 2026-04-30

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
