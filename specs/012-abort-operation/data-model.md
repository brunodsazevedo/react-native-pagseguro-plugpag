# Data Model: Abort Operation

## Entities

### PlugPagAbortSuccess

Returned by `abort()` and `doAsyncAbort()` on successful terminal acknowledgement.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `result` | `'ok'` | Yes | Literal string — always `'ok'` on success |

**Placement**: `src/functions/abort/types.ts`
**Domain-specific**: Yes — used only by `functions/abort/`. Not shared.

**TypeScript**:
```typescript
interface PlugPagAbortSuccess {
  result: 'ok';
}
```

**Kotlin source** (SDK): `data class PlugPagAbortResult(val result: Int)` — `result == 0` (RET_OK) maps to `{ result: 'ok' }` in JS.

---

### OPERATION_ABORTED

Numeric constant emitted by `doPayment`/`doAsyncPayment` when the operation is aborted mid-flow.

| Name | Value | Type | Description |
|------|-------|------|-------------|
| `OPERATION_ABORTED` | `-1028` | `number` | Matches `PlugPag.OPERATION_ABORTED` in the SDK |

**Placement**: `src/functions/abort/types.ts`
**Usage**: `error.userInfo.result === OPERATION_ABORTED` — lets consuming apps distinguish operator cancellations from other payment rejections.

**TypeScript**:
```typescript
const OPERATION_ABORTED = -1028 as const;
```

---

## Error Structures

Errors are rejected via `Promise.reject(code, userInfo)` where `userInfo` is a plain object:

### PLUGPAG_ABORT_ERROR (abort variant)

```typescript
// SDK returned result != RET_OK in abort()
{ result: number, errorCode: 'ABORT_FAILED', message: string }
```

### PLUGPAG_ABORT_ERROR (async variant — not acknowledged)

```typescript
// onAbortRequested(false)
{ result: -1, errorCode: 'ABORT_NOT_REQUESTED', message: string }
```

### PLUGPAG_ABORT_ERROR (async variant — listener error)

```typescript
// onError(errorMessage)
{ result: -1, errorCode: 'ABORT_ERROR', message: string }
```

### PLUGPAG_INTERNAL_ERROR

```typescript
// Exception before or during SDK call
{ result: -1, errorCode: 'INTERNAL_ERROR', message: string }
```

---

## State Transitions

```
[idle]
  │
  ├─ doPayment / doAsyncPayment called
  │
  ▼
[terminal operation in progress]
  │
  ├─ abort() / doAsyncAbort() called
  │   ├─ terminal acknowledges → abort resolves { result: 'ok' }
  │   │   └─ doPayment/doAsyncPayment rejects with PLUGPAG_PAYMENT_ERROR (result: -1028)
  │   └─ terminal rejects / error → abort rejects with PLUGPAG_ABORT_ERROR
  │
  └─ natural completion (no abort)
      └─ doPayment resolves or rejects normally
```

---

## Type Placement Summary

| Type | File | Shared? |
|------|------|---------|
| `PlugPagAbortSuccess` | `src/functions/abort/types.ts` | No — abort domain only |
| `OPERATION_ABORTED` | `src/functions/abort/types.ts` | No — abort domain only |
| `PlugPagTransactionResult` | `src/types/sharedTypes.ts` | Yes — payment + refund |

`PlugPagAbortSuccess` is domain-specific (used only in `abort/`). No changes to `src/types/sharedTypes.ts` are needed.
