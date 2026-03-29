---

# Research: Feature 006 — Custom Printing

**Branch**: `feature/006-custom-printing` | **Date**: 2026-03-29

## SDK API Surface — Verified from PlugPagServiceWrapper 1.33.0 AAR

### Decision: PlugPagPrinterData constructor

```kotlin
PlugPagPrinterData(
  filePath: String,       // non-null, absolute path to image file
  printerQuality: Int,    // 1–4
  steps: Int              // trailing blank lines; clamped to MIN_PRINTER_STEPS (70) internally
)
```

**Rationale**: Three-param constructor confirmed from decompiled AAR. The SDK clamps `steps` to 70 internally if a smaller value is passed — the spec assumption that `steps: 0` is "accepted" is technically inaccurate. The library adopts 70 as default; values 0–69 passed by the caller will be silently clamped by the SDK. No blocking behavior from the library side on values 0–69.

**Alternatives considered**: Named-argument builder pattern — not available in SDK's Java API.

---

### Decision: PlugPagPrinterListener package

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterListener
```

**Rationale**: Unlike `PlugPagActivationListener` and `PlugPagPaymentListener` (which live in the `listeners` sub-package), `PlugPagPrinterListener` is in the root wrapper package. Import path verified from AAR.

**Alternatives considered**: N/A (single import path).

---

### Decision: Blocking vs. async SDK methods

| Library method | SDK method | Blocking? | Threading |
|---|---|---|---|
| `printFromFile` | `plugPag.printFromFile(PlugPagPrinterData)` | YES | `Dispatchers.IO` required |
| `reprintCustomerReceipt` | `plugPag.reprintCustomerReceipt()` | YES | `Dispatchers.IO` required |
| `doAsyncReprintCustomerReceipt` | `plugPag.asyncReprintCustomerReceipt(PlugPagPrinterListener)` | NO | SDK listener thread |
| `reprintEstablishmentReceipt` | `plugPag.reprintStablishmentReceipt()` | YES | `Dispatchers.IO` required |
| `doAsyncReprintEstablishmentReceipt` | `plugPag.asyncReprintEstablishmentReceipt(PlugPagPrinterListener)` | NO | SDK listener thread |

**Rationale**: Confirmed from decompiled AAR. Blocking methods on the main thread would cause ANR — `Dispatchers.IO` is the documented exception from Constituição Princípio VI.

**Alternatives considered**: `suspendCancellableCoroutine` wrapper — unnecessary complexity; the SDK's own async variant (`asyncReprintXxx`) already provides non-blocking behavior.

---

### Decision: SDK typo in `reprintStablishmentReceipt`

The sync SDK method is named `reprintStablishmentReceipt` (missing 'e' — "Stablishment" vs "Establishment"). The async variant `asyncReprintEstablishmentReceipt` uses the correct spelling.

**Decision**: The library's public API uses the correct spelling (`reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt`) and calls the SDK with the typo'd name internally. This is documented in FR-013 of the spec.

**How to apply**: In `PagseguroPlugpagModule.kt`:
```kotlin
// "Stablishment" is the SDK's spelling — see FR-013
val result = plugPag.reprintStablishmentReceipt()
```

---

### Decision: PlugPagPrintResult fields

```kotlin
result: Int      // RET_OK or error code (e.g., NO_PRINTER_DEVICE = -1040)
message: String? // nullable error message from SDK
errorCode: String? // nullable error code string
steps: Int       // number of lines actually printed
```

**Rationale**: All four fields confirmed from AAR. The `steps` field maps to `PrintResult.steps` in the TypeScript public API.

**Alternatives considered**: N/A.

---

### Decision: PlugPagException

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagException
```

Fields relevant to the library:
- `message: String?` — human-readable error description
- `errorCode: String?` — SDK error code string

**Rationale**: Thrown by all printing methods on IPC failure or file not found. Maps to `PLUGPAG_INTERNAL_ERROR` per FR-008.

**How to apply**: Catch as `PlugPagException` (subclass of `RuntimeException`), then serialize via `buildPrintInternalErrorUserInfo(e)`.

---

### Decision: Error code for validation failures

New error code `PLUGPAG_VALIDATION_ERROR` (not currently in the error table of the Kotlin module) will be used for JS-layer validation rejections (`filePath` empty, `printerQuality` out of range, `steps` negative). This keeps validation errors distinct from hardware failures (`PLUGPAG_PRINT_ERROR`) and IPC failures (`PLUGPAG_INTERNAL_ERROR`) per SC-002.

**Rationale**: Existing error codes (`PLUGPAG_PAYMENT_ERROR`, `PLUGPAG_INITIALIZATION_ERROR`) follow the pattern `PLUGPAG_<DOMAIN>_ERROR`. Validation errors are thrown in JS before calling native, so they do not need a Kotlin counterpart.

**Alternatives considered**: Reusing `PLUGPAG_PRINT_ERROR` for validation — rejected because SC-002 requires distinguishable error codes.

---

### Decision: TurboModule Spec additions

Five new methods added to `NativePagseguroPlugpag.ts`:

```typescript
printFromFile(data: Object): Promise<Object>;
reprintCustomerReceipt(): Promise<Object>;
doAsyncReprintCustomerReceipt(): Promise<Object>;
reprintEstablishmentReceipt(): Promise<Object>;
doAsyncReprintEstablishmentReceipt(): Promise<Object>;
```

**Rationale**: `Object` is required by the TurboModule codegen for complex types (Constituição Princípio I). The public TypeScript layer applies type assertion to `PrintResult`.

**Codegen impact**: `generateCodegenArtifactsFromSchema` MUST be re-run after updating the spec (mandatory per CLAUDE.md).

---

### Decision: Domain module `src/printing.ts`

Types `PrintRequest`, `PrintResult`, `PrintQuality` and constant `MIN_PRINTER_STEPS` are defined in `src/printing.ts` and re-exported from `src/index.tsx`. This follows Constituição Princípio IV — each TypeScript module owns one domain.

**Rationale**: Matches the pattern from `src/index.tsx` (existing) and keeps the `print` domain separate from `activation` and `payment`.

**Alternatives considered**: Embedding types directly in `src/index.tsx` — rejected because it violates domain separation.

---

## Open Items (Resolved)

All NEEDS CLARIFICATION items from the spec are resolved:

| Item | Resolution |
|---|---|
| Async variant for `printFromFile`? | Sync-only — SDK has no `asyncPrintFromFile` |
| SDK import path for `PlugPagPrinterListener`? | Root wrapper package (not `listeners`) |
| SDK internal name for establishment reprint? | `reprintStablishmentReceipt` (typo in SDK) |
| `PlugPagException` fields? | `message` + `errorCode` |
| Steps clamping behavior? | SDK clamps to 70 internally; library validates negatives only |
