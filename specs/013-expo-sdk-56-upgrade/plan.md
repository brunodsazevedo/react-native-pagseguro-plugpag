# Implementation Plan: Atualização do Example para Expo SDK 56 (Fase 1)

**Branch**: `feature/013-expo-sdk-56-upgrade` | **Date**: 2026-06-18 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/013-expo-sdk-56-upgrade/spec.md`

## Summary

Atualizar o app de exemplo (`example/`) de Expo SDK 55 / React Native 0.83.2 para Expo SDK
56 / React Native 0.85.x, mantendo o escopo estritamente dentro do diretório `example/`.
Nenhum código da biblioteca raiz (TypeScript, Kotlin, Spec TurboModule) é alterado nesta
fase. A exceção permitida pela spec é o bump de `@expo/config-plugins` na raiz — apenas se
o `expo-doctor` reportar conflito classificado como `error` após o bump do example.

Sequência de execução: bump das dependências do example → `expo install --fix` →
`expo-doctor` → build do plugin → `expo prebuild --platform android` → gates de qualidade
(`lint`, `typecheck`, `test`, `prepare`).

## Technical Context

**Language/Version**: JavaScript / TypeScript 5.9 (raiz — sem mudança nesta fase)  
**Primary Dependencies**: Expo SDK 56 (`~56.0.0`), React Native 0.85.x (`0.85.3`)  
**Storage**: N/A  
**Testing**: Jest 29 + preset `react-native` (raiz, sem mudança nesta fase)  
**Target Platform**: Android (build de validação do example via `expo prebuild`)  
**Project Type**: Biblioteca RN (monorepo Yarn workspaces) + Example App (Expo)  
**Performance Goals**: N/A — feature é exclusivamente de atualização de dependências  
**Constraints**: Escopo restrito ao `example/`; nenhum arquivo fora desse diretório deve ser
alterado, exceto `@expo/config-plugins` na raiz se e somente se `expo-doctor` apontar
`error` (FR-002)  
**Scale/Scope**: 6 campos de `example/package.json`; 7 arquivos do example confirmados como
inalterados (FR-007)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|---|---|---|
| **I — TurboModules Only** | ✅ PASS | Nenhuma comunicação JS↔Native é alterada. `NativePagseguroPlugpag.ts` e `PagseguroPlugpagModule.kt` não mudam. |
| **II — TypeScript Strict / Zero `any`** | ✅ PASS | Nenhum código TypeScript da lib é alterado. `example/tsconfig.json` herda da raiz e permanece intocado (FR-007). |
| **III — Test-First / TDD** | ✅ PASS | Nenhuma nova função é adicionada. Gates de qualidade existentes (`yarn test`) DEVEM passar após o bump (FR-005). |
| **IV — Clean Code + SOLID** | ✅ PASS | Nenhuma lógica de negócio alterada. Domínios TypeScript e módulo Kotlin intactos. |
| **V — Device Compatibility & Fail-Fast** | ✅ PASS | Detecção de dispositivo não afetada. Status: DEFERRED (não implementado ainda — sem impacto nesta fase). |
| **VI — Android-Only Scope** | ✅ PASS | Escopo Android-only preservado. Guards iOS intactos. `.podspec` ausente. `ios/` ausente. |

**Resultado**: Todos os gates PASS. Nenhuma violação da Constituição v1.3.0. Prosseguir
para Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/013-expo-sdk-56-upgrade/
├── plan.md              # Este arquivo (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── example-package-json.md   # Estado alvo de example/package.json
│   └── root-exception.md         # Exceção condicional: @expo/config-plugins na raiz
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Alterações primárias (Fase 1)
example/
└── package.json      ← único arquivo alterado no escopo primário

# Exceção condicional (apenas se expo-doctor reportar erro — FR-002)
package.json          ← @expo/config-plugins bump (^9.0.0 → ~56.0.0), em commit separado

# Arquivos INALTERADOS (validar apenas — FR-007)
example/app.json
example/babel.config.js
example/metro.config.js
example/tsconfig.json
example/src/App.tsx
example/react-native.config.js
example/index.js

# Arquivo gerado (não versionado — regenerado pelo expo prebuild)
example/android/      ← gerado automaticamente; confirmação da saúde do prebuild
```

**Structure Decision**: Single-directory scope (Option 1 simplificado). Toda a mudança
vive em `example/package.json`. A raiz só é tocada condicionalmente para o bump de
`@expo/config-plugins` como sub-item de Fase 2 antecipado, documentado como exceção.

## Complexity Tracking

> Nenhuma violação da Constituição foi identificada. Seção vazia por design.
