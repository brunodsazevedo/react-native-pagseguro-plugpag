# Phase 1 — Data Model: `calculateInstallments`

Tipos novos no domínio `payment` (`src/functions/payment/types.ts`). Todos `interface`
(Princípio II). Nenhum tipo compartilhado entre domínios → permanecem em `<domain>/types.ts`
(Type Placement Rule). Reutiliza `PlugPagInstallmentType` / `InstallmentType` existentes.

---

## Entidade: `CalculateInstallmentsRequest`

Requisição de cálculo de parcelas (entrada da função pública).

| Campo | Tipo | Obrigatório | Regra de validação (JS, fail-fast) |
|---|---|---|---|
| `amount` | `number` | sim | Inteiro estritamente `> 0` (centavos). `!(Number.isInteger(amount) && amount > 0)` → rejeita com `amount must be an integer > 0.` |
| `installmentType` | `PlugPagInstallmentType` | sim | Pertence a `Object.values(InstallmentType)` = `A_VISTA \| PARC_VENDEDOR \| PARC_COMPRADOR`. Caso contrário, rejeita listando os valores aceitos. |

```typescript
export interface CalculateInstallmentsRequest {
  amount: number;                          // centavos, inteiro > 0
  installmentType: PlugPagInstallmentType; // A_VISTA | PARC_VENDEDOR | PARC_COMPRADOR
}
```

---

## Entidade: `PlugPagInstallment`

Uma opção de parcelamento individual. Mapeada do `data class PlugPagInstallment(quantity, amount, total)`
do SDK 1.35.0.

| Campo | Tipo | Significado | Origem no SDK |
|---|---|---|---|
| `quantity` | `number` | Número de parcelas | `PlugPagInstallment.quantity: Int` |
| `amount` | `number` | Valor de **cada** parcela, em centavos | `PlugPagInstallment.amount: Int` |
| `total` | `number` | Total da transação, em centavos | `PlugPagInstallment.total: Int` |

```typescript
export interface PlugPagInstallment {
  quantity: number;  // número de parcelas
  amount: number;    // valor de CADA parcela, em centavos
  total: number;     // total da transação, em centavos
}
```

> **Nota de mapeamento Kotlin**: cada `PlugPagInstallment` do SDK → `WritableNativeMap` com
> `putInt("quantity")`, `putInt("amount")`, `putInt("total")`; agregados em
> `Arguments.createArray()` e embrulhados em `{ options: [...] }`.

---

## Entidade: `CalculateInstallmentsResult`

Resultado do cálculo (retorno da função pública).

| Campo | Tipo | Significado |
|---|---|---|
| `options` | `PlugPagInstallment[]` | Lista de opções de parcelamento. **Pode ser vazia** (resultado válido, não erro). |

```typescript
export interface CalculateInstallmentsResult {
  options: PlugPagInstallment[];
}
```

---

## Relacionamentos

```
CalculateInstallmentsRequest ──(calculateInstallments)──▶ CalculateInstallmentsResult
                                                                 │
                                                                 └─ options: PlugPagInstallment[]

CalculateInstallmentsRequest.installmentType : PlugPagInstallmentType  (reuso — sem novo enum)
```

## Transições de estado

N/A — operação stateless de consulta. Sem máquina de estados.

## Regras derivadas dos requisitos

- **FR-003 / D5**: `amount` inteiro `> 0` em checagem única (mesma mensagem para `0`, negativo,
  não-inteiro).
- **FR-004 / D6**: `installmentType` validado contra o enum existente; mensagem lista valores
  aceitos.
- **FR-006**: cada `PlugPagInstallment` sempre contém os 3 campos (`quantity`/`amount`/`total`).
- **FR-007 / D7**: `options` vazio é válido.
- **FR-011 / D4**: `amount` (centavos, inteiro) → `String` (`saleValue`) na camada nativa — não
  exposto ao consumidor.
