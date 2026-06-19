# Tasks: Atualização do Expo Config Plugin para Expo SDK 56

**Input**: Design documents from `/specs/014-expo-config-plugin-sdk56/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Escopo**: Migração cirúrgica de 2 arquivos — `package.json` (devDep) e `plugin/index.ts` (import).  
**Sem novos testes**: Nenhuma função nova exportada de `src/index.ts`. Acceptance gates = lint + typecheck + build + prebuild.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: User story de origem (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirmar baseline e estado inicial antes das alterações.

- [X] T001 Ler `plugin/index.ts` e confirmar a importação atual: `import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'`
- [X] T002 Ler `package.json` e confirmar devDependency atual: `"@expo/config-plugins": "^9.0.0"`

**Checkpoint**: Baseline confirmado — prosseguir para US1.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: N/A para esta feature — não há infraestrutura compartilhada a criar.  
Todas as user stories operam sobre arquivos independentes sem pré-requisito bloqueante além do Setup.

**⚠️ PULADO**: Prosseguir diretamente para Phase 3 (US1).

---

## Phase 3: User Story 1 — Compatibilidade com Expo SDK 56 (Priority: P1) 🎯 MVP

**Goal**: Atualizar a devDependency `@expo/config-plugins` para `~56.0.9` e confirmar que o build do plugin conclui sem erros com a nova versão.

**Independent Test**: `yarn build:plugin` conclui com código de saída 0 e artefatos presentes em `plugin/build/` após `yarn install` com a devDep atualizada.

### Implementação — User Story 1

- [X] T003 [US1] Atualizar devDependency `@expo/config-plugins` em `package.json` de `"^9.0.0"` para `"~56.0.9"`
- [X] T004 [US1] Executar `yarn install` para resolver dependência atualizada no workspace
- [X] T005 [US1] Executar `yarn build:plugin` e confirmar código de saída 0 com artefatos em `plugin/build/`

**Checkpoint**: US1 completa — devDep atualizada, build do plugin funciona com `@expo/config-plugins@56.0.9`.

---

## Phase 4: User Story 2 — Estabilidade via API Pública (Priority: P2)

**Goal**: Remover importação do caminho interno `@expo/config-plugins/build/utils/generateCode` e substituir por `CodeGenerator` do namespace público do pacote.

**Independent Test**: O código-fonte do plugin (`plugin/index.ts`) não contém nenhuma referência a `/build/utils/generateCode`. O artefato compilado (`plugin/build/index.js`) é gerado sem erros.

### Implementação — User Story 2

- [X] T006 [US2] Em `plugin/index.ts`: adicionar `CodeGenerator` ao import existente de `@expo/config-plugins` e remover a linha `import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'`
- [X] T007 [US2] Em `plugin/index.ts`: substituir as 2 ocorrências de `mergeContents({` por `CodeGenerator.mergeContents({` (em `withPagSeguroMaven` e em `withPagSeguroDependency`)
- [X] T008 [US2] Executar `yarn build:plugin` e confirmar código de saída 0 — compilação TypeScript sem erros após migração de import
- [X] T009 [US2] Confirmar ausência de caminho interno: `grep -r "build/utils/generateCode" plugin/` deve retornar zero resultados

**Checkpoint**: US2 completa — importação migrada para API pública, build confirma tipagem correta.

---

## Phase 5: User Story 3 — Continuidade da Injeção Android (Priority: P3)

**Goal**: Confirmar que o comportamento de injeção do plugin é funcionalmente idêntico ao anterior — mesmos valores Gradle, mesmas tags de idempotência — e que todos os gates de qualidade passam.

**Independent Test**: (a) Todos os 4 gates de qualidade passam com código de saída 0. (b) O prebuild Android gera arquivos Gradle com repositório Maven PagSeguro, dependência wrapper e tags de idempotência presentes.

### Implementação — User Story 3

- [X] T010 [P] [US3] Executar `yarn lint` e confirmar zero erros e zero avisos
- [X] T011 [P] [US3] Executar `yarn typecheck` e confirmar zero erros de tipo TypeScript
- [X] T012 [P] [US3] Executar `yarn test` e confirmar que todos os testes unitários passam
- [X] T013 [US3] Executar `yarn prepare` (build completo: plugin + biblioteca) e confirmar código de saída 0
- [X] T014 [US3] Executar prebuild Android do app de exemplo com limpeza: `cd example && npx expo prebuild --platform android --clean` e confirmar conclusão sem erros
- [X] T015 [US3] Inspecionar `example/android/build.gradle` e confirmar presença de: URL do Maven PagSeguro e tag `pagseguro-plugpag-maven`
- [X] T016 [US3] Inspecionar `example/android/app/build.gradle` e confirmar presença de: declaração da dependência `wrapper:1.33.0` e tag `pagseguro-plugpag-dependency`

**Checkpoint**: US3 completa — comportamento de injeção Android confirmado idêntico, todos os gates passam.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificações finais de escopo e limpeza.

- [X] T017 [P] Executar `git diff --name-only` e confirmar que exatamente 2 arquivos foram alterados: `package.json` e `plugin/index.ts`
- [X] T018 [P] Verificar que nenhum arquivo fora do escopo foi modificado: `src/`, `android/`, `example/` devem estar inalterados

**Checkpoint**: Feature pronta para PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **US1 (Phase 3)**: Depende de Setup — T003 → T004 → T005 (sequencial)
- **US2 (Phase 4)**: Depende de US1 (T005 deve passar primeiro) — T006 → T007 → T008 → T009 (sequencial)
- **US3 (Phase 5)**: Depende de US2 (T008 deve passar) — T010/T011/T012 paralelos → T013 → T014 → T015/T016
- **Polish (Phase 6)**: Depende de US3 — T017/T018 paralelos

### User Story Dependencies

- **US1 (P1)**: Independente — pode iniciar após Setup
- **US2 (P2)**: Depende de US1 (necessário ter a nova versão do pacote instalada para `CodeGenerator` estar disponível)
- **US3 (P3)**: Depende de US2 (validação do estado final após ambas as mudanças)

### Within Each User Story

- US1: T003 → T004 → T005 (sequencial — cada step depende do anterior)
- US2: T006 → T007 → T008 → T009 (sequencial)
- US3: {T010 ‖ T011 ‖ T012} → T013 → T014 → {T015 ‖ T016}

### Parallel Opportunities

- T010, T011, T012 (gates de qualidade de US3) — arquivos diferentes, sem dependências entre si
- T015, T016 (inspeção dos Gradle files) — arquivos diferentes
- T017, T018 (verificações de escopo) — independentes entre si

---

## Parallel Example: User Story 3

```bash
# Gates de qualidade em paralelo (todos independentes):
Task T010: yarn lint
Task T011: yarn typecheck
Task T012: yarn test

# Inspeção dos Gradle files em paralelo:
Task T015: grep "pagseguro-plugpag-maven" example/android/build.gradle
Task T016: grep "pagseguro-plugpag-dependency" example/android/app/build.gradle
```

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Completar Phase 1: Setup (T001, T002)
2. Completar Phase 3: US1 (T003, T004, T005)
3. **PARAR e VALIDAR**: `yarn build:plugin` com saída 0 e artefatos presentes
4. Continuar para US2 se validado

### Entrega Incremental

1. Setup → US1: devDep atualizada, build funciona → **milestone: dependência compatível**
2. US2: import migrado → **milestone: sem caminhos internos**
3. US3: todos os gates passam + prebuild confirmado → **milestone: feature completa**
4. Polish: escopo verificado → **pronto para PR**

### Estratégia de Rollback

Se US2 causar falha de build (ex: `CodeGenerator` não encontrado):
1. Verificar versão instalada: `node -e "console.log(require('@expo/config-plugins/package.json').version)"`
2. Confirmar que é `56.0.9`
3. Verificar exports: `node -e "const p = require('@expo/config-plugins'); console.log(Object.keys(p))"`
4. Se `CodeGenerator` não aparecer, investigar antes de prosseguir

---

## Notes

- [P] = arquivos diferentes, sem dependências pendentes
- [Story] mapeia cada task à user story correspondente para rastreabilidade
- Esta feature não tem testes TDD — acceptance gates são build + lint + typecheck + prebuild
- US1 e US2 são mudanças no mesmo arquivo (`plugin/index.ts` para US2, `package.json` para US1) — realizar em sequência
- Commit após Phase 3 (US1 estável) e após Phase 5 (US3 completa)
- O yarn.lock já tem `56.0.9` resolvido — `yarn install` deve ser rápido (sem novo download)
