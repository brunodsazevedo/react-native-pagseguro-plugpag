# Data Model: Fail-Fast em Tipos de Pagamento, Parcelamento e Estorno

**Feature**: `bugfix/011-fail-fast-type-validation`
**Date**: 2026-04-28

## Entidades Impactadas

Esta feature não introduz novas entidades ou tipos. As entidades existentes permanecem
inalteradas — a mudança é exclusivamente comportamental (validação).

### Entidade: PlugPagPaymentRequest (existente, sem alteração de tipo)

```typescript
// src/functions/payment/types.ts — SEM ALTERAÇÃO
interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;            // "CREDIT" | "DEBIT" | "PIX"
  amount: number;
  installmentType: PlugPagInstallmentType; // "A_VISTA" | "PARC_VENDEDOR" | "PARC_COMPRADOR"
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
}
```

**Mudança**: A validação em runtime passa a rejeitar explicitamente qualquer valor de
`type` ou `installmentType` que não pertença ao conjunto válido, incluindo o valor
inválido recebido na mensagem de erro.

### Entidade: PlugPagRefundRequest (existente, sem alteração de tipo)

```typescript
// src/functions/refund/types.ts — SEM ALTERAÇÃO
interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;      // "VOID_PAYMENT" | "VOID_QRCODE"
  printReceipt?: boolean;
}
```

**Mudança**: A mensagem de erro para `voidType` inválido passa a incluir o valor recebido
e a lista de valores aceitos (melhoria de FR-005).

## Regras de Validação — Estado Após o Bugfix

### validatePaymentRequest (ordem de execução)

| Ordem | Campo | Regra | Mensagem de erro |
|---|---|---|---|
| 1 | `type` | Deve pertencer a `{CREDIT, DEBIT, PIX}` | `type "<valor>" is not valid. Accepted values: CREDIT, DEBIT, PIX.` |
| 2 | `installmentType` | Deve pertencer a `{A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR}` | `installmentType "<valor>" is not valid. Accepted values: A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR.` |
| 3 | `amount` | Deve ser > 0 | `amount must be > 0.` |
| 4 | `installments` | Deve ser ≥ 1 | `installments must be >= 1.` |
| 5 | `installmentType` × `installments` | PARC_VENDEDOR/PARC_COMPRADOR exigem ≥ 2 | `installments must be >= 2 when installmentType is ...` |
| 6 | `type` × `installmentType` | PIX e DEBIT exigem A_VISTA | `PIX and DEBIT payments must use installmentType A_VISTA.` |
| 7 | `userReference` | Se presente, máximo 10 caracteres | `userReference must be at most 10 characters.` |

### validateRefundRequest (ordem de execução)

| Ordem | Campo | Regra | Mensagem de erro |
|---|---|---|---|
| 1 | `transactionCode` | Não pode ser vazio | `transactionCode must not be empty.` |
| 2 | `transactionId` | Não pode ser vazio | `transactionId must not be empty.` |
| 3 | `voidType` | Deve pertencer a `{VOID_PAYMENT, VOID_QRCODE}` | `voidType "<valor>" is not valid. Accepted values: VOID_PAYMENT, VOID_QRCODE.` |

## Invariante de Design

Todos os conjuntos de valores válidos são derivados de `Object.values()` sobre os const
objects (`PaymentType`, `InstallmentType`, `PlugPagVoidType`) definidos em `types.ts`.
Os const objects são a **única fonte de verdade** — nenhum array inline duplica esses valores.
