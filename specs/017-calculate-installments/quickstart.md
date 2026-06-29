# Quickstart — `calculateInstallments`

Consultar as opções de parcelamento de uma venda **antes** de chamar `doPayment`, para montar
sua própria UI de seleção de parcelas.

> Android-only (terminais PagBank SmartPOS). Em iOS, qualquer chamada rejeita com erro prefixado.

## Uso básico

```typescript
import {
  calculateInstallments,
  InstallmentType,
} from 'react-native-pagseguro-plugpag';

async function carregarParcelas() {
  try {
    const { options } = await calculateInstallments({
      amount: 10000, // R$ 100,00 em centavos
      installmentType: InstallmentType.PARC_COMPRADOR,
    });

    // options pode ser [] (resultado válido — sem opções de parcelamento)
    options.forEach((opt) => {
      console.log(
        `${opt.quantity}x de ${opt.amount} (total: ${opt.total}) — valores em centavos`
      );
    });
  } catch (e) {
    // iOS, validação inválida, PLUGPAG_INSTALLMENTS_ERROR ou PLUGPAG_INTERNAL_ERROR
    console.error(e);
  }
}
```

## Parâmetros

| Campo | Tipo | Regra |
|---|---|---|
| `amount` | `number` | Centavos, **inteiro > 0**. `0`, negativo ou fração (`10.5`) → rejeita. |
| `installmentType` | `PlugPagInstallmentType` | `A_VISTA` \| `PARC_VENDEDOR` \| `PARC_COMPRADOR`. |

## Retorno

```typescript
{
  options: [
    { quantity: 1, amount: 10000, total: 10000 },
    { quantity: 2, amount: 5000,  total: 10000 },
    // ...
  ];
}
```

Cada `amount`/`total` em **centavos**.

## Fluxo típico (PDV)

```typescript
// 1. Consultar parcelas para montar a UI
const { options } = await calculateInstallments({
  amount: valorVenda,
  installmentType: InstallmentType.PARC_COMPRADOR,
});

// 2. Usuário escolhe uma opção na sua UI
const escolhida = options[indiceSelecionado];

// 3. Iniciar o pagamento com a quantidade escolhida
await doPayment({
  type: PaymentType.CREDIT,
  amount: valorVenda,
  installmentType: InstallmentType.PARC_COMPRADOR,
  installments: escolhida.quantity,
});
```

## Erros possíveis

| Situação | Resultado |
|---|---|
| iOS | `Error` prefixado `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() ...` |
| `amount` inválido | `Error` — `amount must be an integer > 0.` |
| `installmentType` inválido | `Error` — lista os valores aceitos |
| Erro do SDK | rejeição com code `PLUGPAG_INSTALLMENTS_ERROR` |
| Outra exceção nativa | rejeição com code `PLUGPAG_INTERNAL_ERROR` |

## Verificação rápida (dev)

```bash
yarn lint && yarn typecheck && yarn test
# Após alterar a Spec, regenerar o codegen:
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```
