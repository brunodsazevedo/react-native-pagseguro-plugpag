# Public API Contract: Métodos de Pagamento

**Feature**: feature/003-payment-methods
**Date**: 2026-03-24
**Type**: TypeScript library public API

---

## Exported Functions

### doPayment

```typescript
function doPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>
```

**Description**: Realiza um pagamento de forma síncrona (SDK bloqueante em thread de I/O). Suporta crédito à vista, crédito parcelado, débito e PIX.

**Parameters**:
- `data.type` — `'CREDIT' | 'DEBIT' | 'PIX'` (obrigatório)
- `data.amount` — inteiro positivo em centavos, `> 0` (obrigatório)
- `data.installmentType` — `'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'` (obrigatório)
- `data.installments` — inteiro `>= 1`; se `PARC_*`, deve ser `>= 2` (obrigatório)
- `data.userReference` — string de até 10 caracteres alfanuméricos (opcional)
- `data.printReceipt` — boolean, default `false` (opcional)

**Resolves with**: `PlugPagTransactionResult`

**Rejects with**:
| Código | Quando |
|--------|--------|
| `Error` (validação JS) | `amount <= 0`, `installments < 1`, regras de parcelamento/tipo, `userReference.length > 10` |
| `Error` (guard iOS) | Chamada em iOS — mensagem prefixada com `[react-native-pagseguro-plugpag] ERROR:` |
| `'PLUGPAG_PAYMENT_ERROR'` | SDK retornou `result != RET_OK` — `userInfo: { result, errorCode, message }` |
| `'PLUGPAG_INTERNAL_ERROR'` | Exception inesperada — `userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message }` |

---

### doAsyncPayment

```typescript
function doAsyncPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>
```

**Description**: Variante assíncrona de `doPayment`. Usa `PlugPagPaymentListener` como resolvedor primário (sem coroutines). API pública idêntica a `doPayment` — mesmo formato de entrada, resultado e erros.

**Parameters**: Idênticos a `doPayment`.

**Resolves with**: `PlugPagTransactionResult` (mesmo formato de `doPayment`)

**Rejects with**: Idêntico a `doPayment` (mesmos códigos e `userInfo` shapes).

---

## Exported Hooks

### usePaymentProgress

```typescript
function usePaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): void
```

**Description**: Hook React para consumir eventos de progresso do pagamento dentro de componentes. Registra listener no mount, remove automaticamente no unmount. **Não armazena estado interno** — zero re-renders causados pelo hook.

**Usage**:
```typescript
usePaymentProgress((event) => {
  setMessage(event.customMessage);
  if (event.eventCode === 1) showInsertCardUI();
});
```

**Constraints**:
- Deve ser chamado dentro de um componente React (regras dos hooks).
- O callback é chamado a cada evento emitido durante a transação ativa.
- O cleanup é automático no unmount — não requer chamada manual.

---

## Exported Utilities

### subscribeToPaymentProgress

```typescript
function subscribeToPaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): () => void
```

**Description**: Função utilitária para consumir eventos de progresso fora de componentes React (stores, services, etc.). Retorna uma função `unsubscribe` que deve ser chamada para remover o listener.

**Usage**:
```typescript
const unsubscribe = subscribeToPaymentProgress((event) => {
  store.setProgress(event);
});
try {
  await doPayment(data);
} finally {
  unsubscribe();
}
```

**Returns**: Função `() => void` que remove o listener quando invocada.

---

## Exported Types

### PlugPagPaymentRequest

```typescript
interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
}
```

### PlugPagTransactionResult

```typescript
interface PlugPagTransactionResult {
  transactionCode: string | null;
  transactionId: string | null;
  date: string | null;
  time: string | null;
  hostNsu: string | null;
  cardBrand: string | null;
  bin: string | null;
  holder: string | null;
  userReference: string | null;
  terminalSerialNumber: string | null;
  amount: string | null;
  availableBalance: string | null;
}
```

### PlugPagPaymentProgressEvent

```typescript
interface PlugPagPaymentProgressEvent {
  eventCode: number;
  customMessage: string | null;
}
```

### PlugPagPaymentType

```typescript
const PaymentType: {
  readonly CREDIT: 'CREDIT';
  readonly DEBIT: 'DEBIT';
  readonly PIX: 'PIX';
};
type PlugPagPaymentType = 'CREDIT' | 'DEBIT' | 'PIX';
```

### PlugPagInstallmentType

```typescript
const InstallmentType: {
  readonly A_VISTA: 'A_VISTA';
  readonly PARC_VENDEDOR: 'PARC_VENDEDOR';
  readonly PARC_COMPRADOR: 'PARC_COMPRADOR';
};
type PlugPagInstallmentType = 'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR';
```

---

## NativePagseguroPlugpag.ts — TurboModule Spec Additions

```typescript
// Adições à interface Spec existente
doPayment(data: Object): Promise<Object>;
doAsyncPayment(data: Object): Promise<Object>;
addListener(eventName: string): void;
removeListeners(count: number): void;
```

**Note**: `Object` é obrigatório para tipos complexos no codegen. A tipagem pública usa type assertions seguras em `src/index.tsx`.

---

## Kotlin — PagseguroPlugpagModule.kt Additions

### Method Signatures

```kotlin
override fun doPayment(data: ReadableMap, promise: Promise)
override fun doAsyncPayment(data: ReadableMap, promise: Promise)
override fun addListener(eventName: String) {}
override fun removeListeners(count: Double) {}
```

### Error Payload Shapes

**PLUGPAG_PAYMENT_ERROR**:
```json
{
  "result": <Int from PlugPagTransactionResult.result>,
  "errorCode": "<String from PlugPagTransactionResult.errorCode>",
  "message": "<String from PlugPagTransactionResult.message>"
}
```

**PLUGPAG_INTERNAL_ERROR**:
```json
{
  "result": -1,
  "errorCode": "INTERNAL_ERROR",
  "message": "<exception.message>"
}
```

### Event Payload

```json
{
  "eventCode": <Int from PlugPagEventData.eventCode>,
  "customMessage": "<String | null from PlugPagEventData.customMessage>"
}
```

Emitido via `RCTDeviceEventEmitter` com nome de evento `"onPaymentProgress"`.
