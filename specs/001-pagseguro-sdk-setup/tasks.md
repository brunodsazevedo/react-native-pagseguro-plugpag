# Tasks: PagSeguro SDK Setup & iOS Removal

**Input**: Design documents from `/specs/001-pagseguro-sdk-setup/`
**Branch**: `feature/001-pagseguro-sdk-setup`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Incluídos para US2 (guard de plataforma) conforme exigido pela Constitution III — TDD obrigatório para código exportado de `src/index.tsx`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente da spec.md

---

## Phase 1: Setup (Infraestrutura compartilhada)

**Propósito**: Instalar dependências e criar estrutura base necessária para todas as user stories.

- [X] T001 Adicionar `@expo/config-plugins` como devDependency em `package.json`
- [X] T002 Adicionar script `"build:plugin": "tsc --project tsconfig.plugin.json"` e atualizar `"prepare": "bob build && yarn build:plugin"` em `package.json`
- [X] T003 Criar `tsconfig.plugin.json` na raiz do repo (CommonJS, rootDir: `plugin/`, outDir: `plugin/build/`, noEmit: false)
- [X] T004 [P] Criar `plugin/index.ts` com placeholder de export (estrutura vazia — implementação em Phase 3)
- [X] T005 [P] Adicionar `"react-native-pagseguro-plugpag": "workspace:*"` em `dependencies` de `example/package.json` e executar `yarn install` para criar o symlink

**Checkpoint**: Dependências instaladas, estrutura de plugin criada, symlink de workspace ativo.

---

## Phase 2: Foundational (Pré-requisitos bloqueantes)

> Esta feature não possui pré-requisitos que bloqueiem todas as user stories simultaneamente. As fases 3, 4 e 5 podem ser trabalhadas após Phase 1.

---

## Phase 3: User Story 1 — SDK Android + Config Plugin (Priority: P1) 🎯 MVP

**Goal**: Um desenvolvedor que adiciona a lib a um projeto Expo tem o repositório maven e a dependência do SDK PagSeguro configurados automaticamente no Android após o prebuild, sem editar arquivos nativos manualmente.

**Independent Test**: Rodar `yarn example expo prebuild --platform android` e verificar que `example/android/settings.gradle` contém a entrada maven e `example/android/app/build.gradle` contém a implementação do SDK. Rodar novamente e verificar ausência de duplicação.

### Implementation for User Story 1

- [X] T006 [US1] Implementar `withPagSeguroMaven` em `plugin/index.ts` — injeta maven repo via `mergeContents` com tag `pagseguro-plugpag-maven` e anchor no bloco `repositories` de `dependencyResolutionManagement` em `settings.gradle`
- [X] T007 [US1] Implementar `withPagSeguroDependency` em `plugin/index.ts` — injeta `implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'` via `mergeContents` com tag `pagseguro-plugpag-dependency` e anchor no bloco `dependencies` de `app/build.gradle`
- [X] T008 [US1] Exportar plugin composto `withPlugPag` como `export default` em `plugin/index.ts`
- [X] T009 [P] [US1] Criar `app.plugin.js` na raiz do repo com `module.exports = require('./plugin/build/index')`
- [X] T010 [P] [US1] Adicionar maven repo da PagSeguro ao bloco `buildscript.repositories` em `android/build.gradle`
- [X] T011 [P] [US1] Adicionar `implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'` ao bloco `dependencies` em `android/build.gradle`
- [X] T012 [US1] Registrar plugin em `example/app.json`: adicionar `"plugins": ["react-native-pagseguro-plugpag"]` e remover seção `"ios": { ... }` completa
- [X] T013 [US1] Executar `yarn build:plugin` e verificar que `plugin/build/index.js` é gerado sem erros
- [X] T014 [US1] Executar `yarn example expo prebuild --platform android` e verificar: (a) maven repo presente em `example/android/settings.gradle`, (b) dependência SDK presente em `example/android/app/build.gradle`, (c) executar prebuild novamente e confirmar ausência de entradas duplicadas (idempotência)

**Checkpoint**: Config Plugin funcional — prebuild do example injeta SDK corretamente sem duplicação.

---

## Phase 4: User Story 2 — Comportamento Seguro em iOS (Priority: P2)

**Goal**: A biblioteca emite um aviso claro no import e lança erros acionáveis em cada função quando usada em iOS, sem crash críptico nativo.

**Independent Test**: Executar `yarn test` com mocks de `Platform.OS = 'ios'` e verificar: (a) `console.warn` chamado com prefixo correto ao importar, (b) `multiply()` lança `Error` com prefixo correto ao ser chamado.

### Testes para User Story 2 (Constitution III — TDD obrigatório) ⚠️

> **ESCREVER OS TESTES PRIMEIRO — confirmar que FALHAM antes de qualquer implementação**

- [X] T015 [US2] Escrever testes em `src/__tests__/index.test.tsx` cobrindo: (1) warning no import em iOS — mock `Platform.OS = 'ios'`, spy em `console.warn`, verificar prefixo `[react-native-pagseguro-plugpag] WARNING:`; (2) throw em `multiply()` em iOS — verificar mensagem com prefixo `[react-native-pagseguro-plugpag] ERROR:`; (3) funcionamento normal em Android — mock `Platform.OS = 'android'` + mock do módulo nativo, verificar retorno correto. Confirmar que os 3 testes FALHAM antes de prosseguir.

### Implementation for User Story 2

- [X] T016 [US2] Remover o `import PagseguroPlugpag from './NativePagseguroPlugpag'` do topo de `src/index.tsx` (elimina execução de `getEnforcing` em tempo de carga)
- [X] T017 [US2] Adicionar `import { Platform } from 'react-native'` e `import type { Spec } from './NativePagseguroPlugpag'` em `src/index.tsx`
- [X] T018 [US2] Adicionar Level 1 guard no topo de `src/index.tsx` (após imports): `if (Platform.OS !== 'android') { console.warn('[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.') }`
- [X] T019 [US2] Refatorar `multiply()` em `src/index.tsx`: adicionar Level 2 guard com throw antes do acesso nativo, e substituir uso da variável importada por `require('./NativePagseguroPlugpag').default as Spec` condicional
- [X] T020 [US2] Executar `yarn test` e confirmar que os 3 testes de T015 agora PASSAM

**Checkpoint**: Guard de plataforma funcional — import em iOS emite warning, funções em iOS lançam erro catchable, Android funciona normalmente.

---

## Phase 5: User Story 3 — Projeto Livre de Artefatos iOS (Priority: P3)

**Goal**: O repositório não contém arquivos nativos iOS, podspec, referências iOS em metadados ou jobs iOS no CI.

**Independent Test**: Verificar ausência de `ios/`, `*.podspec`, `"ios"` em keywords/files do `package.json`, task `build:ios` no `turbo.json`, job `build-ios` no CI, e script `ios` em `example/package.json`.

### Implementation for User Story 3

- [X] T021 [P] [US3] Deletar `ios/PagseguroPlugpag.h` e `ios/PagseguroPlugpag.mm` (pode deletar o diretório `ios/` inteiro se vazio)
- [X] T022 [P] [US3] Deletar `PagseguroPlugpag.podspec` da raiz do repo
- [X] T023 [P] [US3] Criar `react-native.config.js` na raiz do repo com `dependency.platforms.ios: null` e `android: {}`
- [X] T024 [US3] Atualizar `package.json`: remover `"ios"` de `keywords`; remover `"ios"`, `"cpp"`, `"*.podspec"` de `files`; adicionar `"app.plugin.js"`, `"plugin/build"`, `"react-native.config.js"` em `files`; atualizar `create-react-native-library.languages` de `"kotlin-objc"` para `"kotlin"`
- [X] T025 [P] [US3] Remover task `build:ios` inteira de `turbo.json`
- [X] T026 [P] [US3] Remover script `"ios": "expo run:ios"` de `example/package.json`
- [X] T027 [P] [US3] Remover job `build-ios` inteiro de `.github/workflows/ci.yml`

**Checkpoint**: Repositório livre de artefatos iOS — nenhuma ferramenta tenta processar código nativo iOS.

---

## Phase 6: Polish & Validação Final

**Propósito**: Garantir que todas as peças funcionam em conjunto e a qualidade está conforme a Constitution.

- [X] T028 [P] Executar `yarn typecheck` e corrigir eventuais erros de TypeScript introduzidos pelas mudanças
- [X] T029 [P] Executar `yarn lint` e corrigir eventuais violações de ESLint
- [X] T030 Executar `yarn test --coverage` e confirmar 100% de cobertura das adições em `src/index.tsx`
- [X] T031 Executar `yarn prepare` (bob build + build:plugin) e confirmar build completo sem erros

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **US1 (Phase 3)**: Depende de Phase 1 (T001-T005) estar completa
- **US2 (Phase 4)**: Depende de Phase 1 estar completa — independente de US1
- **US3 (Phase 5)**: Depende de Phase 1 estar completa — independente de US1 e US2
- **Polish (Phase 6)**: Depende de US1 + US2 + US3 estarem completas

### User Story Dependencies

- **US1 (P1)**: Bloqueada apenas por Phase 1 — pode começar imediatamente após setup
- **US2 (P2)**: Bloqueada apenas por Phase 1 — pode ser trabalhada em paralelo com US1
- **US3 (P3)**: Bloqueada apenas por Phase 1 — pode ser trabalhada em paralelo com US1 e US2

### Within Each User Story

- **US2**: Testes DEVEM ser escritos e confirmados FALHANDO (T015) antes de qualquer implementação (T016-T019)
- **US1**: plugin/index.ts deve ser compilado (T013) antes de verificar o prebuild (T014)
- **US1**: T009-T011 podem ser executadas em paralelo com T006-T008

### Parallel Opportunities

- T004 e T005 (Phase 1) podem rodar em paralelo
- T009, T010, T011 (US1) podem rodar em paralelo após T008
- US2 inteira pode rodar em paralelo com US1 (arquivos diferentes: `src/index.tsx` vs `plugin/index.ts`)
- T021, T022, T023, T025, T026, T027 (US3) podem rodar em paralelo entre si
- T028 e T029 (Polish) podem rodar em paralelo

---

## Parallel Example: US1 + US2 simultâneos

```text
# Após Phase 1 completa, pode-se trabalhar em paralelo:

Developer A (US1 — plugin):
  T006 → T007 → T008 → T013 → T014
  T009, T010, T011 em paralelo enquanto T006-T008 acontecem

Developer B (US2 — platform guard):
  T015 (escrever testes, confirmar falha) → T016 → T017 → T018 → T019 → T020
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup (T001-T005)
2. Completar Phase 3: US1 (T006-T014)
3. **PARAR e VALIDAR**: Rodar prebuild e confirmar SDK configurado
4. Continuar para US2 e US3

### Incremental Delivery

1. Phase 1 → Foundation pronta
2. US1 (T006-T014) → SDK configurado via plugin → validar prebuild
3. US2 (T015-T020) → Guard iOS → validar testes
4. US3 (T021-T027) → Repositório limpo → validar CI
5. Polish (T028-T031) → Qualidade final

---

## Notes

- **Constitution III**: Para US2, testes DEVEM falhar antes da implementação. Não pular T015.
- **Constitution VI**: O `require()` condicional (T019) é obrigatório — não usar import top-level do módulo nativo.
- **Idempotência**: T014 inclui executar prebuild duas vezes — não pular essa verificação.
- `plugin/build/` NÃO deve ser commitado — adicionar ao `.gitignore` se ainda não estiver.
- Confirmar `app.plugin.js` e `plugin/build/` estão incluídos em `files` no `package.json` para publicação npm.
