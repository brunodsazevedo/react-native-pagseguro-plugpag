# Quickstart: Feature 006 — Custom Printing

## Installation

Feature 006 requires no additional setup beyond the SDK already configured in Feature 001.

---

## Printing a Custom Image

```typescript
import {
  printFromFile,
  PrintQuality,
  MIN_PRINTER_STEPS,
  type PrintRequest,
  type PrintResult,
} from 'react-native-pagseguro-plugpag';

// Minimal call — defaults: quality=MAX (4), steps=70
const result: PrintResult = await printFromFile({ filePath: '/data/local/tmp/receipt.png' });
console.log('Printed', result.steps, 'lines');

// Full options
const request: PrintRequest = {
  filePath: '/sdcard/receipts/custom.jpg',
  printerQuality: PrintQuality.HIGH,  // 3
  steps: MIN_PRINTER_STEPS,           // 70
};
const result2: PrintResult = await printFromFile(request);
```

### Validation errors (thrown before hardware is called)

```typescript
try {
  await printFromFile({ filePath: '' });           // PLUGPAG_VALIDATION_ERROR — empty path
  await printFromFile({ filePath: '/f.png', printerQuality: 5 }); // PLUGPAG_VALIDATION_ERROR — quality > 4
  await printFromFile({ filePath: '/f.png', steps: -1 });         // PLUGPAG_VALIDATION_ERROR — negative steps
} catch (e) {
  // e.code === 'PLUGPAG_VALIDATION_ERROR'
}
```

---

## Reprinting Customer Receipt

```typescript
import { reprintCustomerReceipt, doAsyncReprintCustomerReceipt } from 'react-native-pagseguro-plugpag';

// Synchronous variant (blocking IPC — runs on Dispatchers.IO internally)
const r1 = await reprintCustomerReceipt();
console.log('Reprinted', r1.steps, 'lines');

// Asynchronous variant (SDK listener — no coroutine overhead)
const r2 = await doAsyncReprintCustomerReceipt();
console.log('Reprinted', r2.steps, 'lines');
```

---

## Reprinting Establishment Receipt

```typescript
import { reprintEstablishmentReceipt, doAsyncReprintEstablishmentReceipt } from 'react-native-pagseguro-plugpag';

// Synchronous variant
const r1 = await reprintEstablishmentReceipt();

// Asynchronous variant
const r2 = await doAsyncReprintEstablishmentReceipt();
```

---

## Error Handling

```typescript
import { printFromFile } from 'react-native-pagseguro-plugpag';

try {
  await printFromFile({ filePath: '/path/to/image.png' });
} catch (e: unknown) {
  const err = e as { code?: string; userInfo?: { message?: string; errorCode?: string } };
  switch (err.code) {
    case 'PLUGPAG_VALIDATION_ERROR':
      // Invalid input — fix the parameters, do NOT retry
      break;
    case 'PLUGPAG_PRINT_ERROR':
      // Hardware failure — e.g., no paper, no printer detected
      // err.userInfo.errorCode may be 'NO_PRINTER_DEVICE' (-1040)
      break;
    case 'PLUGPAG_INTERNAL_ERROR':
      // IPC failure — PagBank service not running, file not found
      break;
  }
}
```

---

## iOS Behavior

All printing functions throw immediately on iOS with a descriptive error. The app continues normally:

```typescript
// On iOS:
try {
  await printFromFile({ filePath: '/path/to/image.png' });
} catch (e) {
  // e.message: '[react-native-pagseguro-plugpag] ERROR: printFromFile() is not available on iOS...'
}
```

---

## Pre-conditions

1. Terminal must be initialized and activated (Feature 002 — PinPad Activation).
2. The image file must exist on the device before calling `printFromFile`. The library does not
   validate existence — a missing file causes `PlugPagException` → `PLUGPAG_INTERNAL_ERROR`.
3. Image dimensions: widths > 1155px are resized automatically by the SDK.
