---
description: "Task list — Cálculo de Parcelas (calculateInstallments)"
---

# Tasks: Cálculo de Parcelas (`calculateInstallments`)

**Input**: Design documents from `/specs/017-calculate-installments/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/public-api.md

**Tests**: INCLUÍDOS — exigidos pela Constituição (Princípio III — Test-First/TDD) e por
SC-006 (100% das funções exportadas com teste unitário JS; novo método nativo com teste de
integração Kotlin). Testes DEVEM ser escritos antes da implementação e confirmados falhando.

**Organization**: Tarefas agrupadas por user story para permitir implementação e teste
independentes. Atenção: esta feature é aditiva e concentra-se em poucos arquivos
compartilhados (`payment/types.ts`, `payment/index.ts`, `payment.test.ts`,
`PagseguroPlugpagModule.kt`, `PagseguroPlugpagModuleTest.kt`). Por isso, várias tarefas de
implementação no mesmo arquivo são **sequenciais** (sem `[P]`), ainda que pertençam a stories
diferentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivo diferente, sem dependências pendentes)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Biblioteca mobile Android-only (TurboModule). Raiz do repositório:
- TypeScript: `src/functions/payment/`, `src/NativePagseguroPlugpag.ts`, `src/__tests__/functions/`
- Kotlin: `android/src/main/java/com/pagseguroplugpag/`, `android/src/test/java/com/pagseguroplugpag/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar baseline limpo antes de iniciar (feature aditiva — sem novas dependências).

- [X] T001 Confirmar baseline verde executando `yarn lint && yarn typecheck && yarn test` a partir da raiz do projeto, na branch `feature/017-calculate-installments` (nenhuma nova dependência é introduzida — feature aditiva)

**Checkpoint**: Baseline verde — pronto para Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato de tipos e Spec TurboModule + codegen. BLOQUEIA todas as user stories — sem isto, nem JS nem Kotlin compilam contra o novo método.

**⚠️ CRITICAL**: Nenhum trabalho de user story pode começar antes desta fase.

- [X] T002 [P] Adicionar as 3 interfaces `CalculateInstallmentsRequest`, `PlugPagInstallment` e `CalculateInstallmentsResult` (reutilizando `PlugPagInstallmentType` existente) em [src/functions/payment/types.ts](src/functions/payment/types.ts), conforme data-model.md
- [X] T003 Adicionar a assinatura `calculateInstallments(data: Object): Promise<Object>;` à interface `Spec` em [src/NativePagseguroPlugpag.ts](src/NativePagseguroPlugpag.ts) (única fonte de verdade JS↔Native)
- [X] T004 Regenerar codegen Android executando `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` (OBRIGATÓRIO após T003 — sem isto o `override` Kotlin falha com `'X' overrides nothing`)

**Checkpoint**: Tipos e contrato nativo disponíveis — user stories podem iniciar.

---

## Phase 3: User Story 1 - Consultar opções de parcelamento antes da venda (Priority: P1) 🎯 MVP

**Goal**: Expor `calculateInstallments(data)` que, em terminal PagBank SmartPOS, resolve com `{ options: PlugPagInstallment[] }` (cada item com `quantity`/`amount`/`total` em centavos), incluindo o caso de lista vazia como resultado válido.

**Independent Test**: Em terminal SmartPOS, chamar `calculateInstallments({ amount: 10000, installmentType: 'PARC_COMPRADOR' })` e verificar que resolve com `{ options: [...] }` coerente; e que um valor sem opções resolve com `{ options: [] }`.

### Tests for User Story 1 (escrever PRIMEIRO — confirmar FALHANDO) ⚠️

- [X] T005 [US1] Estender o mock de `NativePagseguroPlugpag` com `calculateInstallments` e adicionar os cenários de sucesso em [src/__tests__/functions/payment.test.ts](src/__tests__/functions/payment.test.ts): (a) Android + sucesso → resolve com `{ options: [...] }` tipado; (b) Android + lista vazia → resolve com `{ options: [] }`
- [X] T006 [US1] Adicionar cenários de integração Kotlin em [android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt](android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt): (a) resolve com sucesso quando SDK retorna `List<PlugPagInstallment>` (verifica conversão `amount` centavos→`String` e mapeamento `installmentType`); (b) resolve com `{ options: [] }` quando SDK retorna lista vazia

### Implementation for User Story 1

- [X] T007 [US1] Implementar `validateCalculateInstallmentsRequest()` (privada) e a função pública `calculateInstallments()` com guard de iOS Nível 2 + `getNativeModule().calculateInstallments(data) as Promise<CalculateInstallmentsResult>` em [src/functions/payment/index.ts](src/functions/payment/index.ts) (caminho feliz; validação detalhada vem em US2)
- [X] T008 [US1] Re-exportar os 3 tipos (`CalculateInstallmentsRequest`, `PlugPagInstallment`, `CalculateInstallmentsResult`) a partir de [src/functions/payment/index.ts](src/functions/payment/index.ts) (barrels `functions/index.ts` e `src/index.ts` captam automaticamente — sem edição)
- [X] T009 [US1] Implementar o `override fun calculateInstallments(data: ReadableMap, promise: Promise)` em [android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt): `CoroutineScope(Dispatchers.IO)` (comentário inline justificando exceção ao Princípio VI — SDK síncrono bloqueante por IPC), `when` de `installmentType`→`PlugPag.INSTALLMENT_TYPE_*`, chamada `plugPag.calculateInstallments(data.getInt("amount").toString(), installmentType)`, conversão `List<PlugPagInstallment>`→`Arguments.createArray()` de `WritableNativeMap` (`putInt` quantity/amount/total) embrulhada em `{ options: [...] }`, resolução em `withContext(Dispatchers.Main)`. Adicionar import `br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInstallment`
- [X] T010 [US1] Rodar `yarn lint && yarn typecheck && yarn test` e os testes Kotlin; confirmar que os cenários de US1 (T005, T006) passam

**Checkpoint**: `calculateInstallments` funcional no caminho feliz (incl. lista vazia) — MVP entregável e testável de forma independente.

---

## Phase 4: User Story 2 - Validação fail-fast da requisição (Priority: P2)

**Goal**: Rejeitar requisições inválidas (`amount` não-inteiro/`<= 0`; `installmentType` fora do enum) na camada JS, com mensagens prefixadas, ANTES de qualquer chamada nativa.

**Independent Test**: Chamar `calculateInstallments` com `amount = 0`, negativo, `10.5` ou `installmentType` inválido e verificar rejeição com a mensagem prefixada, sem que o módulo nativo seja invocado (mock não chamado).

### Tests for User Story 2 (escrever PRIMEIRO — confirmar FALHANDO) ⚠️

- [X] T011 [US2] Adicionar cenários de validação em [src/__tests__/functions/payment.test.ts](src/__tests__/functions/payment.test.ts): `amount = 0`, `amount` negativo e `amount = 10.5` → rejeitam com `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.`, **verificando que o mock nativo NÃO foi chamado**
- [X] T012 [US2] Adicionar cenários de validação em [src/__tests__/functions/payment.test.ts](src/__tests__/functions/payment.test.ts): `installmentType` inválido (ex.: `'PARCELADO'`) e `null` → rejeitam com mensagem que lista os valores aceitos (`A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR`), sem chamada nativa

### Implementation for User Story 2

- [X] T013 [US2] Completar `validateCalculateInstallmentsRequest()` em [src/functions/payment/index.ts](src/functions/payment/index.ts): checagem única `!(Number.isInteger(amount) && amount > 0)` (mensagem `amount must be an integer > 0.`) e `Object.values(InstallmentType).includes(installmentType)` (mensagem listando valores aceitos), chamada **após** o guard de iOS e **antes** de `getNativeModule()` — sem alterar a validação existente de `doPayment` (SC-005)
- [X] T014 [US2] Rodar `yarn lint && yarn typecheck && yarn test`; confirmar que os cenários de US2 (T011, T012) passam e que US1 continua verde

**Checkpoint**: Validação fail-fast completa — US1 e US2 funcionais e testáveis independentemente.

---

## Phase 5: User Story 3 - Comportamento por plataforma e propagação de erro do SDK (Priority: P3)

**Goal**: Garantir guard de iOS (rejeição prefixada capturável, precede a validação; import não trava) e propagação padronizada de erros do SDK (`PLUGPAG_INSTALLMENTS_ERROR` / `PLUGPAG_INTERNAL_ERROR`).

**Independent Test**: Com `Platform.OS = 'ios'`, verificar rejeição prefixada contendo `calculateInstallments()`, mesmo com requisição inválida (guard precede validação). Em Kotlin, simular `PlugPagException` → `PLUGPAG_INSTALLMENTS_ERROR`; outra exceção → `PLUGPAG_INTERNAL_ERROR`.

### Tests for User Story 3 (escrever PRIMEIRO — confirmar FALHANDO) ⚠️

- [X] T015 [US3] Adicionar cenários de plataforma em [src/__tests__/functions/payment.test.ts](src/__tests__/functions/payment.test.ts): iOS → rejeita com erro prefixado `[react-native-pagseguro-plugpag] ERROR: ... calculateInstallments() ...`; e iOS com requisição inválida → rejeita pela mensagem do **guard** (precedência sobre a validação)
- [X] T016 [US3] Adicionar cenários de erro Kotlin em [android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt](android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt): (a) `PlugPagException` lançada pelo SDK → `promise.reject("PLUGPAG_INSTALLMENTS_ERROR", ...)` propagando `message`/`errorCode`; (b) outra `Exception` → `promise.reject("PLUGPAG_INTERNAL_ERROR", ...)`

### Implementation for User Story 3

- [X] T017 [US3] Adicionar o helper `private fun buildInstallmentsErrorUserInfo(e: PlugPagException): WritableNativeMap` (espelha `buildInternalErrorUserInfo`: `result(-1)`, `errorCode = e.errorCode`, `message = e.message`) e os blocos `catch (e: PlugPagException)` → `PLUGPAG_INSTALLMENTS_ERROR` / `catch (e: Exception)` → `PLUGPAG_INTERNAL_ERROR` em [android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt). Adicionar import `br.com.uol.pagseguro.plugpagservice.wrapper.exception.PlugPagException`
- [X] T018 [US3] Rodar `yarn lint && yarn typecheck && yarn test` e os testes Kotlin; confirmar que os cenários de US3 (T015, T016) passam e que US1/US2 continuam verdes

**Checkpoint**: Todas as user stories funcionais e independentemente testáveis.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentação, versionamento e validação final.

- [X] T019 [P] Atualizar a documentação pública (README EN/PT-BR e/ou docs do domínio `payment`) com a API e o exemplo de `calculateInstallments`, conforme [quickstart.md](specs/017-calculate-installments/quickstart.md)
- [X] T020 [P] Atualizar a seção "API Pública — Tipagens Exportadas" e o status da feature em [CLAUDE.md](CLAUDE.md) com os 3 novos tipos e o método `calculateInstallments`
- [X] T021 Bump de versão **patch** (`1.2.1` → `1.2.2`) em `package.json` e entrada em `### Added` do `CHANGELOG.md` (commit `chore` separado — padrão da feature/016, conforme research.md D10)
- [X] T022 Validação final completa: `yarn lint && yarn typecheck && yarn test` (0 erros/avisos), suíte Kotlin verde, e revisão do checklist do CLAUDE.md (zero `any`, codegen regenerado, tipos no local correto)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — inicia imediatamente.
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA todas as user stories**. T003 → T004 é estritamente sequencial (codegen depende da Spec).
- **User Stories (Phase 3–5)**: dependem da Foundational. Em priorização: P1 → P2 → P3.
- **Polish (Phase 6)**: depende de todas as user stories desejadas.

### User Story Dependencies

- **US1 (P1)**: inicia após Foundational. Sem dependência de outras stories. Entrega o MVP.
- **US2 (P2)**: inicia após Foundational. Compartilha `payment/index.ts` com US1 (T013 estende a função criada em T007) e `payment.test.ts`. Independentemente testável pelo subconjunto de cenários de validação.
- **US3 (P3)**: inicia após Foundational. Compartilha `PagseguroPlugpagModule.kt` com US1 (T017 adiciona catch/helper ao `override` criado em T009) e os arquivos de teste. Independentemente testável pelos cenários de plataforma/erro.

### Within Each User Story

- Testes (T005/T006, T011/T012, T015/T016) escritos e FALHANDO antes da implementação.
- Implementação JS antes da validação detalhada; implementação Kotlin (happy path) antes dos blocos de erro.
- Story completa e verde antes de passar à próxima prioridade.

### Parallel Opportunities

- **Foundational**: T002 (types.ts) é `[P]` — independente de T003 (Spec). T003 → T004 sequenciais.
- **US1**: T005 (teste JS) e T006 (teste Kotlin) são em arquivos diferentes → podem ser escritos em paralelo. T007/T008 (index.ts) e T009 (Kotlin) ficam em arquivos diferentes mas T010 valida ambos.
- **Polish**: T019 e T020 são `[P]` (arquivos diferentes).
- **Atenção**: tarefas no mesmo arquivo (`payment/index.ts`, `payment.test.ts`, `PagseguroPlugpagModule.kt`, `PagseguroPlugpagModuleTest.kt`) NÃO são paralelas entre si, mesmo em stories distintas.

---

## Parallel Example: Foundational + User Story 1

```bash
# Foundational — T002 em paralelo (arquivo distinto da Spec):
Task: "Adicionar 3 interfaces em src/functions/payment/types.ts"
# (T003 → T004 seguem sequenciais: Spec depois codegen)

# US1 — testes em arquivos diferentes, escritos em paralelo (devem falhar):
Task: "Cenários de sucesso JS em src/__tests__/functions/payment.test.ts"
Task: "Cenários de sucesso Kotlin em android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Phase 1 (Setup) → Phase 2 (Foundational: tipos + Spec + codegen).
2. Phase 3 (US1): testes falhando → implementação JS + Kotlin → validar.
3. **PARAR e VALIDAR**: `calculateInstallments` resolve com `{ options }` (incl. lista vazia) de forma independente.
4. Entregável como MVP.

### Incremental Delivery

1. Setup + Foundational → fundação pronta.
2. US1 → testa independente → MVP.
3. US2 (validação fail-fast) → testa independente.
4. US3 (plataforma + erros SDK) → testa independente.
5. Polish (docs + versionamento) → release patch `1.2.2`.

---

## Notes

- `[P]` = arquivos diferentes, sem dependências pendentes.
- `[Story]` mapeia a tarefa para rastreabilidade.
- Confirmar testes FALHANDO antes de implementar (Princípio III).
- Sempre que a Spec (`NativePagseguroPlugpag.ts`) mudar, regenerar o codegen (T004).
- O guard de iOS Nível 2 DEVE preceder a validação e `getNativeModule()` (contrato em public-api.md §1).
- `Dispatchers.IO` no Kotlin exige comentário inline de exceção ao Princípio VI.
- Feature não-breaking (SC-005): não alterar a validação existente de `doPayment`.
