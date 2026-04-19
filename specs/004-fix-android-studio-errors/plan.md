# Implementation Plan: Correção de Erros Android Studio

**Branch**: `bugfix/004-fix-android-studio-errors` | **Date**: 2026-03-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-fix-android-studio-errors/spec.md`

## Summary

Três correções independentes em `android/build.gradle` e `PagseguroPlugpagModule.kt` que
eliminam ~10 erros de IDE sem alterar comportamento de runtime:

- **FIX-001**: Declarar diretório codegen como `sourceSets` no Gradle → Android Studio indexa `NativePagseguroPlugpagSpec` (resolve 8 erros em cascata).
- **FIX-002**: Usar API `getPackageInfo` correta por versão Android (API 33+: `PackageInfoFlags`; < 33: `@Suppress("DEPRECATION")`) → elimina 1 aviso de depreciação.
- **FIX-003**: Guardar `result.result ?: -1` em `buildSdkPaymentErrorUserInfo` → evita NPE em runtime quando `PlugPagTransactionResult.result` é `null` (campo `java.lang.Integer` boxed, confirmado por inspeção de bytecode do AAR `wrapper-1.33.0`).

## Technical Context

**Language/Version**: Kotlin 2.0.21 (nativo) — sem alterações TypeScript
**Primary Dependencies**: PlugPagServiceWrapper `wrapper:1.33.0`, React Native 0.83.2 (New Architecture), Android Gradle Plugin 8.7.2
**Storage**: N/A
**Testing**: JUnit 5 + Mockk — 2 novos testes Kotlin para CAUSA-3 (`result = null` em `doPayment` e `doAsyncPayment`)
**Target Platform**: Android 24–36 (SmartPOS PagBank: A920, A930, P2, S920)
**Project Type**: React Native library (TurboModule)
**Performance Goals**: N/A — bugfix sem nova lógica
**Constraints**: `minSdkVersion 24`, `compileSdkVersion 36`; correções devem ser idempotentes e sem regressões
**Scale/Scope**: 2 arquivos alterados (build.gradle + PagseguroPlugpagModule.kt), 1 arquivo de testes expandido

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|-----------|--------|-----------|
| I — TurboModules Only | ✅ PASS | FIX-001/002/003 não alteram contrato JS↔Native; nenhum método novo adicionado |
| II — TypeScript Strict — Zero `any` | ✅ PASS | Sem alterações TypeScript neste bugfix |
| III — Test-First / TDD | ✅ PASS | FR-009 e SC-006 exigem novos testes Kotlin para `result = null` (incluídos no plano) |
| IV — Clean Code + SOLID | ✅ PASS | Alterações mínimas, sem nova lógica de negócio; `@Suppress("DEPRECATION")` documentado |
| V — Device Compatibility | ✅ PASS | FIX-002 cobre APIs 24–36 explicitamente |
| VI — Android-Only + Threading | ✅ PASS | Kotlin puro; sem novos coroutines; `Dispatchers.IO` existente não é modificado |

**Lint gate**: `yarn lint` deve passar após as correções — nenhuma alteração TypeScript introduzida; sem impacto esperado.

**Sem violações.** Plano pode avançar.

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-android-studio-errors/
├── plan.md              ← Este arquivo (/speckit.plan)
├── research.md          ← Phase 0 (gerado abaixo)
├── data-model.md        ← Phase 1 (gerado abaixo — mínimo, sem novos modelos)
├── quickstart.md        ← Phase 1 (gerado abaixo)
└── tasks.md             ← Phase 2 (/speckit.tasks — NÃO criado por /speckit.plan)
```

### Source Code (repository root)

```text
android/
├── build.gradle                                    ← FIX-001: adicionar sourceSets
└── src/
    ├── main/java/com/pagseguroplugpag/
    │   └── PagseguroPlugpagModule.kt               ← FIX-002 + FIX-003
    └── test/java/com/pagseguroplugpag/
        └── PagseguroPlugpagModuleTest.kt           ← 2 novos testes (CAUSA-3, null result)
```

**Structure Decision**: Biblioteca Android (single project). Sem novos arquivos criados — apenas
modificações em arquivos existentes.

## Complexity Tracking

> N/A — Nenhuma violação da Constituição identificada no Constitution Check.
