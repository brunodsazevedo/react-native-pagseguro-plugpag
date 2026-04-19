# Implementation Plan: Feature 006 — Custom Printing

**Branch**: `feature/006-custom-printing` | **Date**: 2026-03-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-custom-printing/spec.md`

## Summary

Adiciona suporte a impressão personalizada expondo 5 novas funções na API pública: `printFromFile` (variante síncrona única — SDK não tem async), `reprintCustomerReceipt` / `doAsyncReprintCustomerReceipt` e `reprintEstablishmentReceipt` / `doAsyncReprintEstablishmentReceipt`. Tipos públicos (`PrintRequest`, `PrintResult`, `PrintQuality`, `MIN_PRINTER_STEPS`) definidos em `src/printing.ts`. Validação de parâmetros no lado JS antes de acionar hardware. Três códigos de erro distintos por camada: `PLUGPAG_VALIDATION_ERROR` (JS), `PLUGPAG_PRINT_ERROR` (hardware), `PLUGPAG_INTERNAL_ERROR` (IPC).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21
**Primary Dependencies**: PlugPagServiceWrapper 1.33.0, React Native 0.83.2 (New Architecture / TurboModules + JSI)
**Storage**: N/A
**Testing**: Jest 29 + react-native preset (JS), JUnit 5 + Mockk (Kotlin)
**Target Platform**: Android SmartPOS PagBank (A920, A930, P2, S920)
**Project Type**: React Native library (TurboModule)
**Performance Goals**: N/A (hardware I/O bound — printing speed determined by terminal hardware)
**Constraints**: SDK API shapes fixed (`PlugPagPrinterData`, `PlugPagPrinterListener`, `PlugPagPrintResult`); `PlugPagPrinterListener` in root wrapper package (not `listeners` sub-package); `reprintStablishmentReceipt` SDK typo (see research.md)
**Scale/Scope**: 5 new exported functions, 1 new source module (`printing.ts`), 5 new TurboModule methods

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I — TurboModules Only | ✅ PASS | 5 new methods added to `NativePagseguroPlugpag.ts` spec; codegen must be regenerated |
| II — TypeScript Strict Zero `any` | ✅ PASS | `PrintRequest`/`PrintResult`/`PrintQuality` fully typed in `src/printing.ts`; `Object` in spec only (codegen requirement, documented exception) |
| III — Test-First / TDD | ✅ PASS | Tests written before implementation per workflow |
| IV — Clean Code + SOLID | ✅ PASS | New domain module `src/printing.ts` (Princípio IV — each module owns one domain) |
| V — Device Compatibility | ⚠️ DEFERRED | Same status as existing features — dedicated feature planned post-003 |
| VI — Android-Only Scope | ✅ PASS | iOS Level 2 guard in all 5 exported functions; blocking methods use `Dispatchers.IO` (documented exception) |

**Post-design re-check**: ✅ No violations introduced by Phase 1 design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/006-custom-printing/
├── plan.md              ← This file (/speckit.plan output)
├── spec.md              ← Feature specification
├── research.md          ← Phase 0 output: SDK API verification, decisions
├── data-model.md        ← Phase 1 output: TypeScript types + SDK internal types
├── quickstart.md        ← Phase 1 output: usage examples + error handling
├── contracts/
│   ├── turbomodule-spec.ts   ← TurboModule spec additions (5 new methods)
│   └── kotlin-methods.md     ← Kotlin override method signatures
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts   ← +5 methods: printFromFile, reprintCustomerReceipt,
│                                  doAsyncReprintCustomerReceipt, reprintEstablishmentReceipt,
│                                  doAsyncReprintEstablishmentReceipt
├── printing.ts                 ← NEW: PrintRequest, PrintResult, PrintQuality, MIN_PRINTER_STEPS
├── index.tsx                   ← +5 exported functions + re-exports from printing.ts
└── __tests__/
    └── index.test.tsx          ← +5 new describe blocks (TDD — written before implementation)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt   ← +1 helper (buildPrintErrorUserInfo) + 5 override methods
                                   + new imports (PlugPagPrinterData, PlugPagPrinterListener)

android/src/test/java/com/pagseguroplugpag/
└── PagseguroPlugpagModuleTest.kt  ← +5 new @Nested test groups
```

**Structure Decision**: Single-project library layout (existing pattern). `src/printing.ts` follows the domain-per-module pattern from Constituição Princípio IV — consistent with existing implicit domain grouping in `index.tsx`.

## Implementation Phases

### Phase 1 — TypeScript Layer (TDD: Red first)

1. Add `PrintRequest`, `PrintResult`, `PrintQuality`, `MIN_PRINTER_STEPS` to `src/printing.ts`.
2. Add 5 methods to `NativePagseguroPlugpag.ts`.
3. **Run codegen**: `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` (MANDATORY).
4. Write failing tests in `src/__tests__/index.test.tsx` for all 5 functions (all scenarios from spec).
5. Implement 5 functions in `src/index.tsx` with validation + iOS guards.
6. Confirm tests pass. Run `yarn lint` and `yarn typecheck`.

### Phase 2 — Kotlin Layer (TDD: Red first)

1. Write failing Kotlin tests in `PagseguroPlugpagModuleTest.kt` for all 5 methods.
2. Add `buildPrintErrorUserInfo` helper to `PagseguroPlugpagModule.kt`.
3. Implement 5 `override fun` methods in `PagseguroPlugpagModule.kt`.
4. Confirm Kotlin tests pass.

### Phase 3 — Polish & Validation

1. `yarn lint` — zero errors/warnings.
2. `yarn typecheck` — zero errors.
3. `yarn test` — all tests green.
4. Manual smoke test on device (optional — verify physical printing).

## Key Decisions

| Decision | Rationale |
|---|---|
| `printFromFile` sync-only | SDK has no `asyncPrintFromFile` — confirmed from AAR |
| `PLUGPAG_VALIDATION_ERROR` new code | Required by SC-002 (distinguishable error codes per layer) |
| `PlugPagPrinterListener` root package | Verified from AAR — differs from activation/payment listeners |
| SDK typo `reprintStablishmentReceipt` | Called internally with typo; public API uses correct spelling (FR-013) |
| Types in `src/printing.ts` | Constituição Princípio IV — domain-per-module separation |
| Steps clamping | SDK clamps values < 70 to 70 internally; library only rejects negatives |

## Complexity Tracking

No constitution violations requiring justification. All deviations are documented exceptions per existing Constituição rules (Dispatchers.IO for blocking SDK calls per Princípio VI).
