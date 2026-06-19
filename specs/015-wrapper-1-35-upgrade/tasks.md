---
description: "Task list — Upgrade PlugPagServiceWrapper 1.33.0 → 1.35.0"
---

# Tasks: Atualização do PlugPagServiceWrapper 1.33.0 → 1.35.0

**Input**: Design documents from `/specs/015-wrapper-1-35-upgrade/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅ (N/A), contracts/ ✅ (N/A), quickstart.md ✅

**Tests**: NÃO incluídos. FR-006 é explícito — nenhum teste novo; a suíte existente
(`yarn lint`, `yarn typecheck`, `yarn test`, build Android) é reutilizada como gate de
regressão. Não há função exportada nova nem método nativo novo a cobrir.

**Organization**: Tarefas agrupadas por user story (P1, P1, P2) para implementação e
validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story à qual a tarefa pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluídos nas descrições

## Path Conventions

Biblioteca React Native (Android-only) com Expo config plugin. Caminhos relativos à raiz do
repositório. **Nenhum código TS/Kotlin de produção muda funcionalmente** — apenas configuração
de build, injeção do plugin e documentação (ver plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Garantir contexto correto antes de qualquer edição

- [x] T001 Confirmar checkout na branch `feature/015-wrapper-1-35-upgrade` e árvore de trabalho sem alterações pendentes não relacionadas (`git status`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estabelecer um baseline verde **antes** do bump, para que qualquer regressão seja atribuível à mudança de versão

**⚠️ CRITICAL**: Nenhuma user story deve começar antes de confirmar o baseline

- [x] T002 Estabelecer baseline verde rodando `yarn lint`, `yarn typecheck` e `yarn test` na branch atual (pré-bump) e registrar que estão verdes

**Checkpoint**: Baseline confirmado — as edições de versão podem começar

---

## Phase 3: User Story 1 - Consumidor recebe a versão atualizada do SDK (Priority: P1) 🎯 MVP

**Goal**: Entregar a dependência do SDK na `1.35.0` de forma drop-in — build declara/empacota o novo AAR, plugin Expo injeta a nova versão e a documentação pública reflete `1.35.0`, sem qualquer alteração de código no app consumidor.

**Independent Test**: Em um app de exemplo consumindo a lib, inspecionar que a config de build e o artefato buildado do plugin declaram `1.35.0`, compilar o build Android e executar um fluxo existente (ativação/pagamento) sem mudança de código.

### Implementation for User Story 1

- [x] T003 [P] [US1] Atualizar a coordenada Gradle de `wrapper:1.33.0` para `wrapper:1.35.0` em `android/build.gradle` (linha 76), mantendo a URL Maven inalterada
- [x] T004 [P] [US1] Atualizar a string de injeção da dependência de `:wrapper:1.33.0` para `:wrapper:1.35.0` em `plugin/index.ts` (linha 11)
- [x] T005 [P] [US1] Atualizar a menção ao SDK subjacente `PlugPagServiceWrapper 1.33.0` → `1.35.0` em `README.md` (linha 32)
- [x] T006 [P] [US1] Atualizar a menção ao SDK subjacente `PlugPagServiceWrapper 1.33.0` → `1.35.0` em `README-PTBR.md` (linha 33)
- [x] T007 [US1] Regenerar o artefato compilado do plugin Expo executando `yarn prepare` e confirmar que `plugin/build/index.js` passa a declarar `:wrapper:1.35.0` (depende de T004 — runtime do Expo lê do artefato buildado, não do fonte)

**Checkpoint**: A dependência e o plugin Expo declaram `1.35.0`; a documentação pública está consistente. US1 funcionalmente completa e verificável.

---

## Phase 4: User Story 2 - Mantenedor confia que o upgrade não regrediu (Priority: P1)

**Goal**: Garantia automatizada de que o bump não quebrou nada — todos os gates de qualidade existentes continuam verdes e o build Android resolve o novo AAR.

**Independent Test**: Rodar a suíte de qualidade existente e o build Android do example após o bump — todos verdes, sem adição de testes.

### Implementation for User Story 2

- [x] T008 [US2] Rodar `yarn lint` e confirmar zero erros ou avisos (depende das edições da US1 aplicadas)
- [x] T009 [P] [US2] Rodar `yarn typecheck` e confirmar type-check completo sem erros
- [x] T010 [P] [US2] Rodar `yarn test` e confirmar a suíte Jest existente verde (sem novos testes)
- [x] T011 [US2] Executar o build Android do example (`yarn example android` ou prebuild + gradle build) e confirmar que o AAR `wrapper:1.35.0` resolve via Maven e empacota sem erros

**Checkpoint**: 100% dos gates verdes (SC-002) e AAR `1.35.0` resolvido (SC-001). Upgrade seguro para promover.

---

## Phase 5: User Story 3 - Referências de versão ficam consistentes no repositório (Priority: P2)

**Goal**: Sincronizar todas as referências "vivas" remanescentes à versão do SDK e registrar o upgrade no CHANGELOG, sem reescrever registros históricos.

**Independent Test**: Buscar por `1.33.0` nos arquivos vivos após o bump — zero ocorrências de versão ativa; registros históricos permanecem intactos.

### Implementation for User Story 3

- [x] T012 [P] [US3] Atualizar a referência ativa "**SDK Alvo**" de `:wrapper:1.33.0` → `:wrapper:1.35.0` em `CLAUDE.md` (linha 11), preservando os logs históricos "Active Technologies"/"Recent Changes" (linhas 619-622, 633)
- [x] T013 [P] [US3] Atualizar a referência factual de versão `:wrapper:1.33.0` → `:wrapper:1.35.0` na seção "SDK Version" de `.specify/memory/constitution.md` (linha 262) — edição de referência, não de princípio (sem bump da constituição)
- [x] T014 [P] [US3] Atualizar o comentário "SDK wrapper 1.33.0:" → "SDK wrapper 1.35.0:" em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (linha 31)
- [x] T015 [US3] Adicionar nova entrada no topo de `CHANGELOG.md` documentando o upgrade para `1.35.0`, preservando a entrada histórica da feature 001 (linha 39) sem reescrita
- [x] T016 [US3] Verificar SC-003: rodar `grep -rn "1\.33\.0" android/build.gradle plugin/ README.md README-PTBR.md .specify/memory/constitution.md android/src/main/java` e confirmar zero ocorrências de referência ativa (registros históricos preservados são esperados)

**Checkpoint**: Todas as referências vivas em `1.35.0`; CHANGELOG atualizado; histórico preservado (FR-007).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consistência final e validação ponta a ponta

- [x] T017 [P] Revisar SC-004: confirmar que `1.35.0` aparece de forma consistente em 100% da documentação pública e permanente (READMEs, CLAUDE.md "SDK Alvo", constituição § SDK Version)
- [x] T018 Executar a validação completa de `specs/015-wrapper-1-35-upgrade/quickstart.md` ponta a ponta, confirmando SC-001 a SC-004

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA as user stories (baseline verde é pré-requisito de atribuição de regressões)
- **User Story 1 (Phase 3)**: Depende do Foundational — entrega o bump funcional (MVP)
- **User Story 2 (Phase 4)**: Depende das edições da US1 aplicadas (valida o resultado do bump)
- **User Story 3 (Phase 5)**: Depende do Foundational — independente da US2; pode rodar em paralelo às edições da US1
- **Polish (Phase 6)**: Depende de US1, US2 e US3 completas

### User Story Dependencies

- **US1 (P1)**: Núcleo funcional do bump. Independentemente testável (inspeção de config + build).
- **US2 (P1)**: Rede de segurança. Valida o resultado das edições da US1 (e idealmente roda após US3 para cobrir tudo). Independentemente testável (suíte de gates).
- **US3 (P2)**: Sincronização de referências internas + CHANGELOG. Edições não afetam build, logo não bloqueiam US2; independentemente testável (grep).

### Within Each User Story

- US1: T003-T006 são paralelos (arquivos distintos); T007 depende de T004.
- US2: T008-T010 são gates JS (T009/T010 paralelos); T011 (build Android) após edições da US1.
- US3: T012-T014 paralelos (arquivos distintos); T015 (CHANGELOG); T016 (grep) por último, após todas as edições vivas de US1 e US3.

### Parallel Opportunities

- US1: T003, T004, T005, T006 em paralelo.
- US2: T009, T010 em paralelo (T008 e T011 isolados por custo/ordem).
- US3: T012, T013, T014 em paralelo.

---

## Parallel Example: User Story 1

```bash
# Editar as 4 referências de versão em paralelo (arquivos distintos):
Task: "Atualizar android/build.gradle linha 76 → :wrapper:1.35.0"
Task: "Atualizar plugin/index.ts linha 11 → :wrapper:1.35.0"
Task: "Atualizar README.md linha 32 → PlugPagServiceWrapper 1.35.0"
Task: "Atualizar README-PTBR.md linha 33 → PlugPagServiceWrapper 1.35.0"
# Em seguida (sequencial): yarn prepare para regenerar plugin/build/index.js
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational — baseline verde (T002)
3. Phase 3: US1 — bump funcional (T003-T007)
4. **STOP e VALIDE**: build Android resolve `1.35.0` e fluxo existente roda sem mudança de código
5. Demo/release-candidate se pronto

### Incremental Delivery

1. Setup + Foundational → baseline confirmado
2. US1 → bump funcional → validar build (MVP!)
3. US2 → gates de regressão verdes → garantia de não-regressão
4. US3 → referências consistentes + CHANGELOG → release-ready
5. Polish → revisão de consistência + quickstart ponta a ponta

---

## Notes

- [P] = arquivos diferentes, sem dependências.
- [Story] mapeia a tarefa à user story para rastreabilidade.
- **NÃO** reescrever registros históricos: `CLAUDE.md` L619-622/L633, `CHANGELOG.md` L39, `specs/0*/` (FR-007).
- **Codegen NÃO é regenerado** — a Spec TurboModule (`NativePagseguroPlugpag.ts`) não muda.
- A validação de impressão em SmartPOS real é recomendada porém **não bloqueante** (comportamento a nível de runtime do terminal).
- Commit após cada grupo lógico de tarefas.
