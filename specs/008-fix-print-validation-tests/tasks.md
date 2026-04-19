# Tasks: Fix Print Validation & Complete Test Coverage

**Input**: Design documents from `/specs/008-fix-print-validation-tests/`  
**Prerequisites**: [plan.md](plan.md) ✅ | [spec.md](spec.md) ✅ | [research.md](research.md) ✅ | [data-model.md](data-model.md) ✅ | [quickstart.md](quickstart.md) ✅

**Tests**: TDD enforced pela Constituição (Princípio III) — todos os testes de US1 DEVEM ser escritos e confirmados como falhando antes da implementação.

**Scope**: 2 arquivos modificados | 7 novos `it()` | 1 nova cláusula em `validatePrintRequest()`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executado em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3)
- Caminhos absolutos a partir da raiz do projeto

---

## Phase 1: Setup

> **N/A** — projeto já existente, sem novas dependências ou infraestrutura. Pode prosseguir diretamente para as user stories.

---

## Phase 2: Foundational (Blocking Prerequisites)

> **N/A** — sem pré-requisitos bloqueantes. Nenhum arquivo base novo é necessário antes das user stories.

---

## Phase 3: User Story 1 — Validação de printerQuality inválido (Priority: P1) 🎯 MVP

**Goal**: Garantir que `printFromFile()` rejeita com `PLUGPAG_VALIDATION_ERROR` quando `printerQuality` estiver fora de [1, 4], antes de qualquer chamada ao SDK nativo.

**Independent Test**: `yarn test --testPathPattern=print.test.ts` — os 3 novos `it()` de validação devem falhar antes da implementação e passar após.

### Testes para User Story 1 (TDD — escrita antes da implementação) ⚠️

> **OBRIGATÓRIO (Constituição Princípio III): Escrever os testes abaixo e confirmar que FALHAM antes de implementar a validação.**

- [X] T001 [US1] Adicionar 3 cenários de teste para `printerQuality` inválido no bloco `describe('validatePrintRequest', ...)` existente em `src/__tests__/functions/print.test.ts`:
  - `it('rejects when printerQuality is 99')` → espera rejeição com `PLUGPAG_VALIDATION_ERROR`
  - `it('rejects when printerQuality is 0')` → espera rejeição com `PLUGPAG_VALIDATION_ERROR`
  - `it('rejects when printerQuality is -1')` → espera rejeição com `PLUGPAG_VALIDATION_ERROR`

- [X] T002 [US1] Confirmar que os 3 cenários de T001 **falham** com `yarn test --testPathPattern=print.test.ts` (esperado: implementação ausente → testes vermelhos)

### Implementação para User Story 1

- [X] T003 [US1] Adicionar a terceira cláusula de validação em `validatePrintRequest()` em `src/functions/print/index.ts`:
  ```typescript
  if (
    data.printerQuality !== undefined &&
    (data.printerQuality < 1 || data.printerQuality > 4)
  ) {
    throw new Error(
      '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — printerQuality must be between 1 and 4.'
    );
  }
  ```
  A cláusula DEVE ser inserida após as validações de `filePath` e `steps` existentes.

- [X] T004 [US1] Confirmar que os 22 testes passam com `yarn test --testPathPattern=print.test.ts` (zero falhas — incluindo os 3 novos de T001)

**Checkpoint**: Validação de `printerQuality` funcional e testada. User Story 1 completa e independentemente verificável.

---

## Phase 4: User Story 2 — Cobertura de testes para doAsyncReprintCustomerReceipt (Priority: P2)

**Goal**: Adicionar cobertura de teste para os caminhos de sucesso e falha de `doAsyncReprintCustomerReceipt()` — função exportada que hoje possui apenas o guard iOS coberto.

**Independent Test**: `yarn test --testPathPattern=print.test.ts` — os 2 novos `it()` devem passar (função já implementada corretamente).

### Testes para User Story 2

- [X] T005 [US2] Adicionar novo bloco `describe('doAsyncReprintCustomerReceipt — Android normal operation', ...)` em `src/__tests__/functions/print.test.ts` com 2 cenários:
  - `it('resolves with PrintResult on success')` → mock nativo resolve `{ result: 'ok', steps: 10 }`, espera que a Promise resolva com esse valor
  - `it('rejects with PLUGPAG_PRINT_ERROR on SDK error')` → mock nativo rejeita com `'PLUGPAG_PRINT_ERROR'`, espera que a Promise rejeite com esse código

**Checkpoint**: `doAsyncReprintCustomerReceipt()` 100% coberta. User Story 2 completa.

---

## Phase 5: User Story 3 — Cobertura de testes para doAsyncReprintEstablishmentReceipt (Priority: P3)

**Goal**: Adicionar cobertura de teste para os caminhos de sucesso e falha de `doAsyncReprintEstablishmentReceipt()` — mesma lacuna da US2 para a segunda função assíncrona de reimpressão.

**Independent Test**: `yarn test --testPathPattern=print.test.ts` — os 2 novos `it()` devem passar (função já implementada corretamente).

### Testes para User Story 3

- [X] T006 [US3] Adicionar novo bloco `describe('doAsyncReprintEstablishmentReceipt — Android normal operation', ...)` em `src/__tests__/functions/print.test.ts` com 2 cenários:
  - `it('resolves with PrintResult on success')` → mock nativo resolve `{ result: 'ok', steps: 10 }`, espera que a Promise resolva com esse valor
  - `it('rejects with PLUGPAG_PRINT_ERROR on SDK error')` → mock nativo rejeita com `'PLUGPAG_PRINT_ERROR'`, espera que a Promise rejeite com esse código

**Checkpoint**: `doAsyncReprintEstablishmentReceipt()` 100% coberta. User Story 3 completa. Todas as 5 funções exportadas do domínio `print` possuem cobertura total.

---

## Phase 6: Polish & Validação Final

**Purpose**: Confirmar que todas as alterações estão corretas, sem regressões, e que o código passa nas validações obrigatórias da Constituição.

- [X] T007 Executar `yarn test` — confirmar que **22 testes passam** com zero falhas e zero testes skipped
- [X] T008 Executar `yarn lint` — confirmar **zero erros e zero avisos** (Constituição PR Checklist — bloqueante)
- [X] T009 Executar `yarn typecheck` — confirmar **zero erros de tipo** (TypeScript strict)
- [X] T010 Verificar manualmente que `src/functions/print/index.ts` não contém `any` sem documentação de exceção (Zero `any` — Constituição Princípio II)

**Checkpoint**: Bugfix completo — branch pronta para PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: N/A
- **Phase 2 (Foundational)**: N/A
- **Phase 3 (US1)**: Pode começar imediatamente — **bloqueante para merge** (validação ausente afeta produção)
- **Phase 4 (US2)**: Pode começar após Phase 3 (ambas tocam `print.test.ts` — execução sequencial necessária)
- **Phase 5 (US3)**: Pode começar após Phase 4 (mesmo arquivo — sequencial)
- **Phase 6 (Polish)**: Depende da conclusão de Phase 3, 4 e 5

### User Story Dependencies

- **US1 (P1)**: Independente — toca `print/index.ts` (implementação) e `print.test.ts` (testes)
- **US2 (P2)**: Independente da US1 em termos de implementação, mas toca o mesmo arquivo de testes (`print.test.ts`) — executar após US1 para evitar conflito de edição no mesmo arquivo
- **US3 (P3)**: Independente da US1 e US2 em termos de implementação — também toca `print.test.ts`, executar após US2

### Within Each User Story

- Para **US1** (TDD obrigatório): T001 (escrever testes) → T002 (confirmar falha) → T003 (implementar) → T004 (confirmar sucesso)
- Para **US2** e **US3** (cobertura de funções existentes): escrever testes → confirmar passagem (implementação já existe)

### Parallel Opportunities

> Dado o escopo mínimo (1 desenvolvedor, 2 arquivos), não há oportunidades significativas de paralelismo. US1 bloqueia US2 e US3 apenas por compartilhamento de arquivo — em time com múltiplos devs, US2 e US3 poderiam ser escritas na mesma sessão após US1 concluída.

---

## Implementation Strategy

### MVP (US1 Only)

1. Escrever testes falhando para `printerQuality` (T001)
2. Confirmar falha (T002)
3. Implementar validação em `validatePrintRequest()` (T003)
4. Confirmar testes passando (T004)
5. **PARAR e VALIDAR**: `yarn test` + `yarn lint` — bugfix crítico funcional
6. Entregar US2 e US3 como incremento imediatamente a seguir (mesma sessão)

### Incremental Delivery

1. Completar US1 → validação de `printerQuality` corrigida em produção
2. Completar US2 → `doAsyncReprintCustomerReceipt` 100% coberta
3. Completar US3 → `doAsyncReprintEstablishmentReceipt` 100% coberta → 100% coverage de todos os exports
4. Executar Polish → PR pronto

---

## Notes

- TDD é **non-negotiable** para US1 (Constituição Princípio III): testes DEVEM ser escritos e confirmados falhando antes de T003
- `yarn lint` é **bloqueante**: nenhuma fase pode ser considerada concluída com avisos ou erros de lint
- Nenhum arquivo Kotlin é alterado neste bugfix — os 16 testes Kotlin existentes não são afetados
- `NativePagseguroPlugpag.ts` (spec TurboModule) **não é alterado** — codegen não precisa ser regenerado
- A mensagem de erro de `printerQuality` inválido DEVE usar o prefixo exato `[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR:` (grep-ability — Constituição)
