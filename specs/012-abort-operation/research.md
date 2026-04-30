# Research: Abort Operation

**Source**: PRD.md (inspected `wrapper-1.33.0.aar` via `javap`) — all items resolved before planning.

## SDK API Surface

**Decision**: Map `PlugPag.abort()` → `abort()` and `PlugPag.asyncAbort(listener)` → `doAsyncAbort()`.
**Rationale**: Symmetric naming with existing sync/async pairs (`doPayment`/`doAsyncPayment`, `initializeAndActivatePinPad`/`doAsyncInitializeAndActivatePinPad`). `doAsyncAbort` prefix follows the async convention already established in the project.
**Alternatives considered**: `cancelOperation()` — rejected because it hides SDK semantics; the SDK name `abort` is clear and unambiguous.

```
// Confirmed SDK signatures (wrapper-1.33.0.aar, PlugPag.class):
public PlugPagAbortResult abort() throws PlugPagException   // blocking IPC
public void asyncAbort(PlugPagAbortListener)                // async via listener
public static final int OPERATION_ABORTED = -1028           // code emitted by doPayment when aborted
public static final int RET_OK = 0
```

## Return Type: PlugPagAbortResult

**Decision**: `PlugPagAbortResult` has a single field `result: Int`. Map to `PlugPagAbortSuccess { result: 'ok' }` on success (consistent with `PlugPagActivationSuccess` and `PrintResult`).
**Rationale**: The JS layer never needs the raw integer — success is always `RET_OK`. The `'ok'` literal type is safe and consistent with the rest of the library.
**Alternatives considered**: Returning `{ result: number }` — rejected because it leaks SDK internals.

## Listener Interface: PlugPagAbortListener

```kotlin
interface PlugPagAbortListener {
    fun onAbortRequested(abortRequested: Boolean)  // true = acknowledged; false = rejected
    fun onError(errorMessage: String)              // IPC or service failure
}
```

**Decision**: `onAbortRequested(false)` and `onError(msg)` both map to `PLUGPAG_ABORT_ERROR` rejection. The distinction (not-acknowledged vs. error) is exposed via the `errorCode` field in the rejection map.
**Rationale**: From the JS caller's perspective, both are failure cases. The errorCode field preserves the distinction for advanced consumers.

## Threading

**Decision**: `abort()` synchronous variant MUST use `Dispatchers.IO` (same documented exception as `doPayment`, `doRefund`, `printFromFile`).
**Rationale**: `abort()` is blocking IPC — calling on main thread causes ANR on Android.
**Alternatives considered**: Wrapping in a callback-based pattern — rejected; SDK exposes the async variant (`asyncAbort`) separately.

## Domain Placement

**Decision**: New standalone domain `functions/abort/` — not nested under `payment/` or any other domain.
**Rationale**: `abort()` in the SDK is global — it cancels any active operation (payment, refund, activation). Placing it inside `payment/` would violate Single Responsibility (Principle IV) and mislead consumers.
**Alternatives considered**: Adding `abort` directly to `payment/index.ts` — rejected (breaks SRP and FR-008).

## Error Codes

**Decision**: `PLUGPAG_ABORT_ERROR` for SDK-level failures; `PLUGPAG_INTERNAL_ERROR` for unexpected exceptions — consistent with all other domains.
**Rationale**: Uniform error taxonomy across the library; consumers can handle errors without domain-specific branches.

## OPERATION_ABORTED Constant

**Decision**: Export `OPERATION_ABORTED = -1028 as const` from `functions/abort/types.ts`.
**Rationale**: Allows consuming apps to identify operator cancellations via `error.userInfo.result === OPERATION_ABORTED` without string parsing (FR-006, SC-003).
**Alternatives considered**: Documenting the value in README only — rejected; a typed constant is safer and more ergonomic.

## Concurrent Abort Calls

**Decision**: The library does not add deduplication logic at the JS or Kotlin layer. If abort is called multiple times, both calls reach the SDK. The terminal responds once; the second call either gets a no-op response or an error from the SDK.
**Rationale**: The spec clarification (2026-04-30) states "only the first call is forwarded to the terminal" — this is SDK behavior, not library behavior. Adding a mutex in the library would add complexity without benefit (the SDK already handles it).
