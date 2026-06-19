# Data Model: Atualização do Example para Expo SDK 56 (Fase 1)

**Branch**: `feature/013-expo-sdk-56-upgrade`  
**Date**: 2026-06-18

Esta feature é um **upgrade de dependências** — não introduz novos tipos, entidades, ou
modelos de dados na biblioteca. O "modelo de dados" aqui é o **estado de dependências**
antes e depois da mudança, e as **regras de validação** que governam o escopo da feature.

---

## 1. Estado de Dependências: `example/package.json`

### 1.1. Dependências (`dependencies`)

| Campo | Estado atual | Estado alvo | Método |
|---|---|---|---|
| `expo` | `~55.0.7` | `~56.0.0` | `yarn add expo@^56` |
| `expo-status-bar` | `~55.0.4` | conforme `expo install --fix` | automático |
| `react` | `19.2.0` | `19.2.0` (sem mudança) | — |
| `react-native` | `0.83.2` | `0.85.3` | automático via `expo install --fix` |
| `react-native-pagseguro-plugpag` | `workspace:*` | `workspace:*` (sem mudança) | — |

### 1.2. DevDependências (`devDependencies`)

| Campo | Estado atual | Estado alvo | Método |
|---|---|---|---|
| `expo-dev-client` | `~55.0.17` | conforme `expo install --fix` | automático |
| `react-native-builder-bob` | `^0.40.18` | `^0.43.0` | `yarn add -D` manual |
| `react-native-monorepo-config` | `^0.3.3` | `^0.4.0` | `yarn add -D` manual |

### 1.3. Campos inalterados

```json
{
  "name": "react-native-pagseguro-plugpag-example",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android"
  },
  "private": true
}
```

---

## 2. Estado de Dependências: `package.json` (raiz — exceção condicional)

Aplicável **somente** se `npx expo-doctor` reportar `error` em `@expo/config-plugins`.

| Campo | Estado atual | Estado alvo | Condição |
|---|---|---|---|
| `@expo/config-plugins` (devDep) | `^9.0.0` | `~56.0.0` | Apenas se `expo-doctor` reportar `error` |

Todos os outros campos da raiz permanecem inalterados nesta fase.

---

## 3. Arquivos de Código: Invariantes

Estes arquivos são monitorados como **invariantes de escopo**. Qualquer alteração é
regressão e bloqueia o PR.

| Arquivo | Invariante |
|---|---|
| `example/app.json` | Conteúdo idêntico ao início da branch |
| `example/babel.config.js` | Conteúdo idêntico ao início da branch |
| `example/metro.config.js` | Conteúdo idêntico ao início da branch |
| `example/tsconfig.json` | Conteúdo idêntico ao início da branch |
| `example/src/App.tsx` | Conteúdo idêntico ao início da branch |
| `example/react-native.config.js` | Conteúdo idêntico ao início da branch |
| `example/index.js` | Conteúdo idêntico ao início da branch |
| `src/` (diretório completo) | Nenhuma alteração |
| `android/` (diretório completo) | Nenhuma alteração |
| `plugin/index.ts` | Nenhuma alteração (exceto se deep import `mergeContents` quebrar — ver R-004) |

---

## 4. Regras de Validação

### 4.1. Gates de Aceite (por critério de sucesso)

| SC | Critério | Ferramenta de Verificação |
|---|---|---|
| SC-001 | `expo@~56.x` e `react-native@0.85.x` em `example/package.json` | Inspeção direta + `cat example/package.json` |
| SC-002 | Zero outputs `error` em `expo-doctor` | `cd example && npx expo-doctor` |
| SC-003 | `expo prebuild --platform android` conclui sem erros | Saída do processo + presença de `example/android/` |
| SC-004 | `yarn lint` + `yarn typecheck` + `yarn test` + `yarn prepare` com código de saída 0 | Cada comando na raiz |
| SC-005 | Prebuild local OK antes de abrir PR; CI `build-android` OK antes de mergear | Local + GitHub Actions |
| SC-006 | `git diff` aponta apenas `example/package.json` (+ `package.json` raiz se exceção) | `git diff --name-only` |

### 4.2. Regras de Escopo

- `git diff --name-only` na branch DEVE mostrar apenas arquivos em `example/`
  (e opcionalmente `package.json` raiz para a exceção de `@expo/config-plugins`).
- Qualquer arquivo fora desse conjunto é **fora de escopo** e deve ser revertido.
- A exceção (`@expo/config-plugins`) DEVE estar em **commit separado** identificado como
  "exceção ao escopo da Fase 1" na mensagem de commit.

### 4.3. Transições de Estado do Plugin (`plugin/index.ts`)

```
Estado inicial: usa @expo/config-plugins@^9.0.0 com deep import /build/utils/generateCode
       ↓
Após expo-doctor:
  ├── Sem error em @expo/config-plugins →
  │     plugin/index.ts: SEM alteração (deep import permanece com @9.x)
  │     package.json raiz: SEM alteração
  └── Error em @expo/config-plugins →
        package.json raiz: bump para ~56.0.0 (commit separado)
              ↓
        yarn build:plugin → OK?
          ├── OK → plugin/index.ts: SEM alteração
          └── FALHA (deep import quebrou) → migrar para expo/config-plugins
```

---

## 5. Referência de Versões do Ecossistema (Expo SDK 56)

Consultadas via `npm view` em 2026-06-18 (fonte: RELATORIO-EXPO-SDK-56.md §10):

| Pacote | Versão latest | Linha do SDK 56 |
|---|---|---|
| `expo` | `56.0.12` | `~56.0.0` |
| `react-native` | `0.86.0` (latest geral) | `0.85.3` (SDK 56 fixa) |
| `@expo/config-plugins` | `56.0.9` | `~56.0.0` |
| `react-native-builder-bob` | `0.43.0` | `^0.43.0` |
| `react-native-monorepo-config` | `0.4.0` | `^0.4.0` |
| `@react-native/jest-preset` | `0.86.0` | `0.85.x` (Fase 2 apenas) |
| `typescript` | `6.0.3` | `^6.0.3` (Fase 2 apenas) |

> ⚠️ `react-native@0.86.0` é o latest geral no npm, mas **não** é a linha do SDK 56.
> Usar `npx expo install --fix` garante a versão correta (`0.85.3`), não o latest.
