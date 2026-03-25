# Quickstart: Métodos de Pagamento

**Feature**: feature/003-payment-methods
**Date**: 2026-03-24

---

## Instalação

A feature/003 é parte da biblioteca `react-native-pagseguro-plugpag`. Nenhuma dependência adicional é necessária além das já instaladas na feature/001.

**Pré-requisito**: Terminal PagSeguro deve estar ativado via `initializeAndActivatePinPad` (feature/002) antes de chamar qualquer função de pagamento.

---

## Pagamento Crédito à Vista

```typescript
import {
  doPayment,
  PaymentType,
  InstallmentType,
  usePaymentProgress,
} from 'react-native-pagseguro-plugpag';

function CheckoutScreen() {
  usePaymentProgress((event) => {
    console.log('Progresso:', event.eventCode, event.customMessage);
  });

  async function handlePayment() {
    try {
      const result = await doPayment({
        type: PaymentType.CREDIT,
        amount: 10000, // R$ 100,00
        installmentType: InstallmentType.A_VISTA,
        installments: 1,
        userReference: 'ORDER-001',
        printReceipt: true,
      });
      console.log('Aprovado:', result.transactionCode);
    } catch (error: unknown) {
      const e = error as Error & { code?: string; userInfo?: { message: string } };
      console.error(e.code, e.userInfo?.message ?? e.message);
    }
  }
}
```

---

## Pagamento Crédito Parcelado

```typescript
const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 30000,                          // R$ 300,00
  installmentType: InstallmentType.PARC_VENDEDOR,
  installments: 3,
});
```

---

## Pagamento PIX

```typescript
const result = await doPayment({
  type: PaymentType.PIX,
  amount: 5000,                           // R$ 50,00
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
});
```

---

## Pagamento com Variante Assíncrona

```typescript
import { doAsyncPayment } from 'react-native-pagseguro-plugpag';

const result = await doAsyncPayment({
  type: PaymentType.CREDIT,
  amount: 10000,
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
});
```

---

## Eventos de Progresso — Fora de Componentes React

```typescript
import { subscribeToPaymentProgress, doPayment } from 'react-native-pagseguro-plugpag';

const unsubscribe = subscribeToPaymentProgress((event) => {
  store.setPaymentProgress(event);
});

try {
  const result = await doPayment({ /* ... */ });
  store.setResult(result);
} catch (error) {
  store.setError(error);
} finally {
  unsubscribe();
}
```

---

## Tratamento de Erros

```typescript
try {
  await doPayment(data);
} catch (error: unknown) {
  const e = error as Error & {
    code?: string;
    userInfo?: { result: number; errorCode: string; message: string };
  };

  if (e.code === 'PLUGPAG_PAYMENT_ERROR') {
    // Erro reportado pelo SDK (cartão recusado, timeout, etc.)
    console.error('SDK error:', e.userInfo?.errorCode, e.userInfo?.message);
  } else if (e.code === 'PLUGPAG_INTERNAL_ERROR') {
    // Falha interna inesperada
    console.error('Internal error:', e.userInfo?.message ?? e.message);
  } else {
    // Erro de validação JS (amount inválido, installments inválido, iOS, etc.)
    console.error('Validation error:', e.message);
  }
}
```

---

## Validações Automáticas (JS)

A biblioteca rejeita imediatamente (antes de chamar o nativo) nos seguintes casos:

| Caso | Mensagem |
|------|---------|
| `amount <= 0` | Erro de validação |
| `installments < 1` | Erro de validação |
| `PARC_*` com `installments < 2` | Erro de validação |
| `PIX` ou `DEBIT` com `installmentType` diferente de `'A_VISTA'` | Erro de validação |
| `userReference` com mais de 10 caracteres | Erro de validação |
| Chamada em iOS | `[react-native-pagseguro-plugpag] ERROR: ...` |

---

## Estrutura de Retorno (PlugPagTransactionResult)

```typescript
{
  transactionCode: string | null;     // Código único da transação
  transactionId: string | null;       // ID da transação
  date: string | null;                // Data (formato SDK)
  time: string | null;                // Hora (formato SDK)
  hostNsu: string | null;             // NSU do host
  cardBrand: string | null;           // Bandeira do cartão
  bin: string | null;                 // BIN do cartão (6 dígitos)
  holder: string | null;              // Nome do portador
  userReference: string | null;       // Referência informada
  terminalSerialNumber: string | null; // Serial do terminal
  amount: string | null;              // Valor aprovado
  availableBalance: string | null;    // Saldo disponível (débito)
}
```
