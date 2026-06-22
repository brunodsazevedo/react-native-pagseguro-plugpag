# Phase 1 — Public API Contract: `maxTimeShowPopup`

A biblioteca é Android-only e expõe sua API via funções TypeScript tipadas em `src/index.ts`.
Esta feature é **aditiva e não-breaking**: nenhuma assinatura de função muda; apenas um campo
opcional é adicionado aos tipos de request. A spec TurboModule
(`NativePagseguroPlugpag.ts`) permanece **inalterada** (métodos já recebem `Object`), portanto
**não há regeneração de codegen**.

## Tipos (após a mudança)

```typescript
// src/functions/payment/types.ts
export interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
  /** Tempo máximo de exibição do popup de impressão, em segundos. Inteiro >= 0. */
  maxTimeShowPopup?: number;
}

// src/functions/refund/types.ts
export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;
  printReceipt?: boolean;
  /** Tempo máximo de exibição do popup de impressão, em segundos. Inteiro >= 0. */
  maxTimeShowPopup?: number;
}
```

## Assinaturas (inalteradas)

```typescript
doPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>;
doAsyncPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>;
doRefund(data: PlugPagRefundRequest): Promise<PlugPagTransactionResult>;
```

## Contrato de comportamento

| # | Condição | Resultado esperado |
|---|---|---|
| C1 | `maxTimeShowPopup: 10` em `doPayment`/`doAsyncPayment`/`doRefund` | Valor aplicado ao layout antes da operação; popup fecha automaticamente em até 10s. |
| C2 | Campo omitido | Comportamento atual idêntico; nenhum layout aplicado. |
| C3 | `maxTimeShowPopup: 0` | Aceito; equivale ao default do SDK (popup indefinido). |
| C4 | `maxTimeShowPopup: -1` | Rejeita com `Error` prefixado `[react-native-pagseguro-plugpag] ERROR:` antes de qualquer chamada nativa. |
| C5 | `maxTimeShowPopup: 1.5` | Rejeita com a mesma mensagem `ERROR:`. |
| C6 | Plataforma iOS (campo presente ou não) | Rejeita com `ERROR:` — guard de plataforma precede a validação do campo. |
| C7 | Falha ao aplicar o layout no nativo | `Promise` rejeitada com `PLUGPAG_INTERNAL_ERROR`; sem fallback silencioso. |

## Mensagens de erro (prefixos preservados — grep-ability)

- Validação do campo: `[react-native-pagseguro-plugpag] ERROR: doPayment() — maxTimeShowPopup must be an integer >= 0.`
  (análogo para `doAsyncPayment()` e `doRefund()`)
- Guard iOS: `[react-native-pagseguro-plugpag] ERROR: <método>() is not available on iOS. PagSeguro PlugPag SDK is Android-only.`
- Falha nativa: código `PLUGPAG_INTERNAL_ERROR` (result: -1, errorCode: "INTERNAL_ERROR").
