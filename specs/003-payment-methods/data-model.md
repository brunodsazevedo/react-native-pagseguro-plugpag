# Data Model: Métodos de Pagamento (Crédito, Débito e PIX)

**Feature**: feature/003-payment-methods
**Date**: 2026-03-24

---

## Entidades TypeScript (API Pública)

### PlugPagPaymentType

String literal type para o tipo de pagamento. Mapeado para constantes `PlugPag.TYPE_*` no Kotlin.

```typescript
export const PaymentType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  PIX: 'PIX',
} as const;

export type PlugPagPaymentType = (typeof PaymentType)[keyof typeof PaymentType];
// → 'CREDIT' | 'DEBIT' | 'PIX'
```

**Mapping Kotlin**:
| TypeScript | Kotlin SDK |
|------------|------------|
| `'CREDIT'` | `PlugPag.TYPE_CREDITO` |
| `'DEBIT'`  | `PlugPag.TYPE_DEBITO` |
| `'PIX'`    | `PlugPag.TYPE_PIX` |

---

### PlugPagInstallmentType

String literal type para o tipo de parcelamento.

```typescript
export const InstallmentType = {
  A_VISTA: 'A_VISTA',
  PARC_VENDEDOR: 'PARC_VENDEDOR',
  PARC_COMPRADOR: 'PARC_COMPRADOR',
} as const;

export type PlugPagInstallmentType = (typeof InstallmentType)[keyof typeof InstallmentType];
// → 'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'
```

**Mapping Kotlin**:
| TypeScript | Kotlin SDK |
|------------|------------|
| `'A_VISTA'` | `PlugPag.INSTALLMENT_TYPE_A_VISTA` |
| `'PARC_VENDEDOR'` | `PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR` |
| `'PARC_COMPRADOR'` | `PlugPag.INSTALLMENT_TYPE_PARC_COMPRADOR` |

---

### PlugPagPaymentRequest

Dados de entrada de uma transação de pagamento.

```typescript
export interface PlugPagPaymentRequest {
  /** Tipo de pagamento: crédito, débito ou PIX */
  type: PlugPagPaymentType;
  /** Valor em centavos. Deve ser > 0. Ex: R$10,00 = 1000 */
  amount: number;
  /** Tipo de parcelamento */
  installmentType: PlugPagInstallmentType;
  /** Número de parcelas. Deve ser >= 1. Se PARC_*, deve ser >= 2 */
  installments: number;
  /** Referência do pedido — máx 10 caracteres alfanuméricos. NUNCA logado. */
  userReference?: string;
  /** Imprimir comprovante. Default: false */
  printReceipt?: boolean;
}
```

**Validation Rules** (aplicadas na camada JS antes de chamar o nativo):
| Campo | Regra | Código de Rejeição |
|-------|-------|-------------------|
| `amount` | `> 0` | Erro de validação JS |
| `installments` | `>= 1` | Erro de validação JS |
| `installments` (PARC_*) | `>= 2` quando `installmentType` é `PARC_VENDEDOR` ou `PARC_COMPRADOR` | Erro de validação JS |
| `type` PIX/DEBIT | `installmentType` deve ser `'A_VISTA'` | Erro de validação JS |
| `userReference` | comprimento `<= 10` quando fornecido | Erro de validação JS |

**Mapping para PlugPagPaymentData (Kotlin)**:
```kotlin
PlugPagPaymentData(
  type = paymentType,          // Int, mapeado via when()
  amount = data.getInt("amount"),
  installmentType = installmentType, // Int, mapeado via when()
  installments = data.getInt("installments"),
  userReference = if (data.hasKey("userReference")) data.getString("userReference") else null,
  printReceipt = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false
)
```

---

### PlugPagTransactionResult

Resultado de uma transação aprovada. Todos os campos são nullable (contrato do SDK).

```typescript
export interface PlugPagTransactionResult {
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

**Mapping do Kotlin** (via `WritableNativeMap`):
```kotlin
val map = WritableNativeMap()
map.putString("transactionCode", sdkResult.transactionCode)
map.putString("transactionId", sdkResult.transactionId)
map.putString("date", sdkResult.date)
map.putString("time", sdkResult.time)
map.putString("hostNsu", sdkResult.hostNsu)
map.putString("cardBrand", sdkResult.cardBrand)
map.putString("bin", sdkResult.bin)
map.putString("holder", sdkResult.holder)
map.putString("userReference", sdkResult.userReference)
map.putString("terminalSerialNumber", sdkResult.terminalSerialNumber)
map.putString("amount", sdkResult.amount)
map.putString("availableBalance", sdkResult.availableBalance)
```

---

### PlugPagPaymentProgressEvent

Evento emitido pelo nativo durante o fluxo de pagamento via `NativeEventEmitter`.

```typescript
export interface PlugPagPaymentProgressEvent {
  /** Código do evento. Ver constantes PlugPagEventCode. */
  eventCode: number;
  /** Mensagem customizada do SDK, ou null */
  customMessage: string | null;
}
```

**Constantes de eventCode conhecidas** (não exaustivas — semântica a confirmar em terminal físico):

| Constante SDK | Semântica |
|---------------|-----------|
| `EVENT_CODE_WAITING_CARD` | Aguardando inserção do cartão |
| `EVENT_CODE_INSERTED_CARD` | Cartão inserido |
| `EVENT_CODE_PIN_REQUESTED` | Solicitando PIN |
| `EVENT_CODE_PIN_OK` | PIN aceito |
| `EVENT_CODE_AUTHORIZING` | Autorizando junto ao adquirente |
| `EVENT_CODE_SALE_END` | Transação finalizada |
| `EVENT_CODE_SALE_APPROVED` | Venda aprovada |
| `EVENT_CODE_SALE_NOT_APPROVED` | Venda não aprovada |
| `EVENT_CODE_WAITING_REMOVE_CARD` | Aguardando remoção do cartão |
| `EVENT_CODE_REMOVED_CARD` | Cartão removido |
| `EVENT_CODE_QRCODE` | QR Code PIX gerado |
| `EVENT_CODE_QRCODE_SHOWED` | QR Code exibido no terminal |
| `EVENT_CODE_CUSTOM_MESSAGE` | Mensagem customizada do SDK |

**Mapping do Kotlin**:
```kotlin
fun emitPaymentProgress(eventData: PlugPagEventData) {
    val params = Arguments.createMap()
    params.putInt("eventCode", eventData.eventCode)
    val msg = eventData.customMessage
    if (msg != null) params.putString("customMessage", msg)
    else params.putNull("customMessage")
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onPaymentProgress", params)
}
```

---

## Entidades da Spec TurboModule

### NativePagseguroPlugpag.ts — Adições

```typescript
export interface Spec extends TurboModule {
  // Existentes (feature/002)
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;

  // Novos (feature/003)
  doPayment(data: Object): Promise<Object>;
  doAsyncPayment(data: Object): Promise<Object>;

  // NativeEventEmitter contracts (obrigatórios)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}
```

**Note**: `Object` é obrigatório na spec para tipos complexos — exigência do codegen do React Native. Type assertion segura é feita na camada pública (`src/index.tsx`).

---

## Entidades Kotlin — Adições ao PagseguroPlugpagModule.kt

### Imports adicionais necessários

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
```

### buildTransactionResultMap

Novo helper para mapear `PlugPagTransactionResult` → `WritableNativeMap`:

```kotlin
private fun buildTransactionResultMap(result: PlugPagTransactionResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putString("transactionCode", result.transactionCode)
    map.putString("transactionId", result.transactionId)
    map.putString("date", result.date)
    map.putString("time", result.time)
    map.putString("hostNsu", result.hostNsu)
    map.putString("cardBrand", result.cardBrand)
    map.putString("bin", result.bin)
    map.putString("holder", result.holder)
    map.putString("userReference", result.userReference)
    map.putString("terminalSerialNumber", result.terminalSerialNumber)
    map.putString("amount", result.amount)
    map.putString("availableBalance", result.availableBalance)
    return map
}
```

### buildSdkPaymentErrorUserInfo

Novo helper para erro de pagamento (reutiliza estrutura, mas campo de entrada é `PlugPagTransactionResult`):

```kotlin
private fun buildSdkPaymentErrorUserInfo(result: PlugPagTransactionResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putInt("result", result.result)
    map.putString("errorCode", result.errorCode ?: "")
    map.putString("message", result.message?.takeIf { it.isNotEmpty() } ?: "Unknown error")
    return map
}
```

### emitPaymentProgress

Helper para emitir evento via RCTDeviceEventEmitter:

```kotlin
private fun emitPaymentProgress(eventData: PlugPagEventData) {
    val params = Arguments.createMap()
    params.putInt("eventCode", eventData.eventCode)
    val msg = eventData.customMessage
    if (msg != null) params.putString("customMessage", msg) else params.putNull("customMessage")
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onPaymentProgress", params)
}
```

---

## Fluxo de Estado das Transações

```
PlugPagPaymentRequest (input)
        │
        ▼
   Validação JS
   (amount, installments, type/installmentType, userReference)
        │
   ────────────────────────────────
   Falha                  OK
    │                      │
    ▼                      ▼
  reject               Guard iOS?
(validação)           Sim → reject ERROR
                      Não → chamar nativo
                              │
                    ──────────────────────
                   doPayment           doAsyncPayment
                  (Dispatchers.IO)     (PlugPagPaymentListener)
                   setEventListener    onPaymentProgress
                   + doPayment()       onSuccess / onError
                        │                    │
                   ─────────────────────────────────────
                   RET_OK   RET_ERR   onSuccess  onError  Exception
                     │        │          │          │         │
                   resolve  reject     resolve    reject    reject
               (TransactionResult) (PAYMENT_ERROR) (INTERNAL_ERROR)
```
