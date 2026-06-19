# Research: Atualização do Example para Expo SDK 56 (Fase 1)

**Branch**: `feature/013-expo-sdk-56-upgrade`  
**Date**: 2026-06-18  
**Source primária**: [RELATORIO-EXPO-SDK-56.md](../../RELATORIO-EXPO-SDK-56.md) — análise
executada com `npm view` em 2026-06-18.

---

## R-001: Versões alvo confirmadas (Example)

**Decision**: Versões alvo para `example/package.json`:

| Pacote | De | Para | Como |
|---|---|---|---|
| `expo` | `~55.0.7` | `~56.0.0` | `yarn add expo@^56` (manual) |
| `react-native` | `0.83.2` | `0.85.3` | `npx expo install --fix` (automático) |
| `expo-status-bar` | `~55.0.4` | `~56.x` | `npx expo install --fix` (automático) |
| `expo-dev-client` | `~55.0.17` | `~56.x` | `npx expo install --fix` (automático) |
| `react-native-monorepo-config` | `^0.3.3` | `^0.4.0` | manual |
| `react-native-builder-bob` | `^0.40.18` | `^0.43.0` | manual |
| `react` | `19.2.0` | `19.2.0` | sem mudança |

**Rationale**: O Expo SDK 56 fixa o React Native em `0.85.x` (último patch: `0.85.3`). A
linha `0.86.x` é o latest do npm mas não é suportada pelo SDK 56 — subir além da linha
do SDK quebraria o alinhamento. `expo install --fix` é o método canônico para alinhar
dependências ao SDK.

**Alternatives considered**: Fixar versões manualmente sem `expo install --fix`. Rejeitado
porque `expo install --fix` é o método canônico e garante consistência com as versões
exatas que o SDK 56 espera (especialmente para `expo-status-bar` e `expo-dev-client`).

---

## R-002: API de `react-native-monorepo-config@0.4.0`

**Decision**: A API `withMetroConfig` (usada em `example/metro.config.js`) é estável e
não foi alterada de forma incompatível em `0.4.0`.

**Rationale**: O `example/metro.config.js` usa exclusivamente `withMetroConfig(config, { root, dirname })`.
O RELATORIO classifica o risco como "Baixa" — a API é estável e o changelog não indica
breaking change nessa função. `example/metro.config.js` permanece inalterado (FR-007).

**Alternatives considered**: N/A — não há alternativa; `withMetroConfig` é a única API usada.

---

## R-003: `react-native-builder-bob@0.43.0` — impacto no example

**Decision**: Nenhum impacto em `example/babel.config.js`. O bump afeta apenas ferramental
de build da biblioteca raiz (`yarn prepare`). O example usa `bob` apenas como devDependency
para o monorepo, sem dependência direta da saída do build.

**Rationale**: O RELATORIO classifica o risco como "Baixa". A função `getConfig()` usada
em `example/babel.config.js` é API estável do bob. `example/babel.config.js` permanece
inalterado (FR-007).

**Alternatives considered**: N/A.

---

## R-004: `@expo/config-plugins` — deep import e risco de incompatibilidade

**Decision**: O deep import `@expo/config-plugins/build/utils/generateCode` (usado em
`plugin/index.ts:6`) é o **maior risco prático** desta fase. A estratégia é:

1. Executar `npx expo-doctor` após o bump do example para verificar se o `expo@56`
   requer `@expo/config-plugins@~56.0.0` como peer.
2. Se `expo-doctor` reportar `error` em `@expo/config-plugins`:
   - Antecipar o bump para `~56.0.0` na raiz (exceção ao escopo — FR-002).
   - Validar que `mergeContents` ainda existe no caminho interno após o bump.
   - Se o caminho quebrar: migrar para `expo/config-plugins` (re-export público do Expo).
3. Validar com `yarn build:plugin` + `expo prebuild --platform android`.

**Rationale**: A versão `@expo/config-plugins@^9.0.0` na raiz pode conflitar com
`expo@56` que usa `@expo/config-plugins@56.x`. O esquema de versioning mudou de semver
independente para alinhado ao número do SDK (9 → 56 é um salto de versão major). O
`expo-doctor` expõe esse conflito antes do prebuild.

**Alternatives considered**:
- Ignorar o deep import e confiar na retrocompatibilidade do path interno: rejeitado
  porque `/build/utils/...` é API interna não garantida.
- Migrar imediatamente para `expo/config-plugins` sem testar: rejeitado porque adiciona
  risco desnecessário se o path atual ainda funcionar com `~56.0.0`.

---

## R-005: Arquivos confirmados inalterados (FR-007)

**Decision**: Os 7 arquivos listados em FR-007 são agnósticos de versão e NÃO mudam:

| Arquivo | Motivo |
|---|---|
| `example/app.json` | Configuração Expo agnóstica de versão de SDK |
| `example/babel.config.js` | `babel-preset-expo` gerenciado por `expo install`; API `getConfig()` estável |
| `example/metro.config.js` | `withMetroConfig` (API estável em `0.4.0`); apenas a dep da raiz muda |
| `example/tsconfig.json` | Herda da raiz; TypeScript da raiz permanece `^5.9.2` nesta fase |
| `example/src/App.tsx` | Sem breaking changes do SDK 56 relevantes ao example (sem fetch, router, webview) |
| `example/react-native.config.js` | Agnóstico de versão |
| `example/index.js` | Agnóstico de versão |

**Rationale**: SC-006 e FR-007 exigem que esses arquivos permaneçam inalterados.
`git diff` na branch deve mostrar apenas `example/package.json` (mais `package.json` raiz
se a exceção for aplicada).

---

## R-006: Codegen Android — impacto desta fase

**Decision**: O codegen Android (`generateCodegenArtifactsFromSchema`) **NÃO precisa ser
regenerado** nesta fase.

**Rationale**: A Constituição (CLAUDE.md, seção "Codegen Android") exige regeneração apenas
quando `NativePagseguroPlugpag.ts` é alterado. Esta feature não altera a Spec TurboModule,
o Kotlin, nem nenhum arquivo de `src/`. O `expo prebuild` regenera os arquivos nativos do
**example** (que são gerados, não versionados), mas isso é diferente do codegen da lib.

**Alternatives considered**: N/A.

---

## R-007: Método de sequência de atualização

**Decision**: Sequência de execução validada:

```bash
# 1. Entrar no diretório do example
cd example

# 2. Atualizar expo para SDK 56
yarn add expo@^56

# 3. Alinhar react-native, expo-status-bar, expo-dev-client automaticamente
npx expo install --fix

# 4. Atualizar devDependencies manuais
yarn add -D react-native-monorepo-config@^0.4.0 react-native-builder-bob@^0.43.0

# 5. Instalar tudo no workspace (da raiz)
cd .. && yarn install

# 6. Diagnóstico de saúde (gatekeep da exceção @expo/config-plugins)
cd example && npx expo-doctor

# 7. Build do plugin (necessário antes do prebuild)
cd .. && yarn build:plugin

# 8. Prebuild Android (valida compatibilidade do plugin com SDK 56)
yarn example expo prebuild --platform android

# 9. Gates de qualidade (da raiz)
yarn lint && yarn typecheck && yarn test && yarn prepare
```

**Rationale**: A sequência `expo install --fix` após o bump do `expo` garante que as
versões de peer dependencies alinhadas ao SDK 56 sejam resolvidas automaticamente pelo
Expo CLI, que conhece as versões exatas para cada pacote do ecossistema.

**Alternatives considered**: Usar `@rnx-kit/align-deps` como ferramenta principal.
Avaliado, mas descartado para esta fase porque o `expo install --fix` já cobre o escopo
do example, e o `align-deps` é mais útil para alinhar a raiz da lib a múltiplas linhas de
RN (Fase 2).

---

## Riscos Residuais (pós-research)

| Risco | Probabilidade | Gate de detecção | Mitigação |
|---|---|---|---|
| Deep import `@expo/config-plugins/.../generateCode` quebrar | Média | `yarn build:plugin` + `expo prebuild` | Migrar para `expo/config-plugins` se necessário |
| `expo-doctor` reportar `error` em `@expo/config-plugins` | Média | Passo 6 da sequência | Aplicar exceção: bump `@expo/config-plugins@~56.0.0` na raiz (commit separado) |
| `expo prebuild` falhar por incompatibilidade Gradle / AGP | Baixa | Passo 8 | Investigar output; `android/` do example é gerado — sem versionamento a proteger |
| Gates de qualidade (lint/typecheck/test/prepare) falharem | Muito baixa | Passo 9 | Sem mudança em código da lib; falha seria regressão prévia não relacionada |
