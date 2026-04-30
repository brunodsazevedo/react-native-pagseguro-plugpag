# Contract: Abort Operation API

## Public TypeScript API (src/index.ts exports)

### Functions

#### `abort(): Promise<PlugPagAbortSuccess>`

Cancels any in-progress terminal operation synchronously (blocking IPC). Resolves when the terminal confirms the abort. Rejects if the terminal does not acknowledge or an internal error occurs.

**Platform**: Android only. Throws Level 2 iOS guard error on iOS.
**Threading**: SDK call executes on `Dispatchers.IO` (blocking IPC — Principle VI documented exception).

**Success**:
```typescript
{ result: 'ok' }
```

**Rejection codes**:
| Code | Condition |
|------|-----------|
| `PLUGPAG_ABORT_ERROR` | SDK returned `result != RET_OK` |
| `PLUGPAG_INTERNAL_ERROR` | Exception caught before or during SDK call |

---

#### `doAsyncAbort(): Promise<PlugPagAbortSuccess>`

Cancels any in-progress terminal operation using the native SDK async listener. Resolves when the terminal confirms via `onAbortRequested(true)`.

**Platform**: Android only. Throws Level 2 iOS guard error on iOS.
**Threading**: SDK manages threading via listener — no coroutines in Kotlin.

**Success**:
```typescript
{ result: 'ok' }
```

**Rejection codes**:
| Code | Condition |
|------|-----------|
| `PLUGPAG_ABORT_ERROR` | `onAbortRequested(false)` or `onError(msg)` called |
| `PLUGPAG_INTERNAL_ERROR` | Exception thrown before listener is registered |

---

### Types

#### `PlugPagAbortSuccess`

```typescript
interface PlugPagAbortSuccess {
  result: 'ok';
}
```

Exported from `src/functions/abort/types.ts` and re-exported via `src/index.ts`.

---

### Constants

#### `OPERATION_ABORTED`

```typescript
const OPERATION_ABORTED = -1028 as const;
// type: -1028
```

Matches `PlugPag.OPERATION_ABORTED` in the SDK. Used to detect operator-cancelled payments:

```typescript
try {
  await doPayment(request);
} catch (error: unknown) {
  const e = error as { userInfo?: { result?: number } };
  if (e.userInfo?.result === OPERATION_ABORTED) {
    // operator cancelled — not a payment failure
  }
}
```

---

## TurboModule Spec Changes (NativePagseguroPlugpag.ts)

```typescript
// Add to Spec interface:
abort(): Promise<Object>;
doAsyncAbort(): Promise<Object>;
```

> **Mandatory**: Run `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` after this change.

---

## Kotlin Implementation Contract (PagseguroPlugpagModule.kt)

### New imports required

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener
```

> `PlugPagAbortResult` is the return type of `plugPag.abort()` — no explicit import needed if using Kotlin type inference.

### abort() — synchronous

```kotlin
override fun abort(promise: Promise) {
    // EXCEPTION (Constituição Princípio VI): SDK abort() é bloqueante por IPC — Dispatchers.IO é necessário
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val result = plugPag.abort()
            withContext(Dispatchers.Main) {
                if (result.result != PlugPag.RET_OK) {
                    val map = WritableNativeMap()
                    map.putInt("result", result.result)
                    map.putString("errorCode", "ABORT_FAILED")
                    map.putString("message", "Abort failed with result: ${result.result}")
                    promise.reject("PLUGPAG_ABORT_ERROR", map)
                } else {
                    val successMap = WritableNativeMap()
                    successMap.putString("result", "ok")
                    promise.resolve(successMap)
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
            }
        }
    }
}
```

### doAsyncAbort() — asynchronous

```kotlin
override fun doAsyncAbort(promise: Promise) {
    try {
        plugPag.asyncAbort(object : PlugPagAbortListener {
            override fun onAbortRequested(abortRequested: Boolean) {
                if (abortRequested) {
                    val successMap = WritableNativeMap()
                    successMap.putString("result", "ok")
                    promise.resolve(successMap)
                } else {
                    val map = WritableNativeMap()
                    map.putInt("result", -1)
                    map.putString("errorCode", "ABORT_NOT_REQUESTED")
                    map.putString("message", "Abort was not acknowledged by the terminal")
                    promise.reject("PLUGPAG_ABORT_ERROR", map)
                }
            }

            override fun onError(errorMessage: String) {
                val map = WritableNativeMap()
                map.putInt("result", -1)
                map.putString("errorCode", "ABORT_ERROR")
                map.putString("message", errorMessage)
                promise.reject("PLUGPAG_ABORT_ERROR", map)
            }
        })
    } catch (e: Exception) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
    }
}
```

---

## Test Contract

### JS Unit Tests (src/__tests__/functions/abort.test.ts)

| Test ID | Function | Scenario | Expected |
|---------|----------|----------|----------|
| JS-A01 | `abort()` | iOS platform | Rejects with `Error` containing `[react-native-pagseguro-plugpag] ERROR:` and `abort()` |
| JS-A02 | `doAsyncAbort()` | iOS platform | Rejects with `Error` containing `[react-native-pagseguro-plugpag] ERROR:` and `doAsyncAbort()` |
| JS-A03 | `abort()` | Android — SDK resolves `{ result: 'ok' }` | Resolves with `{ result: 'ok' }` |
| JS-A04 | `abort()` | Android — SDK rejects `PLUGPAG_ABORT_ERROR` | Rejects with that code |
| JS-A05 | `doAsyncAbort()` | Android — SDK resolves `{ result: 'ok' }` | Resolves with `{ result: 'ok' }` |
| JS-A06 | `doAsyncAbort()` | Android — SDK rejects `PLUGPAG_ABORT_ERROR` | Rejects with that code |
| JS-A07 | `OPERATION_ABORTED` | Exported constant | Equals `-1028` |

### Kotlin Integration Tests (PagseguraPlugpagModuleTest.kt)

| Test ID | Method | Scenario | Expected |
|---------|--------|----------|----------|
| KT-A01 | `abort()` | SDK returns `RET_OK` | `promise.resolve({ result: 'ok' })` |
| KT-A02 | `abort()` | SDK returns `result != RET_OK` | `promise.reject("PLUGPAG_ABORT_ERROR", map)` |
| KT-A03 | `abort()` | SDK throws exception | `promise.reject("PLUGPAG_INTERNAL_ERROR", map)` |
| KT-A04 | `doAsyncAbort()` | `onAbortRequested(true)` | `promise.resolve({ result: 'ok' })` |
| KT-A05 | `doAsyncAbort()` | `onAbortRequested(false)` | `promise.reject("PLUGPAG_ABORT_ERROR", map)` |
| KT-A06 | `doAsyncAbort()` | `onError("msg")` | `promise.reject("PLUGPAG_ABORT_ERROR", map)` |
| KT-A07 | `doAsyncAbort()` | SDK throws before listener | `promise.reject("PLUGPAG_INTERNAL_ERROR", map)` |
