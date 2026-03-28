# Tasks: Feature 005 — Estorno de Pagamento (doRefund)

**Input**: Design documents from `/specs/005-refund-payment/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**TDD**: Testes são obrigatórios por Constituição Princípio III — escritos ANTES da implementação e confirmados falhando.

**Organization**: Tarefas agrupadas por user story para permitir implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências entre si)
- **[Story]**: User story correspondente (US1, US2, US3)
- Paths exatos incluídos em cada descrição

---

## Phase 1: Setup — TurboModule Spec + Codegen

**Purpose**: Registrar o novo método na spec do TurboModule e regenerar os artefatos de codegen. Bloqueia toda implementação Kotlin até que o override exista na spec Java gerada.

**⚠️ CRITICAL**: O codegen DEVE ser regenerado antes de qualquer implementação Kotlin — sem isso, o override `doRefund` não compilará.

- [X] T001 Adicionar `doRefund(data: Object): Promise<Object>` à interface `Spec` em `src/NativePagseguroPlugpag.ts` (após `doAsyncPayment`)
- [X] T002 Regenerar codegen: `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` — confirmar que `NativePagseguroPlugpagSpec.java` contém `doRefund`

**Checkpoint**: `NativePagseguroPlugpagSpec.java` atualizado — Kotlin pode compilar o override.

---

## Phase 2: Foundational — Tipos TypeScript + Infraestrutura Kotlin

**Purpose**: Definir os tipos públicos e atualizar a infraestrutura compartilhada que todas as user stories dependem. Deve ser concluída antes de qualquer fase de user story.

**⚠️ CRITICAL**: Os tipos precisam existir antes que os testes possam compilar.

- [X] T003 Adicionar `PlugPagVoidType` (const object) e `PlugPagVoidTypeValue` (type) em `src/index.tsx` — após o bloco `InstallmentType`
- [X] T004 Adicionar interface `PlugPagRefundRequest` em `src/index.tsx` — após `PlugPagPaymentRequest`
- [X] T005 Estender `PlugPagTransactionResult` em `src/index.tsx` com 6 campos opcionais: `nsu?`, `cardApplication?`, `label?`, `holderName?`, `extendedHolderName?`, `autoCode?` (todos `string | null`) — campos existentes inalterados
- [X] T006 [P] Adicionar `import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagVoidData` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`
- [X] T007 Atualizar `buildTransactionResultMap` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` adicionando `putStringOrNull` para os 6 novos campos: `nsu`, `cardApplication`, `label`, `holderName`, `extendedHolderName`, `autoCode`

**Checkpoint**: Foundation pronta — testes de user stories podem ser escritos e compilados.

---

## Phase 3: User Story 1 — Estorno de Cartão (Priority: P1) 🎯 MVP

**Goal**: Expor `doRefund` para estorno de transações de cartão (crédito/débito) com `voidType: 'VOID_PAYMENT'`, incluindo guard iOS, validações JS e implementação nativa Kotlin.

**Independent Test**: Chamar `doRefund({ transactionCode: 'TXN123', transactionId: 'ID456', voidType: 'VOID_PAYMENT' })` no Android e verificar que a promise resolve com `PlugPagTransactionResult` contendo `transactionCode` e `transactionId`. Testar também que rejeita corretamente em cenários de erro.

### Testes JS para User Story 1 (TDD — escrever PRIMEIRO, confirmar falha)

> **⚠️ Escrever estes testes ANTES de qualquer implementação — DEVEM FALHAR inicialmente.**

- [X] T008 [US1] Adicionar `mockDoRefund = jest.fn()` ao mock de `NativePagseguroPlugpag` em `src/__tests__/index.test.tsx` e adicionar `doRefund: mockDoRefund` ao objeto default do mock
- [X] T009 [US1] Escrever teste `doRefund — iOS platform guard`: rejeita com `[react-native-pagseguro-plugpag] ERROR:` quando chamado no iOS (cenário T040a) em `src/__tests__/index.test.tsx`
- [X] T010 [US1] Escrever testes `doRefund — Android normal operation`: resolve com `PlugPagTransactionResult` (T040b), rejeita com `PLUGPAG_REFUND_ERROR` (T040d), rejeita com `PLUGPAG_INTERNAL_ERROR` (T040e) em `src/__tests__/index.test.tsx`
- [X] T011 [US1] Escrever testes `doRefund — JS validation`: rejeita quando `transactionCode` é vazio sem chamar native (T041a), quando `transactionId` é vazio (T041b), quando `voidType` é inválido (T041c), e passa para o native quando `printReceipt` é omitido (T041d) em `src/__tests__/index.test.tsx`
- [X] T012 [US1] Confirmar que todos os testes de US1 falham: executar `yarn test -- --testPathPattern="index.test"` e verificar falhas nos testes de `doRefund`

### Testes Kotlin para User Story 1 (TDD — escrever PRIMEIRO, confirmar falha)

> **⚠️ Escrever estes testes ANTES da implementação Kotlin — DEVEM FALHAR inicialmente.**

- [X] T013 [P] [US1] Escrever teste Kotlin `doRefund resolves with PlugPagTransactionResult on RET_OK` (KT-R01) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T014 [P] [US1] Escrever teste Kotlin `doRefund rejects with PLUGPAG_REFUND_ERROR when SDK result is not RET_OK` (KT-R02) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T015 [P] [US1] Escrever teste Kotlin `doRefund rejects with PLUGPAG_INTERNAL_ERROR when exception is thrown` (KT-R03) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T016 [P] [US1] Escrever teste Kotlin `buildTransactionResultMap maps 6 new fields (nsu, cardApplication, label, holderName, extendedHolderName, autoCode)` (KT-R05) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T017 [P] [US1] Escrever teste Kotlin `doRefund rejects with PLUGPAG_REFUND_ERROR when result field is null` (KT-R06) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`

### Implementação TypeScript para User Story 1

- [X] T018 [US1] Implementar `validateRefundRequest(data: PlugPagRefundRequest): void` em `src/index.tsx` com validações: `transactionCode` não vazio, `transactionId` não vazio, `voidType` dentro de `Object.values(PlugPagVoidType)`
- [X] T019 [US1] Implementar `export async function doRefund(data: PlugPagRefundRequest): Promise<PlugPagTransactionResult>` em `src/index.tsx` com guard iOS (Nível 2), chamada a `validateRefundRequest`, import lazy de `NativePagseguroPlugpag` e type assertion no retorno
- [X] T020 [US1] Executar `yarn test -- --testPathPattern="index.test"` e confirmar que T009–T011 passam

### Implementação Kotlin para User Story 1

- [X] T021 [US1] Implementar `override fun doRefund(data: ReadableMap, promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` com `Dispatchers.IO`, mapeamento `when()` de `voidType`, `PlugPagVoidData`, `setEventListener` (antes e `noop` no `finally`), `plugPag.voidPayment(voidData)`, `PLUGPAG_REFUND_ERROR` e `PLUGPAG_INTERNAL_ERROR` (incluir comentário `// EXCEPTION (Constituição Princípio VI): SDK voidPayment é bloqueante por IPC — Dispatchers.IO é necessário`)
- [X] T022 [US1] Executar `yarn lint` — confirmar zero erros ou avisos após as alterações em `src/index.tsx` e `PagseguroPlugpagModule.kt`

**Checkpoint**: US1 completa — `doRefund` para cartão funciona end-to-end. `yarn test` passa nos cenários T040a, T040b, T040d, T040e, T041a–d. Testes Kotlin KT-R01, KT-R02, KT-R03, KT-R05, KT-R06 mapeados.

---

## Phase 4: User Story 2 — Estorno PIX / QR Code (Priority: P2)

**Goal**: Garantir que `doRefund` com `voidType: 'VOID_QRCODE'` mapeia corretamente para `PlugPag.VOID_QRCODE` (int 2) no SDK e resolve com `PlugPagTransactionResult` válido.

**Independent Test**: Chamar `doRefund({ transactionCode: 'TXN999', transactionId: 'ID888', voidType: 'VOID_QRCODE' })` e verificar que resolve. Verificar também que passar `VOID_PAYMENT` em uma transação PIX causa erro do SDK (comportamento esperado, não do consumidor).

**Nota**: Não há nova implementação — o mapeamento `when("VOID_QRCODE" -> PlugPag.VOID_QRCODE)` já está na implementação Kotlin da US1. Esta fase valida o cenário e confirma os testes.

### Testes para User Story 2 (TDD — escrever PRIMEIRO, confirmar falha antes de verificar implementação)

- [X] T023 [US2] Escrever teste `doRefund — VOID_QRCODE success`: resolve com `PlugPagTransactionResult` quando `voidType: 'VOID_QRCODE'` (T040c) em `src/__tests__/index.test.tsx`
- [X] T024 [P] [US2] Escrever teste Kotlin `doRefund uses VOID_QRCODE constant when voidType is "VOID_QRCODE"` (KT-R04) verificando que `PlugPagVoidData` é instanciado com `voidType = PlugPag.VOID_QRCODE` (int 2) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T025 [US2] Executar `yarn test -- --testPathPattern="index.test"` e confirmar T040c passa (nenhuma nova implementação necessária — `PlugPagVoidType.VOID_QRCODE` já é aceito pela validação JS e mapeado no Kotlin)

**Checkpoint**: US2 completa — todos os tipos de estorno suportados validados. T040c e KT-R04 passam.

---

## Phase 5: User Story 3 — Eventos de Progresso durante Estorno (Priority: P3)

**Goal**: Garantir que o canal `onPaymentProgress` existente emite eventos durante `doRefund` e que o listener é removido corretamente ao término da operação.

**Independent Test**: Registrar um listener com `subscribeToPaymentProgress` (ou `usePaymentProgress`), chamar `doRefund`, simular emissão de `onPaymentProgress` via `DeviceEventEmitter`, e verificar que o callback é invocado com `{ eventCode: number, customMessage: string | null }`.

**Nota**: Não há nova implementação — o `setEventListener` já está configurado no `doRefund` Kotlin (US1). Esta fase valida o comportamento de eventos e garante que o listener noop no `finally` previne emissões residuais.

### Testes para User Story 3

- [X] T026 [US3] Escrever teste `doRefund — emits onPaymentProgress events during refund`: registrar `subscribeToPaymentProgress`, emitir `DeviceEventEmitter.emit('onPaymentProgress', {...})` e verificar que o callback é invocado em `src/__tests__/index.test.tsx`
- [X] T027 [US3] Escrever teste `doRefund — no residual events after completion`: verificar que após o estorno concluir, um `DeviceEventEmitter.emit` não dispara o callback registrado em `src/__tests__/index.test.tsx`
- [X] T028 [US3] Executar `yarn test -- --testPathPattern="index.test"` e confirmar T026–T027 passam

**Checkpoint**: US3 completa — canal de eventos funciona durante o estorno sem regressões no sistema de eventos existente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final, lint, typecheck e confirmação de zero regressões nas features anteriores.

- [X] T029 Executar `yarn typecheck` — confirmar zero erros de tipo (especialmente na extensão de `PlugPagTransactionResult` e nos tipos de `doRefund`)
- [X] T030 Executar `yarn lint` — confirmar zero erros ou avisos em todos os arquivos alterados
- [X] T031 Executar `yarn test` (suite completa) — confirmar que todos os testes passam incluindo features 002 e 003 (zero regressões)
- [X] T032 Verificar cobertura: todas as funções exportadas em `src/index.tsx` possuem teste unitário — checar `doRefund`, `PlugPagVoidType`, `PlugPagRefundRequest` e a extensão de `PlugPagTransactionResult`
- [X] T033 [P] Revisar `quickstart.md` em `specs/005-refund-payment/quickstart.md` e validar que os exemplos refletem a implementação final (nenhuma diferença entre exemplos e código real)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — iniciar imediatamente. **BLOQUEIA** toda implementação Kotlin.
- **Foundational (Phase 2)**: Depende de Phase 1 (codegen atualizado). **BLOQUEIA** todas as user stories.
- **US1 (Phase 3)**: Depende de Foundational — pode iniciar após Phase 2. MVP mínimo.
- **US2 (Phase 4)**: Depende de Phase 2 (tipos existem). Pode rodar em paralelo com US1 se time duplo (sem conflito de arquivo para testes, mas T018–T021 em src/index.tsx e PagseguroPlugpagModule.kt devem ser concluídos antes de T023 ser executado para validar).
- **US3 (Phase 5)**: Depende de US1 (Phase 3) estar completa — eventos dependem de doRefund estar implementado.
- **Polish (Phase 6)**: Depende de todas as user stories desejadas serem concluídas.

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Phase 2. Sem dependências de outras stories.
- **US2 (P2)**: Pode iniciar após Phase 2. Não requer nova implementação — valida comportamento já criado em US1.
- **US3 (P3)**: Depende de US1 estar completa (doRefund implementado para que eventos possam ser testados end-to-end).

### Dentro de Cada User Story

1. Testes JS DEVEM ser escritos e confirmados **falhando** antes de T018–T019
2. Testes Kotlin DEVEM ser escritos e confirmados **falhando** antes de T021
3. `yarn lint` após cada fase de implementação (T022, T030)
4. Confirmar testes passam após implementação antes de avançar

### Parallel Opportunities

- T003 (index.tsx) + T006 (PagseguroPlugpagModule.kt) — arquivos diferentes, podem rodar em paralelo
- T013–T017 (testes Kotlin US1) — todos no mesmo arquivo, mas sem dependências entre si — podem ser escritos em sequência rápida
- T008–T011 (testes JS US1) — mesmo arquivo, sequenciais
- T013–T017 [marcados P] podem ser escritos enquanto T008–T011 são escritos (arquivos diferentes: index.test.tsx vs PagseguroPlugpagModuleTest.kt)
- T023 (teste JS US2) + T024 (teste Kotlin US2) — podem rodar em paralelo (arquivos diferentes)

---

## Parallel Example: User Story 1

```bash
# Escrever testes em paralelo (arquivos diferentes):
Task A: T008–T011 — "Testes JS doRefund em src/__tests__/index.test.tsx"
Task B: T013–T017 — "Testes Kotlin doRefund em PagseguroPlugpagModuleTest.kt"

# Implementar em paralelo (após testes escritos):
Task A: T018–T019 — "Implementar doRefund em src/index.tsx"
Task B: T021      — "Implementar doRefund em PagseguroPlugpagModule.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Estorno de Cartão)

1. Concluir **Phase 1**: Setup (T001–T002)
2. Concluir **Phase 2**: Foundational (T003–T007)
3. Concluir **Phase 3**: US1 (T008–T022)
4. **PARAR e VALIDAR**: `yarn test` completo + `yarn lint` + `yarn typecheck`
5. `doRefund` para cartão pronto — MVP entregável.

### Incremental Delivery

1. Setup + Foundational → infraestrutura pronta
2. US1 → `doRefund` funciona para cartão → MVP!
3. US2 → validação de PIX adicionada (apenas testes, zero código novo)
4. US3 → cobertura de eventos confirmada
5. Polish → suite completa verde

### Sequência Recomendada para Desenvolvedor Solo

```
T001 → T002 → T003 → T004 → T005 → T006 → T007
→ T008 → T009 → T010 → T011 → T012 (confirmar falha)
→ T013 → T014 → T015 → T016 → T017 (Kotlin — confirmar falha)
→ T018 → T019 → T020 (implementar JS + confirmar JS verde)
→ T021 → T022 (implementar Kotlin + lint)
→ T023 → T024 → T025 (US2)
→ T026 → T027 → T028 (US3)
→ T029 → T030 → T031 → T032 → T033 (polish)
```

---

## Notes

- `[P]` = arquivos diferentes, sem dependências — podem ser executados em paralelo
- `[Story]` mapeia tarefa para user story específica para rastreabilidade
- TDD é **obrigatório** (Constituição Princípio III) — testes devem ser escritos e confirmados falhando antes de qualquer implementação
- Executar `yarn lint` após T022 e novamente em T030 — DEVE passar antes de abrir PR
- Sem `doAsyncRefund` — SDK 1.33.0 não oferece listener assíncrono para `voidPayment`
- US2 e US3 não requerem novo código de implementação — apenas testes adicionais
- A extensão de `PlugPagTransactionResult` (T005 + T007) beneficia também `doPayment`/`doAsyncPayment` existentes retroativamente
