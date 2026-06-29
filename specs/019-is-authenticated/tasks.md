---
description: "Task list for feature 019 — isAuthenticated & asyncIsAuthenticated"
---

# Tasks: Consulta de Estado de Ativação do Terminal (`isAuthenticated`)

**Input**: Design documents from `/specs/019-is-authenticated/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included — TDD é obrigatório (Constituição Princípio III + spec FR-011/SC-003). Os testes JS DEVEM ser escritos e confirmados FALHANDO antes da implementação.

**Organization**: Tasks agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: User story à qual a task pertence (US1, US2)
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

- Biblioteca React Native (single project): `src/` na raiz, nativo em `android/src/main/java/com/pagseguroplugpag/`, testes Kotlin em `android/src/test/java/com/pagseguroplugpag/`.

⚠️ **Atenção a conflito de arquivo compartilhado**: as duas user stories editam os mesmos 4 arquivos
(`src/__tests__/functions/activation.test.ts`, `src/functions/activation/index.ts`,
`android/.../PagseguroPlugpagModule.kt`, `android/.../PagseguroPlugpagModuleTest.kt`). Por isso há
pouco paralelismo real entre US1 e US2 — tasks que tocam o mesmo arquivo NÃO são marcadas `[P]` e
devem rodar sequencialmente.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Garantir ponto de partida limpo

- [X] T001 Confirmar branch `feature/019-is-authenticated` ativa e baseline de gates verde rodando `yarn lint && yarn typecheck && yarn test` a partir da raiz do projeto (estabelece estado limpo antes do TDD)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Alteração da Spec TurboModule + regeneração de codegen — bloqueia TODA implementação nativa de ambas as user stories

**⚠️ CRITICAL**: Nenhuma implementação Kotlin pode começar até esta fase terminar

- [X] T002 Adicionar `isAuthenticated(): Promise<boolean>;` e `asyncIsAuthenticated(): Promise<boolean>;` à interface `Spec` em `src/NativePagseguroPlugpag.ts` (tipo primitivo `boolean`, não `Object` — research.md Decisão 1)
- [X] T003 Regenerar codegen Android rodando `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` — BLOQUEANTE, depende de T002; verificar que `android/build/generated/source/codegen/java/com/pagseguroplugpag/NativePagseguroPlugpagSpec.java` contém os 2 novos métodos abstratos

**Checkpoint**: Spec atualizada e codegen regenerado — implementação das user stories pode começar

---

## Phase 3: User Story 1 - Consultar ativação antes de iniciar uma venda (Priority: P1) 🎯 MVP

**Goal**: Expor `isAuthenticated(): Promise<boolean>` (consulta síncrona, SDK bloqueante por IPC) que resolve `true`/`false` sem disparar fluxo de ativação. `false` é resultado válido (resolve, nunca rejeita).

**Independent Test**: Chamar `isAuthenticated()` em terminal ativado (espera `true`) e não ativado (espera `false`), sem invocar nenhum outro método da feature.

### Tests for User Story 1 (escrever PRIMEIRO, confirmar FALHANDO) ⚠️

- [X] T004 [US1] Escrever testes JS falhando em `describe('isAuthenticated')` em `src/__tests__/functions/activation.test.ts` cobrindo os 4 cenários do contrato: (1) iOS rejeita com `Error` prefixado sem acessar o nativo; (2) Android resolve `true`; (3) Android resolve `false` (NÃO rejeita); (4) exceção interna → rejeita `PLUGPAG_INTERNAL_ERROR`. Confirmar que falham antes da implementação.

### Implementation for User Story 1

- [X] T005 [US1] Implementar `export async function isAuthenticated(): Promise<boolean>` em `src/functions/activation/index.ts` com guard Nível 2 (mensagem `[react-native-pagseguro-plugpag] ERROR: isAuthenticated() is not available on iOS...`) antes de `getNativeModule()`, retornando `getNativeModule().isAuthenticated() as Promise<boolean>` (depende de T002, T003, T004)
- [X] T006 [US1] Implementar `override fun isAuthenticated(promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` usando `CoroutineScope(Dispatchers.IO).launch { ... }`, resolvendo o boolean via `withContext(Dispatchers.Main)` e capturando exceção com `promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))`; comentário `// Threading Policy (Constituição VI):` (depende de T003)
- [X] T007 [US1] Adicionar testes de integração Kotlin (placeholders estruturais — feature/018) para `isAuthenticated` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: resolve true / resolve false / exceção → `PLUGPAG_INTERNAL_ERROR` (depende de T006)

**Checkpoint**: `isAuthenticated` funcional e testável de forma independente — MVP completo

---

## Phase 4: User Story 2 - Consulta assíncrona via listener nativo (Priority: P2)

**Goal**: Expor `asyncIsAuthenticated(): Promise<boolean>` (listener RxJava do SDK, padrão `UiThreadUtil.runOnUiThread` validado em device na feature/018), paridade com os `doAsync*` existentes. `false` resolve; falha real do SDK rejeita com `PLUGPAG_AUTHENTICATION_ERROR`.

**Independent Test**: Invocar `asyncIsAuthenticated()` e verificar que resolve `true`/`false` conforme estado do terminal, e que falha de recuperação de status rejeita com erro de domínio distinto.

### Tests for User Story 2 (escrever PRIMEIRO, confirmar FALHANDO) ⚠️

- [X] T008 [US2] Escrever testes JS falhando em `describe('asyncIsAuthenticated')` em `src/__tests__/functions/activation.test.ts` cobrindo os 5 cenários do contrato: (1) iOS rejeita prefixado; (2) resolve `true`; (3) resolve `false` (NÃO rejeita); (4) `onError` → rejeita `PLUGPAG_AUTHENTICATION_ERROR`; (5) exceção interna → `PLUGPAG_INTERNAL_ERROR`. Confirmar que falham antes da implementação. (mesmo arquivo de T004 — rodar após T004)

### Implementation for User Story 2

- [X] T009 [US2] Implementar `export async function asyncIsAuthenticated(): Promise<boolean>` em `src/functions/activation/index.ts` com guard Nível 2 (mensagem com nome `asyncIsAuthenticated()`) antes de `getNativeModule()`, retornando `getNativeModule().asyncIsAuthenticated() as Promise<boolean>` (mesmo arquivo de T005 — rodar após T005; depende de T002, T003, T008)
- [X] T010 [US2] Implementar `override fun asyncIsAuthenticated(promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` com `import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagIsActivatedListener`, invocando o SDK dentro de `UiThreadUtil.runOnUiThread { }`; `onIsActivated(isActivated)` → `promise.resolve(isActivated)`; `onError(errorMessage)` → `promise.reject("PLUGPAG_AUTHENTICATION_ERROR", map)` preservando a mensagem; exceção → `PLUGPAG_INTERNAL_ERROR`; comentário `// Threading Policy (Constituição VI):` (mesmo arquivo de T006 — rodar após T006; depende de T003)
- [X] T011 [US2] Adicionar testes de integração Kotlin (placeholders estruturais) para `asyncIsAuthenticated` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`: `onIsActivated(true)`→resolve / `onIsActivated(false)`→resolve / `onError`→`PLUGPAG_AUTHENTICATION_ERROR` / exceção→`PLUGPAG_INTERNAL_ERROR`; lembrar `mockkStatic(UiThreadUtil::class)` no `@BeforeEach` com runnable síncrono (`firstArg<Runnable>().run(); true`) (mesmo arquivo de T007 — rodar após T007; depende de T010)

**Checkpoint**: Ambas as variantes (síncrona e assíncrona) funcionais e testáveis independentemente

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentação, demonstração opcional e validação final

- [X] T012 [P] Documentar `isAuthenticated` e `asyncIsAuthenticated` na seção de ativação do `README.md` (EN), incluindo a semântica de que `false` = "não ativado" (não é erro) — spec FR-012
- [X] T013 [P] Documentar as duas funções na seção de ativação do `README-PTBR.md` (PT-BR), com a mesma semântica de `false`
- [X] T014 [P] Atualizar `CLAUDE.md`: adicionar as 2 funções à seção "API Pública" do domínio activation e marcar a feature 019 na tabela "Status das Features"
- [ ] T015 [P] (Opcional) Adicionar botão "Verificar ativação" demonstrando `isAuthenticated()` em `example/src/App.tsx`
- [X] T016 Rodar todos os gates a partir da raiz: `yarn lint` (zero erros/avisos), `yarn typecheck` (zero erros), `yarn test` (suíte JS verde incl. novos describes) e `cd example/android && ./gradlew :react-native-pagseguro-plugpag:test` (Kotlin)
- [X] T017 Validar build Android do example e executar a validação do `quickstart.md` (SC-001..SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA toda implementação nativa
- **User Stories (Phase 3-4)**: Dependem da Foundational (T002, T003)
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **US1 (P1)**: Começa após Foundational. Independente — MVP completo sozinho.
- **US2 (P2)**: Começa após Foundational. Independentemente testável, mas compartilha 4 arquivos com US1 → suas tasks rodam DEPOIS das equivalentes de US1 (mesmo arquivo): T008 após T004, T009 após T005, T010 após T006, T011 após T007.

### Within Each User Story

- Testes JS escritos e FALHANDO antes da implementação (TDD)
- Spec + codegen (Foundational) antes do público TS e do Kotlin
- Função pública TS + override Kotlin antes dos testes Kotlin
- Story completa antes de avançar para a próxima prioridade

### Parallel Opportunities

- Paralelismo entre US1 e US2 é limitado: ambas funilam para os mesmos 4 arquivos (test JS, index.ts, Module.kt, ModuleTest.kt). Essas tasks NÃO são `[P]`.
- Paralelismo real existe apenas no Polish: T012, T013, T014, T015 tocam arquivos distintos → podem rodar juntas.

---

## Parallel Example: Polish Phase

```bash
# Tasks de documentação/demonstração tocam arquivos distintos — rodam em paralelo:
Task T012: "Atualizar README.md (EN)"
Task T013: "Atualizar README-PTBR.md (PT-BR)"
Task T014: "Atualizar CLAUDE.md (API pública + status)"
Task T015: "Adicionar botão de demonstração em example/src/App.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (Spec + codegen — CRÍTICO, bloqueia tudo)
3. Phase 3: US1 (`isAuthenticated`) — TDD: T004 falha → T005 → T006 → T007
4. **STOP e VALIDAR**: testar US1 independentemente (`yarn test`)
5. Demo/entrega se pronto — `isAuthenticated` já entrega o valor essencial

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 (`isAuthenticated`) → testar → MVP entregável
3. US2 (`asyncIsAuthenticated`) → testar → paridade com os `doAsync*`
4. Polish (docs + gates) → fechar a feature

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente
- Confirmar que os testes JS falham antes de implementar (TDD — Constituição III)
- Codegen é BLOQUEANTE após editar a Spec (research.md Decisão 5)
- `false` NÃO é erro: cobertura dedicada em ambas as variantes (regressão mais provável — research.md Riscos)
- Listener nativo no pacote `.listeners.PlugPagIsActivatedListener` (armadilha feature/018)
- Testes Kotlin permanecem placeholders estruturais (dívida técnica conhecida — feature/018)
- Commit após cada task ou grupo lógico
