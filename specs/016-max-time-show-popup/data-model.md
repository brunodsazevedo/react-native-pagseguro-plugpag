# Phase 1 — Data Model: `maxTimeShowPopup`

A feature não introduz novas entidades; estende duas entidades de request existentes com um
campo escalar opcional, e mapeia para uma entidade do SDK no lado nativo.

## Entidade: Requisição de Pagamento (`PlugPagPaymentRequest`)

`src/functions/payment/types.ts` — usada por `doPayment` e `doAsyncPayment`.

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| type | `PlugPagPaymentType` | sim | (inalterado) |
| amount | `number` | sim | (inalterado) > 0 |
| installmentType | `PlugPagInstallmentType` | sim | (inalterado) |
| installments | `number` | sim | (inalterado) >= 1 |
| userReference | `string?` | não | (inalterado) <= 10 chars |
| printReceipt | `boolean?` | não | (inalterado) |
| **maxTimeShowPopup** | **`number?`** | **não** | **inteiro >= 0; em segundos** |

## Entidade: Requisição de Estorno (`PlugPagRefundRequest`)

`src/functions/refund/types.ts` — usada por `doRefund`.

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| transactionCode | `string` | sim | (inalterado) não-vazio |
| transactionId | `string` | sim | (inalterado) não-vazio |
| voidType | `PlugPagVoidTypeValue` | sim | (inalterado) |
| printReceipt | `boolean?` | não | (inalterado) |
| **maxTimeShowPopup** | **`number?`** | **não** | **inteiro >= 0; em segundos** |

## Regras de validação do campo (`maxTimeShowPopup`)

Aplicadas no lado JS, **após** o guard de plataforma e **antes** de qualquer chamada nativa:

1. **Omitido (`undefined`)** → válido. Nenhum layout é aplicado; comportamento atual preservado.
2. **Inteiro >= 0** → válido. `0` equivale ao default do SDK (popup aguarda indefinidamente).
3. **Negativo** → rejeita: `[react-native-pagseguro-plugpag] ERROR: <método>() — maxTimeShowPopup must be an integer >= 0.`
4. **Não-inteiro** (ex.: `1.5`) → rejeita com a mesma mensagem.

Predicado de aceitação: `value === undefined || (Number.isInteger(value) && value >= 0)`.

## Mapeamento nativo (entidade do SDK)

| Origem (JS request) | Destino (Kotlin / SDK) |
|---|---|
| `maxTimeShowPopup` presente | `PlugPagCustomPrinterLayout().apply { maxTimeShowPopup = data.getInt("maxTimeShowPopup") }` → `plugPag.setPlugPagCustomPrinterLayout(layout)` aplicado **antes** da operação |
| `maxTimeShowPopup` ausente (`!data.hasKey(...)`) | nenhuma chamada de layout (comportamento atual) |

Sem conversão de unidade — o inteiro (segundos) é repassado cru (FR-005).

## Estados / transições

Não há máquina de estados. O campo é uma configuração one-shot aplicada por transação; não
persiste entre operações (premissa confirmada na spec).
