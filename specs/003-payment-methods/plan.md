# Implementation Plan: Métodos de Pagamento (Crédito, Débito e PIX)

**Branch**: `feature/003-payment-methods` | **Date**: 2026-03-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-payment-methods/spec.md`

---

## Summary

Implementar `doPayment` e `doAsyncPayment` para pagamentos via crédito, débito e PIX no TurboModule `react-native-pagseguro-plugpag`. Inclui sistema de eventos de progresso (`onPaymentProgress`) via `NativeEventEmitter`, hook React (`usePaymentProgress`) e utilitário de subscription (`subscribeToPaymentProgress`). A feature estende o módulo existente da feature/002 sem breaking changes — adiciona 4 métodos ao Spec TurboModule, 2 funções públicas, 1 hook e 1 utilitário ao `src/index.tsx`, e implementação completa no Kotlin com threading adequado.

---

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21
**Primary Dependencies**: React Native 0.83.2 (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.33.0`, kotlinx.coroutines (somente `doPayment` — bloqueante por IPC), NativeEventEmitter (RN built-in)
**Storage**: N/A
**Testing**: Jest 29 + react-native preset (JS) | JUnit 5 + Mockk (Kotlin)
**Target Platform**: Android 7.0+ (API 24+), terminais PagBank SmartPOS (A920, A930, P2, S920)
**Project Type**: React Native library (TurboModule)
**Performance Goals**: Sem metas de latência — SDK e terminal ditam o tempo de transação. Threads não podem bloquear a main thread (ANR risk).
**Constraints**: `doPayment` DEVE executar em `Dispatchers.IO`; `doAsyncPayment` NÃO usa coroutines; `setEventListener(null)` proibido (parâmetro `@NotNull`)
**Scale/Scope**: 4 métodos no TurboModule Spec, 2 funções + 1 hook + 1 utilitário na API pública, mínimo 13 novos cenários de teste JS, mínimo 6 cenários Kotlin

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I — TurboModules Only** | ✅ PASS | `doPayment`, `doAsyncPayment`, `addListener`, `removeListeners` adicionados ao Spec. `NativeEventEmitter` instanciado com módulo nativo (não DeviceEventEmitter). |
| **II — TypeScript Strict / Zero `any`** | ✅ PASS | `Object` na spec (exigência codegen, documentado). Type assertions com cast explícito em `src/index.tsx`. Const objects para enums. Interfaces para todos os modelos. |
| **III — Test-First / TDD** | ✅ PASS | Testes escritos antes da implementação (Red→Green→Refactor). Mínimo 8 cenários JS de pagamento + 4 de eventos + 1 validação = 13 novos. Mínimo 6 Kotlin. |
| **IV — Clean Code + SOLID** | ✅ PASS | `PlugPag` chamado somente em `PagseguroPlugpagModule.kt`. Helpers privados para serialização. Domínio `payment` isolado. |
| **V — Device Compatibility** | ⚠️ DEFERRED | Princípio V não implementado ainda — feature dedicada futura. Não bloqueia feature/003. |
| **VI — Android-Only** | ✅ PASS | Guard iOS Nível 1 (warn) + Nível 2 (throw) em `doPayment` e `doAsyncPayment`. `Dispatchers.IO` documentado inline. `doAsyncPayment` sem coroutines. |

**Complexidade extra justificada**:

| Exceção | Por que necessária | Alternativa mais simples rejeitada |
|---------|-------------------|-----------------------------------|
| `Dispatchers.IO` em `doPayment` | `plugPag.doPayment()` é bloqueante por IPC — executar na main thread causaria ANR | Executar sem wrap: ANR garantido |
| `setEventListener(no-op)` em vez de `null` | Parâmetro `@NotNull` no SDK — `null` causaria NPE | `setEventListener(null)`: crash garantido |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-payment-methods/
├── plan.md              ← Este arquivo
├── spec.md              ← Especificação da feature
├── research.md          ← Decisões de arquitetura e pesquisa
├── data-model.md        ← Entidades TS e Kotlin detalhadas
├── quickstart.md        ← Guia de uso para consumidores
├── contracts/
│   └── public-api.md   ← Contrato completo da API pública
├── checklists/
│   └── requirements.md ← Checklist de qualidade do spec
└── tasks.md             ← Gerado por /speckit.tasks (próxima etapa)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts   ← Spec TurboModule — adicionar doPayment, doAsyncPayment, addListener, removeListeners
├── index.tsx                   ← API pública — adicionar doPayment, doAsyncPayment, usePaymentProgress, subscribeToPaymentProgress, tipos
└── __tests__/
    └── index.test.tsx          ← Adicionar cenários de pagamento (mínimo 13 novos)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt   ← Implementar doPayment, doAsyncPayment, addListener, removeListeners, helpers

android/src/test/java/com/pagseguroplugpag/  ← CRIAR se não existir
└── PagseguroPlugpagModuleTest.kt  ← Testes Kotlin (mínimo 6 novos cenários)

example/src/
└── App.tsx                     ← Substituir demo de ativação por demo de pagamento
```

**Structure Decision**: Single project — a feature é adição incremental ao módulo existente. Sem novos arquivos de tipos separados nesta fase (os tipos residem em `src/index.tsx` seguindo o padrão atual).

---

## Implementation Phases

### Phase 1: TurboModule Spec + Tipos TS (TDD: Red)

**Objetivo**: Atualizar o contrato JS↔Native e definir todos os tipos públicos. Escrever testes que falham.

**Tasks**:
1. Atualizar `src/NativePagseguroPlugpag.ts` — adicionar `doPayment`, `doAsyncPayment`, `addListener`, `removeListeners`
2. Adicionar tipos públicos em `src/index.tsx`: `PaymentType`, `InstallmentType`, `PlugPagPaymentRequest`, `PlugPagTransactionResult`, `PlugPagPaymentProgressEvent`
3. Escrever testes Jest para `doPayment` (guard iOS, sucesso, erro SDK, erro interno, validações)
4. Escrever testes Jest para `doAsyncPayment` (guard iOS, sucesso, erro SDK, erro interno)
5. Escrever testes Jest para `usePaymentProgress` (cleanup unmount, entrega de evento)
6. Escrever testes Jest para `subscribeToPaymentProgress` (entrega de evento, unsubscribe)
7. Confirmar que todos os testes **falham** (Red)

**Files**:
- `src/NativePagseguroPlugpag.ts`
- `src/index.tsx` (apenas tipos e stubs)
- `src/__tests__/index.test.tsx`

---

### Phase 2: Implementação JS (TDD: Green)

**Objetivo**: Implementar as funções, hook e utilitário no `src/index.tsx` até todos os testes passarem.

**Tasks**:
1. Implementar validações JS em `doPayment` e `doAsyncPayment`
2. Implementar `doPayment` com iOS guard + chamada ao nativo
3. Implementar `doAsyncPayment` com iOS guard + chamada ao nativo
4. Criar instância compartilhada de `NativeEventEmitter` em `src/index.tsx`
5. Implementar `usePaymentProgress(callback)` hook (via `useRef` + `useEffect`)
6. Implementar `subscribeToPaymentProgress(callback)` utilitário
7. Confirmar que todos os testes **passam** (Green)
8. Executar `yarn lint` — zero erros

**Files**:
- `src/index.tsx`

---

### Phase 3: Implementação Kotlin (TDD: Red → Green)

**Objetivo**: Implementar os métodos nativos no módulo Kotlin.

**Tasks**:
1. Escrever testes Kotlin para `doPayment` (sucesso, erro SDK, erro interno) — confirmar Red
2. Escrever testes Kotlin para `doAsyncPayment` (sucesso, erro SDK, erro interno) — confirmar Red
3. Adicionar imports necessários em `PagseguroPlugpagModule.kt`
4. Implementar helper `buildTransactionResultMap`
5. Implementar helper `buildSdkPaymentErrorUserInfo`
6. Implementar helper `emitPaymentProgress`
7. Implementar `doPayment` com `Dispatchers.IO` + `setEventListener` + no-op em `finally`
8. Implementar `doAsyncPayment` com `PlugPagPaymentListener`
9. Implementar `addListener` e `removeListeners` (corpo vazio)
10. Confirmar que todos os testes Kotlin **passam** (Green)

**Files**:
- `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`
- `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt`

---

### Phase 4: App de Exemplo + Validação Final

**Objetivo**: Atualizar o app de exemplo e garantir que tudo passa.

**Tasks**:
1. Atualizar `example/src/App.tsx` — demo de `doPayment` e `doAsyncPayment` com `onPaymentProgress`
2. Remover código de `multiply` e imports não relacionados ao pagamento
3. Executar `yarn test` — 100% dos cenários passando
4. Executar `yarn lint` — zero erros ou avisos
5. Executar `yarn typecheck` — zero erros de tipo

**Files**:
- `example/src/App.tsx`

---

## Dependency Graph

```
Phase 1 (Spec + Tipos + Testes Red)
    │
    ▼
Phase 2 (Implementação JS — Green)
    │
    ▼
Phase 3 (Implementação Kotlin — Red → Green)
    │
    ▼
Phase 4 (Exemplo + Validação Final)
```

---

## Risk Register

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| `PlugPagTransactionResult` campos diferentes da versão 1.33.0 | Baixa | Inspecionar JAR/AAR antes de implementar `buildTransactionResultMap` |
| `TYPE_PIX` ausente no SDK 1.33.0 | Baixa | Verificar constante no JAR antes de implementar o mapeamento Kotlin |
| Múltiplas instâncias de `NativeEventEmitter` causando duplicação de eventos | Baixa | Instância única compartilhada em módulo — criada no top-level do arquivo |
| Chamadas concorrentes a `doPayment`/`doAsyncPayment` | N/A | Documentado como responsabilidade do consumidor (NFR-004) |

---

## Test Coverage Target

| Função | Cenários mínimos | Tipo |
|--------|-----------------|------|
| `doPayment` | 4 (iOS guard, sucesso, erro SDK, erro interno) + validações (amount, installments, PARC_*, PIX/DEBIT+PARC_*, userReference) | Jest |
| `doAsyncPayment` | 3 (iOS guard, sucesso, erro SDK, erro interno) | Jest |
| `usePaymentProgress` | 2 (cleanup unmount, entrega de evento) | Jest |
| `subscribeToPaymentProgress` | 2 (entrega de evento, unsubscribe) | Jest |
| `doPayment` Kotlin | 3 (sucesso, erro SDK, erro interno) | JUnit 5 |
| `doAsyncPayment` Kotlin | 3 (sucesso, erro SDK, erro interno) | JUnit 5 |
| **Total** | **≥ 17 cenários** | |
