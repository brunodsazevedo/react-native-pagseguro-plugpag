# Research: PagSeguro SDK Setup & iOS Removal

**Feature**: 001-pagseguro-sdk-setup
**Date**: 2026-03-21

---

## Decision 1: Placement of `@expo/config-plugins` dependency

**Decision**: `devDependency` somente.

**Rationale**: O Config Plugin é executado durante o `expo prebuild` do projeto consumidor, que já possui `@expo/config-plugins` em seu próprio ambiente (é uma dependência direta do Expo). A lib não precisa carregar o pacote em runtime. Adicioná-lo como `dependency` normal inflaria o bundle e criaria conflito de versão com o Expo do consumidor.

**Alternatives considered**:
- `peerDependency`: Exige que o consumidor instale explicitamente, adicionando fricção sem necessidade.
- `dependency` direta: Carregada em runtime, aumenta bundle size sem benefício.

---

## Decision 2: Compilação TypeScript do plugin (`plugin/index.ts`) e entry point

**Decision**: `tsconfig.plugin.json` separado + script `build:plugin` no package.json. Output em `plugin/build/`. Um arquivo `app.plugin.js` na **raiz da lib** re-exporta o output compilado: `module.exports = require('./plugin/build/index')`. Esse é o entry point que o Expo CLI resolve ao procurar pelo nome do pacote.

**Rationale**: O `react-native-builder-bob` compila apenas `src/` → `lib/`. O plugin precisa de compilação independente porque: (a) é executado em ambiente Node.js (não React Native), (b) tem configuração de módulo diferente (`commonjs`, não `esm`), e (c) não deve ser incluído no bundle da lib. O padrão do ecossistema (confirmado pela documentação oficial do Expo e por libs como `expo-camera`) é ter um `app.plugin.js` na raiz como entry point — o Expo CLI procura por esse arquivo ao resolver plugins pelo nome do pacote.

**app.plugin.js** (raiz da lib):
```javascript
module.exports = require('./plugin/build/index');
```

**tsconfig.plugin.json** (estrutura):
```json
{
  "extends": "./tsconfig",
  "compilerOptions": {
    "outDir": "./plugin/build",
    "rootDir": "./plugin",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": false
  },
  "include": ["plugin"]
}
```

**Alternatives considered**:
- Campo `"expo": { "plugins": ["./plugin/build/index"] }` no `package.json`: Incorreto — o Expo não usa esse campo para resolução de plugins de terceiros. Esse campo seria interpretado como plugins a serem aplicados no próprio app, não como o entry point do plugin da lib.
- Apontar para `.ts` diretamente: Requer `ts-node` no ambiente do consumidor — frágil e não portátil.
- Incluir no pipeline do builder-bob: Não suportado sem ejeção da configuração padrão.

---

## Decision 3: Evitar crash de `TurboModuleRegistry.getEnforcing` em iOS (Constitution VI compliance)

**Decision**: `NativePagseguroPlugpag.ts` permanece com `TurboModuleRegistry.getEnforcing`, mas **NÃO é importado no topo de `src/index.tsx`**. O módulo nativo é acessado via `require()` condicional dentro de cada função exportada, após o guard de plataforma.

**Rationale**: A Constitution VI proíbe explicitamente `TurboModuleRegistry.getEnforcing` sem um guard de plataforma precedente. Importar `NativePagseguroPlugpag.ts` no topo do módulo causa a execução de `getEnforcing` em tempo de carga (`import` é síncrono), ANTES de qualquer guard — resultando no crash críptico que a constitution proíbe. O `require()` condicional é a única forma de garantir que `getEnforcing` nunca seja chamado em iOS.

**Estrutura resultante em `src/index.tsx`**:
```typescript
import { Platform } from 'react-native';

// Level 1: warning no import (nunca crasha)
if (Platform.OS !== 'android') {
  console.warn('[react-native-pagseguro-plugpag] WARNING: iOS is not supported. ...');
}

export function multiply(a: number, b: number): number {
  // Level 2: guard antes de qualquer acesso ao módulo nativo
  if (Platform.OS !== 'android') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: multiply() is not supported on iOS. ...');
  }
  // require() condicional — getEnforcing só executa em Android
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PagseguroPlugpag = require('./NativePagseguroPlugpag').default as import('./NativePagseguroPlugpag').Spec;
  return PagseguroPlugpag.multiply(a, b);
}
```

**Alternatives considered**:
- `TurboModuleRegistry.get` (nullable) em vez de `getEnforcing`: Permitiria import no topo, mas requer null-check em toda chamada nativa e muda o contrato do TurboModule spec. Maior impacto em fases futuras.
- Import dinâmico (`await import(...)`): Tornaria todas as funções assíncronas, quebrando a API atual.

---

## Decision 4: Escopo do `react-native.config.js`

**Decision**: Arquivo criado na **raiz da lib** (não no example). O `example/react-native.config.js` existente já declara a lib com `ios: {}` e `android: {}` explicitamente — esse arquivo é do app example, não da lib em si.

**Rationale**: Para desabilitar o autolinking iOS nos projetos *consumidores* da lib, o `react-native.config.js` deve existir no pacote npm publicado (raiz da lib). O arquivo do example serve apenas para que o monorepo encontre a lib local corretamente durante desenvolvimento.

**Conteúdo**:
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

**Alternatives considered**:
- Apenas no example: Não afeta consumidores externos — o problema persiste para qualquer projeto que instalar a lib via npm.
- Nenhum arquivo (só remover podspec): Sem `ios: null`, o autolinking tenta processar a lib para iOS mesmo sem podspec, gerando erros em logs de build.

---

## Decision 5: Registro do Config Plugin — como consumidores usam

**Decision**: Consumidores (incluindo o example app) registram o plugin pelo **nome do pacote** em seu `app.json`:
```json
{ "expo": { "plugins": ["react-native-pagseguro-plugpag"] } }
```
O Expo CLI resolve o nome do pacote → encontra `app.plugin.js` na raiz da lib → executa o plugin. Nenhum campo `"expo"` precisa ser adicionado ao `package.json` da lib.

**Rationale**: Este é o padrão oficial documentado pelo Expo e usado por todas as libs do ecossistema (firebase, camera, notifications, etc.). O `app.plugin.js` na raiz é o contrato de descoberta. Quando o consumidor usa o nome do pacote, a DX é idêntica a qualquer outra lib Expo.

**Pré-requisito crítico para o example (monorepo)**: O `.yarnrc.yml` usa `nmHoistingLimits: workspaces` — com esse setting, pacotes não são hoistados além do escopo de cada workspace. Como `example/package.json` não declara `react-native-pagseguro-plugpag` como dependência, o Expo não consegue resolver o plugin pelo nome. A solução é adicionar `"react-native-pagseguro-plugpag": "workspace:*"` em `example/package.json` — Yarn cria o symlink correto e o Expo resolve `app.plugin.js` normalmente.

**Alternatives considered**:
- `"../app.plugin.js"` (caminho relativo) no example: Funciona sem declarar dep, mas trata o example de forma diferente de um consumidor real — esconde problemas de resolução que só seriam descobertos na publicação.
- Campo `"expo": { "plugins": [...] }` no `package.json` da lib: Incorreto para este propósito — esse campo não é o mecanismo de registro para plugins distribuídos. O `app.plugin.js` é o único entry point reconhecido pelo Expo CLI.

---

## Decision 6: Âncora do `mergeContents` para `settings.gradle` (RN 0.76+)

**Decision**: Usar regex `/dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/` com `offset: 1` para injetar após a abertura do bloco `repositories`.

**Rationale**: React Native ≥ 0.73 usa `dependencyResolutionManagement` em `settings.gradle`. O `mergeContents` insere após a linha que casa com o anchor, no offset indicado. A regex captura o início do bloco independente de variações de espaçamento.

**Alternatives considered**:
- Anchor em `allprojects`: Removido do RN ≥ 0.73 — seria incompatível.
- String literal exata: Quebraria com qualquer variação de formatação no arquivo gerado.
