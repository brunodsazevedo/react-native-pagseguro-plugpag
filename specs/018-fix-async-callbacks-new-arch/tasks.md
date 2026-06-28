---
description: "Task list — Correção de entrega de callbacks nos métodos doAsync* na New Architecture"
---

# Tasks: Correção de entrega de callbacks nos métodos `doAsync*` na New Architecture

**Input**: Design documents from `/specs/018-fix-async-callbacks-new-arch/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: INCLUÍDOS — exigidos pelo Princípio III (NON-NEGOTIABLE / TDD) e FR-008 (testes de integração Kotlin cobrindo resolução/rejeição dos `doAsync*`).

**Organization**: Tarefas agrupadas por user story. ⚠️ **Restrição de paralelismo**: os 5 métodos
`doAsync*` residem no mesmo arquivo `PagseguroPlugpagModule.kt` e seus testes no mesmo
`PagseguroPlugpagModuleTest.kt`. Edições nesses arquivos **NÃO** podem rodar em paralelo
(conflito de mesmo arquivo) — `[P]` só aparece em tarefas de arquivos distintos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivo diferente, sem dependências)
- **[Story]**: User story (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

- **Mobile library (Android-only)**: produção em `android/src/main/java/com/pagseguroplugpag/`,
  testes Kotlin em `android/src/test/java/com/pagseguroplugpag/`, camada JS em `src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar baseline verde antes de qualquer alteração; estabelecer ponto de partida.

- [X] T001 Confirmar baseline verde executando `yarn lint`, `yarn typecheck` e `yarn test` (testes JS dos `doAsync*` devem passar **antes** da correção, pois o mock nativo já simula resolve/reject — confirma que a camada JS é invisível ao threading)
- [X] T002 Confirmar que `src/NativePagseguroPlugpag.ts` **NÃO** será alterado e portanto o codegen Android NÃO precisa ser regenerado (verificação documental — nenhum método novo/removido/com assinatura diferente)

**Checkpoint**: Baseline confirmado — nenhuma mudança de spec/codegen necessária.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ajuste de harness de teste Kotlin compartilhado por TODAS as user stories.

**⚠️ CRITICAL**: Sem este harness, os testes Kotlin dos `doAsync*` (que passam a invocar o SDK dentro de `UiThreadUtil.runOnUiThread`) não conseguem capturar o listener — todo trabalho de US1/US2 depende disto.

- [X] T003 Adicionar import de `com.facebook.react.bridge.UiThreadUtil` e o setup de `mockkStatic(UiThreadUtil::class)` com `every { UiThreadUtil.runOnUiThread(any()) } answers { firstArg<Runnable>().run() }` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` (executar o runnable de forma síncrona no ambiente JUnit, que não possui main `Looper`) — ver research.md Decisão 5

**Checkpoint**: Harness pronto — implementação por user story pode começar.

---

## Phase 3: User Story 1 - Pagamento assíncrono resolve a Promise (Priority: P1) 🎯 MVP

**Goal**: `doAsyncPayment` resolve com `PlugPagTransactionResult` no sucesso e rejeita com `PLUGPAG_PAYMENT_ERROR` no erro, com `newArchEnabled=true`, sem regredir `onPaymentProgress`.

**Independent Test**: Em terminal físico, chamar `doAsyncPayment`, aprovar → Promise resolve; negar/cancelar → Promise rejeita com `PLUGPAG_PAYMENT_ERROR`; confirmar que `onPaymentProgress` continua chegando.

### Tests for User Story 1 ⚠️ (escrever PRIMEIRO, confirmar que FALHAM)

- [X] T004 [US1] Escrever/ajustar teste de integração Kotlin para `doAsyncPayment` cobrindo: (a) `onSuccess` → `promise.resolve(buildTransactionResultMap(result))`; (b) `onError` → `promise.reject("PLUGPAG_PAYMENT_ERROR", ...)`; (c) exceção interna → `promise.reject("PLUGPAG_INTERNAL_ERROR", ...)` — em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`, usando o mock de `UiThreadUtil` (T003). Confirmar que FALHA antes da correção.

### Implementation for User Story 1

- [X] T005 [US1] Envolver a invocação de `plugPag.doAsyncPayment(...)` (e a serialização de `PlugPagPaymentData` + `applyMaxTimeShowPopupIfPresent`) em `UiThreadUtil.runOnUiThread { ... }` no método `doAsyncPayment` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha ~349), preservando o `try/catch` → `PLUGPAG_INTERNAL_ERROR` e os callbacks `onSuccess`/`onError`/`onPaymentProgress` inalterados — ver contracts/doAsync-contract.md
- [X] T006 [US1] Adicionar o import `com.facebook.react.bridge.UiThreadUtil` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (uma vez, reutilizado por US2) e confirmar que o teste T004 passa

**Checkpoint**: `doAsyncPayment` resolve/rejeita a Promise; testes Kotlin verdes; pronto para validação em device (MVP).

---

## Phase 4: User Story 2 - Paridade dos demais métodos `doAsync*` (Priority: P1)

**Goal**: `doAsyncInitializeAndActivatePinPad`, `doAsyncAbort`, `doAsyncReprintCustomerReceipt` e `doAsyncReprintEstablishmentReceipt` resolvem/rejeitam suas Promises de forma equivalente, com `newArchEnabled=true`.

**Independent Test**: Exercitar cada um dos 4 métodos em device verificando resolução no sucesso e rejeição com o `PLUGPAG_<DOMAIN>_ERROR` correspondente; em teste, verificar registro do listener e resolução/rejeição via harness.

> ⚠️ **Mesmo arquivo** (`PagseguroPlugpagModule.kt` / `PagseguroPlugpagModuleTest.kt`) — tarefas desta fase são **sequenciais entre si** e dependem do import de `UiThreadUtil` (T006).

### Tests for User Story 2 ⚠️ (escrever PRIMEIRO, confirmar que FALHAM)

- [X] T007 [US2] Escrever/ajustar testes de integração Kotlin para `doAsyncInitializeAndActivatePinPad` (resolve `{result:'ok'}` / reject `PLUGPAG_INITIALIZATION_ERROR` / `PLUGPAG_INTERNAL_ERROR`) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T008 [US2] Escrever/ajustar testes de integração Kotlin para `doAsyncAbort` (resolve `{result:'ok'}` quando `onAbortRequested(true)` / reject `PLUGPAG_ABORT_ERROR` quando `false` ou `onError` / `PLUGPAG_INTERNAL_ERROR`) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`
- [X] T009 [US2] Escrever/ajustar testes de integração Kotlin para `doAsyncReprintCustomerReceipt` e `doAsyncReprintEstablishmentReceipt` (resolve `{result:'ok', steps}` / reject `PLUGPAG_PRINT_ERROR` / `PLUGPAG_INTERNAL_ERROR`) em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`

### Implementation for User Story 2

- [X] T010 [US2] Envolver `plugPag.doAsyncInitializeAndActivatePinpad(...)` em `UiThreadUtil.runOnUiThread { ... }` no método `doAsyncInitializeAndActivatePinPad` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha ~268), preservando contrato e `try/catch`
- [X] T011 [US2] Envolver `plugPag.asyncAbort(...)` em `UiThreadUtil.runOnUiThread { ... }` no método `doAsyncAbort` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha ~206), preservando contrato e `try/catch`
- [X] T012 [US2] Envolver `plugPag.asyncReprintCustomerReceipt(...)` em `UiThreadUtil.runOnUiThread { ... }` no método `doAsyncReprintCustomerReceipt` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha ~496), preservando contrato e `try/catch`
- [X] T013 [US2] Envolver `plugPag.asyncReprintEstablishmentReceipt(...)` em `UiThreadUtil.runOnUiThread { ... }` no método `doAsyncReprintEstablishmentReceipt` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha ~539), preservando contrato e `try/catch`
- [X] T014 [US2] Rodar a suíte Kotlin (`cd example/android && ./gradlew :react-native-pagseguro-plugpag:test`) e confirmar T007/T008/T009 verdes

**Checkpoint**: Os 5 métodos `doAsync*` concluem a Promise; paridade estrutural completa; testes Kotlin verdes.

---

## Phase 5: User Story 3 - Compatibilidade preservada e contrato JS estável (Priority: P2)

**Goal**: Nenhuma mudança de código JS exigida do consumidor; API pública e códigos de erro idênticos; remoção dos comentários `EXCEPTION` agora redundantes (Threading Policy v1.4.0).

**Independent Test**: Os testes JS existentes dos `doAsync*` passam sem alteração de asserção; `git diff` confirma zero mudança de assinatura/tipo público.

### Tests for User Story 3 ⚠️

- [X] T015 [P] [US3] Executar `yarn test` e confirmar que os testes JS dos `doAsync*` em `src/__tests__/functions/{payment,activation,refund,print}.test.ts` permanecem verdes **sem alteração de asserção** (FR-006 / SC-004)

### Implementation for User Story 3

- [X] T016 [US3] Remover os 8 comentários `// EXCEPTION (Constituição Princípio VI): ...` dos métodos com gerência de thread em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (`calculateInstallments`, `abort`, `initializeAndActivatePinPad`, `doPayment`, `doRefund`/`voidPayment`, `printFromFile`, `reprintCustomerReceipt`, `reprintEstablishmentReceipt`) — FR-009; NÃO refatorar a lógica desses métodos bloqueantes
- [X] T017 [US3] Confirmar via `git diff` que `src/` (assinaturas públicas, tipos, códigos de erro) permanece inalterado e que nenhuma mudança JS é exigida do consumidor (FR-006)

**Checkpoint**: Contrato JS estável; comentários de exceção removidos; constituição v1.4.0 refletida no código.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates finais, documentação, versionamento e validação em device.

- [X] T018 Atualizar `CHANGELOG.md` — mover/registrar o bugfix em `[Unreleased]` → seção `Fixed` (Issue #13: `doAsync*` agora resolvem/rejeitam a Promise na New Architecture via `UiThreadUtil.runOnUiThread`) — FR-010
- [X] T019 Bump de versão **patch** `1.2.2` → `1.2.3` em `package.json` (correção de bug sem mudança de API — SemVer) — FR-010
- [X] T020 Executar os gates locais: `yarn lint`, `yarn typecheck`, `yarn test` — todos verdes (SC-005)
- [X] T021 Build Android do app de exemplo: `yarn example android` — concluído com sucesso (SC-005)
- [X] T022 Rodar a suíte de integração Kotlin completa (`cd example/android && ./gradlew :react-native-pagseguro-plugpag:test`) — todos os testes `doAsync*` passando (SC-006)
- [ ] T023 Validação em terminal físico PagBank seguindo `specs/018-fix-async-callbacks-new-arch/quickstart.md` (SC-001, SC-002, SC-003) — **NÃO bloqueante de merge**. Estratégia: publicar uma **versão RC no npm** e validar com o autor da Issue #13 se os `doAsync*` passaram a resolver/rejeitar a Promise. Se confirmar → promover RC para `latest`; se falhar → acionar o fallback Opção C (research.md Decisão 2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA** todas as user stories (harness de teste).
- **User Story 1 (Phase 3)**: depende da Foundational. Entrega o MVP (`doAsyncPayment`).
- **User Story 2 (Phase 4)**: depende da Foundational + import de `UiThreadUtil` (T006, criado em US1).
- **User Story 3 (Phase 5)**: depende de US1+US2 estarem implementadas (remoção de comentários e verificação do diff fazem mais sentido após as edições do módulo).
- **Polish (Phase 6)**: depende de todas as user stories completas.

### User Story Dependencies

- **US1 (P1)**: independentemente testável; cria o import compartilhado de `UiThreadUtil` (T006).
- **US2 (P1)**: reutiliza o import de T006; demais métodos no mesmo arquivo → sequencial após US1.
- **US3 (P2)**: verificação de estabilidade + limpeza; logicamente após as edições de US1/US2.

### Within Each User Story

- Testes escritos e confirmados FALHANDO antes da implementação (TDD — Princípio III).
- Implementação após os testes; validação ao fim de cada story.

### Parallel Opportunities

- ⚠️ Paralelismo **muito limitado**: produção e testes concentram-se em 2 arquivos.
- T015 (`[P]`, roda `yarn test` sobre `src/__tests__/`) é independente das edições Kotlin e pode rodar em paralelo com a Phase 4/5.
- Dentro de `PagseguroPlugpagModule.kt` e `PagseguroPlugpagModuleTest.kt`, **nenhuma** tarefa é paralelizável (conflito de mesmo arquivo).

---

## Parallel Example

```bash
# Único par genuinamente paralelo (arquivos distintos):
# - T015: yarn test sobre src/__tests__/ (camada JS)
# - qualquer tarefa Kotlin em andamento sobre android/src/
Task: "T015 — yarn test confirmando testes JS dos doAsync* verdes sem mudança"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) → baseline verde.
2. Phase 2 (Foundational) → harness `mockkStatic(UiThreadUtil)`.
3. Phase 3 (US1) → `doAsyncPayment` corrigido + testes Kotlin verdes.
4. **PARAR e VALIDAR** em terminal físico: `doAsyncPayment` resolve/rejeita; `onPaymentProgress` sem regressão.
5. Demo do MVP (caso central da Issue #13 resolvido).

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → valida `doAsyncPayment` (MVP).
3. US2 → paridade dos outros 4 `doAsync*`.
4. US3 → confirma contrato JS estável + remove comentários `EXCEPTION`.
5. Polish → CHANGELOG, bump, gates, build, validação em device (bloqueante de merge).

---

## Notes

- `[P]` = arquivos diferentes, sem dependências (raro nesta feature).
- `[Story]` mapeia a tarefa à user story para rastreabilidade.
- Verificar testes FALHANDO antes de implementar (TDD).
- Commit após cada tarefa ou grupo lógico.
- **Codegen NÃO precisa ser regenerado** — `NativePagseguroPlugpag.ts` não muda.
- **Merge bloqueado** até a validação em terminal físico (T023).
- Evitar: editar `PagseguroPlugpagModule.kt` / `PagseguroPlugpagModuleTest.kt` concorrentemente.
