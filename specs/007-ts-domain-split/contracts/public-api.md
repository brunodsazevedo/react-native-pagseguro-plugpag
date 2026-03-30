# Contrato da API Pública: react-native-pagseguro-plugpag

**Feature**: `007-ts-domain-split` | **Date**: 2026-03-29
**Entry point**: `react-native-pagseguro-plugpag` (via `package.json` `main` → `src/index.ts`)

Este documento define a superfície de API pública completa da biblioteca após a refatoração. Todos os exports abaixo DEVEM estar disponíveis no entry point `src/index.ts` — importados via barrel de `./functions` e import direto de `./hooks/usePaymentProgress`.

---

## Funções Exportadas

### Domínio: Ativação

| Função | Assinatura | Origem após refatoração |
|---|---|---|
| `initializeAndActivatePinPad` | `(activationCode: string) => Promise<PlugPagActivationSuccess>` | `functions/activation/index.ts` |
| `doAsyncInitializeAndActivatePinPad` | `(activationCode: string) => Promise<PlugPagActivationSuccess>` | `functions/activation/index.ts` |

### Domínio: Pagamento

| Função | Assinatura | Origem após refatoração |
|---|---|---|
| `doPayment` | `(data: PlugPagPaymentRequest) => Promise<PlugPagTransactionResult>` | `functions/payment/index.ts` |
| `doAsyncPayment` | `(data: PlugPagPaymentRequest) => Promise<PlugPagTransactionResult>` | `functions/payment/index.ts` |
| `subscribeToPaymentProgress` | `(callback: (event: PlugPagPaymentProgressEvent) => void) => () => void` | `functions/payment/index.ts` |

### Domínio: Estorno

| Função | Assinatura | Origem após refatoração |
|---|---|---|
| `doRefund` | `(data: PlugPagRefundRequest) => Promise<PlugPagTransactionResult>` | `functions/refund/index.ts` |

### Domínio: Impressão

| Função | Assinatura | Origem após refatoração |
|---|---|---|
| `printFromFile` | `(data: PrintRequest) => Promise<PrintResult>` | `functions/print/index.ts` |
| `reprintCustomerReceipt` | `() => Promise<PrintResult>` | `functions/print/index.ts` |
| `doAsyncReprintCustomerReceipt` | `() => Promise<PrintResult>` | `functions/print/index.ts` |
| `reprintEstablishmentReceipt` | `() => Promise<PrintResult>` | `functions/print/index.ts` |
| `doAsyncReprintEstablishmentReceipt` | `() => Promise<PrintResult>` | `functions/print/index.ts` |

### Hooks

| Hook | Assinatura | Origem após refatoração |
|---|---|---|
| `usePaymentProgress` | `(callback: (event: PlugPagPaymentProgressEvent) => void) => void` | `hooks/usePaymentProgress.ts` |

---

## Tipos Exportados

### Tipos de Ativação

| Nome | Tipo | Origem |
|---|---|---|
| `PlugPagActivationSuccess` | `interface` | `functions/activation/types.ts` |

### Tipos de Pagamento

| Nome | Tipo | Origem |
|---|---|---|
| `PaymentType` | `const object` | `functions/payment/types.ts` |
| `PlugPagPaymentType` | `type alias` | `functions/payment/types.ts` |
| `InstallmentType` | `const object` | `functions/payment/types.ts` |
| `PlugPagInstallmentType` | `type alias` | `functions/payment/types.ts` |
| `PlugPagPaymentRequest` | `interface` | `functions/payment/types.ts` |
| `PlugPagPaymentProgressEvent` | `interface` | `functions/payment/types.ts` |

### Tipos de Estorno

| Nome | Tipo | Origem |
|---|---|---|
| `PlugPagVoidType` | `const object` | `functions/refund/types.ts` |
| `PlugPagVoidTypeValue` | `type alias` | `functions/refund/types.ts` |
| `PlugPagRefundRequest` | `interface` | `functions/refund/types.ts` |

### Tipos de Impressão

| Nome | Tipo | Breaking change? | Origem |
|---|---|---|---|
| `PrintQuality` | `const object` | Não | `functions/print/types.ts` |
| `PrintQualityValue` | `type alias` | Não | `functions/print/types.ts` |
| `PrintRequest` | `interface` | **Sim** — `printerQuality?: PrintQualityValue` (era `number`) | `functions/print/types.ts` |
| `PrintResult` | `interface` | Não | `functions/print/types.ts` |
| `MIN_PRINTER_STEPS` | `const number` | Não | `functions/print/types.ts` |

### Tipos Compartilhados

| Nome | Tipo | Usado por | Origem |
|---|---|---|---|
| `PlugPagTransactionResult` | `interface` | `payment`, `refund` | `types/sharedTypes.ts` |

---

## Comportamento de Plataforma

### iOS — Nível 1 (não crasha, apenas avisa)

Ao importar a biblioteca em qualquer contexto iOS, a seguinte mensagem é emitida:

```
[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.
```

O app continua funcionando normalmente.

### iOS — Nível 2 (lança erro capturável)

Ao chamar qualquer função exportada em iOS:

```
[react-native-pagseguro-plugpag] ERROR: <methodName>() is not supported on iOS. PagSeguro PlugPag SDK is Android-only.
```

O erro é capturável via `try/catch` ou `.catch()`.

---

## Contrato de Import do Consumidor

Nenhum import externo precisa mudar após a refatoração:

```typescript
// Antes e depois: idêntico para o consumidor
import {
  doPayment,
  doAsyncPayment,
  doRefund,
  printFromFile,
  reprintCustomerReceipt,
  doAsyncReprintCustomerReceipt,
  reprintEstablishmentReceipt,
  doAsyncReprintEstablishmentReceipt,
  initializeAndActivatePinPad,
  doAsyncInitializeAndActivatePinPad,
  subscribeToPaymentProgress,
  usePaymentProgress,
  PaymentType,
  InstallmentType,
  PrintQuality,
  PlugPagVoidType,
  MIN_PRINTER_STEPS,
} from 'react-native-pagseguro-plugpag';

import type {
  PlugPagPaymentRequest,
  PlugPagTransactionResult,
  PlugPagRefundRequest,
  PlugPagPaymentProgressEvent,
  PrintRequest,
  PrintResult,
  PlugPagActivationSuccess,
  PlugPagPaymentType,
  PlugPagInstallmentType,
  PlugPagVoidTypeValue,
  PrintQualityValue,
} from 'react-native-pagseguro-plugpag';
```

**Único breaking change intencional**: Código que passava `printerQuality` como número fora de `1–4` receberá erro de compilação (não erro de runtime).
