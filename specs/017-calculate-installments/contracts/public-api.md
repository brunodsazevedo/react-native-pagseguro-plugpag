# Phase 1 — Contract: Public API `calculateInstallments`

Contrato da superfície pública da biblioteca (interface exposta a consumidores) e do contrato
JS↔Native (Spec TurboModule). Android-only.

---

## 1. Função pública (consumidor da lib)

```typescript
import { calculateInstallments } from 'react-native-pagseguro-plugpag';

calculateInstallments(
  data: CalculateInstallmentsRequest
): Promise<CalculateInstallmentsResult>;
```

### Entrada

```typescript
interface CalculateInstallmentsRequest {
  amount: number;                          // centavos, inteiro > 0
  installmentType: PlugPagInstallmentType; // 'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'
}
```

### Saída (sucesso)

```typescript
interface CalculateInstallmentsResult {
  options: PlugPagInstallment[]; // pode ser []
}

interface PlugPagInstallment {
  quantity: number; // número de parcelas
  amount: number;   // valor de cada parcela, em centavos
  total: number;    // total da transação, em centavos
}
```

### Contrato de erro (rejeição da Promise)

| Condição | Tipo de rejeição | Mensagem / código (exato) |
|---|---|---|
| `Platform.OS !== 'android'` (precede validação) | `Error` | `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() is not available on iOS. PagSeguro PlugPag SDK is Android-only.` |
| `amount` `0`, negativo ou não-inteiro | `Error` | `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.` |
| `installmentType` fora do enum (ex.: `'PARCELADO'`, `null`) | `Error` | `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — installmentType "<valor>" is not valid. Accepted values: A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR.` |
| SDK lança `PlugPagException` | rejeição nativa | code `PLUGPAG_INSTALLMENTS_ERROR` (com `message`/`errorCode` do SDK) |
| Qualquer outra exceção nativa | rejeição nativa | code `PLUGPAG_INTERNAL_ERROR` (`result: -1`, `errorCode: "INTERNAL_ERROR"`) |

### Ordem de execução garantida

1. Guard de plataforma (Nível 2) — **antes** de tudo.
2. Validação fail-fast (`validateCalculateInstallmentsRequest`) — antes de qualquer chamada nativa.
3. `getNativeModule().calculateInstallments(data)` — só após 1 e 2.

---

## 2. Contrato TurboModule Spec (JS↔Native)

`src/NativePagseguroPlugpag.ts` — **única fonte de verdade**. Alteração exige codegen Android.

```typescript
export interface Spec extends TurboModule {
  // ... métodos existentes ...
  calculateInstallments(data: Object): Promise<Object>;
}
```

> Tipos `Object`/`Promise<Object>` exigidos pelo codegen. A camada pública aplica type
> assertion segura: `as Promise<CalculateInstallmentsResult>`.

---

## 3. Contrato nativo (Kotlin — `PagseguroPlugpagModule.kt`)

```kotlin
override fun calculateInstallments(data: ReadableMap, promise: Promise)
```

### Comportamento

1. `CoroutineScope(Dispatchers.IO)` — SDK síncrono bloqueante por IPC (exceção Princípio VI,
   documentar inline).
2. Mapear `installmentType: String` → `PlugPag.INSTALLMENT_TYPE_*` (mesmo `when` de `doPayment`).
3. Chamar `plugPag.calculateInstallments(data.getInt("amount").toString(), installmentType)`.
4. Converter `List<PlugPagInstallment>` → `Arguments.createArray()` de `WritableNativeMap`
   (`putInt` para `quantity`/`amount`/`total`), embrulhado em `WritableNativeMap { options: [...] }`.
5. `withContext(Dispatchers.Main)` → `promise.resolve(result)`.
6. `catch (e: PlugPagException)` → `promise.reject("PLUGPAG_INSTALLMENTS_ERROR", buildInstallmentsErrorUserInfo(e))`.
7. `catch (e: Exception)` → `promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))`.

### Imports novos

- `br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInstallment`
- `br.com.uol.pagseguro.plugpagservice.wrapper.exception.PlugPagException`

### Helper novo

```kotlin
private fun buildInstallmentsErrorUserInfo(e: PlugPagException): WritableNativeMap
// espelha buildInternalErrorUserInfo: result(-1), errorCode = e.errorCode, message = e.message
```

---

## 4. Garantias do contrato (não-breaking)

- Nenhuma assinatura, tipo ou comportamento público existente é alterado (SC-005).
- A validação atual de `doPayment` (`amount must be > 0.`) permanece intacta.
- Re-export automático via barrels existentes (`functions/index.ts`, `src/index.ts`) — sem edição.
