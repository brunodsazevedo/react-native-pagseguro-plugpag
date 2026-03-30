# Implementation Plan: Refatoração JS/TS — Clean Code & Separação de Domínios

**Branch**: `feature/007-ts-domain-split` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-ts-domain-split/spec.md`

## Summary

Migrar o monolito `src/index.tsx` (375 linhas, 4 domínios) para uma estrutura domain-first: cada domínio (`activation`, `payment`, `refund`, `print`) vive em `src/functions/<domain>/` com `types.ts` e `index.ts` próprios. Hooks React movem para `src/hooks/`. O barrel raiz vira `src/index.ts` (sem JSX). A API pública permanece idêntica para consumidores — exceto `PrintRequest.printerQuality`, que passa de `number` para `PrintQualityValue` (breaking change intencional, pré-1.0). Todas as migrações seguem TDD: testes falham antes de mover o código.

---

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`)
**Primary Dependencies**: React Native 0.83.2 (New Architecture / TurboModules), Jest 29 + react-native preset, @testing-library/react-native
**Storage**: N/A — biblioteca sem estado persistente
**Testing**: Jest 29 (`yarn test`) + TypeScript type-check (`yarn typecheck`) + ESLint (`yarn lint`)
**Target Platform**: Android (React Native library); iOS guarda de dois níveis (warn + throw)
**Project Type**: Biblioteca React Native (TurboModule / JSI)
**Performance Goals**: Zero regressão no tempo de build; zero regressão na suite de testes
**Constraints**: API pública inalterada (salvo `PrintRequest.printerQuality`); `yarn lint && yarn typecheck && yarn test` deve passar ao final de cada domínio migrado
**Scale/Scope**: 4 domínios, ~375 linhas TypeScript; 1 hook React; 1 arquivo de tipos de impressão (`printing.ts`)

---

## Constitution Check

*GATE: Deve passar antes da implementação. Re-verificado após cada domínio.*

| Princípio | Regra Relevante | Status |
|---|---|---|
| **I** — TurboModules Only | `NativePagseguroPlugpag.ts` não é alterado | ✅ Sem alterações no contrato nativo |
| **II** — TypeScript Strict | `verbatimModuleSyntax`: `const` objects exportados com `export { }`, não `export type { }` | ✅ Documentado em research.md §R2 |
| **II** — Zero `any` | Exceções documentadas em `getEmitter` e `NativeEventEmitter` devem ser preservadas | ✅ Exceções existentes re-documentadas no novo local |
| **III** — TDD | Testes criados antes do código; confirmados como falhando (red) antes de mover implementação | ✅ Sequência TDD por domínio documentada na implementação |
| **IV** — Clean Code / Domínio único | Cada `functions/<domain>/index.ts` possui um único domínio | ✅ Objetivo central desta feature |
| **IV** — Import Rules | `functions/<domain>/index.ts` importa somente de `./types`; sem imports cruzados entre domínios | ✅ Regras de import documentadas; violações detectáveis por `yarn typecheck` |
| **IV** — Type Placement | Tipos de domínio em `functions/<domain>/types.ts`; tipos compartilhados (≥2 domínios) em `src/types/` | ✅ Nenhum tipo compartilhado existe — `src/types/` nasce vazio |
| **VI** — iOS Guard Nível 1 | `console.warn` somente em `src/index.ts` (top-level) | ✅ Barrel raiz mantém Nível 1 |
| **VI** — iOS Guard Nível 2 | `throw new Error(...)` em cada função exportada de `functions/<domain>/index.ts`, antes de `getNativeModule()` | ✅ Padrão `getNativeModule()` documentado em research.md §R1 |
| **VI** — `getNativeModule()` lazy | `require('../../NativePagseguroPlugpag')` somente após guard Nível 2; nunca no top-level do módulo | ✅ Path relativo documentado em research.md §R3 |

**Violações detectadas**: Nenhuma. Nenhuma entrada em Complexity Tracking necessária.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-ts-domain-split/
├── plan.md              ← este arquivo
├── research.md          ← Phase 0: decisões técnicas e padrões consolidados
├── data-model.md        ← Phase 1: mapeamento completo de tipos por domínio
├── quickstart.md        ← Phase 1: guia para adicionar novo domínio
├── contracts/
│   └── public-api.md    ← Phase 1: superfície de API pública (barrel exports)
└── tasks.md             ← Phase 2: gerado por /speckit.tasks
```

### Source Code (antes → depois)

```text
ANTES
src/
├── NativePagseguroPlugpag.ts    ← sem alterações
├── printing.ts                  ← removido após migração para functions/print/
├── index.tsx                    ← monolito (375 linhas); substituído por index.ts
└── __tests__/
    └── index.test.tsx           ← monolito; redistribuído em subdirs

DEPOIS
src/
├── NativePagseguroPlugpag.ts    ← sem alterações
├── functions/
│   ├── activation/
│   │   ├── types.ts             ← PlugPagActivationSuccess
│   │   └── index.ts             ← initializeAndActivatePinPad, doAsyncInitializeAndActivatePinPad
│   ├── payment/
│   │   ├── types.ts             ← PaymentType, PlugPagPaymentType, InstallmentType,
│   │   │                           PlugPagInstallmentType, PlugPagPaymentRequest,
│   │   │                           PlugPagTransactionResult, PlugPagPaymentProgressEvent
│   │   └── index.ts             ← doPayment, doAsyncPayment, subscribeToPaymentProgress
│   │                               (+ validatePaymentRequest e getEmitter privados)
│   ├── refund/
│   │   ├── types.ts             ← PlugPagVoidType, PlugPagVoidTypeValue, PlugPagRefundRequest
│   │   └── index.ts             ← doRefund (+ validateRefundRequest privado)
│   ├── print/
│   │   ├── types.ts             ← PrintQuality, PrintQualityValue, PrintRequest (printerQuality: PrintQualityValue),
│   │   │                           PrintResult, MIN_PRINTER_STEPS
│   │   └── index.ts             ← printFromFile, reprintCustomerReceipt, doAsyncReprintCustomerReceipt,
│   │                               reprintEstablishmentReceipt, doAsyncReprintEstablishmentReceipt
│   │                               (+ validatePrintRequest privado; runtime range check removido)
│   └── index.ts                 ← barrel: export * from './activation'; payment; refund; print
├── hooks/
│   └── usePaymentProgress.ts    ← importa subscribeToPaymentProgress de ../functions/payment/index
├── types/                       ← vazio (placeholder para tipos compartilhados futuros)
└── index.ts                     ← barrel raiz: iOS Nível 1 + export * from './functions'
                                    + export * from './hooks/usePaymentProgress'

src/__tests__/
├── functions/
│   ├── activation.test.ts       ← testa initializeAndActivatePinPad, doAsyncInitializeAndActivatePinPad
│   ├── payment.test.ts          ← testa doPayment, doAsyncPayment, subscribeToPaymentProgress,
│   │                               validatePaymentRequest (indiretamente)
│   ├── refund.test.ts           ← testa doRefund, validateRefundRequest (indiretamente)
│   └── print.test.ts            ← testa printFromFile, reprint*, validatePrintRequest (indiretamente)
├── hooks/
│   └── usePaymentProgress.test.ts
└── index.test.ts                ← apenas iOS guard Nível 1 (console.warn)
```

**Structure Decision**: Domain-first com barrel raiz. Segue o Princípio IV da Constituição v1.3.0. Referências externas: stripe/stripe-react-native (domínios em `/types/` por arquivo), mrousavy/react-native-vision-camera (subpastas por domínio). Barrels são legítimos e recomendados em bibliotecas — não em aplicações (tkdodo.eu).

---

## Implementation Sequence

A migração é feita domínio por domínio, em sequência, sempre com TDD (red → green → refactor). Cada domínio é validado com `yarn lint && yarn typecheck && yarn test` antes de avançar.

### Etapa 0 — Scaffold e preparação

- Criar estrutura de pastas: `src/functions/`, `src/hooks/`, `src/types/`
- Criar arquivos vazios: `functions/{activation,payment,refund,print}/{types,index}.ts`, `functions/index.ts`
- Criar `hooks/usePaymentProgress.ts` vazio
- Criar `src/__tests__/functions/` e `src/__tests__/hooks/`
- **Não alterar `src/index.tsx` ainda**

### Etapa 1 — Domínio `activation` (menor, sem validação)

**TDD**:
1. Criar `__tests__/functions/activation.test.ts` com imports de `../../functions/activation` — falha (red)
2. Criar `functions/activation/types.ts` com `PlugPagActivationSuccess`
3. Criar `functions/activation/index.ts` com `initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad`
4. Garantir guard Nível 2 + `getNativeModule()` lazy (path: `../../NativePagseguroPlugpag`)
5. Testes passam (green)
6. `yarn lint && yarn typecheck && yarn test`

**Barrel**: Adicionar `export * from './activation'` em `functions/index.ts`.
**index.tsx ainda não é alterado** — `activation` coexiste com `index.tsx` nesta etapa.

### Etapa 2 — Domínio `payment` (com validação e emitter)

**TDD**: idem — testes de `payment.test.ts` falham antes da implementação.
- Mover `PaymentType`, `InstallmentType`, interfaces para `functions/payment/types.ts`
- Mover `getEmitter` (privado), `validatePaymentRequest` (privado), `doPayment`, `doAsyncPayment`, `subscribeToPaymentProgress` para `functions/payment/index.ts`
- **Atenção exportação**: `PaymentType` e `InstallmentType` são `const` objects — `export { PaymentType, InstallmentType }` (valor); tipos derivados usam `export type { PlugPagPaymentType, PlugPagInstallmentType, ... }`
- Guardar `PlugPagTransactionResult` aqui (usado por payment e refund — mas ver research.md §R5: é definido aqui, re-exportado pelo barrel; refund importa do barrel via caminho direto `../payment/types` — **proibido por Princípio IV**; solução: `PlugPagTransactionResult` vai para `src/types/sharedTypes.ts` se dois domínios precisarem — ver research.md §R5)

### Etapa 3 — Domínio `refund`

**TDD**: idem.
- Mover `PlugPagVoidType`, `PlugPagVoidTypeValue`, `PlugPagRefundRequest` para `functions/refund/types.ts`
- Mover `validateRefundRequest` (privado), `doRefund` para `functions/refund/index.ts`
- `doRefund` retorna `PlugPagTransactionResult` — ver resolução de R5 em research.md

### Etapa 4 — Domínio `print` (substitui `printing.ts`)

**TDD**: idem.
- Criar `functions/print/types.ts` com conteúdo de `printing.ts` + correção `printerQuality?: PrintQualityValue`
- Mover `validatePrintRequest` (privado) e funções de impressão para `functions/print/index.ts`
- **Remover check de runtime** `printerQuality < 1 || printerQuality > 4` de `validatePrintRequest` (coberto por compile-time agora)
- Manter checks de `filePath` e `steps`

### Etapa 5 — Hook `usePaymentProgress`

- Criar `__tests__/hooks/usePaymentProgress.test.ts` (falha)
- Criar `hooks/usePaymentProgress.ts` importando `subscribeToPaymentProgress` de `../functions/payment/index`
- Testes passam

### Etapa 6 — Barrel raiz + renome de index.tsx

- Criar `__tests__/index.test.ts` com apenas o teste de iOS guard Nível 1
- Criar `src/index.ts` como barrel: iOS Nível 1 + `export * from './functions'` + `export * from './hooks/usePaymentProgress'`
- Confirmar que `__tests__/index.test.ts` passa
- Remover `src/index.tsx` e `src/printing.ts`

### Etapa 7 — Atualização da Constituição

- Atualizar `CLAUDE.md`: estrutura de arquivos, path do `require`, extensão `index.ts`
- Verificar que `constitution.md` já reflete a nova estrutura (v1.3.0 já está atualizada)

### Etapa 8 — Validação final

```bash
yarn lint && yarn typecheck && yarn test
```

Todos os testes devem passar; zero erros de lint; zero erros de tipo.

---

## Complexity Tracking

> Nenhuma violação da Constituição identificada. Esta seção não se aplica.
