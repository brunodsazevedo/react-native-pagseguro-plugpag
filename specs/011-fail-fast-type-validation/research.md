# Research: Fail-Fast em Tipos de Pagamento, Parcelamento e Estorno

**Feature**: `bugfix/011-fail-fast-type-validation`
**Date**: 2026-04-28

## Decisões Técnicas

### Decisão 1 — Fonte de verdade para valores válidos

**Decision**: Usar `Object.values(PaymentType)`, `Object.values(InstallmentType)` e
`Object.values(PlugPagVoidType)` — derivados dos const objects já definidos em `types.ts`.

**Rationale**: Mantém DRY. Os const objects são a fonte de verdade canônica; duplicar
as strings em arrays inline cria risco de divergência silenciosa se os tipos evoluírem.

**Alternatives considered**:
- Arrays inline `['CREDIT', 'DEBIT', 'PIX']` — rejeitado por duplicação com `types.ts`.
- `Set<string>` — descartado por overhead desnecessário; `Array.includes` é suficiente.

---

### Decisão 2 — Pattern de exportação para tornar const objects disponíveis como valores

**Decision**: Converter `export { X } from './types'` para `import { X } from './types'`
+ `export { X }` nos arquivos `payment/index.ts` e `refund/index.ts`.

**Rationale**: `export { X } from './types'` re-exporta mas NÃO coloca `X` no escopo do
módulo. Para chamar `Object.values(X)`, o valor precisa estar disponível como binding
local. Separar em `import` + `export` é o padrão idiomático TypeScript para isso.

**Alternatives considered**:
- `import * as Types from './types'; Types.PaymentType` — rejeitado; cria namespace
  desnecessário, viola convenção de import do projeto.
- Inline arrays sem const object — rejeitado (ver Decisão 1).

---

### Decisão 3 — Formato de mensagem de erro (FR-005)

**Decision**: Template unificado:
```
[react-native-pagseguro-plugpag] ERROR: <method>() — <field> "<value>" is not valid. Accepted values: <list>.
```
Exemplo: `type "INVALIDO" is not valid. Accepted values: CREDIT, DEBIT, PIX.`

**Rationale**: Inclui (a) valor inválido recebido e (b) lista de valores aceitos — critérios
explícitos de FR-005. O integrador pode identificar e corrigir o problema sem consultar
documentação externa.

**Alternatives considered**:
- Mensagem em português — rejeitado; mensagens de erro do projeto estão em inglês (consistência).
- Apenas listar valores sem incluir o valor recebido — rejeitado; viola FR-005.

---

### Decisão 4 — Posição da validação de tipo no pipeline de validação

**Decision**: As validações de `type` e `installmentType` são inseridas **antes** das
validações existentes (amount, installments, cross-validation) em `validatePaymentRequest`.

**Rationale**: Fail-fast. Um `type` inválido torna as validações subsequentes (especialmente
as cross-validations PIX/DEBIT ↔ A_VISTA) semanticamente sem sentido. Rejeitar o tipo
primeiro dá ao integrador o erro mais relevante diretamente.

---

### Decisão 5 — Escopo de mudança: sem alteração nativa

**Decision**: Zero alterações em `NativePagseguroPlugpag.ts`, `PagseguroPlugpagModule.kt`,
ou qualquer arquivo nativo.

**Rationale**: A validação intercepta requisições **antes** de chegarem ao TurboModule.
Codegen não é necessário. A feature é um bugfix puro da camada TypeScript.

**Impact**: Sem necessidade de `generateCodegenArtifactsFromSchema`.

---

### Decisão 6 — Comportamento para null/undefined

**Decision**: null e undefined são rejeitados com a mesma mensagem de erro — eles não
fazem parte do conjunto de valores válidos. `String(null)` → `"null"`, `String(undefined)`
→ `"undefined"` — a mensagem de erro permanece descritiva mesmo para esses casos.

**Rationale**: Edge case explícito na spec. O sistema não faz normalização silenciosa nem
fallback.

---

## Arquivos Impactados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/functions/payment/index.ts` | Adicionar validações de `type` e `installmentType`; converter re-export para import+export |
| `src/functions/refund/index.ts` | Melhorar mensagem de erro de `voidType`; converter re-export para import+export |
| `src/__tests__/functions/payment.test.ts` | Adicionar testes para `type` inválido e `installmentType` inválido |
| `src/__tests__/functions/refund.test.ts` | Atualizar teste de `voidType` inválido para verificar valor na mensagem |

## Arquivos NÃO Impactados

- `NativePagseguroPlugpag.ts` — sem alteração de spec
- `src/functions/payment/types.ts` — sem novos tipos
- `src/functions/refund/types.ts` — sem novos tipos
- `PagseguroPlugpagModule.kt` — sem alteração nativa
- `src/index.ts` — sem alteração de barrel
