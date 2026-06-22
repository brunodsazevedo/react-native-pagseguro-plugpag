# Implementation Plan: Suporte a `maxTimeShowPopup` do `PlugPagCustomPrinterLayout`

**Branch**: `feature/016-max-time-show-popup` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-max-time-show-popup/spec.md`

## Summary

Expor um campo opcional `maxTimeShowPopup` (inteiro >= 0, em **segundos**) nas requisições de
pagamento (`doPayment`, `doAsyncPayment`) e estorno (`doRefund`). Quando fornecido, o valor é
aplicado ao layout de impressão do terminal — via
`PlugPag.setPlugPagCustomPrinterLayout(PlugPagCustomPrinterLayout(maxTimeShowPopup = N))` —
**imediatamente antes** de iniciar a operação, fazendo o popup de impressão fechar
automaticamente após N segundos em vez de travar a Promise aguardando o operador. Campo omitido
preserva o comportamento atual integralmente (nenhum layout aplicado). Validação no lado JS
(inteiro >= 0) precede qualquer chamada nativa; o guard de plataforma (iOS) tem precedência.

**Abordagem técnica**: o campo viaja dentro do payload `Object` já existente dos métodos da
spec TurboModule — **nenhuma assinatura de `NativePagseguroPlugpag.ts` muda**, portanto **não há
regeneração de codegen**. A mudança é aditiva: tipos de domínio (`payment`, `refund`), validação
JS, e leitura/aplicação do layout no `PagseguroPlugpagModule.kt`.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax`) + Kotlin 2.0.21
**Primary Dependencies**: React Native 0.83.2 (New Architecture / TurboModules + JSI),
PlugPagServiceWrapper `wrapper:1.35.0` (já em uso — sem upgrade), kotlinx.coroutines (apenas
nas variantes bloqueantes já existentes)
**Storage**: N/A — biblioteca sem estado persistente
**Testing**: Jest 29 + react-native preset (JS); JUnit 5 + Mockk (Kotlin)
**Target Platform**: Android — terminais PagBank SmartPOS (A920, A930, P2, S920). iOS fora de escopo.
**Project Type**: Biblioteca React Native (TurboModule) — single project
**Performance Goals**: N/A — feature de configuração, sem requisito de throughput
**Constraints**: Aditivo e não-breaking (FR-010); validação fail-fast antes de chamada nativa
(FR-006); falha de aplicação do layout propagada explicitamente (FR-009)
**Scale/Scope**: 3 operações afetadas (`doPayment`, `doAsyncPayment`, `doRefund`); 1 campo novo
em 2 tipos de request; 0 métodos nativos novos

### API do SDK (confirmada por inspeção do `wrapper-1.35.0.aar`)

- `class PlugPagCustomPrinterLayout` — construtor sem-args disponível; campo
  `var maxTimeShowPopup: Int` com `setMaxTimeShowPopup(Int)`. Demais campos (cores, título)
  ficam com defaults do SDK.
- `PlugPag.setPlugPagCustomPrinterLayout(layout: PlugPagCustomPrinterLayout): Unit` — ponto de
  aplicação, chamado antes de `doPayment` / `doAsyncPayment` / `voidPayment`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Princípio | Status | Observação |
|---|---|---|
| I — TurboModules Only | ✅ PASS | Sem Bridge. Campo trafega no `Object` já existente da spec; spec inalterada. |
| II — TypeScript Strict / Zero `any` | ✅ PASS | Campo tipado `maxTimeShowPopup?: number`. Validação inteiro >= 0 sem `any`. |
| III — Test-First / TDD | ✅ PASS | Testes JS (válido/negativo/não-inteiro/omitido/iOS) e Kotlin (layout aplicado/omitido) antes da implementação. |
| IV — Clean Code + SOLID | ✅ PASS | Tipos em `functions/<domain>/types.ts`; `PlugPag` chamado só no módulo Kotlin; sem cross-domain import. Campo duplicado em payment e refund é domínio-específico (não compartilhado), logo permanece em cada `types.ts`. |
| V — Device Compat & Fail-Fast | ✅ PASS (N/A direto) | DEFERRED no projeto; FR-009 (propagar falha de layout) respeita o espírito fail-fast. |
| VI — Android-Only Scope | ✅ PASS | Guard Nível 2 já presente nas funções afetadas precede a validação do campo (FR-008). Sem novas coroutines (reusa fluxo bloqueante existente). |

**Gate inicial**: PASS — nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/016-max-time-show-popup/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões de SDK e validação
├── data-model.md        # Phase 1 — entidades e regras do campo
├── quickstart.md        # Phase 1 — exemplos de uso
├── contracts/           # Phase 1 — contrato da API pública (TS)
│   └── public-api.md
├── checklists/          # (já existente)
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts            # INALTERADO — métodos já recebem Object (sem codegen)
├── functions/
│   ├── payment/
│   │   ├── types.ts                     # + maxTimeShowPopup?: number em PlugPagPaymentRequest
│   │   └── index.ts                     # + validação inteiro>=0 em validatePaymentRequest
│   └── refund/
│       ├── types.ts                     # + maxTimeShowPopup?: number em PlugPagRefundRequest
│       └── index.ts                     # + validação inteiro>=0 em validateRefundRequest

src/__tests__/functions/
├── payment.test.ts                      # + cenários maxTimeShowPopup
└── refund.test.ts                       # + cenários maxTimeShowPopup

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt            # aplica layout antes de doPayment/doAsyncPayment/voidPayment

android/src/test/...                     # + testes Kotlin de aplicação do layout

# Documentação pública (FR-012 — declarar unidade "segundos")
README.md / README.pt-BR.md              # inventário de tipos + exemplos
example/src/App.tsx                      # (opcional) demonstração do campo
```

**Structure Decision**: Single-project library. A mudança é estritamente aditiva sobre os
domínios `payment` e `refund` já existentes, seguindo o domain split da Constituição (Princípio
IV). Nenhum domínio novo, nenhum tipo compartilhado novo (o campo é domínio-específico e fica
duplicado intencionalmente em cada `types.ts`, pois não há dependência cross-domain permitida).

## Complexity Tracking

> Não aplicável — Constitution Check passou sem violações.
