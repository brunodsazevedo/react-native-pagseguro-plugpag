# Implementation Plan: Fix Print Validation & Complete Test Coverage

**Branch**: `bugfix/008-fix-print-validation-tests` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/008-fix-print-validation-tests/spec.md`

## Summary

Corrigir dois gaps críticos da Feature 006 (Custom Printing) que bloqueiam merge:

1. **GAP 1**: Adicionar validação de `printerQuality` em `validatePrintRequest()` — rejeitar com `PLUGPAG_VALIDATION_ERROR` quando o valor estiver fora de [1, 4].
2. **GAP 2**: Adicionar testes TypeScript para `doAsyncReprintCustomerReceipt()` e `doAsyncReprintEstablishmentReceipt()` (sucesso + falha) e para a nova validação de `printerQuality`.

Escopo mínimo: **2 arquivos**, **7 novos cenários de teste**, **1 nova guarda de validação**.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`)  
**Primary Dependencies**: React Native 0.83.2 (New Architecture / TurboModules), Jest 29 + react-native preset  
**Storage**: N/A — sem estado persistente  
**Testing**: Jest 29 com mock do módulo nativo (`NativePagseguroPlugpag`)  
**Target Platform**: Android — PagBank SmartPOS (A920, A930, P2, S920)  
**Project Type**: Biblioteca React Native (TurboModule)  
**Performance Goals**: N/A — validação síncrona, trivial  
**Constraints**: Zero `any`; `yarn lint` limpo; `yarn test` 100% verde  
**Scale/Scope**: 2 arquivos modificados; 7 novos `it()`; 1 nova cláusula em `validatePrintRequest()`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|---|---|---|
| I — TurboModules Only | ✅ PASS | `NativePagseguroPlugpag.ts` não é alterado; contrato já está correto |
| II — TypeScript Strict / Zero `any` | ✅ PASS | Comparação numérica com `undefined` check — sem `any`, sem asserções não-documentadas |
| III — TDD | ✅ ENFORCED | Testes devem ser escritos e confirmados falhando antes da implementação |
| IV — Clean Code + SOLID | ✅ PASS | Validação adicionada à função `validatePrintRequest()` existente — SRP mantido |
| V — Device Compatibility | N/A | Não aplicável a este bugfix |
| VI — Android-Only | ✅ PASS | Guards Nível 1 e 2 já existentes; nenhum toque em código iOS |

**Resultado do gate**: ✅ APROVADO — sem violações. Pode prosseguir para Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-print-validation-tests/
├── plan.md              ← Este arquivo
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md  ← Spec quality checklist
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── functions/
│   └── print/
│       └── index.ts        ← MODIFICADO: nova cláusula printerQuality em validatePrintRequest()
└── __tests__/
    └── functions/
        └── print.test.ts   ← MODIFICADO: 7 novos cenários de teste
```

**Structure Decision**: Single-project. Esta correção toca exclusivamente a camada TypeScript do domínio `print`. Nenhum arquivo Kotlin é alterado — os 16 testes existentes no lado nativo já cobrem o comportamento do SDK.

## Phase 0: Research

Consulte [research.md](research.md) — sem unknowns; todos os aspectos técnicos foram resolvidos por análise do código existente.

## Phase 1: Design & Contracts

### Artefatos Gerados

- [data-model.md](data-model.md) — entidades e regras de validação do domínio print
- [quickstart.md](quickstart.md) — comportamento esperado da validação pós-fix

### Contratos

Nenhum contrato externo é alterado. A assinatura pública de `printFromFile(data: PrintRequest)` permanece idêntica — apenas o comportamento de validação interna é expandido. Nenhuma alteração em `NativePagseguroPlugpag.ts`.

## Complexity Tracking

> Nenhuma violação constitucional identificada. Seção omitida conforme instrução do template.
