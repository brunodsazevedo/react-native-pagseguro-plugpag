# Implementation Plan: Cálculo de Parcelas (`calculateInstallments`)

**Branch**: `feature/017-calculate-installments` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-calculate-installments/spec.md`

## Summary

Expor uma nova função pública síncrona `calculateInstallments(data)` no domínio `payment`,
que recebe `{ amount, installmentType }` e resolve com `{ options: PlugPagInstallment[] }`
(cada opção com `quantity`, `amount`, `total` em centavos). A função permite ao consumidor
montar a própria UI de parcelas **antes** de chamar `doPayment`.

Abordagem técnica: adicionar `calculateInstallments(data: Object): Promise<Object>` à Spec
TurboModule, regenerar o codegen Android, implementar o `override` Kotlin usando a sobrecarga
**síncrona estruturada** do SDK 1.35.0 (`calculateInstallments(saleValue: String, installmentType: Int)`)
em `Dispatchers.IO` (SDK bloqueante por IPC), com mapeamento de `List<PlugPagInstallment>` →
`{ options: [...] }`. Tratamento de erro por `try/catch` (o método síncrono lança
`PlugPagException`, não retorna `result`/`RET_OK`): `PLUGPAG_INSTALLMENTS_ERROR` para exceção do
SDK e `PLUGPAG_INTERNAL_ERROR` para demais. Validação fail-fast no JS (`amount` inteiro `> 0`;
`installmentType` no enum existente) com guard de iOS de dois níveis. Feature aditiva/não-breaking.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`) + Kotlin 2.0.21
**Primary Dependencies**: React Native 0.83.2+ (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.35.0`, kotlinx.coroutines (somente para o método síncrono — bloqueante por IPC)
**Storage**: N/A — biblioteca sem estado persistente
**Testing**: Jest 29 + react-native preset (JS), JUnit 5 + Mockk (Kotlin)
**Target Platform**: Android (terminais PagBank SmartPOS — A920, A930, P2, S920); iOS explicitamente fora de escopo
**Project Type**: Mobile library (TurboModule React Native, Android-only)
**Performance Goals**: N/A — cálculo único de baixa latência; chamada IPC ao SDK
**Constraints**: Chamada síncrona do SDK é bloqueante por IPC → DEVE rodar em `Dispatchers.IO` (exceção do Princípio VI). Zero `any`. Fail-fast antes de qualquer chamada nativa.
**Scale/Scope**: Adição de 1 método nativo + 3 tipos no domínio `payment`. Sem variante async nesta fase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| **I — TurboModules Only** | Novo método entra na Spec `NativePagseguroPlugpag.ts` (única fonte de verdade); JSI/TurboModule; sem Bridge. Codegen regenerado obrigatoriamente. | ✅ PASS |
| **II — TS Strict / Zero `any`** | 3 tipos novos como `interface`; `installmentType` reutiliza enum `const` existente; type assertion segura na camada pública (`as Promise<CalculateInstallmentsResult>`), padrão idêntico a `doPayment`. Sem `any`. | ✅ PASS |
| **III — Test-First / TDD** | Testes JS (10 cenários) e Kotlin (5 cenários) escritos antes da implementação, confirmados falhando. 100% da função exportada coberta; novo método nativo com teste de integração. Módulo nativo mockado no JS. | ✅ PASS |
| **IV — Clean Code + SOLID** | Função única no domínio `payment`; `PlugPag` chamado só em `PagseguroPlugpagModule.kt`; nenhuma lógica de negócio além de serialização/conversão; tipos estendidos aditivamente (Open/Closed). | ✅ PASS |
| **V — Device Compat & Fail-Fast** | Validação fail-fast no JS antes da chamada nativa. Princípio V (mock/non-POS) permanece DEFERRED globalmente — não regressa nesta feature. | ✅ PASS (no escopo aplicável) |
| **VI — Android-Only Scope** | Kotlin 2.x; guard de iOS de dois níveis (Nível 2 em `calculateInstallments` antes de `getNativeModule()`); `Dispatchers.IO` justificado inline (SDK síncrono bloqueante por IPC, espelha `initializeAndActivatePinPad`/`doPayment`). | ✅ PASS |

**API Contract**: método síncrono do SDK exposto como `Promise<T>` ✅; Spec usa `Object`/`Promise<Object>` (codegen-compatível) com type assertion na camada pública ✅; SDK target `1.35.0` ✅.

**Resultado do gate**: ✅ Nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/017-calculate-installments/
├── plan.md              # Este arquivo (/speckit-plan)
├── spec.md              # Especificação da feature (/speckit-specify)
├── research.md          # Phase 0 output (/speckit-plan)
├── data-model.md        # Phase 1 output (/speckit-plan)
├── quickstart.md        # Phase 1 output (/speckit-plan)
├── contracts/
│   └── public-api.md    # Phase 1 output (/speckit-plan)
└── tasks.md             # Phase 2 output (/speckit-tasks — NÃO criado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts                 # + calculateInstallments(data: Object): Promise<Object>
└── functions/
    └── payment/
        ├── types.ts                          # + CalculateInstallmentsRequest, PlugPagInstallment, CalculateInstallmentsResult
        └── index.ts                          # + validateCalculateInstallmentsRequest() (privada) + calculateInstallments() + re-export dos 3 tipos

src/__tests__/functions/
└── payment.test.ts                           # + 10 cenários de calculateInstallments (mock estendido)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt                 # + override calculateInstallments(data, promise) + buildInstallmentsErrorUserInfo() + imports PlugPagInstallment/PlugPagException

android/src/test/java/com/pagseguroplugpag/
└── PagseguroPlugpagModuleTest.kt             # + 5 cenários JUnit5 + Mockk

# Re-export automático — SEM alterações:
# src/functions/index.ts  (export * from './payment')
# src/index.ts            (export * from './functions' + export type * from './functions/payment/types')
```

**Structure Decision**: Mobile library Android-only com domain split (Princípio IV). A feature
é inteiramente aditiva ao domínio `payment` existente — nenhum novo domínio, hook ou tipo
compartilhado (`src/types/`) é necessário, pois os 3 tipos são exclusivos do domínio `payment`
(Type Placement Rule → `<domain>/types.ts`). O re-export público é captado automaticamente
pelos barrels existentes.

## Complexity Tracking

> Constitution Check passou sem violações — nenhuma justificativa necessária.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
