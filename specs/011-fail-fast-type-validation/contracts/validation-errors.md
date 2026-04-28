# Contrato: Erros de Validação de Tipos

**Feature**: `bugfix/011-fail-fast-type-validation`
**Escopo**: Erros lançados pela camada de validação TypeScript antes de qualquer chamada nativa

## Formato Canônico de Mensagem (FR-005)

```
[react-native-pagseguro-plugpag] ERROR: <method>() — <field> "<receivedValue>" is not valid. Accepted values: <v1>, <v2>, ..., <vN>.
```

- `<receivedValue>` é sempre o valor recebido como string (`String(value)`)
- `<list>` é sempre os valores aceitos separados por vírgula e espaço

## Erros por Domínio

### Payment — `doPayment()` e `doAsyncPayment()`

| Campo | Valores inválidos | Mensagem (trecho) |
|---|---|---|
| `type` | Qualquer valor fora de `CREDIT`, `DEBIT`, `PIX` | `type "<value>" is not valid. Accepted values: CREDIT, DEBIT, PIX.` |
| `installmentType` | Qualquer valor fora de `A_VISTA`, `PARC_VENDEDOR`, `PARC_COMPRADOR` | `installmentType "<value>" is not valid. Accepted values: A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR.` |

**Exemplos de valores rejeitados:**
- `type: "credit"` → `type "credit" is not valid. Accepted values: CREDIT, DEBIT, PIX.`
- `type: "INVALID"` → `type "INVALID" is not valid. Accepted values: CREDIT, DEBIT, PIX.`
- `type: null` → `type "null" is not valid. Accepted values: CREDIT, DEBIT, PIX.`
- `type: undefined` → `type "undefined" is not valid. Accepted values: CREDIT, DEBIT, PIX.`
- `installmentType: "PARCELADO"` → `installmentType "PARCELADO" is not valid. Accepted values: A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR.`

**Comportamento consistente entre variantes:**
- `doPayment()` e `doAsyncPayment()` usam a mesma função `validatePaymentRequest` — o
  comportamento de rejeição é idêntico em ambas as variantes (FR-007).

### Refund — `doRefund()`

| Campo | Valores inválidos | Mensagem (trecho) |
|---|---|---|
| `voidType` | Qualquer valor fora de `VOID_PAYMENT`, `VOID_QRCODE` | `voidType "<value>" is not valid. Accepted values: VOID_PAYMENT, VOID_QRCODE.` |

**Exemplos de valores rejeitados:**
- `voidType: "ESTORNO"` → `voidType "ESTORNO" is not valid. Accepted values: VOID_PAYMENT, VOID_QRCODE.`
- `voidType: "VOID"` → `voidType "VOID" is not valid. Accepted values: VOID_PAYMENT, VOID_QRCODE.`

## Tipo do Erro

Todos os erros de validação são instâncias de `Error` nativo (não `reject` com código).
Não há código de erro estruturado (sem `.code` property) — consistente com as validações
existentes de `amount`, `installments`, etc.

O prefixo `[react-native-pagseguro-plugpag] ERROR:` é mandatório e preservado para
grep-ability (conforme Constituição Princípio VI).

## Ordem de Precedência

Quando múltiplos campos são inválidos, o primeiro erro na sequência de validação
(conforme `data-model.md`) é lançado. O integrador corrige um campo por vez — fail-fast
por campo, não validação em lote.

## Fluxo de Validação (payment)

```
doPayment(data) ou doAsyncPayment(data)
  │
  ├─ iOS guard (Nível 2) → throw iOS error
  │
  └─ validatePaymentRequest(data)
       ├─ type inválido → throw  ← NOVO
       ├─ installmentType inválido → throw  ← NOVO
       ├─ amount ≤ 0 → throw
       ├─ installments < 1 → throw
       ├─ PARC × installments < 2 → throw
       ├─ PIX/DEBIT × não-A_VISTA → throw
       └─ userReference > 10 chars → throw
       └─ [válido] → getNativeModule().doPayment(data)
```
