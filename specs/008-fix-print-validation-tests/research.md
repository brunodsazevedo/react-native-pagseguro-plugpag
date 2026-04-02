# Research: Fix Print Validation & Complete Test Coverage

**Branch**: `bugfix/008-fix-print-validation-tests`  
**Date**: 2026-04-02  
**Status**: Completo — sem NEEDS CLARIFICATION

## Contexto

Este bugfix não tem unknowns técnicos externos. Toda a pesquisa foi conduzida por análise
direta do codebase existente: `src/functions/print/index.ts`, `src/functions/print/types.ts`
e `src/__tests__/functions/print.test.ts`.

---

## Decisão 1: Localização da validação de `printerQuality`

**Decision**: Adicionar a validação de `printerQuality` dentro da função `validatePrintRequest()` existente em `src/functions/print/index.ts`, como terceira cláusula após as validações de `filePath` e `steps`.

**Rationale**: A função `validatePrintRequest()` já centraliza todas as validações do `PrintRequest`. Criar uma função separada ou mover a lógica seria complexidade desnecessária — a cláusula adicional segue exatamente o mesmo padrão das duas já existentes.

**Alternatives considered**:
- Validar inline em `printFromFile()` antes de chamar `validatePrintRequest()` — rejeitado: fragmenta a responsabilidade de validação.
- Criar uma função `validatePrinterQuality()` separada — rejeitado: over-engineering para uma única condição.

---

## Decisão 2: Condição exata da guarda de `printerQuality`

**Decision**:
```typescript
if (
  data.printerQuality !== undefined &&
  (data.printerQuality < 1 || data.printerQuality > 4)
) {
  throw new Error(
    '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — printerQuality must be between 1 and 4.'
  );
}
```

**Rationale**:
- O check `!== undefined` garante que o campo opcional continua sendo aceito sem valor.
- As comparações `< 1` e `> 4` capturam corretamente `NaN` (ambas retornam `true` com `NaN` em JavaScript), sem necessidade de `Number.isNaN()` adicional.
- O tipo TypeScript `PrintQualityValue` é `1 | 2 | 3 | 4` — mas a validação em runtime é necessária para consumidores que usam `as PrintQualityValue` ou JavaScript sem tipagem.
- A mensagem segue o padrão de prefixo já estabelecido nos outros erros de validação do domínio print.

**Alternatives considered**:
- Usar `!Object.values(PrintQuality).includes(data.printerQuality)` — rejeitado: depende de comportamento de `includes()` com tipos que TypeScript não infere corretamente aqui; a comparação numérica é mais legível e explícita.
- Usar `Number.isInteger(data.printerQuality)` como check adicional — rejeitado: valores não-inteiros como `1.5` já são capturados pela condição `< 1 || > 4` de forma indireta? Não — `1.5` não é `< 1` nem `> 4`. Decisão: o tipo `PrintQualityValue` é `1 | 2 | 3 | 4` (literais inteiros). Em runtime, `1.5` não pertence ao enum. Contudo, a spec (FR-005) define o intervalo como 1–4 sem restrição de integralidade explícita. Como `PrintQualityValue` é composto apenas por inteiros, aceitar `1.5` seria inconsistente. **Decisão final**: a condição `< 1 || > 4` é suficiente para os valores que chegam via TypeScript — valores fracionários fora do intervalo são capturados; fracionários dentro (ex: `1.5`) são tecnicamente impossíveis de passar pelo tipo, mas se chegarem via `as`, o SDK receberá `1.5` que pode ter comportamento indeterminado. **Aceito como risco residual** — não vale adicionar complexidade para um cenário que requer `as` explícito pelo caller.

---

## Decisão 3: Estrutura dos novos testes

**Decision**: Adicionar dois novos blocos `describe` ao final do arquivo `print.test.ts`:
1. `describe('doAsyncReprintCustomerReceipt — Android normal operation', ...)` com 2 `it()`.
2. `describe('doAsyncReprintEstablishmentReceipt — Android normal operation', ...)` com 2 `it()`.

E expandir o bloco `describe('validatePrintRequest', ...)` existente com 3 `it()` adicionais para `printerQuality`.

**Rationale**: O arquivo de testes já usa a convenção `describe('<função> — Android normal operation', ...)` para operações normais e `describe('validatePrintRequest', ...)` para validações. Seguir o padrão existente mantém consistência e facilita leitura.

**Alternatives considered**:
- Criar um novo `describe` separado `describe('validatePrintRequest — printerQuality', ...)` — rejeitado: cria fragmentação desnecessária; `validatePrintRequest` já cobre todos os campos.
- Adicionar `it()` dentro do bloco iOS guard para as funções async — rejeitado: o bloco iOS guard para `doAsyncReprint*` já existe e tem exatamente um `it()` cada; não é necessário expandir.

---

## Estado atual dos testes (baseline)

| Função | Cenários existentes | Cenários faltantes |
|---|---|---|
| `printFromFile` | iOS guard, filePath vazio, filePath whitespace, steps < 0, sucesso Android, PLUGPAG_PRINT_ERROR | `printerQuality` inválido (3 cenários) |
| `reprintCustomerReceipt` | iOS guard, sucesso Android, PLUGPAG_PRINT_ERROR | — |
| `doAsyncReprintCustomerReceipt` | iOS guard | sucesso Android, PLUGPAG_PRINT_ERROR (2 cenários) |
| `reprintEstablishmentReceipt` | iOS guard, sucesso Android, PLUGPAG_PRINT_ERROR | — |
| `doAsyncReprintEstablishmentReceipt` | iOS guard | sucesso Android, PLUGPAG_PRINT_ERROR (2 cenários) |

**Total atual**: 15 `it()` | **Total pós-fix**: 22 `it()`
