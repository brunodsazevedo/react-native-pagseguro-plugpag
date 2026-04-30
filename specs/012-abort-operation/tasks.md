---
description: "Task list for feature/012 — Abort Operation"
---

# Tasks: Abort Operation

**Feature**: `feature/012-abort-operation` | **Date**: 2026-04-30
**Input**: Design documents from `specs/012-abort-operation/`
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Contract**: [contracts/abort-api.md](./contracts/abort-api.md)

**Scope**: 2 new JS functions (`abort`, `doAsyncAbort`), 2 new Kotlin overrides, 1 new domain folder (`functions/abort/`), 1 new constant (`OPERATION_ABORTED`).
**Tests**: TDD mandatory per Constituição Princípio III — tests MUST be written before implementation and MUST FAIL first.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create the new domain folder structure as empty module stubs.

- [ ] T001 Create `src/functions/abort/types.ts` and `src/functions/abort/index.ts` as empty module stubs (no exports yet — stubs only to allow imports to resolve during test authoring)

**Checkpoint**: Folder structure exists — test files and implementation can now reference the module path.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the TurboModule Spec and regenerate Android codegen — MUST complete before any Kotlin implementation.

**⚠️ CRITICAL**: No Kotlin implementation can compile until T003 completes. T002 and T003 MUST run sequentially.

- [ ] T002 Add `abort(): Promise<Object>` and `doAsyncAbort(): Promise<Object>` to the `Spec` interface in `src/NativePagseguroPlugpag.ts`
- [ ] T003 Regenerate Android codegen artifacts — run `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` (mandatory after every change to `NativePagseguroPlugpag.ts`)

**Checkpoint**: Foundation ready — `NativePagseguroPlugpagSpec.java` now declares both methods. Kotlin implementation can proceed.

---

## Phase 3: User Story 1 — Operator Cancels a Waiting Terminal Operation (Priority: P1) 🎯 MVP

**Goal**: Expose `abort()` (sync, Dispatchers.IO) and `doAsyncAbort()` (async, SDK listener) to the React Native layer, covering all Android success and failure paths.

**Independent Test**: Initiate a payment, call abort while the terminal displays "waiting for card", verify it resolves with `{ result: 'ok' }` and the original payment rejects.

### Tests for User Story 1 ⚠️ Write FIRST — Confirm ALL FAIL before any implementation

- [ ] T004 [P] [US1] Create `src/__tests__/functions/abort.test.ts` with JS test scenarios JS-A03 and JS-A04 (`abort()` Android success + `PLUGPAG_ABORT_ERROR` rejection) using the native module mock pattern (`jest.mock('../../NativePagseguroPlugpag', ...)`) — run `yarn test` and confirm FAIL
- [ ] T005 [P] [US1] Append JS test scenarios JS-A05 and JS-A06 to `src/__tests__/functions/abort.test.ts` (`doAsyncAbort()` Android success + `PLUGPAG_ABORT_ERROR` rejection) — confirm FAIL
- [ ] T006 [P] [US1] Add Kotlin tests KT-A01, KT-A02, KT-A03 (`abort()` — RET_OK resolve, result != RET_OK reject with `PLUGPAG_ABORT_ERROR`, exception reject with `PLUGPAG_INTERNAL_ERROR`) to `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` — confirm FAIL
- [ ] T007 [P] [US1] Add Kotlin tests KT-A04, KT-A05, KT-A06, KT-A07 (`doAsyncAbort()` — `onAbortRequested(true)` resolve, `onAbortRequested(false)` reject, `onError(msg)` reject, exception before listener reject) to `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` — confirm FAIL

### Implementation for User Story 1

- [ ] T008 [US1] Define `PlugPagAbortSuccess` interface (`{ result: 'ok' }`) in `src/functions/abort/types.ts` replacing the empty stub from T001
- [ ] T009 [US1] Implement `abort()` and `doAsyncAbort()` in `src/functions/abort/index.ts` — each function must include: (1) Level 2 iOS guard throwing `Error` with prefix `[react-native-pagseguro-plugpag] ERROR:` and the exact function name; (2) `getNativeModule()` lazy accessor called only after the guard (EXCEPTION comment per Constituição); (3) return type assertion to `PlugPagAbortSuccess`
- [ ] T010 [US1] Add `abort()` and `doAsyncAbort()` overrides to `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `abort()` uses `CoroutineScope(Dispatchers.IO).launch` with the documented EXCEPTION comment (blocking IPC); `doAsyncAbort()` uses `plugPag.asyncAbort(object : PlugPagAbortListener { ... })` without coroutines; add `import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener`
- [ ] T011 [P] [US1] Add `export * from './abort'` to `src/functions/index.ts`
- [ ] T012 [P] [US1] Add `export type * from './functions/abort/types'` to `src/index.ts`

**Checkpoint**: `yarn test -- --testPathPattern=abort` passes JS-A03–JS-A06. US1 is independently functional — abort and doAsyncAbort work on Android.

---

## Phase 4: User Story 2 — Application Detects Operator-Cancelled Payment (Priority: P2)

**Goal**: Export `OPERATION_ABORTED = -1028 as const` so consuming apps can distinguish operator cancellations from payment failures without string parsing.

**Independent Test**: Import `OPERATION_ABORTED` from the library and assert it equals `-1028`; use it in a payment error handler to match `error.userInfo.result`.

### Tests for User Story 2 ⚠️ Write FIRST — Confirm FAIL before implementation

- [ ] T013 [US2] Append JS test scenario JS-A07 to `src/__tests__/functions/abort.test.ts` — assert that `OPERATION_ABORTED` is exported from the library and equals `-1028` — confirm FAIL

### Implementation for User Story 2

- [ ] T014 [US2] Add `const OPERATION_ABORTED = -1028 as const` and `export { OPERATION_ABORTED }` to `src/functions/abort/types.ts` — run `yarn test -- --testPathPattern=abort` and confirm JS-A07 passes

**Checkpoint**: `OPERATION_ABORTED` is importable by library consumers. US2 independently functional.

---

## Phase 5: User Story 3 — iOS Platform Guard (Priority: P3)

**Goal**: Both `abort()` and `doAsyncAbort()` reject immediately on iOS with the exact library-prefix error format, enabling cross-platform apps to handle the absence gracefully.

**Independent Test**: Call `abort()` and `doAsyncAbort()` in an iOS environment (mock `Platform.OS = 'ios'`) and verify the rejection message matches the exact format required by grep-ability conventions.

### Tests for User Story 3 ⚠️ Write FIRST — Confirm FAIL before implementation

- [ ] T015 [P] [US3] Append JS test scenarios JS-A01 and JS-A02 to `src/__tests__/functions/abort.test.ts` — JS-A01: `abort()` on iOS rejects with `Error` whose message contains `[react-native-pagseguro-plugpag] ERROR:` and `abort()`; JS-A02: same for `doAsyncAbort()` — confirm FAIL

### Implementation for User Story 3

- [ ] T016 [US3] Verify Level 2 guard in `abort()` in `src/functions/abort/index.ts` uses exact message: `'[react-native-pagseguro-plugpag] ERROR: abort() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'` — adjust if message differs from contract
- [ ] T017 [US3] Verify Level 2 guard in `doAsyncAbort()` in `src/functions/abort/index.ts` uses exact message: `'[react-native-pagseguro-plugpag] ERROR: doAsyncAbort() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'` — adjust if message differs from contract

**Checkpoint**: `yarn test -- --testPathPattern=abort` passes all 7 JS scenarios (JS-A01–JS-A07). US3 independently functional.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T018 Run `yarn lint` — fix any ESLint violations in `src/functions/abort/`, `src/functions/index.ts`, `src/index.ts`, and `src/NativePagseguroPlugpag.ts`
- [ ] T019 [P] Run `yarn typecheck` — fix any TypeScript strict-mode errors; confirm zero `any` in abort domain
- [ ] T020 [P] Run `yarn test` — confirm full suite passes and abort test file reports exactly 7 passing scenarios (JS-A01–JS-A07)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — T002 then T003 sequentially; **BLOCKS** all Kotlin implementation
- **Phase 3 (US1)**: Tests T004–T007 can start after Phase 1 (parallel with each other, different files); implementation T008–T012 requires Phase 2 complete
- **Phase 4 (US2)**: Depends on Phase 3 complete (types.ts already exists); T013 can be written any time after T004
- **Phase 5 (US3)**: Depends on Phase 3 implementation (guards are in index.ts from T009); T015 can be written any time after T004
- **Final Phase**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 (Foundational) — no dependency on US2 or US3
- **US2 (P2)**: Can start after Phase 1 (types.ts stub exists) — adds one constant to an existing file; independent of US1 runtime behavior
- **US3 (P3)**: Depends on US1 implementation (guards live in index.ts created in T009) — cannot be verified before T009

### Within Phase 3

1. T004–T007 (test authoring) can all run in parallel — different files
2. T008 must complete before T009 (index.ts imports from types.ts)
3. T009 (JS) and T010 (Kotlin) can run in parallel — different files
4. T011 and T012 (barrel exports) can run in parallel — different files; require T009/T010 to be logically complete

---

## Parallel Execution Examples

### Phase 3 — Test Authoring (all in parallel)

```
Task T004: Create src/__tests__/functions/abort.test.ts (JS-A03, JS-A04)
Task T005: Append to abort.test.ts (JS-A05, JS-A06)         ← same file as T004, do sequentially
Task T006: Add KT-A01–KT-A03 to PagseguroPlugpagModuleTest.kt
Task T007: Add KT-A04–KT-A07 to PagseguroPlugpagModuleTest.kt  ← same file as T006, do sequentially
```

> Note: T004+T005 are the same file (abort.test.ts) — execute sequentially. T006+T007 are the same file (PagseguroPlugpagModuleTest.kt) — execute sequentially. T004/T005 group and T006/T007 group can run in parallel with each other.

### Phase 3 — Implementation (JS and Kotlin in parallel)

```
Task T009: Implement abort() + doAsyncAbort() in src/functions/abort/index.ts
Task T010: Implement Kotlin overrides in PagseguroPlugpagModule.kt
```

### Phase 3 — Barrel Exports (parallel)

```
Task T011: src/functions/index.ts  ← add export * from './abort'
Task T012: src/index.ts            ← add export type * from './functions/abort/types'
```

### Final Phase (parallel after all stories done)

```
Task T019: yarn typecheck
Task T020: yarn test
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational — T002 → T003 sequentially (CRITICAL — blocks Kotlin)
3. Write Phase 3 tests T004–T007 (red) → implement T008–T012 (green)
4. **STOP and VALIDATE**: `yarn test -- --testPathPattern=abort` — 4 JS scenarios pass (JS-A03–JS-A06), Kotlin tests pass
5. Deploy / demo MVP — abort and doAsyncAbort work on Android

### Incremental Delivery

1. Setup + Foundational → TurboModule Spec and codegen ready
2. US1 → Core abort functions working on Android (MVP)
3. US2 → OPERATION_ABORTED constant exported (enhances payment error handling)
4. US3 → iOS guard verified (cross-platform safety)
5. Polish → Full suite green, ready for PR

---

## Notes

- [P] tasks operate on different files — no merge conflicts when run concurrently
- TDD rule: run `yarn test -- --testPathPattern=abort` after each test-writing task to confirm the new tests FAIL (not just that they don't exist)
- T003 (codegen) is a Gradle task that takes ~2 minutes on first run; plan accordingly
- T010 Kotlin: `doAsyncAbort()` must NOT use coroutines — the SDK listener is the async mechanism (Constituição Princípio VI)
- T009 JS: `getNativeModule()` must be called only inside the function body, after the Level 2 guard — never at module top-level (would crash on iOS import)
- `OPERATION_ABORTED` is a value constant (`const`), not a type — it is covered by `export * from './abort'` in T011; the `export type *` in T012 will also export the type of the constant
- Codegen note: if `'abort' overrides nothing` appears in `PagseguroPlugpagModule.kt`, T003 was not run — re-run before proceeding
