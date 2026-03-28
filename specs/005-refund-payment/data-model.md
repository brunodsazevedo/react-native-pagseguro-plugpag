# Data Model: Feature 005 — Estorno de Pagamento (doRefund)

**Branch**: `feature/005-refund-payment` | **Date**: 2026-03-28

---

## Entidades

### `PlugPagVoidType` (const enum object — novo)

Conjunto fechado dos tipos de estorno. Mapeia strings públicas para constantes inteiras internas do SDK.

```typescript
export const PlugPagVoidType = {
  VOID_PAYMENT: 'VOID_PAYMENT', // Estorno de cartão (crédito/débito) → PlugPag.VOID_PAYMENT = 1
  VOID_QRCODE:  'VOID_QRCODE',  // Estorno de PIX/QR Code            → PlugPag.VOID_QRCODE  = 2
} as const;

export type PlugPagVoidTypeValue = (typeof PlugPagVoidType)[keyof typeof PlugPagVoidType];
```

**Regras**:
- Valores fora deste conjunto devem ser rejeitados pela validação JS antes de acionar o terminal.
- Os inteiros internos do SDK (1, 2) NÃO são expostos ao consumidor.

---

### `PlugPagRefundRequest` (interface — nova)

Input do método `doRefund`. Identifica a transação original e controla o tipo de estorno.

```typescript
export interface PlugPagRefundRequest {
  transactionCode: string;   // obrigatório, não pode ser vazio
  transactionId:   string;   // obrigatório, não pode ser vazio
  voidType:        PlugPagVoidTypeValue; // obrigatório, deve ser VOID_PAYMENT ou VOID_QRCODE
  printReceipt?:   boolean;  // opcional, default false
}
```

**Campos**:

| Campo | Tipo | Obrigatório | Validação | Origem |
|---|---|---|---|---|
| `transactionCode` | `string` | Sim | Não pode ser vazio (`''`) | `PlugPagTransactionResult.transactionCode` do pagamento original |
| `transactionId` | `string` | Sim | Não pode ser vazio (`''`) | `PlugPagTransactionResult.transactionId` do pagamento original |
| `voidType` | `PlugPagVoidTypeValue` | Sim | Deve ser `'VOID_PAYMENT'` ou `'VOID_QRCODE'` | Definido pelo consumidor |
| `printReceipt` | `boolean` | Não | — | Controla impressão de comprovante; `false` quando omitido |

**Mapeamento para SDK** (`PlugPagVoidData`):

```kotlin
PlugPagVoidData(
    transactionCode = data.getString("transactionCode")!!,
    transactionId   = data.getString("transactionId")!!,
    printReceipt    = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false,
    voidType        = when (data.getString("voidType")) {
        "VOID_PAYMENT" -> PlugPag.VOID_PAYMENT  // 1
        "VOID_QRCODE"  -> PlugPag.VOID_QRCODE   // 2
        else           -> PlugPag.VOID_PAYMENT   // fallback (nunca deve ocorrer — validado no JS)
    }
)
```

---

### `PlugPagTransactionResult` (interface — estendida, retro-compatível)

Tipo de retorno de `doRefund` (e de `doPayment`/`doAsyncPayment` existentes). Estendido com 6 campos opcionais sem quebrar o contrato atual.

```typescript
export interface PlugPagTransactionResult {
  // Campos existentes (feature/003) — inalterados
  transactionCode:      string | null;
  transactionId:        string | null;
  date:                 string | null;
  time:                 string | null;
  hostNsu:              string | null;
  cardBrand:            string | null;
  bin:                  string | null;
  holder:               string | null;
  userReference:        string | null;
  terminalSerialNumber: string | null;
  amount:               string | null;
  availableBalance:     string | null;

  // Novos campos opcionais (feature/005) — podem ser null dependendo do firmware do terminal
  nsu?:                 string | null;
  cardApplication?:     string | null; // AID EMV (ex: A0000000031010)
  label?:               string | null;
  holderName?:          string | null;
  extendedHolderName?:  string | null;
  autoCode?:            string | null; // Código de autorização
}
```

**Regras de extensão**:
- Todos os 6 novos campos são `?` (opcionais) — consumidores existentes de `doPayment` não são afetados.
- Podem retornar `null` dependendo da versão de firmware do terminal — comportamento esperado do SDK.
- `buildTransactionResultMap` em Kotlin deve ser atualizado para mapear os 6 novos campos.

**Mapeamento Kotlin** (adição ao `buildTransactionResultMap`):

```kotlin
putStringOrNull("nsu", result.nsu)
putStringOrNull("cardApplication", result.cardApplication)
putStringOrNull("label", result.label)
putStringOrNull("holderName", result.holderName)
putStringOrNull("extendedHolderName", result.extendedHolderName)
putStringOrNull("autoCode", result.autoCode)
```

---

## Fluxo de Estados — `doRefund`

```
[JS: doRefund(PlugPagRefundRequest)]
        │
        ▼
[Guard iOS → throw se Platform.OS !== 'android']
        │
        ▼
[Validação JS:
  transactionCode vazio? → throw
  transactionId vazio? → throw
  voidType inválido? → throw
]
        │
        ▼
[Native: doRefund(ReadableMap, Promise)]
        │
        ├── PlugPagEventListener.setEventListener → emite onPaymentProgress
        │
        ▼
[Dispatchers.IO: plugPag.voidPayment(PlugPagVoidData)]
        │
        ├── result == RET_OK → promise.resolve(buildTransactionResultMap(result))
        ├── result != RET_OK → promise.reject("PLUGPAG_REFUND_ERROR", buildSdkPaymentErrorUserInfo(result))
        └── Exception        → promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
        │
        ▼ (finally)
[plugPag.setEventListener(noop) — limpa listener]
```

---

## Códigos de Erro

| Código | Quando | userInfo |
|---|---|---|
| `PLUGPAG_REFUND_ERROR` | SDK retorna `result != RET_OK` | `{ result: Int, errorCode: String, message: String }` |
| `PLUGPAG_INTERNAL_ERROR` | Exception não-SDK capturada | `{ result: -1, errorCode: "INTERNAL_ERROR", message: String }` |

---

## Validações JS (ordem de execução)

1. **Guard iOS**: `Platform.OS !== 'android'` → `throw new Error('[...] ERROR: doRefund() is not available on iOS...')`
2. **transactionCode vazio**: `data.transactionCode.trim() === ''` → `throw new Error('[...] ERROR: doRefund() — transactionCode must not be empty.')`
3. **transactionId vazio**: `data.transactionId.trim() === ''` → `throw new Error('[...] ERROR: doRefund() — transactionId must not be empty.')`
4. **voidType inválido**: `!Object.values(PlugPagVoidType).includes(data.voidType)` → `throw new Error('[...] ERROR: doRefund() — voidType must be PlugPagVoidType.VOID_PAYMENT or PlugPagVoidType.VOID_QRCODE.')`
