<div align="center">
  <img src=".github/images/react-native-pagseguro-plugpag-logo.png" alt="react-native-pagseguro-plugpag" width="200" />
</div>

<div align="center">

  # react-native-pagseguro-plugpag

</div>

> React Native TurboModule for PagSeguro PlugPag SDK — accept payments on PagBank SmartPOS terminals

<div align="center">

[![npm version](https://img.shields.io/npm/v/react-native-pagseguro-plugpag.svg)](https://www.npmjs.com/package/react-native-pagseguro-plugpag)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![React Native 0.76+](https://img.shields.io/badge/React%20Native-0.76%2B-blue.svg)](https://reactnative.dev)

</div>

---

## What is this?

PagBank SmartPOS terminals (A920, A930, P2, S920) run Android and expose a proprietary payment SDK — but they have no official React Native bridge. Developers building apps on these terminals must either write their own native integration or find a maintained solution.

`react-native-pagseguro-plugpag` is a React Native library that bridges the gap. It wraps PagSeguro's official `PlugPagServiceWrapper` SDK in a TurboModule, exposing a fully typed TypeScript API for activating the terminal, accepting payments, processing refunds, and printing receipts — all from JavaScript.

The underlying SDK is `PlugPagServiceWrapper 1.33.0`, distributed via Maven at `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master`. This library manages the Maven configuration automatically via its Expo config plugin, so you do not need to add the SDK dependency manually.

---

## Prerequisites

Before installing this library, make sure your project meets the following requirements:

**Hardware**

- A PagBank SmartPOS terminal (A920, A930, P2, or S920) is required to run payment operations. Standard Android phones and emulators are not supported for production use.

**React Native**

- React Native **≥ 0.76** with **New Architecture enabled** (`newArchEnabled=true` in `android/gradle.properties`). This library uses TurboModules (JSI) and will not work with the legacy bridge.

**Android SDK**

- Minimum SDK: **24**
- Compile SDK: **36**
- Target SDK: **36**

**Expo**

- Expo SDK **52+** is supported via the included config plugin.
- **Expo Go is not supported** — the library includes native code and must be used with a development build (`eas build`) or a production build (`npx expo run:android`).

---

## Installation

### Installation — Bare React Native

**Step 1 — Install the library**

```sh
npm install react-native-pagseguro-plugpag
# or
yarn add react-native-pagseguro-plugpag
```

**Step 2 — Enable New Architecture**

In `android/gradle.properties`, verify this line is present and set to `true`:

```properties
newArchEnabled=true
```

**Step 3 — Add the Maven repository**

In `android/build.gradle`, add the PagSeguro Maven repository inside the `allprojects > repositories` block:

```groovy
allprojects {
    repositories {
        // ... other repositories
        maven { url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master' }
    }
}
```

> **Warning**: Do **not** add the `PlugPagServiceWrapper` dependency to your `build.gradle` manually. This library declares it as a transitive dependency — adding it twice will cause version conflicts.

**Step 4 — Build**

```sh
npx react-native run-android
```

**Installation summary**

| Step | Action | File |
|------|--------|------|
| 1 | Install package | — |
| 2 | Enable New Architecture | `android/gradle.properties` |
| 3 | Add Maven repo | `android/build.gradle` |
| 4 | Build | — |

---

### Installation — Expo

Add the library and configure the plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "react-native-pagseguro-plugpag"
    ]
  }
}
```

The config plugin automatically configures:

- The PagSeguro Maven repository in the Android build
- `newArchEnabled=true` in `gradle.properties`
- The required SDK dependency

Build using EAS or local build:

```sh
# EAS Build (recommended)
eas build --platform android

# Local build
npx expo run:android
```

> **Note**: Expo Go is not supported. Use a development build or production build.

**Installation summary**

| Step | Action | File |
|------|--------|------|
| 1 | Install package | — |
| 2 | Add plugin | `app.json` |
| 3 | Build with EAS or locally | — |

---

## Usage

### Activating the PinPad

The terminal must be activated before any payment operation. Use your PagBank activation code.

**Synchronous activation** (recommended for simple flows):

```typescript
import { initializeAndActivatePinPad } from 'react-native-pagseguro-plugpag';

try {
  const result = await initializeAndActivatePinPad('YOUR_ACTIVATION_CODE');
  console.log('Activated:', result.result); // 'ok'
} catch (error) {
  console.error('Activation failed:', error);
}
```

**Asynchronous activation** (uses native SDK listener — preferred when blocking I/O is a concern):

```typescript
import { doAsyncInitializeAndActivatePinPad } from 'react-native-pagseguro-plugpag';

try {
  const result = await doAsyncInitializeAndActivatePinPad('YOUR_ACTIVATION_CODE');
  console.log('Activated:', result.result); // 'ok'
} catch (error) {
  console.error('Activation failed:', error);
}
```

Use the synchronous variant for straightforward activation flows. Use the async variant when you need the native SDK's event-driven mechanism.

---

### Debit Payment

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';
import type { PlugPagTransactionResult } from 'react-native-pagseguro-plugpag';

try {
  const result: PlugPagTransactionResult = await doPayment({
    type: PaymentType.DEBIT,
    amount: 1990, // amount in cents (R$ 19,90)
    installmentType: InstallmentType.A_VISTA,
    installments: 1,
  });
  console.log('Transaction code:', result.transactionCode);
} catch (error) {
  console.error('Payment failed:', error);
}
```

---

### Credit Payment

**À vista (single charge):**

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 5000, // amount in cents (R$ 50,00)
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
});
```

**Parcelado (installments):**

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

// PARC_VENDEDOR: interest charged to merchant
// PARC_COMPRADOR: interest charged to customer
const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 12000, // amount in cents (R$ 120,00)
  installmentType: InstallmentType.PARC_VENDEDOR,
  installments: 3, // must be >= 2 for installment types
});
```

---

### PIX Payment

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

const result = await doPayment({
  type: PaymentType.PIX,
  amount: 3500, // amount in cents (R$ 35,00)
  installmentType: InstallmentType.A_VISTA, // PIX always uses A_VISTA
  installments: 1,
});
```

---

### Refund

**Card refund** (use `transactionCode` and `transactionId` from the original `PlugPagTransactionResult`):

```typescript
import { doRefund, PlugPagVoidType } from 'react-native-pagseguro-plugpag';
import type { PlugPagTransactionResult } from 'react-native-pagseguro-plugpag';

// originalResult is the PlugPagTransactionResult from the original doPayment call
async function refundCardPayment(originalResult: PlugPagTransactionResult) {
  const refundResult = await doRefund({
    transactionCode: originalResult.transactionCode ?? '',
    transactionId: originalResult.transactionId ?? '',
    voidType: PlugPagVoidType.VOID_PAYMENT,
  });
  console.log('Refund complete:', refundResult.transactionCode);
}
```

**PIX refund:**

```typescript
import { doRefund, PlugPagVoidType } from 'react-native-pagseguro-plugpag';

const refundResult = await doRefund({
  transactionCode: 'ORIGINAL_TRANSACTION_CODE',
  transactionId: 'ORIGINAL_TRANSACTION_ID',
  voidType: PlugPagVoidType.VOID_QRCODE,
});
```

---

### Custom Printing

Print a bitmap image file on the terminal's built-in printer:

```typescript
import { printFromFile, PrintQuality, MIN_PRINTER_STEPS } from 'react-native-pagseguro-plugpag';

try {
  const result = await printFromFile({
    filePath: '/data/user/0/com.myapp/files/receipt.bmp',
    printerQuality: PrintQuality.HIGH,
    steps: MIN_PRINTER_STEPS, // minimum line feed after printing (70)
  });
  console.log('Printed successfully, steps:', result.steps);
} catch (error) {
  // error.code may be 'PLUGPAG_VALIDATION_ERROR' for invalid input
  console.error('Print failed:', error);
}
```

---

### Reprinting Receipts

Reprint the last transaction's receipt without requiring the original transaction data.

**Synchronous reprinting:**

```typescript
import {
  reprintCustomerReceipt,
  reprintEstablishmentReceipt,
} from 'react-native-pagseguro-plugpag';

// Customer copy
const customerResult = await reprintCustomerReceipt();

// Establishment copy
const establishmentResult = await reprintEstablishmentReceipt();
```

**Asynchronous reprinting** (uses native SDK listener):

```typescript
import {
  doAsyncReprintCustomerReceipt,
  doAsyncReprintEstablishmentReceipt,
} from 'react-native-pagseguro-plugpag';

const customerResult = await doAsyncReprintCustomerReceipt();
const establishmentResult = await doAsyncReprintEstablishmentReceipt();
```

Use the synchronous variants for straightforward reprint flows. Use the async variants when you need the native SDK's event-driven mechanism.

---

### Payment Progress Hook

Subscribe to real-time payment progress events during a `doPayment` or `doAsyncPayment` call:

```tsx
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { usePaymentProgress } from 'react-native-pagseguro-plugpag';
import type { PlugPagPaymentProgressEvent } from 'react-native-pagseguro-plugpag';

function PaymentScreen() {
  const [progressEvent, setProgressEvent] =
    useState<PlugPagPaymentProgressEvent | null>(null);

  // useCallback ensures a stable reference across renders
  const handleProgress = useCallback((event: PlugPagPaymentProgressEvent) => {
    setProgressEvent(event);
  }, []);

  // Subscribes on mount, unsubscribes on unmount automatically
  usePaymentProgress(handleProgress);

  return (
    <View>
      {progressEvent && (
        <Text>
          Event {progressEvent.eventCode}: {progressEvent.customMessage}
        </Text>
      )}
    </View>
  );
}
```

---

## API Reference

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `initializeAndActivatePinPad` | `activationCode: string` | `Promise<PlugPagActivationSuccess>` | Activates the PinPad synchronously (blocking I/O via Dispatchers.IO) |
| `doAsyncInitializeAndActivatePinPad` | `activationCode: string` | `Promise<PlugPagActivationSuccess>` | Activates the PinPad using the native SDK async listener |
| `doPayment` | `data: PlugPagPaymentRequest` | `Promise<PlugPagTransactionResult>` | Processes a payment synchronously (blocking I/O) |
| `doAsyncPayment` | `data: PlugPagPaymentRequest` | `Promise<PlugPagTransactionResult>` | Processes a payment using the native SDK async listener |
| `subscribeToPaymentProgress` | `callback: (event: PlugPagPaymentProgressEvent) => void` | `() => void` | Subscribes to payment progress events; returns an unsubscribe function |
| `doRefund` | `data: PlugPagRefundRequest` | `Promise<PlugPagTransactionResult>` | Processes a refund (card or PIX) |
| `printFromFile` | `data: PrintRequest` | `Promise<PrintResult>` | Prints a bitmap file on the terminal's built-in printer |
| `reprintCustomerReceipt` | — | `Promise<PrintResult>` | Reprints the customer copy of the last receipt (sync) |
| `reprintEstablishmentReceipt` | — | `Promise<PrintResult>` | Reprints the establishment copy of the last receipt (sync) |
| `doAsyncReprintCustomerReceipt` | — | `Promise<PrintResult>` | Reprints the customer receipt using the native SDK async listener |
| `doAsyncReprintEstablishmentReceipt` | — | `Promise<PrintResult>` | Reprints the establishment receipt using the native SDK async listener |

---

### Hooks

| Hook | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `usePaymentProgress` | `callback: (event: PlugPagPaymentProgressEvent) => void` | `void` | Subscribes to payment progress events for the component lifetime; unsubscribes automatically on unmount |

---

### Types & Interfaces

#### `PlugPagPaymentRequest`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `PlugPagPaymentType` | Yes | Payment method: `CREDIT`, `DEBIT`, or `PIX` |
| `amount` | `number` | Yes | Amount in cents (e.g. `1990` = R$ 19,90) |
| `installmentType` | `PlugPagInstallmentType` | Yes | Installment plan: `A_VISTA`, `PARC_VENDEDOR`, or `PARC_COMPRADOR` |
| `installments` | `number` | Yes | Number of installments (must be ≥ 2 for `PARC_*` types) |
| `userReference` | `string` | No | Optional internal reference (max 10 characters) |
| `printReceipt` | `boolean` | No | Whether to print a receipt after the transaction |

#### `PlugPagRefundRequest`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `transactionCode` | `string` | Yes | Transaction code from the original `PlugPagTransactionResult` |
| `transactionId` | `string` | Yes | Transaction ID from the original `PlugPagTransactionResult` |
| `voidType` | `PlugPagVoidTypeValue` | Yes | Refund method: `VOID_PAYMENT` (card) or `VOID_QRCODE` (PIX) |
| `printReceipt` | `boolean` | No | Whether to print a receipt after the refund |

#### `PlugPagTransactionResult`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `transactionCode` | `string \| null` | Yes | Unique transaction code |
| `transactionId` | `string \| null` | Yes | Unique transaction ID |
| `date` | `string \| null` | Yes | Transaction date |
| `time` | `string \| null` | Yes | Transaction time |
| `hostNsu` | `string \| null` | Yes | Host NSU number |
| `cardBrand` | `string \| null` | Yes | Card brand (e.g. Visa, Mastercard) |
| `bin` | `string \| null` | Yes | Card BIN (first 6 digits) |
| `holder` | `string \| null` | Yes | Cardholder identifier |
| `userReference` | `string \| null` | Yes | User reference passed in the request |
| `terminalSerialNumber` | `string \| null` | Yes | Terminal serial number |
| `amount` | `string \| null` | Yes | Amount charged (formatted string) |
| `availableBalance` | `string \| null` | Yes | Available balance (debit/PIX) |
| `nsu` | `string \| null` | No | NSU number |
| `cardApplication` | `string \| null` | No | Card application identifier |
| `label` | `string \| null` | No | Card label |
| `holderName` | `string \| null` | No | Cardholder name |
| `extendedHolderName` | `string \| null` | No | Extended cardholder name |
| `autoCode` | `string \| null` | No | Authorization code |

#### `PlugPagPaymentProgressEvent`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `eventCode` | `number` | Yes | Numeric event code from the PagBank SDK |
| `customMessage` | `string \| null` | Yes | Optional message associated with the event |

#### `PrintRequest`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filePath` | `string` | Yes | Absolute path to the bitmap file to print |
| `printerQuality` | `PrintQualityValue` | No | Print quality (1–4); defaults to medium if omitted |
| `steps` | `number` | No | Line feed steps after printing; use `MIN_PRINTER_STEPS` (70) as minimum |

#### `PrintResult`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | `'ok'` | Yes | Always `'ok'` on success |
| `steps` | `number` | Yes | Number of line feed steps applied |

#### `PlugPagActivationSuccess`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | `'ok'` | Yes | Always `'ok'` on successful activation |

---

### Constants

#### `PaymentType`

| Constant | Value | Description |
|----------|-------|-------------|
| `PaymentType.CREDIT` | `'CREDIT'` | Credit card payment |
| `PaymentType.DEBIT` | `'DEBIT'` | Debit card payment |
| `PaymentType.PIX` | `'PIX'` | PIX instant payment |

#### `InstallmentType`

| Constant | Value | Description |
|----------|-------|-------------|
| `InstallmentType.A_VISTA` | `'A_VISTA'` | Single charge (no installments) |
| `InstallmentType.PARC_VENDEDOR` | `'PARC_VENDEDOR'` | Installments with interest charged to merchant |
| `InstallmentType.PARC_COMPRADOR` | `'PARC_COMPRADOR'` | Installments with interest charged to customer |

#### `PlugPagVoidType`

| Constant | Value | Description |
|----------|-------|-------------|
| `PlugPagVoidType.VOID_PAYMENT` | `'VOID_PAYMENT'` | Refund a card payment |
| `PlugPagVoidType.VOID_QRCODE` | `'VOID_QRCODE'` | Refund a PIX payment |

#### `PrintQuality`

| Constant | Value | Description |
|----------|-------|-------------|
| `PrintQuality.LOW` | `1` | Low print quality |
| `PrintQuality.MEDIUM` | `2` | Medium print quality |
| `PrintQuality.HIGH` | `3` | High print quality |
| `PrintQuality.MAX` | `4` | Maximum print quality |

#### `MIN_PRINTER_STEPS`

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_PRINTER_STEPS` | `70` | Minimum recommended line feed steps after printing |

---

### Error Codes

#### Activation

| Error Code | When Thrown | Meaning |
|------------|-------------|---------|
| `PLUGPAG_INITIALIZATION_ERROR` | SDK returns `result != RET_OK` | The PagBank SDK rejected the activation request |
| `PLUGPAG_INTERNAL_ERROR` | Unexpected exception caught | IPC failure, unreachable service, or unexpected SDK state |

#### Payment

| Error Code | When Thrown | Meaning |
|------------|-------------|---------|
| `PLUGPAG_PAYMENT_ERROR` | SDK returns `result != RET_OK` | The PagBank SDK rejected the payment (card declined, network issue, etc.) |
| `PLUGPAG_INTERNAL_ERROR` | Unexpected exception caught | IPC failure, unreachable service, or unexpected SDK state |

#### Refund

| Error Code | When Thrown | Meaning |
|------------|-------------|---------|
| `PLUGPAG_REFUND_ERROR` | SDK returns `result != RET_OK` | The PagBank SDK rejected the refund |
| `PLUGPAG_INTERNAL_ERROR` | Unexpected exception caught | IPC failure, unreachable service, or unexpected SDK state |

#### Print

| Error Code | When Thrown | Meaning |
|------------|-------------|---------|
| `PLUGPAG_PRINT_ERROR` | SDK returns `result != RET_OK` | The PagBank SDK reported a printer error |
| `PLUGPAG_INTERNAL_ERROR` | Unexpected exception caught | IPC failure, unreachable service, or unexpected SDK state |
| `PLUGPAG_VALIDATION_ERROR` | Invalid input parameters | `filePath` is empty, `steps` < 0, or `printerQuality` outside 1–4 |

---

## Limitations and Scope

- **iOS is not supported.** The PagSeguro PlugPag SDK is Android-only. Calling any library function on iOS will throw an explicit error.
- **Non-SmartPOS devices are not supported.** The library targets PagBank SmartPOS terminals (A920, A930, P2, S920). Behavior on standard Android phones is undefined.
- **Financial reports and statement queries are out of scope.** This library covers payment operations only.
- **Autonomous NFC without PlugPag is out of scope.** All NFC interactions go through the PlugPag SDK.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request, and review the [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) to understand community expectations.

---

## License

MIT — see [LICENSE](./LICENSE)
