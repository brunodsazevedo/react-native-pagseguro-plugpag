---

description: "Task list for bugfix/011-fail-fast-type-validation"
---

# Tasks: Fail-Fast em Tipos de Pagamento, Parcelamento e Estorno

**Input**: Design documents from `specs/011-fail-fast-type-validation/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/validation-errors.md ✅

**Scope**: 4 TypeScript files modified — zero native changes, zero codegen.

**Tests**: Incluídos (TDD obrigatório — Constituição Princípio III).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Establish a passing baseline before any changes.

- [X] T001 Run `yarn test` from the project root and confirm all existing tests pass — this is the red/green baseline; do not proceed if any test is already failing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Convert re-export patterns to `import` + `export` in both domain files so that
const objects (`PaymentType`, `InstallmentType`, `PlugPagVoidType`) are available as runtime
bindings for `Object.values()`. This change has no behavioral effect and requires no new tests.
Both tasks target different files and can run in parallel.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — US1/US2 depend
on T002 and US3 depends on T003.

- [X] T002 [P] In `src/functions/payment/index.ts`, replace `export { PaymentType, InstallmentType } from './types'` with `import { PaymentType, InstallmentType } from './types'` (Grupo 2 — value import, alphabetical order) plus a bare `export { PaymentType, InstallmentType }` at the bottom of the file; verify `yarn test` still passes after this refactor
- [X] T003 [P] In `src/functions/refund/index.ts`, replace `export { PlugPagVoidType } from './types'` with `import { PlugPagVoidType } from './types'` (Grupo 2 — value import) plus a bare `export { PlugPagVoidType }` at the bottom of the file; verify `yarn test` still passes after this refactor

**Checkpoint**: Both import conversions complete and all existing tests still pass.

---

## Phase 3: User Story 1 — Rejeição de Tipo de Pagamento Inválido (Priority: P1) 🎯 MVP

**Goal**: `doPayment()` and `doAsyncPayment()` reject any request whose `type` field is not
one of `CREDIT`, `DEBIT`, `PIX` — including wrong casing, null, and undefined — with an
auto-descriptive error message that includes the received value and the accepted values.

**Independent Test**: Send `doPayment({ ...validRequest, type: 'INVALIDO' as any })` and
assert it rejects with a message containing `type "INVALIDO" is not valid` and
`CREDIT, DEBIT, PIX`. No native call should be made.

### Tests for User Story 1 (TDD — write BEFORE implementing T005)

> **NOTE: Write these tests FIRST and confirm they FAIL before any implementation**

- [X] T004 [US1] In `src/__tests__/functions/payment.test.ts`, inside the existing `describe('validatePaymentRequest', ...)` block, add three test cases: (a) `type: 'INVALID' as any` rejects with message containing `type "INVALID" is not valid` and `CREDIT, DEBIT, PIX`; (b) `type: 'credit' as any` (lowercase) rejects with message containing `type "credit" is not valid`; (c) `doAsyncPayment({ ...validRequest, type: 'INVALID' as any })` rejects identically to `doPayment` (FR-007 consistency); run `yarn test` and confirm these three tests FAIL (red phase)

### Implementation for User Story 1

- [X] T005 [US1] In `src/functions/payment/index.ts`, inside `validatePaymentRequest`, add a `type` validation block at position 1 (before all existing validations): `const validPaymentTypes = Object.values(PaymentType)` → `if (!validPaymentTypes.includes(data.type))` → throw with message `[react-native-pagseguro-plugpag] ERROR: doPayment() — type "${String(data.type)}" is not valid. Accepted values: ${validPaymentTypes.join(', ')}.`; this task depends on T002 (PaymentType must be an in-scope binding)
- [X] T006 [US1] Run `yarn test` — confirm T004 tests now pass and no existing tests regressed (green phase); if any existing test fails, fix before proceeding

**Checkpoint**: User Story 1 is fully functional — `doPayment` and `doAsyncPayment` reject
invalid `type` values with descriptive errors.

---

## Phase 4: User Story 2 — Rejeição de Tipo de Parcelamento Inválido (Priority: P2)

**Goal**: `doPayment()` and `doAsyncPayment()` reject any request whose `installmentType`
field is not one of `A_VISTA`, `PARC_VENDEDOR`, `PARC_COMPRADOR` — with the same
auto-descriptive error message format.

**Independent Test**: Send `doPayment({ ...validRequest, installmentType: 'PARCELADO' as any })`
and assert it rejects with a message containing `installmentType "PARCELADO" is not valid`
and `A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR`.

### Tests for User Story 2 (TDD — write BEFORE implementing T008)

> **NOTE: Write these tests FIRST and confirm they FAIL before any implementation**

- [X] T007 [US2] In `src/__tests__/functions/payment.test.ts`, inside the existing `describe('validatePaymentRequest', ...)` block, add two test cases: (a) `installmentType: 'PARCELADO' as any` rejects with message containing `installmentType "PARCELADO" is not valid` and `A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR`; (b) `installmentType: null as any` rejects with message containing `installmentType "null" is not valid`; run `yarn test` and confirm these tests FAIL (red phase)

### Implementation for User Story 2

- [X] T008 [US2] In `src/functions/payment/index.ts`, inside `validatePaymentRequest`, add an `installmentType` validation block at position 2 (immediately after the `type` validation added in T005, before the existing `amount` validation): `const validInstallmentTypes = Object.values(InstallmentType)` → `if (!validInstallmentTypes.includes(data.installmentType))` → throw with message `[react-native-pagseguro-plugpag] ERROR: doPayment() — installmentType "${String(data.installmentType)}" is not valid. Accepted values: ${validInstallmentTypes.join(', ')}.`; this task depends on T002 and T005
- [X] T009 [US2] Run `yarn test` — confirm T007 tests now pass and no existing tests regressed (green phase); verify the full `payment.test.ts` suite is green

**Checkpoint**: User Stories 1 AND 2 both work independently — both `type` and
`installmentType` are validated with descriptive errors.

---

## Phase 5: User Story 3 — Rejeição de Tipo de Estorno Inválido (Priority: P3)

**Goal**: `doRefund()` rejects any request whose `voidType` field is not one of
`VOID_PAYMENT`, `VOID_QRCODE`, with an error message that includes the received value
and the accepted values (upgrading from the current generic `'voidType'` message).

**Independent Test**: Send `doRefund({ ...validRequest, voidType: 'ESTORNO' as any })`
and assert it rejects with a message containing `voidType "ESTORNO" is not valid` and
`VOID_PAYMENT, VOID_QRCODE`.

### Tests for User Story 3 (TDD — update BEFORE implementing T011)

> **NOTE: Update the existing test FIRST and confirm it FAILS before any implementation**

- [X] T010 [US3] In `src/__tests__/functions/refund.test.ts`, update the existing `'rejects when voidType is invalid'` test: replace the current `rejects.toThrow('voidType')` assertion with two `expect.objectContaining` assertions — (a) message contains `voidType "INVALID" is not valid`; (b) message contains `VOID_PAYMENT, VOID_QRCODE`; run `yarn test` and confirm this test FAILS (red phase — current message format lacks the received value)

### Implementation for User Story 3

- [X] T011 [US3] In `src/functions/refund/index.ts`, inside `validateRefundRequest`, update the `voidType` validation block: derive valid values via `const validVoidTypes = Object.values(PlugPagVoidType)` → update the `if (!validVoidTypes.includes(data.voidType))` throw message to: `[react-native-pagseguro-plugpag] ERROR: doRefund() — voidType "${String(data.voidType)}" is not valid. Accepted values: ${validVoidTypes.join(', ')}.`; this task depends on T003 (PlugPagVoidType must be an in-scope binding)
- [X] T012 [US3] Run `yarn test` — confirm T010 test now passes and no existing tests regressed (green phase)

**Checkpoint**: All three user stories are independently functional — payment type,
installment type, and refund void type are all validated with descriptive errors.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gates — mandatory per Constituição before any PR.

- [X] T013 Run `yarn lint` — must exit with zero errors and zero warnings; if any lint error is found, fix it before proceeding (BLOCKING per Constituição v1.3.0)
- [X] T014 Run `yarn typecheck` — must exit with zero TypeScript errors (`strict: true`); verify no `any` was introduced without a documented `// EXCEPTION: <reason>` comment
- [X] T015 Run full `yarn test` — 100% pass rate across all domains (payment, refund, activation, print); confirm no regressions in any test file not touched by this bugfix

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
  - T002 and T003 can run in parallel (different files)
- **User Stories (Phases 3–5)**: All depend on Foundational phase completion
  - US1 (Phase 3) and US3 (Phase 5) can be done in parallel by different developers (different files)
  - US2 (Phase 4) depends on US1 completion (same file — `payment/index.ts`)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (payment import conversion) — T004 (tests) can be written in parallel with T002
- **US2 (P2)**: Depends on T002 AND T005 (US1 implementation) — same function `validatePaymentRequest`, validation order must be preserved (type → installmentType → amount → ...)
- **US3 (P3)**: Depends on T003 (refund import conversion) only — fully independent of US1/US2

### Within Each User Story

1. Write tests FIRST (TDD red phase) — confirm failure before implementing
2. Implement validation
3. Run `yarn test` to confirm green phase
4. No story is complete until its checkpoint test passes

### Parallel Opportunities

- T002 and T003 (Phase 2) can run in parallel — different files
- US1 (Phase 3) and US3 (Phase 5) can run in parallel — different files and different domains
- T013 and T014 (Phase 6) can be run in parallel — independent CLI commands

---

## Parallel Example: Foundational Phase

```bash
# Run in parallel (different files, no dependencies):
Task T002: "Convert re-export in src/functions/payment/index.ts"
Task T003: "Convert re-export in src/functions/refund/index.ts"
```

## Parallel Example: US1 + US3

```bash
# After Phase 2 completes, with two developers:
Developer A (Phase 3): "Write T004 tests → implement T005 → verify T006"
Developer B (Phase 5): "Write T010 tests → implement T011 → verify T012"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: User Story 1 (T004 → T005 → T006)
4. **STOP and VALIDATE**: `doPayment` and `doAsyncPayment` reject invalid `type` values
5. Continue with US2 and US3 in priority order

### Incremental Delivery

1. T001 (Setup) → T002+T003 (Foundation) → Foundation ready
2. T004→T006 (US1) → Payment type validated → MVP
3. T007→T009 (US2) → InstallmentType validated → MVP+
4. T010→T012 (US3) → Refund voidType validated → Complete
5. T013→T015 (Polish) → PR-ready

### Single-Developer Sequence (Recommended)

```
T001 → T002+T003 (parallel) → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015
```

---

## Notes

- [P] tasks = different files, no dependencies — safe to run in parallel
- [Story] label maps each task to a specific user story for traceability
- Tests MUST be written and confirmed FAILING before implementation (TDD red→green)
- Commit after each Phase or logical group (Constituição PR Checklist)
- Stop at any Phase 3/4/5 checkpoint to validate the story independently
- Zero `any` without `// EXCEPTION: <reason>` — enforced by T014 (`yarn typecheck`)
- `yarn lint` must pass with zero warnings — enforced by T013 (BLOCKING)
- `NativePagseguroPlugpag.ts` is NOT modified — no codegen needed
