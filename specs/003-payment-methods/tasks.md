# Tasks: Métodos de Pagamento (Crédito, Débito e PIX)

**Input**: Design documents from `/specs/003-payment-methods/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: TDD obrigatório — FR-014 (mínimo 13 cenários Jest) e FR-015 (mínimo 6 cenários Kotlin). Testes escritos ANTES da implementação e confirmados como falhando (Red → Green → Refactor).

**Organization**: Tarefas agrupadas por User Story para permitir implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências em tarefas incompletas)
- **[Story]**: User Story correspondente ([US1]–[US6])
- Paths absolutos conforme estrutura do projeto

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Atualizar o contrato JS↔Native e definir todos os tipos públicos — pré-requisito para escrever testes.

- [X]T001 Update `src/NativePagseguroPlugpag.ts` — add `doPayment(data: Object): Promise<Object>`, `doAsyncPayment(data: Object): Promise<Object>`, `addListener(eventName: string): void`, `removeListeners(count: number): void` to the `Spec` interface
- [X]T002 Add public types to `src/index.tsx` — `PaymentType` (const object), `InstallmentType` (const object), `PlugPagPaymentType` (string literal union), `PlugPagInstallmentType` (string literal union), `PlugPagPaymentRequest` (interface), `PlugPagTransactionResult` (interface), `PlugPagPaymentProgressEvent` (interface)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Helpers Kotlin compartilhados — obrigatórios antes de qualquer implementação nativa.

**⚠️ CRÍTICO**: Nenhum método Kotlin pode ser implementado sem esses helpers.

- [X]T003 Add Kotlin imports to `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `PlugPagEventListener`, `PlugPagPaymentData`, `PlugPagPaymentListener`, `PlugPagTransactionResult` (SDK), `Arguments`, `ReadableMap`, `DeviceEventManagerModule`
- [X]T004 [P] Implement `buildTransactionResultMap(result: PlugPagTransactionResult): WritableNativeMap` private helper in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — maps all 12 nullable fields (`transactionCode`, `transactionId`, `date`, `time`, `hostNsu`, `cardBrand`, `bin`, `holder`, `userReference`, `terminalSerialNumber`, `amount`, `availableBalance`)
- [X]T005 [P] Implement `buildSdkPaymentErrorUserInfo(result: PlugPagTransactionResult): WritableNativeMap` private helper in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — fields: `result` (Int), `errorCode` (String), `message` (String)
- [X]T006 [P] Implement `emitPaymentProgress(eventData: PlugPagEventData)` private helper in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — emits `"onPaymentProgress"` event with `{ eventCode: Int, customMessage: String? }` via `RCTDeviceEventEmitter`
- [X]T007 [P] Implement `addListener(eventName: String) {}` and `override fun removeListeners(count: Double) {}` (empty bodies) in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — mandatory NativeEventEmitter contract (count is Double per codegen mapping)

**Checkpoint**: Helpers prontos — implementação dos métodos principais pode começar.

---

## Phase 3: User Story 1 — Pagamento via Crédito à Vista (Priority: P1) 🎯 MVP

**Goal**: `doPayment` funcional ponta a ponta para crédito à vista — iOS guard, sucesso, erro SDK, erro interno. Valida toda a arquitetura de `doPayment`.

**Independent Test**: Chamar `doPayment({ type: 'CREDIT', amount: 1000, installmentType: 'A_VISTA', installments: 1 })` e verificar que a promise resolve com `PlugPagTransactionResult` contendo `transactionCode` não-nulo; ou que rejeita com `PLUGPAG_PAYMENT_ERROR`/`PLUGPAG_INTERNAL_ERROR` no formato correto.

### Testes para User Story 1 (TDD — escrever ANTES, confirmar RED)

- [X]T008 [US1] Write Jest tests for `doPayment` in `src/__tests__/index.test.tsx`: (a) iOS guard — rejeita com `[react-native-pagseguro-plugpag] ERROR:`, (b) Android sucesso — resolve com `PlugPagTransactionResult`, (c) Android erro SDK — rejeita com `PLUGPAG_PAYMENT_ERROR` e `userInfo: { result, errorCode, message }`, (d) Android erro interno — rejeita com `PLUGPAG_INTERNAL_ERROR` e `userInfo: { result: -1, errorCode: 'INTERNAL_ERROR' }` — confirmar que todos os 4 cenários **falham** (RED)
- [X]T009 [P] [US1] Write Kotlin tests for `doPayment` in `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` (criar arquivo se não existir): (a) sucesso — resolve com `PlugPagTransactionResult` serializado, (b) erro SDK — rejeita com `PLUGPAG_PAYMENT_ERROR`, (c) erro interno — rejeita com `PLUGPAG_INTERNAL_ERROR` — confirmar que todos os 3 cenários **falham** (RED)

### Implementação para User Story 1

- [X]T010 [US1] Implement `doPayment` stub in `src/index.tsx` — iOS guard (Level 2), `amount <= 0` validation, `installments < 1` validation, lazy native module load, call `PagseguroPlugpag.doPayment(data)`, type-assert return as `Promise<PlugPagTransactionResult>`
- [X]T011 [US1] Implement `doPayment(data: ReadableMap, promise: Promise)` in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `Dispatchers.IO` coroutine, map type/installmentType via `when`, build `PlugPagPaymentData`, call `plugPag.setEventListener` (with `emitPaymentProgress`), call `plugPag.doPayment()`, `withContext(Main)` for resolve/reject, `setEventListener(no-op)` in `finally` block. Add `// EXCEPTION (Constituição Princípio VI): SDK doPayment é bloqueante por IPC — Dispatchers.IO é necessário` comment.
- [X]T012 [US1] Confirm T008 Jest tests pass (GREEN) — run `yarn test` and verify 4 doPayment scenarios pass
- [X]T013 [US1] Confirm T009 Kotlin tests pass (GREEN) — run Kotlin test suite and verify 3 doPayment scenarios pass

**Checkpoint**: `doPayment` crédito à vista funcional — US1 independentemente testável.

---

## Phase 4: User Story 2 — Validações de Parcelamento (Priority: P1)

**Goal**: Todas as regras de validação JS para `doPayment` — PARC_* com `installments < 2`, PIX/DEBIT com `installmentType != A_VISTA`, `userReference > 10 chars`. A chamada nunca chega ao nativo quando a validação falha.

**Independent Test**: Chamar `doPayment` com `installmentType: 'PARC_VENDEDOR'` e `installments: 1` → verificar rejeição imediata (antes do nativo). Chamar com `type: 'PIX'` e `installmentType: 'PARC_VENDEDOR'` → rejeição imediata.

### Testes para User Story 2 (TDD — escrever ANTES, confirmar RED)

- [X]T014 [US2] Write Jest validation tests for `doPayment` in `src/__tests__/index.test.tsx`: (a) `installments: 0` — rejeita antes do nativo, (b) `PARC_VENDEDOR` + `installments: 1` — rejeita, (c) `PIX` + `PARC_VENDEDOR` — rejeita, (d) `DEBIT` + `PARC_COMPRADOR` — rejeita, (e) `userReference: 'TOOLONGREF01'` (11 chars) — rejeita — confirmar que todos os 5 cenários **falham** (RED)

### Implementação para User Story 2

- [X]T015 [US2] Add `PARC_*` installment validation in `doPayment` in `src/index.tsx` — if `installmentType === 'PARC_VENDEDOR' || installmentType === 'PARC_COMPRADOR'` and `installments < 2`, throw with descriptive message
- [X]T016 [US2] Add PIX/DEBIT cross-validation in `doPayment` in `src/index.tsx` — if `type === 'PIX' || type === 'DEBIT'` and `installmentType !== 'A_VISTA'`, throw with descriptive message
- [X]T017 [US2] Add `userReference` length validation in `doPayment` in `src/index.tsx` — if `userReference` provided and `userReference.length > 10`, throw with descriptive message (NFR-001: never log userReference value)
- [X]T018 [US2] Confirm T014 Jest tests pass (GREEN) — run `yarn test` and verify 5 validation scenarios pass

**Checkpoint**: Todas as validações JS de `doPayment` funcionais — US2 independentemente testável.

---

## Phase 5: User Story 3 — Pagamento via PIX (Priority: P1)

**Goal**: Confirmar que `doPayment` com `type: 'PIX'` serializa corretamente e prossegue ao nativo. Aproveita implementação de `doPayment` já existente (US1) — apenas garante cobertura do fluxo PIX.

**Independent Test**: Chamar `doPayment({ type: 'PIX', amount: 5000, installmentType: 'A_VISTA', installments: 1 })` — verificar que não rejeita por validação JS e prossegue ao nativo com os valores corretos.

### Testes para User Story 3 (TDD — escrever ANTES, confirmar RED)

- [X]T019 [US3] Write Jest test for `doPayment` PIX scenario in `src/__tests__/index.test.tsx` — Android + type PIX + sucesso → resolve com `PlugPagTransactionResult` (verifica que a chamada não é bloqueada por validação JS) — confirmar RED

### Implementação para User Story 3

- [X]T020 [US3] Verify `when (type) { "PIX" -> PlugPag.TYPE_PIX }` mapping exists in `doPayment` Kotlin implementation in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — add `PlugPag.TYPE_PIX` case if missing
- [X]T021 [US3] Confirm T019 Jest test passes (GREEN) — run `yarn test`

**Checkpoint**: Fluxo PIX validado — US3 independentemente testável.

---

## Phase 6: User Story 4 — Eventos de Progresso (Priority: P1)

**Goal**: Sistema de eventos de progresso completo — `usePaymentProgress` hook + `subscribeToPaymentProgress` utility + `onPaymentProgress` emitido pelo Kotlin durante `doPayment`.

**Independent Test**: Montar componente com `usePaymentProgress(callback)`, emitir evento `onPaymentProgress`, verificar callback chamado. Desmontar componente, emitir evento, verificar callback NÃO chamado (cleanup).

### Testes para User Story 4 (TDD — escrever ANTES, confirmar RED)

- [X]T022 [US4] Write Jest tests for `usePaymentProgress` in `src/__tests__/index.test.tsx`: (a) callback chamado com `{ eventCode, customMessage }` quando evento emitido, (b) listener removido automaticamente no unmount (sem memory leak) — confirmar RED
- [X]T023 [P] [US4] Write Jest tests for `subscribeToPaymentProgress` in `src/__tests__/index.test.tsx`: (a) callback chamado quando evento emitido, (b) listener removido após `unsubscribe()` — confirmar RED

### Implementação para User Story 4

- [X]T024 [US4] Create shared `NativeEventEmitter` instance in `src/index.tsx` — `import { NativeEventEmitter, NativeModules } from 'react-native'` — `const emitter = new NativeEventEmitter(NativeModules.PagseguroPlugpag as EventSubscriptionVendor)` at module top-level (após iOS guard level 1)
- [X]T025 [US4] Implement `usePaymentProgress(callback)` hook in `src/index.tsx` — `useRef` for callback (always current), `useEffect(() => { const sub = emitter.addListener('onPaymentProgress', ...); return () => sub.remove(); }, [])` — zero internal state, zero re-renders
- [X]T026 [US4] Implement `subscribeToPaymentProgress(callback)` utility in `src/index.tsx` — `const sub = emitter.addListener('onPaymentProgress', callback); return () => sub.remove()`
- [X]T027 [US4] Verify `emitPaymentProgress` is called inside `doPayment` Kotlin's `PlugPagEventListener.onEvent` in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — confirm event emission wired correctly
- [X]T028 [US4] Confirm T022 and T023 Jest tests pass (GREEN) — run `yarn test`

**Checkpoint**: Sistema de eventos funcional — US4 independentemente testável.

---

## Phase 7: User Story 5 — Variante Assíncrona (Priority: P2)

**Goal**: `doAsyncPayment` funcional com `PlugPagPaymentListener` como resolvedor primário — mesmo contrato de entrada/saída que `doPayment`, sem coroutines.

**Independent Test**: Chamar `doAsyncPayment` com dados válidos → verificar que resolve/rejeita com mesmo formato que `doPayment`. Chamar em iOS → verificar guard.

### Testes para User Story 5 (TDD — escrever ANTES, confirmar RED)

- [X]T029 [US5] Write Jest tests for `doAsyncPayment` in `src/__tests__/index.test.tsx`: (a) iOS guard — rejeita com `[react-native-pagseguro-plugpag] ERROR:`, (b) Android sucesso — resolve com `PlugPagTransactionResult`, (c) Android erro SDK — rejeita com `PLUGPAG_PAYMENT_ERROR`, (d) Android erro interno — rejeita com `PLUGPAG_INTERNAL_ERROR` — confirmar RED
- [X]T030 [P] [US5] Write Kotlin tests for `doAsyncPayment` in `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: (a) sucesso via `onSuccess` — resolve com `PlugPagTransactionResult`, (b) erro SDK via `onError` — rejeita com `PLUGPAG_PAYMENT_ERROR`, (c) erro interno via exception — rejeita com `PLUGPAG_INTERNAL_ERROR` — confirmar RED

### Implementação para User Story 5

- [X]T031 [US5] Implement `doAsyncPayment` in `src/index.tsx` — reuse iOS guard pattern and same validations as `doPayment` (DRY: extract `validatePaymentRequest` helper if beneficial), call `PagseguroPlugpag.doAsyncPayment(data)`, type-assert return
- [X]T032 [US5] Implement `doAsyncPayment(data: ReadableMap, promise: Promise)` in `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — no coroutines, call `plugPag.doAsyncPayment(data, listener)` where `listener: PlugPagPaymentListener` implements `onSuccess` (resolve), `onError` (reject PLUGPAG_PAYMENT_ERROR — no result check needed), `onPaymentProgress` (emitPaymentProgress), wrap in try/catch for PLUGPAG_INTERNAL_ERROR
- [X]T033 [US5] Confirm T029 Jest tests pass (GREEN) — run `yarn test`
- [X]T034 [US5] Confirm T030 Kotlin tests pass (GREEN)

**Checkpoint**: `doAsyncPayment` funcional — US5 independentemente testável.

---

## Phase 8: User Story 6 — Demonstração no App de Exemplo (Priority: P3)

**Goal**: App de exemplo demonstra `doPayment` e `doAsyncPayment` com subscrição a `onPaymentProgress` para os três tipos de pagamento.

**Independent Test**: Inspecionar `example/src/App.tsx` — contém uso de `doPayment`, `doAsyncPayment` e `usePaymentProgress`; não contém código de `multiply`.

### Implementação para User Story 6

- [X]T035 [US6] Update `example/src/App.tsx` — replace PinPad activation demo with payment demo: add `usePaymentProgress` hook with state for progress messages, add buttons/handlers for `doPayment` (CREDIT, DEBIT, PIX) and `doAsyncPayment` (CREDIT), display progress events and transaction result, remove any `multiply` references or unrelated imports

**Checkpoint**: App de exemplo pronto — US6 verificável.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validação final de qualidade e lint.

- [X]T036 [P] Run `yarn test` — confirm 100% of all test scenarios pass (mínimo: 4 doPayment + 5 validações + 1 PIX + 2 usePaymentProgress + 2 subscribeToPaymentProgress + 4 doAsyncPayment = 18+ Jest scenarios)
- [X]T037 [P] Run Kotlin test suite — confirm 100% of Kotlin scenarios pass (3 doPayment + 3 doAsyncPayment = 6 mínimo)
- [X]T038 Run `yarn lint` — confirm zero errors or warnings (Constitution v1.2.0 — NFR-003, Absolute Prohibitions)
- [X]T039 Run `yarn typecheck` — confirm zero TypeScript errors (`strict: true`, zero `any`)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup — T001, T002)
    │
    ▼
Phase 2 (Foundational — T003–T007) ← BLOCKS all Kotlin implementations
    │
    ├─► Phase 3 (US1 — doPayment crédito à vista) ← MVP
    │       │
    │       ▼
    │   Phase 4 (US2 — Validações de parcelamento) ← depende de doPayment existir
    │       │
    │       ▼
    │   Phase 5 (US3 — PIX) ← depende de doPayment existir
    │       │
    │       ▼
    │   Phase 6 (US4 — Eventos) ← depende de doPayment+doAsyncPayment para wire
    │
    ├─► Phase 7 (US5 — doAsyncPayment) ← pode iniciar após Phase 2
    │
    └─► Phase 8 (US6 — Example app) ← depende de US1+US4+US5 para demo completa
            │
            ▼
        Phase 9 (Polish)
```

### User Story Dependencies

- **US1 (P1)**: Depende apenas da Phase 2 (Foundational) — sem dependências entre stories
- **US2 (P1)**: Depende de US1 (adiciona validações ao `doPayment` existente)
- **US3 (P1)**: Depende de US1 (verifica fluxo PIX no `doPayment` existente)
- **US4 (P1)**: Depende de US1 (eventos são wired no `doPayment` Kotlin)
- **US5 (P2)**: Pode iniciar após Phase 2 — independente de US1 na camada JS
- **US6 (P3)**: Depende de US1, US4 e US5 para demo completa

### Within Each User Story

- Testes DEVEM ser escritos e confirmados como falhando **antes** de qualquer implementação (TDD)
- Implementação Kotlin depende dos helpers da Phase 2
- Confirmar GREEN após cada story antes de prosseguir

---

## Parallel Opportunities

```bash
# Phase 2 — todos os helpers em paralelo (arquivos diferentes na mesma classe, blocos distintos):
T004: buildTransactionResultMap
T005: buildSdkPaymentErrorUserInfo
T006: emitPaymentProgress
T007: addListener / removeListeners

# Phase 3 — testes Jest e Kotlin em paralelo (linguagens diferentes):
T008: Jest tests doPayment
T009: Kotlin tests doPayment

# Phase 6 — testes usePaymentProgress e subscribeToPaymentProgress em paralelo:
T022: Jest tests usePaymentProgress
T023: Jest tests subscribeToPaymentProgress

# Phase 7 — testes Jest e Kotlin para doAsyncPayment em paralelo:
T029: Jest tests doAsyncPayment
T030: Kotlin tests doAsyncPayment

# Phase 9 — yarn test e Kotlin test suite em paralelo:
T036: yarn test (Jest)
T037: Kotlin test suite
```

---

## Implementation Strategy

### MVP First (User Stories 1–4 apenas)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T007)
3. Complete Phase 3: US1 — doPayment crédito à vista (T008–T013)
4. Complete Phase 4: US2 — Validações (T014–T018)
5. Complete Phase 5: US3 — PIX (T019–T021)
6. Complete Phase 6: US4 — Eventos (T022–T028)
7. **STOP e VALIDAR**: `doPayment` com eventos funcionando — core da biblioteca entregue

### Incremental Delivery

1. Setup + Foundational → contrato estabelecido
2. US1 → `doPayment` básico funcional (MVP!)
3. US2 → validações completas de parcelamento
4. US3 → PIX confirmado
5. US4 → eventos de progresso
6. US5 → `doAsyncPayment` (variante assíncrona)
7. US6 → app de exemplo
8. Polish → lint + typecheck limpos

---

## Notes

- `[P]` = arquivos diferentes, sem dependências em tarefas incompletas do mesmo grupo
- `[Story]` mapeia a tarefa à User Story para rastreabilidade
- TDD obrigatório: verificar RED antes de implementar
- `setEventListener(null)` **proibido** — parâmetro `@NotNull` no SDK — usar no-op object
- `userReference` **nunca** logado nem incluído em mensagens de erro (NFR-001)
- `Dispatchers.IO` somente em `doPayment` — documentar exception inline (Constituição Princípio VI)
- `doAsyncPayment` sem coroutines — usa `PlugPagPaymentListener` diretamente
- `count` em `removeListeners` é `Double` no Kotlin (codegen mapping de `number` TS)
- Executar `yarn lint` após cada fase — DEVE passar sem erros antes de prosseguir
- Parar em cada checkpoint para validar a story independentemente
