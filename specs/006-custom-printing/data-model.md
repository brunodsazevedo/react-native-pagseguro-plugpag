---

# Data Model: Feature 006 — Custom Printing

**Branch**: `feature/006-custom-printing` | **Date**: 2026-03-29

## TypeScript Public Types (`src/printing.ts`)

### PrintQuality (const enum)

```typescript
export const PrintQuality = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  MAX: 4,
} as const;

export type PrintQualityValue = (typeof PrintQuality)[keyof typeof PrintQuality];
```

- Discrete scale matching the SDK's `printerQuality` parameter.
- `MAX` (4) is the default when not specified.

---

### PrintRequest (interface)

```typescript
export interface PrintRequest {
  filePath: string;         // required: absolute path to PNG/JPEG/BMP on device
  printerQuality?: number;  // optional: 1–4, default 4 (PrintQuality.MAX)
  steps?: number;           // optional: trailing blank lines ≥ 0, default 70 (MIN_PRINTER_STEPS)
}
```

**Validation rules** (enforced in JS before hardware call):
- `filePath`: must not be empty/whitespace → `PLUGPAG_VALIDATION_ERROR`
- `printerQuality`: must be 1, 2, 3 or 4 (inclusive) → `PLUGPAG_VALIDATION_ERROR`
- `steps`: must be ≥ 0 → `PLUGPAG_VALIDATION_ERROR`

**SDK mapping**: maps to `PlugPagPrinterData(filePath, printerQuality, steps)` in Kotlin.

---

### PrintResult (interface)

```typescript
export interface PrintResult {
  result: 'ok';
  steps: number;  // lines actually printed, as reported by SDK (PlugPagPrintResult.steps)
}
```

- Returned by all 5 printing functions on success.
- `steps` maps directly to `PlugPagPrintResult.steps` from the SDK.
- A value of `steps: 0` is valid (SDK may report 0 if no lines were printed).

---

### MIN_PRINTER_STEPS (constant)

```typescript
export const MIN_PRINTER_STEPS = 70;
```

- Matches `PlugPag.MIN_PRINTER_STEPS` from the SDK.
- Used as the default value for `PrintRequest.steps`.

---

## SDK Internal Types (Kotlin only — never exported)

### PlugPagPrinterData

```kotlin
// Package: br.com.uol.pagseguro.plugpagservice.wrapper
PlugPagPrinterData(
  filePath: String,      // from PrintRequest.filePath
  printerQuality: Int,   // from PrintRequest.printerQuality ?: 4
  steps: Int             // from PrintRequest.steps ?: 70; SDK clamps values < 70 to 70
)
```

### PlugPagPrinterListener

```kotlin
// Package: br.com.uol.pagseguro.plugpagservice.wrapper (NOT listeners sub-package)
interface PlugPagPrinterListener {
  fun onSuccess(result: PlugPagPrintResult)
  fun onError(result: PlugPagPrintResult)
}
```

### PlugPagPrintResult

```kotlin
// Package: br.com.uol.pagseguro.plugpagservice.wrapper
class PlugPagPrintResult(
  val result: Int,          // RET_OK = 0; NO_PRINTER_DEVICE = -1040
  val message: String?,     // nullable human-readable message
  val errorCode: String?,   // nullable error code string
  val steps: Int            // lines printed
)
```

### PlugPagException

```kotlin
// Package: br.com.uol.pagseguro.plugpagservice.wrapper
class PlugPagException : RuntimeException {
  val message: String?      // error description
  val errorCode: String?    // SDK error code
}
```

---

## Error Codes

| Code | Layer | Condition |
|---|---|---|
| `PLUGPAG_VALIDATION_ERROR` | JS (before hardware) | `filePath` empty, `printerQuality` out of 1–4, `steps` negative |
| `PLUGPAG_PRINT_ERROR` | Kotlin (hardware failure) | `PlugPagPrintResult.result != RET_OK` |
| `PLUGPAG_INTERNAL_ERROR` | Kotlin (IPC/exception) | `PlugPagException` caught |

---

## State Transitions

```
printFromFile / reprintXxx called
  │
  ├─[iOS]──────────────────────────────→ throws Error (Level 2 guard)
  │
  ├─[validation failure]───────────────→ rejects PLUGPAG_VALIDATION_ERROR
  │                                       (no hardware call)
  │
  ├─[PlugPagException]─────────────────→ rejects PLUGPAG_INTERNAL_ERROR
  │
  ├─[result != RET_OK]─────────────────→ rejects PLUGPAG_PRINT_ERROR
  │
  └─[result == RET_OK]─────────────────→ resolves PrintResult { result: 'ok', steps }
```
