---
description: "Task list for feature 016 — maxTimeShowPopup"
---

# Tasks: Suporte a `maxTimeShowPopup` do `PlugPagCustomPrinterLayout`

**Input**: Design documents from `/specs/016-max-time-show-popup/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/public-api.md ✅, quickstart.md ✅

**Tests**: INCLUÍDOS — TDD é NON-NEGOTIABLE (Constituição Princípio III). Testes JS e Kotlin
são escritos ANTES da implementação e confirmados como falhando.

**Organization**: Tarefas agrupadas por user story para implementação/teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Biblioteca React Native single-project. Caminhos relativos à raiz do repositório:
`src/functions/<domain>/`, `src/__tests__/functions/`, `android/src/main/.../PagseguroPlugpagModule.kt`,
`android/src/test/.../PagseguroPlugpagModuleTest.kt`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar pré-condições. Mudança é aditiva — nenhum método nativo novo.

- [X] T001 Confirmar que `src/NativePagseguroPlugpag.ts` NÃO será alterado (campo trafega no payload `Object` de `doPayment`/`doAsyncPayment`/`doRefund`) e que, portanto, NÃO há regeneração de codegen nesta feature (research.md Decisão 3). Validar branch `feature/016-max-time-show-popup` ativa.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Helper Kotlin compartilhado de aplicação do layout, reutilizado pelas 3 operações.

**⚠️ CRITICAL**: Nenhuma user story pode ser concluída no lado nativo antes deste helper existir.

- [X] T002 [P] Escrever teste Kotlin (FALHANDO) para o helper privado de aplicação de layout em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: (a) quando `maxTimeShowPopup` presente → `plugPag.setPlugPagCustomPrinterLayout(...)` é chamado com o valor inteiro cru; (b) quando ausente (`!data.hasKey`) → `setPlugPagCustomPrinterLayout` NÃO é chamado (mockk `verify(exactly = 0)`).
- [X] T003 Implementar helper privado `applyMaxTimeShowPopupIfPresent(data: ReadableMap)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` que, se `data.hasKey("maxTimeShowPopup")`, cria `PlugPagCustomPrinterLayout().apply { maxTimeShowPopup = data.getInt("maxTimeShowPopup") }` e chama `plugPag.setPlugPagCustomPrinterLayout(layout)` — sem conversão de unidade (FR-005); caso contrário, nenhuma chamada (FR-004). Faz T002 passar.

**Checkpoint**: Helper compartilhado pronto — wiring por operação pode começar.

---

## Phase 3: User Story 1 - Liberar fluxo de pagamento após timeout do popup (Priority: P1) 🎯 MVP

**Goal**: Expor `maxTimeShowPopup?: number` em `PlugPagPaymentRequest` e aplicá-lo ao layout antes de `doPayment`, validando inteiro >= 0 no JS antes de qualquer chamada nativa.

**Independent Test**: Chamar `doPayment({ ..., printReceipt: true, maxTimeShowPopup: 10 })` e confirmar que o valor é repassado ao layout antes da operação (popup fecha em até 10s); `-1`/`1.5` rejeitam com prefixo `ERROR:`; campo omitido preserva comportamento atual.

### Tests for User Story 1 ⚠️ (escrever PRIMEIRO, confirmar FALHANDO)

- [X] T004 [P] [US1] Adicionar cenários `maxTimeShowPopup` para `doPayment` em `src/__tests__/functions/payment.test.ts`: válido `10` (resolve, passa o campo ao módulo nativo), omitido (resolve, comportamento atual), `0` (válido), negativo `-1` (rejeita com `[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.`), não-inteiro `1.5` (mesma rejeição), iOS (rejeita com guard ANTES da validação do campo — FR-008).
- [X] T005 [P] [US1] Adicionar teste Kotlin em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: `doPayment` aplica o layout (chama o helper / `setPlugPagCustomPrinterLayout`) ANTES de `plugPag.doPayment(...)` quando o campo está presente; e NÃO aplica quando ausente.

### Implementation for User Story 1

- [X] T006 [US1] Adicionar `maxTimeShowPopup?: number` (com JSDoc "em segundos. Inteiro >= 0.") em `PlugPagPaymentRequest` no arquivo `src/functions/payment/types.ts` (data-model.md).
- [X] T007 [US1] Adicionar validação em `validatePaymentRequest` em `src/functions/payment/index.ts`: predicado `data.maxTimeShowPopup === undefined || (Number.isInteger(data.maxTimeShowPopup) && data.maxTimeShowPopup >= 0)`; senão lançar `Error` `[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.` (depende de T006). Validação roda DEPOIS do guard iOS e ANTES da chamada nativa.
- [X] T008 [US1] Invocar `applyMaxTimeShowPopupIfPresent(data)` dentro do `try` de `doPayment` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`, imediatamente antes de `plugPag.doPayment(paymentData)`; falha de layout propaga como `PLUGPAG_INTERNAL_ERROR` via `catch` existente (FR-009) (depende de T003). Faz T005 passar.

**Checkpoint**: `doPayment` com `maxTimeShowPopup` totalmente funcional e testável de forma independente (MVP).

---

## Phase 4: User Story 2 - Mesmo controle de timeout no estorno (Priority: P1)

**Goal**: Expor `maxTimeShowPopup?: number` em `PlugPagRefundRequest` e aplicá-lo antes de `voidPayment`, com validação idêntica.

**Independent Test**: Chamar `doRefund({ ..., maxTimeShowPopup: 10 })` e confirmar que o valor é aplicado ao layout antes do estorno; valores inválidos rejeitam com prefixo `ERROR:`; omitido preserva comportamento atual.

### Tests for User Story 2 ⚠️ (escrever PRIMEIRO, confirmar FALHANDO)

- [X] T009 [P] [US2] Adicionar cenários `maxTimeShowPopup` para `doRefund` em `src/__tests__/functions/refund.test.ts`: válido `10`, omitido, `0`, negativo (rejeita `[react-native-pagseguro-plugpag] ERROR: doRefund() — maxTimeShowPopup must be an integer >= 0.`), não-inteiro (mesma rejeição), iOS (guard precede validação).
- [X] T010 [US2] Adicionar teste Kotlin em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: `voidPayment` (via `doRefund`) aplica o layout quando o campo está presente e NÃO aplica quando ausente.

### Implementation for User Story 2

- [X] T011 [P] [US2] Adicionar `maxTimeShowPopup?: number` (JSDoc "em segundos. Inteiro >= 0.") em `PlugPagRefundRequest` no arquivo `src/functions/refund/types.ts` (duplicação intencional — domínio-específico, research.md Decisão 6).
- [X] T012 [US2] Adicionar validação em `validateRefundRequest` em `src/functions/refund/index.ts` com o mesmo predicado de T007, lançando mensagem prefixada para `doRefund()` (depende de T011).
- [X] T013 [US2] Invocar `applyMaxTimeShowPopupIfPresent(data)` dentro do `try` do fluxo de `doRefund`/`voidPayment` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`, imediatamente antes de `plugPag.voidPayment(voidData)` (depende de T003). Faz T010 passar.

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Paridade na variante assíncrona (Priority: P2)

**Goal**: Aplicar `maxTimeShowPopup` em `doAsyncPayment` com comportamento idêntico ao `doPayment`. Tipo e validação JS já são reaproveitados de US1 (mesmo `PlugPagPaymentRequest` / `validatePaymentRequest`).

**Independent Test**: Chamar `doAsyncPayment({ ..., maxTimeShowPopup: 10 })` e confirmar que o valor é aplicado antes da operação assíncrona, idêntico à variante síncrona.

### Tests for User Story 3 ⚠️ (escrever PRIMEIRO, confirmar FALHANDO)

- [X] T014 [US3] Adicionar cenários `maxTimeShowPopup` para `doAsyncPayment` em `src/__tests__/functions/payment.test.ts`: válido `10` (passa o campo), iOS (rejeita), inválido (rejeita) — confirmando paridade com `doPayment`.
- [X] T015 [US3] Adicionar teste Kotlin em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: `doAsyncPayment` aplica o layout quando o campo está presente e NÃO aplica quando ausente.

### Implementation for User Story 3

- [X] T016 [US3] Invocar `applyMaxTimeShowPopupIfPresent(data)` no fluxo de `doAsyncPayment` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`, antes de `plugPag.doAsyncPayment(...)` (depende de T003; validação JS já coberta por T007). Faz T015 passar.

**Checkpoint**: As três operações suportam o campo com comportamento consistente (SC-003).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentação pública declarando a unidade "segundos" (FR-012) e gates de validação.

- [X] T017 [P] Documentar `maxTimeShowPopup` (unidade segundos, inteiro >= 0, semântica do `0`) no inventário de tipos e exemplos de `README.md`.
- [X] T018 [P] Documentar o mesmo campo em `README.pt-BR.md`.
- [X] T019 [P] Atualizar o inventário de tipos em `CLAUDE.md` (`PlugPagPaymentRequest` e `PlugPagRefundRequest`) adicionando `maxTimeShowPopup?: number`.
- [ ] T020 [P] (Opcional) Demonstrar o campo em `example/src/App.tsx`.
- [X] T021 Rodar `yarn lint`, `yarn typecheck` e `yarn test` — todos verdes, zero `any`, zero avisos.
- [ ] T022 Rodar testes Kotlin (`./gradlew test` no example/android) e validar quickstart.md (cenários: válido, omitido, 0, negativo, não-inteiro, iOS).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; BLOQUEIA o wiring nativo de todas as stories.
- **User Stories (Phase 3–5)**: dependem do helper de Phase 2 (T003).
  - US1 (P1) e US2 (P1) são independentes entre si (arquivos de domínio distintos).
  - US3 (P2) reaproveita tipo/validação de US1 (T006/T007) mas só os usa no JS; o wiring Kotlin (T016) depende apenas de T003.
- **Polish (Phase 6)**: depende das stories desejadas concluídas.

### Within Each User Story

- Testes (T004/T005, T009/T010, T014/T015) escritos e FALHANDO antes da implementação.
- Tipos (T006/T011) antes da validação (T007/T012).
- Wiring Kotlin (T008/T013/T016) depende do helper T003.

### Parallel Opportunities

- **Phase 2**: T002 [P] (teste) pode ser escrito enquanto se planeja T003.
- **US1**: T004 (JS) e T005 (Kotlin) em paralelo — arquivos diferentes.
- **US2**: T009 (JS), T011 (types.ts) em paralelo; T010 (Kotlin test) toca o mesmo arquivo de teste das outras stories (serializar entre stories).
- **Polish**: T017, T018, T019, T020 em paralelo — arquivos diferentes.
- **Atenção**: `PagseguroPlugpagModule.kt` (T008/T013/T016) e `PagseguroPlugpagModuleTest.kt` (T002/T005/T010/T015) são arquivos únicos — tarefas que os tocam NÃO rodam em paralelo entre si; o mesmo vale para `payment.test.ts` (T004/T014).

---

## Parallel Example: User Story 1

```bash
# Lançar os testes de US1 juntos (arquivos diferentes):
Task: "Cenários maxTimeShowPopup para doPayment em src/__tests__/functions/payment.test.ts"
Task: "Teste Kotlin de aplicação de layout em doPayment em PagseguroPlugpagModuleTest.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational (helper) → 3. Phase 3 US1 → 4. **VALIDAR** `doPayment` isolado → 5. Demo MVP.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 (`doPayment`) → testar → MVP.
3. US2 (`doRefund`) → testar → entregar.
4. US3 (`doAsyncPayment`) → testar → paridade completa.
5. Polish (docs + gates).

---

## Notes

- [P] = arquivos diferentes, sem dependências.
- Spec TurboModule INALTERADA — sem codegen (research.md Decisão 3).
- Confirmar que cada teste FALHA antes de implementar.
- Prefixos de erro `[react-native-pagseguro-plugpag] ERROR:` DEVEM ser preservados (grep-ability).
- Commit após cada task ou grupo lógico.
