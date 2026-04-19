# Quickstart: Feature 005 — Estorno de Pagamento (doRefund)

**Branch**: `feature/005-refund-payment` | **Date**: 2026-03-28

---

## Como usar `doRefund`

```typescript
import {
  doRefund,
  PlugPagVoidType,
  usePaymentProgress,
  type PlugPagRefundRequest,
  type PlugPagTransactionResult,
  type PlugPagPaymentProgressEvent,
} from 'react-native-pagseguro-plugpag';

// transactionCode e transactionId obtidos previamente de doPayment()
const refundRequest: PlugPagRefundRequest = {
  transactionCode: '12345',       // obrigatório
  transactionId:   '67890',       // obrigatório
  voidType:        PlugPagVoidType.VOID_PAYMENT, // VOID_PAYMENT = cartão | VOID_QRCODE = PIX
  printReceipt:    false,         // opcional, default false
};

// Acompanhar progresso (opcional)
usePaymentProgress((event: PlugPagPaymentProgressEvent) => {
  console.log('Progresso:', event.eventCode, event.customMessage);
});

// Executar estorno
try {
  const result: PlugPagTransactionResult = await doRefund(refundRequest);
  console.log('Estorno aprovado:', result.transactionCode, result.transactionId);
} catch (error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const e = error as { code: string; userInfo: { result: number; errorCode: string; message: string } };
    if (e.code === 'PLUGPAG_REFUND_ERROR') {
      console.error('Estorno rejeitado pelo terminal:', e.userInfo.message);
    } else if (e.code === 'PLUGPAG_INTERNAL_ERROR') {
      console.error('Erro interno:', e.userInfo.message);
    }
  }
}
```

---

## Estorno de PIX

```typescript
const pixRefundRequest: PlugPagRefundRequest = {
  transactionCode: result.transactionCode!, // do PlugPagTransactionResult do PIX original
  transactionId:   result.transactionId!,
  voidType:        PlugPagVoidType.VOID_QRCODE, // obrigatório para PIX
};

const refundResult = await doRefund(pixRefundRequest);
```

> **Atenção**: usar `VOID_PAYMENT` em uma transação PIX causa erro do SDK. O `voidType` deve
> corresponder ao tipo da transação original.

---

## Validações automáticas (antes de acionar o terminal)

```typescript
// Estes erros são lançados ANTES de qualquer chamada nativa:

await doRefund({ transactionCode: '', transactionId: '123', voidType: 'VOID_PAYMENT' });
// ❌ Error: doRefund() — transactionCode must not be empty.

await doRefund({ transactionCode: '123', transactionId: '', voidType: 'VOID_PAYMENT' });
// ❌ Error: doRefund() — transactionId must not be empty.

await doRefund({ transactionCode: '123', transactionId: '456', voidType: 'INVALID' as any });
// ❌ Error: doRefund() — voidType must be PlugPagVoidType.VOID_PAYMENT or PlugPagVoidType.VOID_QRCODE.
```

---

## Campos adicionais em `PlugPagTransactionResult`

Com a feature/005, o `PlugPagTransactionResult` agora inclui campos adicionais (também
disponíveis no retorno de `doPayment`/`doAsyncPayment`):

```typescript
const result = await doRefund(refundRequest);

// Campos novos (podem ser null dependendo do firmware do terminal)
console.log(result.nsu);               // NSU da transação
console.log(result.cardApplication);   // AID EMV (ex: A0000000031010)
console.log(result.label);             // Label do cartão (ex: "Visa Credit")
console.log(result.holderName);        // Nome completo do portador
console.log(result.extendedHolderName); // Nome estendido do portador
console.log(result.autoCode);          // Código de autorização
```

---

## Notas de implementação

- **Sem `doAsyncRefund`**: o SDK 1.33.0 não oferece listener assíncrono para `voidPayment`. Não existe `PlugPagVoidPaymentListener`.
- **Eventos de progresso**: o canal `onPaymentProgress` já existente funciona automaticamente durante o estorno — sem mudanças necessárias.
- **Concorrência**: chamadas simultâneas de `doRefund` e `doPayment` são responsabilidade do consumidor. O terminal PagBank serializa operações por hardware.
