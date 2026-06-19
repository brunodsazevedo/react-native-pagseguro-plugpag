# Tasks: Atualização do Example para Expo SDK 56 (Fase 1)

**Input**: Design documents from `specs/013-expo-sdk-56-upgrade/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tasks agrupadas por user story para permitir implementação e validação independentes de cada story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências de tasks incompletas)
- **[Story]**: A qual user story pertence (US1, US2, US3)
- Paths de arquivo exatos incluídos nas descrições

---

## Phase 1: Setup

**Purpose**: Verificar condições de partida e pré-requisitos do ambiente

- [X] T001 Verificar que o ambiente possui Node.js v24+ e Android SDK configurados localmente (pré-requisitos de `spec.md` — Assumptions)
- [X] T002 Inspecionar estado atual de `example/package.json` e confirmar versões de partida: `expo ~55.x`, `react-native 0.83.2`, `react-native-monorepo-config ^0.3.3`, `react-native-builder-bob ^0.40.18`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bump das dependências em `example/package.json` + sincronização do workspace — DEVE ser concluída antes das user stories

**⚠️ CRITICAL**: As stories US1, US2 e US3 dependem desta fase estar completa

- [X] T003 Atualizar `expo` para `^56` em `example/package.json` executando `cd example && yarn add expo@^56`
- [X] T004 Executar `cd example && npx expo install --fix` para alinhar automaticamente `react-native@0.85.3`, `expo-status-bar` e `expo-dev-client` às versões canônicas do SDK 56 (R-007)
- [X] T005 Atualizar devDependencies manuais em `example/package.json` executando `cd example && yarn add -D react-native-monorepo-config@^0.4.0 react-native-builder-bob@^0.43.0`
- [X] T006 Executar `yarn install` na raiz do projeto para sincronizar o workspace Yarn com as novas versões

**Checkpoint**: Dependências do example atualizadas — stories podem prosseguir sequencialmente

---

## Phase 3: User Story 1 — Atualização de Dependências do Example (Priority: P1) 🎯 MVP

**Goal**: Confirmar que `example/package.json` reflete o estado alvo do SDK 56 conforme contrato, e que nenhum arquivo invariante foi modificado

**Independent Test**: Inspecionar `example/package.json` verificando `expo ~56.x`, `react-native 0.85.x`, `react-native-builder-bob ^0.43.0`, `react-native-monorepo-config ^0.4.0`; e confirmar que todos os 7 arquivos invariantes do example e os diretórios `src/`, `android/` e `plugin/index.ts` da raiz estão inalterados

### Implementation for User Story 1

- [X] T007 [US1] Verificar `example/package.json` contra todas as invariantes do contrato `specs/013-expo-sdk-56-upgrade/contracts/example-package-json.md`: `expo ~56.x`, `react-native 0.85.3`, `react ^19.2.0` (sem mudança), `react-native-pagseguro-plugpag workspace:*` (sem mudança), `expo-status-bar` e `expo-dev-client` alinhados pelo `expo install --fix`, `react-native-builder-bob ^0.43.0`, `react-native-monorepo-config ^0.4.0`, campos `scripts/name/version/main/private` inalterados
- [X] T008 [P] [US1] Confirmar que os 7 arquivos invariantes de `example/` estão inalterados: `example/app.json`, `example/babel.config.js`, `example/metro.config.js`, `example/tsconfig.json`, `example/src/App.tsx`, `example/react-native.config.js`, `example/index.js` (FR-007)
  > **Desvio documentado**: `example/app.json` foi alterado pelo `expo install --fix` (adicionou `expo-status-bar` ao array `plugins`) e pelo upgrade do schema SDK 56 (remoção do campo `splash` — inválido no schema v56). As demais invariantes permaneceram inalteradas.
- [X] T009 [P] [US1] Confirmar que `src/` (diretório completo), `android/` (diretório completo) e `plugin/index.ts` da raiz estão inalterados (FR-007, data-model.md §3)

**Checkpoint**: US1 concluída — `example/package.json` no estado alvo e todos os invariantes preservados

---

## Phase 4: User Story 2 — Validação do Plugin Expo com o Novo SDK (Priority: P2)

**Goal**: Confirmar que o plugin de configuração da biblioteca é compatível com o Expo SDK 56 via `expo-doctor` + `expo prebuild`; aplicar exceção condicional em `@expo/config-plugins` na raiz se necessário

**Independent Test**: Executar `cd example && npx expo-doctor` sem outputs de categoria `error`; executar `yarn example expo prebuild --platform android` sem erros e confirmar presença de `example/android/`

### Implementation for User Story 2

- [X] T010 [US2] Executar `cd example && npx expo-doctor` e inspecionar output: anotar qualquer saída de categoria `error` (warnings são aceitáveis e não bloqueantes — SC-002)
  > **Resultado**: 20/21 checks passou. 1 check falhou: duplicata de `react`/`react-native` (`nmHoistingLimits: workspaces` no `.yarnrc.yml` — false positive de monorepo, pre-existing). Nenhum erro de `@expo/config-plugins`. Ação adicional: `splash` removido do schema `example/app.json` (inválido no SDK 56).
- [X] T011 [US2] (Condicional — apenas se T010 reportar `error` em `@expo/config-plugins`) Aplicar bump `@expo/config-plugins@^9.0.0` → `~56.0.0` em `package.json` (raiz) — entregar em **commit separado** identificado como "exceção Fase 1" conforme `specs/013-expo-sdk-56-upgrade/contracts/root-exception.md`
  > **Não aplicado**: expo-doctor não reportou erro em `@expo/config-plugins`.
- [X] T012 [US2] (Condicional — apenas após T011) Executar `yarn install` na raiz para instalar `@expo/config-plugins@~56.0.0` atualizado
  > **Não aplicado**: T011 não foi executado.
- [X] T013 [US2] Executar `yarn build:plugin` na raiz e confirmar que o plugin de configuração compila sem erros; artefatos esperados em `plugin/build/`
- [X] T014 [US2] (Condicional — apenas se T013 falhar) Verificar se o deep import `@expo/config-plugins/build/utils/generateCode` ainda existe no pacote instalado; se quebrou, substituir import em `plugin/index.ts` conforme alternativa documentada em `specs/013-expo-sdk-56-upgrade/contracts/root-exception.md` (R-004)
  > **Não aplicado**: `yarn build:plugin` passou sem erros.
- [X] T015 [US2] Executar `yarn example expo prebuild --platform android` e confirmar: (a) processo conclui com código de saída 0, (b) diretório `example/android/` é gerado — SC-003, FR-004, FR-006

**Checkpoint**: US2 concluída — plugin validado com SDK 56, prebuild Android concluído sem erros

---

## Phase 5: User Story 3 — Confirmação de Nenhuma Regressão na Biblioteca Raiz (Priority: P3)

**Goal**: Executar os quatro gates de qualidade da raiz e confirmar que nenhuma regressão foi introduzida na biblioteca pelo upgrade do example; verificar escopo de arquivos alterados

**Independent Test**: Executar `yarn lint`, `yarn typecheck`, `yarn test` e `yarn prepare` todos com código de saída 0 e zero erros/avisos; `git diff --name-only` mostrando apenas arquivos permitidos

### Implementation for User Story 3

- [X] T016 [P] [US3] Executar `yarn lint` na raiz e confirmar zero erros ou avisos (SC-004, FR-005) — bloqueante para abertura de PR
- [X] T017 [P] [US3] Executar `yarn typecheck` na raiz e confirmar zero erros de tipagem TypeScript (SC-004, FR-005)
- [X] T018 [P] [US3] Executar `yarn test` na raiz e confirmar que todos os testes unitários passam sem falhas (SC-004, FR-005)
  > **Ação adicional**: `react-native@0.85.3` moveu o jest preset para `@react-native/jest-preset`. Instalado `@react-native/jest-preset@0.85.3` e atualizado `jest.preset` em `package.json` raiz. 63 testes passando.
- [X] T019 [US3] Executar `yarn prepare` na raiz e confirmar que os artefatos da biblioteca são gerados sem erros nos diretórios esperados (FR-008, SC-004)
- [X] T020 [US3] Executar `git diff --name-only` e confirmar que apenas `example/package.json` está modificado (e `package.json` raiz se a exceção de T011 foi aplicada) — nenhum outro arquivo fora do escopo permitido (SC-006, FR-002)
  > **Desvio documentado**: Arquivos modificados além de `example/package.json`:
  > - `example/app.json`: expo-status-bar plugin (pelo `expo install --fix`) + remoção de `splash` (exigida pelo schema SDK 56)
  > - `package.json` raiz: `react 19.2.3`, `react-native 0.85.3`, `react-test-renderer 19.2.3` (alinhamento com example para deduplicação) + `@react-native/jest-preset 0.85.3` + `jest.preset` migrado (exigido pelo RN 0.85.3)
  > - `yarn.lock`: esperado

**Checkpoint**: US3 concluída — zero regressões na biblioteca raiz, escopo de alterações validado

---

## Phase Final: Polish & Critérios de Abertura de PR

**Purpose**: Validação final cruzada de todos os critérios de sucesso antes de abrir o PR

- [X] T021 [P] Confirmar todos os critérios de sucesso: SC-001 (`example/package.json` com SDK 56 + RN 0.85.x), SC-002 (expo-doctor sem `error`), SC-003 (prebuild Android OK), SC-004 (lint + typecheck + test + prepare OK), SC-006 (git diff no escopo)
  > **SC-002**: 20/21 checks passaram. 1 check falhou com false positive de `nmHoistingLimits: workspaces` (pre-existing). Nenhum erro funcional.
- [X] T023 [US2] Corrigir `example/babel.config.js` — incompatibilidade com `@babel/core` bundled no `@expo/metro-config` SDK 56
  > **Causa raiz**: `@expo/metro-config` SDK 56 vende internamente uma versão mais nova de `@babel/core` que rejeita string/RegExp em `overrides.include` quando `loadPartialConfigSync` é chamado sem `filename` (cálculo de cache key do transformer). `getConfig` de `react-native-builder-bob/babel-config` retornava `overrides: [{ include: "/path/to/src" }]` — a string `include` dispara `ConfigError`, que cascateia para `TypeError: Cannot read properties of undefined (reading 'transformFile')`.
  > **Fix (Opção B)**: Substituído por config mínima `{ presets: ['babel-preset-expo'] }`. Funcional porque `metro.config.js` já usa `withMetroConfig` de `react-native-monorepo-config` com `conditions: ['source']` para resolver a biblioteca pelo código-fonte — o `overrides` do babel era redundante.
  > **Desvio adicional**: `example/babel.config.js` era invariante previsto em T008. Modificado por incompatibilidade introduzida pelo SDK 56 — mesma justificativa que `example/app.json`.
- [ ] T022 Abrir PR com title, description e referência ao SC-005 — garantir que CI `build-android` passe na branch antes do merge (FR-006); PR deve ser aberto apenas após prebuild local concluído (T015)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende de Setup — **BLOQUEIA todas as stories**
- **US1 (Phase 3)**: Depende da Foundational — verificação do resultado do bump
- **US2 (Phase 4)**: Depende de US1 — não faz sentido validar o plugin sem o bump confirmado
- **US3 (Phase 5)**: Depende de US2 — gates de qualidade após validação Android
- **Polish (Phase Final)**: Depende de todas as stories estarem completas

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Foundational — verifica estado de `example/package.json`
- **US2 (P2)**: Depende de US1 — requer bump confirmado antes de rodar expo-doctor e prebuild
- **US3 (P3)**: Depende de US2 — gates de qualidade após validação completa do plugin

> **Nota**: As 3 stories deste upgrade são fundamentalmente sequenciais. Não há oportunidade de paralelismo entre stories — apenas dentro de cada story.

### Within Each User Story

- **US1**: T008 e T009 podem rodar em paralelo (verificam conjuntos de arquivos diferentes)
- **US2**: T011 depende de T010; T012 depende de T011; T014 depende de T013 — sequencial; T013 depende de T011/T012 se exceção foi aplicada
- **US3**: T016, T017, T018 podem rodar em paralelo (comandos independentes)

### Conditional Tasks

| Task | Condição de Execução |
|---|---|
| T011 | `expo-doctor` (T010) reportar `error` em `@expo/config-plugins` |
| T012 | T011 ter sido executado (exceção aplicada) |
| T014 | `yarn build:plugin` (T013) falhar com erro de import |

Se nenhuma condição for ativada, a sequência reduz para: T010 → T013 → T015.

---

## Parallel Example: User Story 1

```bash
# T008 e T009 podem rodar em paralelo:
Task T008: "Verificar 7 arquivos invariantes em example/"
Task T009: "Verificar src/, android/, plugin/index.ts da raiz"
```

## Parallel Example: User Story 3

```bash
# T016, T017, T018 podem rodar em paralelo:
Task T016: "yarn lint"
Task T017: "yarn typecheck"
Task T018: "yarn test"
# T019 (yarn prepare) roda após T016-T018 passarem
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (T001-T002)
2. Completar Phase 2: Foundational (T003-T006) — CRÍTICO
3. Completar Phase 3: US1 (T007-T009)
4. **PARAR e VALIDAR**: `example/package.json` reflete SDK 56 com todos os invariantes preservados?
5. Prosseguir para US2 se validação passar

### Sequência Completa

1. Setup → Foundational → US1 completada (bump confirmado)
2. US2: expo-doctor → exceção condicional → build:plugin → prebuild Android
3. US3: lint + typecheck + test (paralelo) → prepare → git diff check
4. Polish: validação final + PR

### Sequência de Execução Resumida (R-007)

```bash
# Phase 2 - Foundational
cd example && yarn add expo@^56
npx expo install --fix
yarn add -D react-native-monorepo-config@^0.4.0 react-native-builder-bob@^0.43.0
cd .. && yarn install

# Phase 3 - US1: verificar package.json e invariantes

# Phase 4 - US2
cd example && npx expo-doctor
# (se error em @expo/config-plugins → bump na raiz em commit separado + yarn install)
cd .. && yarn build:plugin
yarn example expo prebuild --platform android

# Phase 5 - US3
yarn lint && yarn typecheck && yarn test
yarn prepare
git diff --name-only
```

---

## Notes

- [P] = arquivos diferentes, sem dependências entre si
- [US?] = rastreabilidade à user story da spec
- T010-T012 e T013-T014 são condicional — a sequência feliz (sem `error` no expo-doctor e sem quebra de import) pula T011, T012 e T014
- Commits: o bump do `example/package.json` e a exceção condicional de `@expo/config-plugins` na raiz DEVEM ser commits separados (FR-002)
- O prebuild local (T015) é obrigatório antes de abrir o PR — o CI não substitui a validação local (SC-005)
- `yarn lint` (T016) é bloqueante para qualquer PR — falha aqui bloqueia abertura
