# Implementation Plan: PagSeguro SDK Setup & iOS Removal

**Branch**: `feature/001-pagseguro-sdk-setup` | **Date**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pagseguro-sdk-setup/spec.md`

## Summary

Configurar a dependência do SDK PagSeguro PlugPagServiceWrapper 1.33.0 para projetos Android (via Expo Config Plugin idempotente e via `android/build.gradle` standalone), e remover completamente o suporte iOS do repositório — arquivos nativos, podspec, metadados de pacote, tasks de CI e autolinking — aplicando os guards de plataforma obrigatórios conforme Constitution Principle VI.

## Technical Context

**Language/Version**: TypeScript 5.9 (camada JS/TurboModule spec) + Kotlin 2.0.21 (módulo nativo Android)
**Primary Dependencies**: react-native 0.83.2, react-native-builder-bob 0.40.18, @expo/config-plugins (novo devDependency), expo ~55.0.7 (example)
**Storage**: N/A
**Testing**: Jest 29.7 com preset `react-native`
**Target Platform**: Android exclusivamente (PagBank SmartPOS: A920, A930, P2, S920)
**Project Type**: Biblioteca React Native — Turbo Module (New Architecture)
**Performance Goals**: N/A — feature de infraestrutura/configuração sem requisitos de performance em runtime
**Constraints**: Config Plugin DEVE ser idempotente; nenhuma breaking change na API pública existente (`multiply`); histórico git preservado (sem reescrita)
**Scale/Scope**: Setup de dependências — impacta todos os projetos consumidores da lib

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| **I. TurboModules Only** | ✅ PASS | A feature não altera a arquitetura TurboModule existente. Entretanto, o `TurboModuleRegistry.getEnforcing` em `NativePagseguroPlugpag.ts` é chamado no momento do `import` em `src/index.tsx`. **Esta feature DEVE corrigir isso** usando `require()` condicional dentro das funções exportadas, garantindo que `getEnforcing` nunca execute em iOS. |
| **II. TypeScript Strict** | ✅ PASS | O `require()` condicional requer tipagem explícita via `import()` type. O plugin em `plugin/index.ts` opera no ambiente Node.js — `strict: true` se aplica igualmente. Nenhum `any` permitido. |
| **III. Test-First / TDD** | ✅ PASS | O guard de plataforma (`Platform.OS !== 'android'`) em `src/index.tsx` DEVE ter cobertura de teste. O `it.todo` existente em `__tests__/index.test.tsx` DEVE ser substituído por testes reais que cubram: (a) warning no import em iOS, (b) erro na chamada de função em iOS, (c) funcionamento normal em Android. |
| **IV. Clean Code + SOLID** | ✅ PASS | Plugin com responsabilidade única (configuração de build). Guards com mensagens exatas da constitution. |
| **V. Device Compatibility** | ⚪ N/A | Lógica de detecção de dispositivo POS não é escopo desta feature (fase posterior). Esta feature cobre apenas o guard de plataforma iOS vs. Android no nível do SO. |
| **VI. Android-Only Scope** | ✅ PASS (com ação) | Esta feature implementa diretamente este princípio: remoção do `ios/`, remoção do `.podspec`, guard de dois níveis em `src/index.tsx`, `ios: null` em `react-native.config.js`. As mensagens exatas da constitution DEVEM ser usadas. |

**Violações detectadas**: Nenhuma que bloqueie o prosseguimento. A correção do `import` vs. `require()` condicional está no escopo desta feature e é tratada na implementação de `src/index.tsx`.

## Project Structure

### Documentation (this feature)

```text
specs/001-pagseguro-sdk-setup/
├── plan.md              # Este arquivo
├── spec.md              # Especificação da feature
├── research.md          # Decisões técnicas consolidadas (Phase 0)
├── data-model.md        # Entidades configuradas (Phase 1)
├── contracts/
│   └── expo-plugin-api.md   # Contrato público do Config Plugin (Phase 1)
└── tasks.md             # Gerado por /speckit.tasks (não criado aqui)
```

### Source Code (repository root)

```text
# Criar (novos)
app.plugin.js            # Entry point do Config Plugin (raiz da lib) — Expo resolve por aqui
plugin/
├── index.ts             # Expo Config Plugin (maven + dependência SDK)
└── build/               # Compilado via build:plugin — NÃO commitado diretamente
    └── index.js

react-native.config.js   # Desabilita autolinking iOS (raiz da lib)
tsconfig.plugin.json     # Config TypeScript para compilação do plugin

# Editar (existentes)
src/
└── index.tsx            # Adicionar guard de dois níveis (Platform.OS check + require condicional)

android/
└── build.gradle         # Adicionar maven repo PagSeguro + implementação SDK

package.json             # remover iOS de keywords/files; atualizar languages; adicionar build:plugin script; @expo/config-plugins em devDependencies; adicionar app.plugin.js e plugin/build em files

turbo.json               # Remover task build:ios inteira

example/
├── app.json             # Remover seção "ios"; registrar Config Plugin pelo nome do pacote
└── package.json         # Remover script "ios"; adicionar react-native-pagseguro-plugpag como workspace dep

.github/workflows/ci.yml # Remover job build-ios inteiro

# Deletar
ios/PagseguroPlugpag.h
ios/PagseguroPlugpag.mm
PagseguroPlugpag.podspec
```

**Structure Decision**: Projeto único com plugin como subdirectory separada. O `plugin/` não entra no pipeline do `react-native-builder-bob` (que compila `src/` → `lib/`); tem seu próprio `tsconfig.plugin.json` e script de build. O `app.plugin.js` na raiz é o entry point de descoberta do Expo.

## Complexity Tracking

> Nenhuma violação de constitution que exija justificativa de complexidade.

---

## Phase 0: Research (Complete)

Ver [research.md](research.md) para decisões consolidadas. Resumo:

| Tema | Decisão |
|------|---------|
| `@expo/config-plugins` placement | `devDependency` — Expo do consumidor fornece em runtime |
| Compilação do plugin | `tsconfig.plugin.json` separado → `plugin/build/` (CommonJS) |
| Entry point do plugin | `app.plugin.js` na raiz (re-exporta `plugin/build/index`) — Expo CLI resolve pelo nome do pacote |
| Import de `NativePagseguroPlugpag` | `require()` condicional dentro de funções (não import top-level) — evita `getEnforcing` em iOS |
| `react-native.config.js` | Raiz da lib — afeta consumidores npm, não apenas o example |
| Resolução do plugin no example | `workspace:*` em `example/package.json` — cria symlink via Yarn para Expo resolver pelo nome |
| Âncora `mergeContents` | Regex `/dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/` com offset 1 |

---

## Phase 1: Design & Contracts (Complete)

Ver [data-model.md](data-model.md) e [contracts/expo-plugin-api.md](contracts/expo-plugin-api.md).

### Implementação detalhada por arquivo

#### `app.plugin.js` (novo — raiz da lib)

```javascript
module.exports = require('./plugin/build/index');
```

Entry point que o Expo CLI procura ao resolver o plugin pelo nome do pacote `"react-native-pagseguro-plugpag"`. Tanto consumidores externos (via npm) quanto o example app (via workspace) chegam aqui.

#### `plugin/index.ts` (novo)

```typescript
import {
  withSettingsGradle,
  withAppBuildGradle,
  type ConfigPlugin,
} from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';

const MAVEN_REPO_URL =
  'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master';
const SDK_DEPENDENCY =
  "implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'";

const withPagSeguroMaven: ConfigPlugin = (config) =>
  withSettingsGradle(config, (mod) => {
    mod.modResults.contents = mergeContents({
      src: mod.modResults.contents,
      newSrc: `        maven { url "${MAVEN_REPO_URL}" }`,
      anchor: /dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/,
      offset: 1,
      tag: 'pagseguro-plugpag-maven',
      comment: '//',
    }).contents;
    return mod;
  });

const withPagSeguroDependency: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mergeContents({
      src: mod.modResults.contents,
      newSrc: `    ${SDK_DEPENDENCY}`,
      anchor: /dependencies\s*\{/,
      offset: 1,
      tag: 'pagseguro-plugpag-dependency',
      comment: '//',
    }).contents;
    return mod;
  });

const withPlugPag: ConfigPlugin = (config) => {
  config = withPagSeguroMaven(config);
  config = withPagSeguroDependency(config);
  return config;
};

export default withPlugPag;
```

#### `src/index.tsx` (editar)

Guard de dois níveis com `require()` condicional para compliance com Constitution VI:

```typescript
import { Platform } from 'react-native';
import type { Spec } from './NativePagseguroPlugpag';

// Level 1: warning no import — não crasha; app abre normalmente em iOS
if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. ' +
    'PagSeguro PlugPag SDK is Android-only.'
  );
}

export function multiply(a: number, b: number): number {
  // Level 2: erro catchable antes de qualquer acesso ao módulo nativo
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: multiply() is not supported on iOS. ' +
      'PagSeguro PlugPag SDK is Android-only.'
    );
  }
  // require() condicional — TurboModuleRegistry.getEnforcing nunca executa em iOS
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PagseguroPlugpag = require('./NativePagseguroPlugpag').default as Spec;
  return PagseguroPlugpag.multiply(a, b);
}
```

#### `android/build.gradle` (editar — adicionar ao existente)

```gradle
buildscript {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master' }  // adicionar
  }
  // ...
}

dependencies {
  implementation "com.facebook.react:react-android"
  implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'  // adicionar
}
```

#### `react-native.config.js` (novo — raiz da lib)

```javascript
module.exports = {
  dependency: {
    platforms: {
      ios: null,
      android: {},
    },
  },
};
```

#### `tsconfig.plugin.json` (novo)

```json
{
  "extends": "./tsconfig",
  "compilerOptions": {
    "outDir": "./plugin/build",
    "rootDir": "./plugin",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": false,
    "noEmit": false
  },
  "include": ["plugin"]
}
```

#### `package.json` (editar — campos afetados)

```json
{
  "keywords": ["react-native", "android"],
  "files": [
    "src",
    "lib",
    "android",
    "cpp",
    "app.plugin.js",
    "plugin/build",
    "react-native.config.js",
    "!android/build",
    ...
  ],
  "scripts": {
    "build:plugin": "tsc --project tsconfig.plugin.json",
    "prepare": "bob build && yarn build:plugin",
    ...
  },
  "devDependencies": {
    "@expo/config-plugins": "^9.0.0",
    ...
  },
  "create-react-native-library": {
    "languages": "kotlin",
    ...
  }
}
```

> Nota: **Não** adicionar campo `"expo": { "plugins": [...] }` ao `package.json` da lib. O `app.plugin.js` na raiz é o entry point reconhecido pelo Expo CLI — não o campo `expo` do package.json.

#### `turbo.json` (editar — remover task `build:ios`)

Manter apenas:
```json
{
  "tasks": {
    "build:android": { ... }
  }
}
```

#### `example/package.json` (editar)

Duas mudanças:

1. Remover script `"ios": "expo run:ios"`
2. Adicionar a lib como workspace dependency — necessário para o Expo resolver o plugin pelo nome:

```json
{
  "dependencies": {
    "react-native-pagseguro-plugpag": "workspace:*",
    "expo": "~55.0.7",
    ...
  }
}
```

> **Por quê**: `.yarnrc.yml` usa `nmHoistingLimits: workspaces` e o pacote não é declarado como dep do example. Sem a declaração, `node_modules/react-native-pagseguro-plugpag` não existe (confirmado localmente) e o Expo não consegue resolver o plugin pelo nome. Com `workspace:*`, Yarn cria o symlink correto após `yarn install`. Quando publicado no npm, consumidores reais instalam via `yarn add react-native-pagseguro-plugpag` — o symlink é substituído pelo pacote real, sem diferença de comportamento.

#### `example/app.json` (editar)

- Remover seção `"ios": { ... }` completa
- Registrar plugin pelo nome do pacote — mesmo padrão que consumidores externos usarão:

```json
{
  "expo": {
    "plugins": ["react-native-pagseguro-plugpag"],
    ...
  }
}
```

#### `.github/workflows/ci.yml` (editar)

Remover job `build-ios` inteiro.

#### Arquivos a deletar

- `ios/PagseguroPlugpag.h`
- `ios/PagseguroPlugpag.mm`
- `PagseguroPlugpag.podspec`

### Testes obrigatórios (Constitution III)

`src/__tests__/index.test.tsx` DEVE cobrir:

1. **iOS — warning no import**: mock `Platform.OS = 'ios'`, verificar `console.warn` chamado com prefixo correto
2. **iOS — erro nas funções**: mock `Platform.OS = 'ios'`, verificar que `multiply()` lança `Error` com prefixo correto
3. **Android — funcionamento normal**: mock `Platform.OS = 'android'` + mock do módulo nativo, verificar que `multiply()` chama o módulo e retorna o resultado

O módulo nativo DEVE ser mockado conforme Constitution III: "The native module MUST always be mocked in unit tests."

### Re-avaliação Constitution Check (pós-design)

| Princípio | Status Final |
|-----------|-------------|
| I. TurboModules Only | ✅ — `require()` condicional elimina o `getEnforcing` em iOS |
| II. TypeScript Strict | ✅ — tipagem via `import type` + asserção de tipo justificada |
| III. Test-First | ✅ — 3 cenários de teste definidos, cobrindo 100% do código adicionado |
| IV. Clean Code | ✅ — responsabilidades separadas, mensagens auto-documentadas |
| V. Device Compatibility | ⚪ N/A para esta feature |
| VI. Android-Only | ✅ — implementação completa do princípio |
