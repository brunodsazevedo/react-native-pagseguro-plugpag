# Data Model: Refatoração JS/TS — Clean Code & Separação de Domínios

**Feature**: `007-ts-domain-split` | **Date**: 2026-03-29

Este documento mapeia todos os tipos TypeScript do projeto, seu domínio de origem, sua localização após a refatoração, e as regras de validação associadas.

---

## Tipos Compartilhados (`src/types/`)

### `PlugPagTransactionResult` → `src/types/sharedTypes.ts`

Resultado de transação financeira. Compartilhado por `payment` e `refund` (ver research.md §R5).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `transactionCode` | `string \| null` | ✅ | Código da transação retornado pelo SDK |
| `transactionId` | `string \| null` | ✅ | ID da transação retornado pelo SDK |
| `date` | `string \| null` | ✅ | Data no formato `YYYYMMDD` |
| `time` | `string \| null` | ✅ | Hora no formato `HHmmss` |
| `hostNsu` | `string \| null` | ✅ | NSU do host |
| `cardBrand` | `string \| null` | ✅ | Bandeira do cartão |
| `bin` | `string \| null` | ✅ | Primeiros 6 dígitos do cartão (BIN) |
| `holder` | `string \| null` | ✅ | Nome truncado do portador |
| `userReference` | `string \| null` | ✅ | Referência do comerciante |
| `terminalSerialNumber` | `string \| null` | ✅ | Número de série do terminal |
| `amount` | `string \| null` | ✅ | Valor em centavos (string) |
| `availableBalance` | `string \| null` | ✅ | Saldo disponível (débito/pré-pago) |
| `nsu` | `string \| null` | ❌ | NSU local (opcional) |
| `cardApplication` | `string \| null` | ❌ | Aplicação EMV do cartão |
| `label` | `string \| null` | ❌ | Label EMV da aplicação |
| `holderName` | `string \| null` | ❌ | Nome completo do portador |
| `extendedHolderName` | `string \| null` | ❌ | Nome estendido do portador |
| `autoCode` | `string \| null` | ❌ | Código de autorização |

**Validação**: Sem validação em runtime — todos os campos são preenchidos pelo SDK e mapeados via type assertion segura.

---

## Domínio `activation` → `src/functions/activation/`

### `PlugPagActivationSuccess` → `types.ts`

Resultado de sucesso da ativação do PinPad.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `result` | `'ok'` | ✅ | Literal fixo indicando sucesso |

**Validação**: Sem validação de entrada — parâmetro de ativação é `activationCode: string` (validado pelo SDK).

---

## Domínio `payment` → `src/functions/payment/`

### `PaymentType` (const object) → `types.ts`

Tipos de pagamento suportados.

| Chave | Valor | Descrição |
|---|---|---|
| `CREDIT` | `'CREDIT'` | Pagamento no crédito |
| `DEBIT` | `'DEBIT'` | Pagamento no débito |
| `PIX` | `'PIX'` | Pagamento via PIX |

**Tipo derivado**: `PlugPagPaymentType = 'CREDIT' | 'DEBIT' | 'PIX'`

---

### `InstallmentType` (const object) → `types.ts`

Modalidades de parcelamento.

| Chave | Valor | Descrição |
|---|---|---|
| `A_VISTA` | `'A_VISTA'` | À vista (sem parcelamento) |
| `PARC_VENDEDOR` | `'PARC_VENDEDOR'` | Parcelado pelo lojista |
| `PARC_COMPRADOR` | `'PARC_COMPRADOR'` | Parcelado pelo comprador |

**Tipo derivado**: `PlugPagInstallmentType = 'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'`

---

### `PlugPagPaymentRequest` → `types.ts`

Dados de entrada para uma operação de pagamento.

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `type` | `PlugPagPaymentType` | ✅ | — |
| `amount` | `number` | ✅ | Deve ser `> 0` |
| `installmentType` | `PlugPagInstallmentType` | ✅ | PIX e DEBIT exigem `A_VISTA` |
| `installments` | `number` | ✅ | Mínimo `1`; mínimo `2` se `PARC_VENDEDOR` ou `PARC_COMPRADOR` |
| `userReference` | `string` | ❌ | Máximo 10 caracteres quando presente |
| `printReceipt` | `boolean` | ❌ | — |

**Regras de validação em runtime** (`validatePaymentRequest` — privado em `index.ts`):
1. `amount <= 0` → erro
2. `installments < 1` → erro
3. `(installmentType === 'PARC_VENDEDOR' || 'PARC_COMPRADOR') && installments < 2` → erro
4. `(type === 'PIX' || 'DEBIT') && installmentType !== 'A_VISTA'` → erro
5. `userReference !== undefined && userReference.length > 10` → erro

---

### `PlugPagPaymentProgressEvent` → `types.ts`

Evento de progresso emitido pelo SDK durante uma operação de pagamento.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `eventCode` | `number` | ✅ | Código do evento (definido pelo SDK) |
| `customMessage` | `string \| null` | ✅ | Mensagem customizada do SDK |

---

## Domínio `refund` → `src/functions/refund/`

### `PlugPagVoidType` (const object) → `types.ts`

Tipos de estorno suportados.

| Chave | Valor | Descrição |
|---|---|---|
| `VOID_PAYMENT` | `'VOID_PAYMENT'` | Estorno de pagamento |
| `VOID_QRCODE` | `'VOID_QRCODE'` | Estorno de QR Code |

**Tipo derivado**: `PlugPagVoidTypeValue = 'VOID_PAYMENT' | 'VOID_QRCODE'`

---

### `PlugPagRefundRequest` → `types.ts`

Dados de entrada para uma operação de estorno.

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `transactionCode` | `string` | ✅ | Não pode ser vazio (`.trim() === ''`) |
| `transactionId` | `string` | ✅ | Não pode ser vazio (`.trim() === ''`) |
| `voidType` | `PlugPagVoidTypeValue` | ✅ | Deve ser um dos valores de `PlugPagVoidType` |
| `printReceipt` | `boolean` | ❌ | — |

**Regras de validação em runtime** (`validateRefundRequest` — privado em `index.ts`):
1. `transactionCode.trim() === ''` → erro
2. `transactionId.trim() === ''` → erro
3. `!Object.values(PlugPagVoidType).includes(voidType)` → erro

---

## Domínio `print` → `src/functions/print/`

### `PrintQuality` (const object) → `types.ts`

Níveis de qualidade de impressão.

| Chave | Valor numérico | Descrição |
|---|---|---|
| `LOW` | `1` | Baixa qualidade |
| `MEDIUM` | `2` | Qualidade média |
| `HIGH` | `3` | Alta qualidade |
| `MAX` | `4` | Qualidade máxima |

**Tipo derivado**: `PrintQualityValue = 1 | 2 | 3 | 4`

**Constante associada**: `MIN_PRINTER_STEPS = 70`

---

### `PrintRequest` → `types.ts`

Dados de entrada para uma operação de impressão.

| Campo | Tipo | Obrigatório | Antes | Depois | Validação |
|---|---|---|---|---|---|
| `filePath` | `string` | ✅ | `string` | `string` | Não pode ser vazio (`.trim() === ''`) |
| `printerQuality` | `PrintQualityValue` | ❌ | `number` ⚠️ | `PrintQualityValue` ✅ | Removida (coberta por compile time) |
| `steps` | `number` | ❌ | `number` | `number` | Deve ser `>= 0` quando presente |

**Breaking change**: `printerQuality?: number` → `printerQuality?: PrintQualityValue`. Consumidores que passavam valores fora de `1–4` recebem erro de compilação.

---

### `PrintResult` → `types.ts`

Resultado de uma operação de impressão.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `result` | `'ok'` | ✅ | Literal fixo indicando sucesso |
| `steps` | `number` | ✅ | Número de steps executados pela impressora |

---

## Diagrama de Relacionamentos

```
src/types/
└── PlugPagTransactionResult
        ↑ usado por
        ├── functions/payment/index.ts (doPayment, doAsyncPayment)
        └── functions/refund/index.ts (doRefund)

functions/payment/types.ts
├── PaymentType (const)
├── PlugPagPaymentType (derived)
├── InstallmentType (const)
├── PlugPagInstallmentType (derived)
├── PlugPagPaymentRequest
└── PlugPagPaymentProgressEvent
        ↑ usado por
        ├── functions/payment/index.ts (doPayment, doAsyncPayment, subscribeToPaymentProgress)
        └── hooks/usePaymentProgress.ts (via import de ../functions/payment/types)

functions/activation/types.ts
└── PlugPagActivationSuccess
        ↑ usado por
        └── functions/activation/index.ts

functions/refund/types.ts
├── PlugPagVoidType (const)
├── PlugPagVoidTypeValue (derived)
└── PlugPagRefundRequest
        ↑ usado por
        └── functions/refund/index.ts

functions/print/types.ts
├── PrintQuality (const)
├── PrintQualityValue (derived)
├── PrintRequest
├── PrintResult
└── MIN_PRINTER_STEPS (const)
        ↑ usado por
        └── functions/print/index.ts
```
