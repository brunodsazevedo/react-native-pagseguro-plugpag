# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-28

### Fixed

- **Fail-fast validation for payment and refund types:** `doPayment`/`doAsyncPayment` and refund paths now fail-fast when receiving invalid `type` or `installmentType` values instead of defaulting to credit. Integrations now receive descriptive errors (e.g. `INVALID_PAYMENT_TYPE`) to avoid silent fallbacks and improve safety. See issue: https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/10
- **Tests & validation:** Updated unit tests to cover invalid type cases and adjusted validation logic. Affected files: `src/functions/payment/index.ts`, `src/functions/refund/index.ts`, `src/__tests__/functions/payment.test.ts`, `src/__tests__/functions/refund.test.ts`.


## [1.0.0-rc.1] - 2026-04-07

### Added

- **SDK Setup & Expo Config Plugin** — integração com `PlugPagServiceWrapper 1.33.0` via
  Maven do PagSeguro; plugin Expo para injeção automática das dependências Android.
- **PinPad Activation** — `initializeAndActivatePinPad` (síncrono via `Dispatchers.IO`)
  e `doAsyncInitializeAndActivatePinPad` (assíncrono via listener nativo do SDK).
- **Payment Methods** — `doPayment` e `doAsyncPayment` para pagamentos Crédito, Débito e
  PIX; suporte a parcelamento (à vista, parcelado vendedor, parcelado comprador);
  evento `onPaymentProgress` via NativeEventEmitter.
- **Refund** — `doRefund` para estorno de pagamentos (`VOID_PAYMENT`) e QR Code
  (`VOID_QRCODE`).
- **Custom Printing** — `printFromFile` para impressão de recibos a partir de arquivo;
  validação de `printerQuality` (LOW/MEDIUM/HIGH/MAX) e `steps` (mínimo 70).
- **TypeScript Domain Split** — código fonte reorganizado em domínios
  (`activation`, `payment`, `refund`, `print`); tipagens completas exportadas via
  `src/index.ts`; zero `any`; `strict: true` + `verbatimModuleSyntax`.
- **Documentação completa** — README, API Reference, Contributing Guide, badges de CI e
  cobertura.
- **CI/CD automatizado** — GitHub Actions com jobs de lint, typecheck, test, build
  (biblioteca JS + Android) e publicação automática no npm com provenance ao merge para
  `main`.
