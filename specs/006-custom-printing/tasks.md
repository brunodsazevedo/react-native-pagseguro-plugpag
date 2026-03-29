# Tasks: Feature 006 — Custom Printing

**Input**: Design documents from `/specs/006-custom-printing/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: TDD — Constituição Princípio III. Testes escritos **antes** da implementação, confirmados como falhando antes de prosseguir.

**Organization**: Tarefas organizadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências de tarefas incompletas)
- **[Story]**: User story a que pertence (US1, US2, US3)
- Caminhos de arquivo exatos nas descrições

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Contratos de tipo + Spec TurboModule + Codegen. Nenhuma user story pode começar sem esta fase.

- [X] T001 Criar `src/printing.ts` com `PrintQuality`, `PrintRequest`, `PrintResult` e `MIN_PRINTER_STEPS` conforme data-model.md
- [X] T002 Adicionar 5 métodos à Spec TurboModule: `printFromFile`, `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt` em `src/NativePagseguroPlugpag.ts`
- [X] T003 Regenerar codegen Android: `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` (OBRIGATÓRIO após T002 — sem isto o Kotlin não compila)

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Infraestrutura Kotlin compartilhada e re-exportação de tipos. DEVE estar completa antes de qualquer user story.

**⚠️ CRITICAL**: Nenhuma user story pode começar até esta fase estar completa.

- [X] T004 Adicionar imports de `PlugPagPrinterData`, `PlugPagPrinterListener`, `PlugPagPrintResult` e helper `buildPrintErrorUserInfo` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — ver `contracts/kotlin-methods.md`
- [X] T005 Re-exportar `PrintQuality`, `PrintRequest`, `PrintResult`, `MIN_PRINTER_STEPS` de `src/printing.ts` em `src/index.tsx`

**Checkpoint**: Foundation ready — user stories podem ser implementadas independentemente.

---

## Phase 3: User Story 1 — Imprimir Conteúdo Personalizado (Priority: P1) 🎯 MVP

**Goal**: Desenvolvedor consegue imprimir imagem local (PNG/JPEG/BMP) com `printFromFile`, com validação de parâmetros antes do hardware e três códigos de erro distinguíveis.

**Independent Test**: Chamar `printFromFile({ filePath: '/path/img.png' })` com mock do módulo nativo retornando `{ result: 0, steps: 120 }` → resolve `{ result: 'ok', steps: 120 }`. Chamar com `filePath: ''` → rejeita `PLUGPAG_VALIDATION_ERROR` sem acionar o nativo.

### Tests para User Story 1 (TDD — escrever ANTES da implementação) ⚠️

> **IMPORTANTE: Escrever estes testes PRIMEIRO e confirmar que FALHAM antes de prosseguir para implementação**

- [X] T006 [P] [US1] Escrever testes falhando para `printFromFile` em `src/__tests__/index.test.tsx` cobrindo todos os cenários da spec: iOS guard, sucesso com defaults, sucesso com parâmetros customizados, `filePath` vazio → `PLUGPAG_VALIDATION_ERROR`, `printerQuality` fora de 1–4 → `PLUGPAG_VALIDATION_ERROR`, `steps` negativo → `PLUGPAG_VALIDATION_ERROR`, SDK `result != RET_OK` → `PLUGPAG_PRINT_ERROR`, SDK `PlugPagException` → `PLUGPAG_INTERNAL_ERROR`
- [X] T007 [P] [US1] Escrever testes falhando para `printFromFile` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` cobrindo: resolve com `{ result: 'ok', steps }` quando SDK retorna `RET_OK`, rejeita `PLUGPAG_PRINT_ERROR` quando `result != RET_OK`, rejeita `PLUGPAG_INTERNAL_ERROR` quando SDK lança `PlugPagException`, serialização correta de `filePath`/`printerQuality`/`steps` para `PlugPagPrinterData`

### Implementation para User Story 1

- [X] T008 [US1] Implementar `validatePrintRequest` e `printFromFile` em `src/index.tsx` com iOS guard (Nível 2), validação de `filePath`/`printerQuality`/`steps`, import lazy do módulo nativo e type assertion para `PrintResult` — confirmar que T006 passa
- [X] T009 [US1] Implementar `override fun printFromFile(data: ReadableMap, promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` com `Dispatchers.IO`, `PlugPagPrinterData`, tratamento de `RET_OK` / `PLUGPAG_PRINT_ERROR` / `PLUGPAG_INTERNAL_ERROR` — confirmar que T007 passa

**Checkpoint**: `printFromFile` totalmente funcional e testado independentemente. MVP utilizável.

---

## Phase 4: User Story 2 — Reimprimir Via do Cliente (Priority: P2)

**Goal**: Operador consegue reimprimir comprovante do cliente da última transação aprovada sem parâmetros — variantes síncrona (`reprintCustomerReceipt`) e assíncrona (`doAsyncReprintCustomerReceipt`).

**Independent Test**: Chamar `reprintCustomerReceipt()` com mock retornando `{ result: 0, steps: 80 }` → resolve `{ result: 'ok', steps: 80 }`. Chamar `doAsyncReprintCustomerReceipt()` → resolve identicamente via listener.

### Tests para User Story 2 (TDD — escrever ANTES da implementação) ⚠️

> **IMPORTANTE: Escrever estes testes PRIMEIRO e confirmar que FALHAM antes de prosseguir para implementação**

- [X] T010 [P] [US2] Escrever testes falhando para `reprintCustomerReceipt` e `doAsyncReprintCustomerReceipt` em `src/__tests__/index.test.tsx` cobrindo: iOS guard (ambas as funções), sucesso → `PrintResult`, SDK erro → `PLUGPAG_PRINT_ERROR`, SDK exceção → `PLUGPAG_INTERNAL_ERROR`
- [X] T011 [P] [US2] Escrever testes falhando para `reprintCustomerReceipt` e `doAsyncReprintCustomerReceipt` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` cobrindo: resolve com `RET_OK`, rejeita `PLUGPAG_PRINT_ERROR`, rejeita `PLUGPAG_INTERNAL_ERROR`; para async: `onSuccess` resolve, `onError` rejeita, exceção antes do listener rejeita `PLUGPAG_INTERNAL_ERROR`

### Implementation para User Story 2

- [X] T012 [US2] Implementar `reprintCustomerReceipt` e `doAsyncReprintCustomerReceipt` em `src/index.tsx` com iOS guard (Nível 2), import lazy, type assertion para `PrintResult` — confirmar que T010 passa
- [X] T013 [US2] Implementar `override fun reprintCustomerReceipt(promise: Promise)` (Dispatchers.IO) e `override fun doAsyncReprintCustomerReceipt(promise: Promise)` (PlugPagPrinterListener) em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — confirmar que T011 passa

**Checkpoint**: US1 e US2 totalmente funcionais e testados independentemente.

---

## Phase 5: User Story 3 — Reimprimir Via do Estabelecimento (Priority: P3)

**Goal**: Operador consegue reimprimir comprovante do estabelecimento da última transação aprovada sem parâmetros — variantes síncrona (`reprintEstablishmentReceipt`) e assíncrona (`doAsyncReprintEstablishmentReceipt`).

**Independent Test**: Chamar `reprintEstablishmentReceipt()` com mock retornando `{ result: 0, steps: 80 }` → resolve `{ result: 'ok', steps: 80 }`. Chamar `doAsyncReprintEstablishmentReceipt()` → resolve identicamente via listener.

### Tests para User Story 3 (TDD — escrever ANTES da implementação) ⚠️

> **IMPORTANTE: Escrever estes testes PRIMEIRO e confirmar que FALHAM antes de prosseguir para implementação**

- [X] T014 [P] [US3] Escrever testes falhando para `reprintEstablishmentReceipt` e `doAsyncReprintEstablishmentReceipt` em `src/__tests__/index.test.tsx` cobrindo: iOS guard (ambas), sucesso → `PrintResult`, SDK erro → `PLUGPAG_PRINT_ERROR`, SDK exceção → `PLUGPAG_INTERNAL_ERROR`
- [X] T015 [P] [US3] Escrever testes falhando para `reprintEstablishmentReceipt` e `doAsyncReprintEstablishmentReceipt` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` cobrindo: resolve com `RET_OK`, rejeita `PLUGPAG_PRINT_ERROR`, rejeita `PLUGPAG_INTERNAL_ERROR`; para async: `onSuccess` resolve, `onError` rejeita, exceção antes do listener rejeita `PLUGPAG_INTERNAL_ERROR`; verificar que o SDK é chamado com `reprintStablishmentReceipt` (grafia do SDK, FR-013)

### Implementation para User Story 3

- [X] T016 [US3] Implementar `reprintEstablishmentReceipt` e `doAsyncReprintEstablishmentReceipt` em `src/index.tsx` com iOS guard (Nível 2), import lazy, type assertion para `PrintResult` — confirmar que T014 passa
- [X] T017 [US3] Implementar `override fun reprintEstablishmentReceipt(promise: Promise)` (Dispatchers.IO — chama `plugPag.reprintStablishmentReceipt()`) e `override fun doAsyncReprintEstablishmentReceipt(promise: Promise)` (PlugPagPrinterListener — chama `plugPag.asyncReprintEstablishmentReceipt()`) em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — confirmar que T015 passa

**Checkpoint**: Todas as 3 user stories funcionais e testadas independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação de qualidade — DEVE passar antes de qualquer PR.

- [X] T018 [P] Executar `yarn lint` — confirmar zero erros ou avisos (bloqueante conforme Constituição PR Checklist e Proibições Absolutas)
- [X] T019 [P] Executar `yarn typecheck` — confirmar zero erros de tipo TypeScript
- [X] T020 Executar `yarn test` — confirmar que todos os testes JS passam

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 completo (especialmente T003 — codegen) — BLOQUEIA todas as user stories
- **User Stories (Phases 3–5)**: Todas dependem de Phase 2 completo; podem prosseguir em paralelo ou em ordem de prioridade
- **Polish (Phase 6)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Phase 2 — sem dependências em US2/US3
- **US2 (P2)**: Pode iniciar após Phase 2 — sem dependências em US1/US3 (independentemente testável)
- **US3 (P3)**: Pode iniciar após Phase 2 — sem dependências em US1/US2 (independentemente testável)

### Dentro de Cada User Story

```
Testes (T006/T007) → DEVEM falhar → Implementação (T008/T009) → Testes passam
```

### Parallel Opportunities

- T006 e T007 (US1 tests JS + Kotlin) podem rodar em paralelo
- T010 e T011 (US2 tests) podem rodar em paralelo
- T014 e T015 (US3 tests) podem rodar em paralelo
- T008 e T009 (US1 impl JS + Kotlin) podem rodar em paralelo após testes confirmados falhando
- T018 e T019 (lint + typecheck) podem rodar em paralelo

---

## Parallel Example: User Story 1

```bash
# Escrever testes falhando em paralelo:
Task: "T006 — JS tests for printFromFile in src/__tests__/index.test.tsx"
Task: "T007 — Kotlin tests for printFromFile in PagseguroPlugpagModuleTest.kt"

# Implementar em paralelo (após confirmar que testes falham):
Task: "T008 — printFromFile in src/index.tsx"
Task: "T009 — printFromFile override in PagseguroPlugpagModule.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 Apenas)

1. Completar Phase 1: Setup (T001–T003)
2. Completar Phase 2: Foundational (T004–T005)
3. Completar Phase 3: User Story 1 (T006–T009)
4. **PARAR E VALIDAR**: `printFromFile` funcionando independentemente
5. Executar Polish (T018–T020) — pronto para PR de MVP

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → `printFromFile` → MVP!
3. US2 → reprint cliente → incremento
4. US3 → reprint estabelecimento → completo
5. Cada story adiciona valor sem quebrar as anteriores

### Parallel Team Strategy

Com dois desenvolvedores (a partir de Phase 3):
- Dev A: tarefas JS (T006, T008, T010, T012, T014, T016)
- Dev B: tarefas Kotlin (T007, T009, T011, T013, T015, T017)

---

## Notes

- `[P]` = arquivos diferentes, sem dependências — podem rodar em paralelo
- `[Story]` = rastreabilidade para a user story específica
- Codegen (T003) é **não-negociável** antes de qualquer trabalho Kotlin
- Testes Kotlin devem ser escritos com `override fun` stubs vazios se necessário para compilar
- `reprintStablishmentReceipt` (SDK typo) — chamar sempre com esta grafia no Kotlin (FR-013)
- Executar `yarn lint` após cada fase de implementação — DEVE passar antes do próximo passo
- Commit após cada tarefa ou grupo lógico
