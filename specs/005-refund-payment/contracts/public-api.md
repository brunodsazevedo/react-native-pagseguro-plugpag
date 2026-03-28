# Contrato de API Pública — Feature 005: doRefund

**Branch**: `feature/005-refund-payment` | **Date**: 2026-03-28

---

## Exports adicionados em `src/index.tsx`

### Tipos exportados (novos)

```typescript
// Const enum — tipos de estorno suportados
export const PlugPagVoidType = {
  VOID_PAYMENT: 'VOID_PAYMENT',
  VOID_QRCODE:  'VOID_QRCODE',
} as const;

export type PlugPagVoidTypeValue = (typeof PlugPagVoidType)[keyof typeof PlugPagVoidType];

// Interface de entrada do estorno
export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId:   string;
  voidType:        PlugPagVoidTypeValue;
  printReceipt?:   boolean;  // default: false
}
```

### Tipo modificado (retro-compatível)

```typescript
// PlugPagTransactionResult — 6 campos opcionais adicionados
export interface PlugPagTransactionResult {
  // ... campos existentes inalterados ...
  nsu?:                string | null;
  cardApplication?:    string | null;
  label?:              string | null;
  holderName?:         string | null;
  extendedHolderName?: string | null;
  autoCode?:           string | null;
}
```

### Função exportada (nova)

```typescript
export async function doRefund(
  data: PlugPagRefundRequest
): Promise<PlugPagTransactionResult>
```

**Comportamento**:
- **iOS**: lança `Error` com prefixo `[react-native-pagseguro-plugpag] ERROR: doRefund() is not available on iOS...` antes de qualquer chamada nativa.
- **Android + entrada inválida**: lança `Error` com prefixo `[react-native-pagseguro-plugpag] ERROR: doRefund() — ...` antes de acionar o terminal.
- **Android + sucesso**: resolve com `PlugPagTransactionResult` contendo `transactionCode` e `transactionId` do estorno gerado.
- **Android + erro SDK**: rejeita com código `PLUGPAG_REFUND_ERROR` e `userInfo: { result, errorCode, message }`.
- **Android + exceção interna**: rejeita com código `PLUGPAG_INTERNAL_ERROR` e `userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message }`.

---

## Spec TurboModule — `NativePagseguroPlugpag.ts`

Novo método adicionado à interface `Spec`:

```typescript
doRefund(data: Object): Promise<Object>;
```

> Obs.: `Object` é exigência do codegen React Native para tipos complexos. A tipagem
> completa é feita com type assertion na camada pública (`src/index.tsx`).

**Impacto**: Codegen deve ser regenerado após a alteração:
```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## Contrato Kotlin — `PagseguroPlugpagModule.kt`

Novo override adicionado:

```kotlin
override fun doRefund(data: ReadableMap, promise: Promise)
```

**Padrão de implementação** (idêntico a `doPayment`, com `VOID` em vez de `PAYMENT`):

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

## Compatibilidade com features anteriores

| Feature | Impacto |
|---|---|
| 002 — PinPad Activation | Nenhum — `PlugPagTransactionResult` não usado |
| 003 — Payment Methods | Extensão retro-compatível de `PlugPagTransactionResult` (6 campos opcionais); canal `onPaymentProgress` reutilizado sem alterações |

---

## Eventos de progresso (reutilizados, sem alteração)

O canal `onPaymentProgress` já existente emite `PlugPagPaymentProgressEvent` durante o estorno:

```typescript
// Sem alterações necessárias — funciona automaticamente via setEventListener
interface PlugPagPaymentProgressEvent {
  eventCode: number;
  customMessage: string | null;
}
```

Consumidores usam `usePaymentProgress` ou `subscribeToPaymentProgress` — nenhuma mudança de API.
