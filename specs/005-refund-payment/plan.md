# Implementation Plan: Feature 005 — Estorno de Pagamento (doRefund)

**Branch**: `feature/005-refund-payment` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-refund-payment/spec.md`

---

## Summary

Implementar `doRefund` — método que expõe `plugPag.voidPayment(PlugPagVoidData)` do SDK PagSeguro ao JavaScript via TurboModule (JSI / New Architecture). Suporta estorno de cartão (`VOID_PAYMENT`) e PIX (`VOID_QRCODE`). Requer extensão retro-compatível de `PlugPagTransactionResult` com 6 campos opcionais. Não existe variante assíncrona — SDK 1.33.0 oferece apenas chamada bloqueante para `voidPayment`, tratada com `Dispatchers.IO` (mesmo padrão de `doPayment`).

---

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) + Kotlin 2.0.21
**Primary Dependencies**: PlugPagServiceWrapper `wrapper:1.33.0`, React Native 0.83.2 (New Architecture / TurboModules + JSI)
**Storage**: N/A
**Testing**: Jest 29 (JS unit tests) + JUnit 5 + Mockk (Kotlin integration tests)
**Target Platform**: Android — PagBank SmartPOS (A920, A930, P2, S920). Mínimo SDK 24.
**Project Type**: React Native Library (TurboModule)
**Performance Goals**: N/A — operação bloqueante por IPC, performance determinada pelo terminal.
**Constraints**: `voidPayment` é bloqueante por IPC → `Dispatchers.IO` obrigatório (Constituição Princípio VI, exceção documentada). Sem variante assíncrona no SDK 1.33.0.
**Scale/Scope**: 1 função pública, 2 novos tipos exportados, extensão de 1 tipo existente, 1 método Kotlin.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|---|---|---|
| **I — TurboModules Only** | ✅ PASS | `doRefund(data: Object): Promise<Object>` adicionado à spec. Codegen obrigatório após alteração. |
| **II — TypeScript Strict / Zero `any`** | ✅ PASS | `PlugPagVoidType` como const object. `PlugPagRefundRequest` como interface. Type assertion explícita na camada pública. |
| **III — TDD / Test-First** | ✅ PASS | Testes JS escritos antes da implementação. Testes Kotlin documentados. 100% cobertura das funções exportadas. |
| **IV — Clean Code / SOLID** | ✅ PASS | `doRefund` domínio `payment`. `voidPayment` chamado somente em `PagseguroPlugpagModule.kt`. Reutiliza helpers existentes (`buildTransactionResultMap`, `buildSdkPaymentErrorUserInfo`, `emitPaymentProgress`). |
| **V — Device Compatibility / Fail-Fast** | ⚠️ DEFERRED | Princípio V ainda não implementado (feature dedicada pós-005). Guard iOS Nível 1/2 aplicado em `doRefund`. |
| **VI — Android-Only / Threading** | ✅ PASS (com exceção justificada) | `voidPayment` bloqueante por IPC → `Dispatchers.IO` necessário. Comentário inline obrigatório: `// EXCEPTION (Constituição Princípio VI): SDK voidPayment é bloqueante por IPC — Dispatchers.IO é necessário` |
| **iOS Guard (dois níveis)** | ✅ PASS | Nível 1 (import warning) já existe. Nível 2 (throw dentro de `doRefund`) será adicionado. |

**Resultado**: APROVADO. Nenhuma violação não-justificada.

---

## Project Structure

### Documentation (esta feature)

```text
specs/005-refund-payment/
├── plan.md              # Este arquivo (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — SDK API, decisões, alternativas
├── data-model.md        # Phase 1 output — entidades, validações, fluxo de estados
├── quickstart.md        # Phase 1 output — exemplos de uso
├── contracts/
│   └── public-api.md    # Phase 1 output — contrato TypeScript e Kotlin
└── tasks.md             # Phase 2 output (/speckit.tasks command — NÃO criado aqui)
```

### Source Code (arquivos afetados)

```text
src/
├── NativePagseguroPlugpag.ts    ← MODIFICAR: adicionar doRefund(data: Object): Promise<Object>
└── index.tsx                    ← MODIFICAR: adicionar PlugPagVoidType, PlugPagVoidTypeValue,
                                              PlugPagRefundRequest, doRefund(), e estender
                                              PlugPagTransactionResult com 6 campos opcionais

src/__tests__/
└── index.test.tsx               ← MODIFICAR: adicionar testes de doRefund (TDD — escrever ANTES)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt    ← MODIFICAR: adicionar override doRefund(data: ReadableMap, promise: Promise)
                                              e atualizar buildTransactionResultMap com 6 novos campos

android/src/test/java/com/pagseguroplugpag/
└── PagseguroPlugpagModuleTest.kt ← MODIFICAR: adicionar testes Kotlin de doRefund (TDD — escrever ANTES)

android/build/generated/source/codegen/
└── java/com/pagseguroplugpag/
    └── NativePagseguroPlugpagSpec.java  ← REGENERAR após alteração em NativePagseguroPlugpag.ts
```

**Structure Decision**: Single project. Sem novos arquivos — todas as mudanças são adições a arquivos existentes. A única exceção é a geração automática do codegen.

---

## Implementation Phases

### Phase 1 — Spec TurboModule + Codegen

**Objetivo**: Adicionar `doRefund` à spec e regenerar o codegen para que o Kotlin possa implementar o override.

**Arquivo**: [NativePagseguroPlugpag.ts](../../src/NativePagseguroPlugpag.ts)

Adicionar após `doAsyncPayment`:
```typescript
doRefund(data: Object): Promise<Object>;
```

**Após a alteração** — regenerar codegen (BLOQUEANTE):
```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

---

### Phase 2 — Testes JS (TDD — ANTES da implementação)

**Objetivo**: Escrever testes que falham. Confirmar falha antes de implementar.

**Arquivo**: [src/__tests__/index.test.tsx](../../src/__tests__/index.test.tsx)

**Mock adicionado ao mock existente**:
```typescript
const mockDoRefund = jest.fn();
// Adicionar ao mock de NativePagseguroPlugpag:
doRefund: mockDoRefund,
```

**Cenários obrigatórios** (todos devem falhar antes da implementação):

| ID | Cenário | Grupo |
|---|---|---|
| T040a | iOS → rejeita com `[...] ERROR: doRefund() is not available on iOS...` | iOS guard |
| T040b | Android + sucesso VOID_PAYMENT → resolve com `PlugPagTransactionResult` | sucesso |
| T040c | Android + sucesso VOID_QRCODE → resolve com `PlugPagTransactionResult` | sucesso |
| T040d | Android + erro SDK → rejeita com `PLUGPAG_REFUND_ERROR` e userInfo | erro SDK |
| T040e | Android + exceção interna → rejeita com `PLUGPAG_INTERNAL_ERROR` | erro interno |
| T041a | `transactionCode` vazio → rejeita sem chamar native | validação JS |
| T041b | `transactionId` vazio → rejeita sem chamar native | validação JS |
| T041c | `voidType` inválido → rejeita sem chamar native | validação JS |
| T041d | `printReceipt` omitido → native chamado (não rejeita) | validação JS |

---

### Phase 3 — Implementação TypeScript (`src/index.tsx`)

**Objetivo**: Implementar os tipos e a função `doRefund` satisfazendo os testes da Phase 2.

**Adições em ordem**:

1. **Após `InstallmentType`** — Adicionar `PlugPagVoidType` e `PlugPagVoidTypeValue`:
```typescript
export const PlugPagVoidType = {
  VOID_PAYMENT: 'VOID_PAYMENT',
  VOID_QRCODE:  'VOID_QRCODE',
} as const;

export type PlugPagVoidTypeValue = (typeof PlugPagVoidType)[keyof typeof PlugPagVoidType];
```

2. **Após `PlugPagPaymentRequest`** — Adicionar `PlugPagRefundRequest`:
```typescript
export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId:   string;
  voidType:        PlugPagVoidTypeValue;
  printReceipt?:   boolean;
}
```

3. **Modificar `PlugPagTransactionResult`** — Adicionar 6 campos opcionais ao final:
```typescript
nsu?:                string | null;
cardApplication?:    string | null;
label?:              string | null;
holderName?:         string | null;
extendedHolderName?: string | null;
autoCode?:           string | null;
```

4. **Após `doAsyncPayment`** — Adicionar `validateRefundRequest` e `doRefund`:
```typescript
function validateRefundRequest(data: PlugPagRefundRequest): void {
  if (data.transactionCode.trim() === '') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doRefund() — transactionCode must not be empty.');
  }
  if (data.transactionId.trim() === '') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doRefund() — transactionId must not be empty.');
  }
  if (!Object.values(PlugPagVoidType).includes(data.voidType)) {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doRefund() — voidType must be PlugPagVoidType.VOID_PAYMENT or PlugPagVoidType.VOID_QRCODE.');
  }
}

export async function doRefund(
  data: PlugPagRefundRequest
): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doRefund() is not available on iOS. PagSeguro PlugPag SDK is Android-only.');
  }

  validateRefundRequest(data);

  const PagseguroPlugpag = (
    require('./NativePagseguroPlugpag') as { default: Spec }
  ).default;

  return PagseguroPlugpag.doRefund(data) as Promise<PlugPagTransactionResult>;
}
```

---

### Phase 4 — Testes Kotlin (TDD — ANTES da implementação Kotlin)

**Objetivo**: Escrever testes Kotlin que falham. Confirmar falha antes de implementar.

**Arquivo**: [android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt](../../android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt)

**Cenários obrigatórios**:

| ID | Cenário |
|---|---|
| KT-R01 | `doRefund` resolve com `buildTransactionResultMap` quando `result == RET_OK` |
| KT-R02 | `doRefund` rejeita com `PLUGPAG_REFUND_ERROR` quando `result != RET_OK` |
| KT-R03 | `doRefund` rejeita com `PLUGPAG_INTERNAL_ERROR` quando exceção é lançada |
| KT-R04 | `doRefund` usa `VOID_QRCODE` quando `voidType == "VOID_QRCODE"` (verifica `PlugPagVoidData` passado ao SDK) |
| KT-R05 | `buildTransactionResultMap` mapeia os 6 novos campos (`nsu`, `cardApplication`, `label`, `holderName`, `extendedHolderName`, `autoCode`) |
| KT-R06 | `doRefund` rejeita com `PLUGPAG_PAYMENT_ERROR` quando `result` é null (null safety — mesmo padrão de `doPayment`) |

---

### Phase 5 — Implementação Kotlin (`PagseguroPlugpagModule.kt`)

**Objetivo**: Implementar `doRefund` e atualizar `buildTransactionResultMap` satisfazendo os testes da Phase 4.

**Imports adicionados**:
```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagVoidData
```

**Atualizar `buildTransactionResultMap`** — adicionar os 6 novos campos:
```kotlin
putStringOrNull("nsu", result.nsu)
putStringOrNull("cardApplication", result.cardApplication)
putStringOrNull("label", result.label)
putStringOrNull("holderName", result.holderName)
putStringOrNull("extendedHolderName", result.extendedHolderName)
putStringOrNull("autoCode", result.autoCode)
```

**Implementar `doRefund`**:
```kotlin
override fun doRefund(data: ReadableMap, promise: Promise) {
    // EXCEPTION (Constituição Princípio VI): SDK voidPayment é bloqueante por IPC — Dispatchers.IO é necessário
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val voidType = when (data.getString("voidType")) {
                "VOID_PAYMENT" -> PlugPag.VOID_PAYMENT
                "VOID_QRCODE"  -> PlugPag.VOID_QRCODE
                else           -> PlugPag.VOID_PAYMENT
            }
            val voidData = PlugPagVoidData(
                transactionCode = data.getString("transactionCode")!!,
                transactionId   = data.getString("transactionId")!!,
                printReceipt    = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false,
                voidType        = voidType
            )

            plugPag.setEventListener(object : PlugPagEventListener {
                override fun onEvent(eventData: PlugPagEventData) {
                    emitPaymentProgress(eventData)
                }
            })

            val result = plugPag.voidPayment(voidData)

            withContext(Dispatchers.Main) {
                if (result.result != PlugPag.RET_OK) {
                    promise.reject("PLUGPAG_REFUND_ERROR", buildSdkPaymentErrorUserInfo(result))
                } else {
                    promise.resolve(buildTransactionResultMap(result))
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
            }
        } finally {
            plugPag.setEventListener(object : PlugPagEventListener {
                override fun onEvent(eventData: PlugPagEventData) {}
            })
        }
    }
}
```

---

### Phase 6 — Validação Final

**Objetivo**: Confirmar que todos os critérios de sucesso estão satisfeitos.

```bash
yarn test          # Todos os testes passam — incluindo novos (T040*, T041*, KT-R*)
yarn lint          # Zero erros ou avisos
yarn typecheck     # Zero erros de tipo
```

**SC checklist** (da spec):
- [ ] SC-001: 100% das funções exportadas com cobertura de teste unitário (TDD confirmado)
- [ ] SC-002: `doRefund` rejeita em todos os cenários de entrada inválida sem acionar o terminal (6 cenários: T041a, T041b, T041c + iOS guard T040a + vazio null safety)
- [ ] SC-003: Extensão de `PlugPagTransactionResult` não quebra testes existentes das features 002 e 003
- [ ] SC-004: Consumidor consegue estornar cartão e PIX usando apenas tipos exportados
- [ ] SC-005: `yarn test`, `yarn lint`, `yarn typecheck` passam sem erros

---

## Complexity Tracking

> Nenhuma violação da Constituição não-justificada.

| Aspecto | Decisão |
|---|---|
| `Dispatchers.IO` em `doRefund` | Justificado — Princípio VI, exceção documentada. SDK `voidPayment` bloqueante por IPC. |
| Sem `doAsyncRefund` | Correto — SDK 1.33.0 não oferece `PlugPagVoidPaymentListener`. |
| Extensão retro-compatível de `PlugPagTransactionResult` | Princípio IV (Open/Closed) — campos opcionais, sem quebrar contrato. |
| Canal `onPaymentProgress` reutilizado | Sem nova API — semântica idêntica para pagamento e estorno. |
