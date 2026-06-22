# Quickstart — `maxTimeShowPopup`

Controla o tempo máximo (em **segundos**) que o popup de impressão de comprovante fica visível
no terminal PagBank antes de fechar automaticamente — evitando que o `doPayment`/`doRefund`
fique travado aguardando o operador.

## Pagamento com timeout de popup

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 1000, // centavos
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
  printReceipt: true,
  maxTimeShowPopup: 10, // popup fecha sozinho após 10 segundos
});
```

## Variante assíncrona

```typescript
import { doAsyncPayment } from 'react-native-pagseguro-plugpag';

await doAsyncPayment({
  type: 'DEBIT',
  amount: 500,
  installmentType: 'A_VISTA',
  installments: 1,
  printReceipt: true,
  maxTimeShowPopup: 10, // mesmo comportamento da variante síncrona
});
```

## Estorno com timeout de popup

```typescript
import { doRefund, PlugPagVoidType } from 'react-native-pagseguro-plugpag';

await doRefund({
  transactionCode: 'ABC123',
  transactionId: '999',
  voidType: PlugPagVoidType.VOID_PAYMENT,
  printReceipt: true,
  maxTimeShowPopup: 10,
});
```

## Comportamento

- **Omitido**: nada muda — o popup aguarda o operador indefinidamente (comportamento atual).
- **`0`**: equivale ao default do SDK (popup indefinido).
- **`>= 1`**: popup fecha automaticamente após N segundos.
- **Inválido** (negativo ou não-inteiro): a chamada é rejeitada antes de qualquer interação com
  o terminal, com erro prefixado `[react-native-pagseguro-plugpag] ERROR:`.

## Validação rápida

```bash
yarn lint        # zero erros/avisos
yarn typecheck   # tipos OK
yarn test        # cenários: válido, omitido, 0, negativo, não-inteiro, iOS
```
