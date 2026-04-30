# Implementation Plan: Abort Operation

**Branch**: `feature/012-abort-operation` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-abort-operation/spec.md`

## Summary

Expose `abort()` and `doAsyncAbort()` from the PlugPag SDK's `abort()` / `asyncAbort(listener)` to the React Native layer via a new `functions/abort` domain. A new `OPERATION_ABORTED` constant lets consuming apps distinguish operator cancellations from other payment failures. Threading follows established project conventions: synchronous variant uses `Dispatchers.IO`; async variant uses the SDK's native listener without coroutines.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`) + Kotlin 2.0.21
**Primary Dependencies**: PlugPagServiceWrapper `wrapper:1.33.0`, React Native 0.83.2 (New Architecture / TurboModules + JSI)
**Storage**: N/A — library with no persistent state
**Testing**: Jest 29 + react-native preset (JS); JUnit 5 + Mockk (Kotlin)
**Target Platform**: Android — PagBank SmartPOS terminals (A920, A930, P2, S920, GPOS780)
**Project Type**: React Native library (TurboModule)
**Performance Goals**: Abort acknowledged within seconds; no call hangs indefinitely (SC-002)
**Constraints**: No blocking calls on main thread; SDK `abort()` is IPC-blocking → requires `Dispatchers.IO`
**Scale/Scope**: 2 new JS functions, 2 new Kotlin overrides, 1 new domain folder

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Notes |
|---|---|---|
| **I — TurboModules Only** | ✅ PASS | `abort()` / `doAsyncAbort()` added to `NativePagseguroPlugpag.ts` spec; codegen regeneration mandatory after spec change |
| **II — TypeScript Strict / Zero `any`** | ✅ PASS | `PlugPagAbortSuccess` typed interface; `OPERATION_ABORTED` as `const`; no `any` needed for abort domain |
| **III — Test-First / TDD** | ✅ PASS | 7 JS test scenarios + 7 Kotlin tests documented in PRD; tests written before implementation |
| **IV — Clean Code + SOLID** | ✅ PASS | Dedicated `functions/abort/` domain (Single Responsibility); `abort` applies globally, no cross-domain coupling |
| **V — Device Compatibility / Fail-Fast** | ⚠️ DEFERRED | Principle V implementation is project-wide deferred — does not block this feature per existing project decision |
| **VI — Android-Only / iOS Guard** | ✅ PASS | Level 2 guard required in both `abort()` and `doAsyncAbort()`; `getNativeModule()` called only after guard; sync variant uses `Dispatchers.IO` (documented exception) |

**Gate result**: PASS — no violations. Feature may proceed.

## Project Structure

### Documentation (this feature)

```text
specs/012-abort-operation/
├── plan.md              ← This file
├── research.md          ← Phase 0 output (resolved from PRD.md — no open items)
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── abort-api.md     ← Phase 1 output — public TypeScript contract
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts        ← MODIFY: add abort() + doAsyncAbort() to Spec
├── functions/
│   ├── abort/                       ← NEW domain
│   │   ├── types.ts                 ← PlugPagAbortSuccess, OPERATION_ABORTED
│   │   └── index.ts                 ← abort(), doAsyncAbort() + Level 2 iOS guard + getNativeModule()
│   ├── activation/                  ← unchanged
│   ├── payment/                     ← unchanged
│   ├── print/                       ← unchanged
│   ├── refund/                      ← unchanged
│   └── index.ts                     ← MODIFY: add export * from './abort'
├── index.ts                         ← MODIFY: add export type * from './functions/abort/types'
└── __tests__/
    └── functions/
        └── abort.test.ts            ← NEW: 7 JS test scenarios (written before implementation)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt        ← MODIFY: add abort() + doAsyncAbort() overrides + PlugPagAbortListener import

android/src/test/java/com/pagseguroplugpag/
└── PagseguroPlugpagModuleTest.kt    ← MODIFY: add KT-A01 through KT-A07 (7 Kotlin tests)

android/build/generated/source/codegen/   ← REGENERATE after NativePagseguroPlugpag.ts change
```

**Structure Decision**: Single domain addition (`functions/abort/`) within the existing library structure. No new projects, no new top-level directories. Follows the established pattern from `activation`, `payment`, `refund`, `print`.

## Complexity Tracking

> No Constitution Check violations — section not applicable.
