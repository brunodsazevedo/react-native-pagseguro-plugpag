# Phase 1 — Data Model: Upgrade PlugPagServiceWrapper 1.33.0 → 1.35.0

## Não aplicável — sem entidades de dados

Esta feature é um **version-bump de dependência** com sincronização de referências de
documentação. Não introduz, remove ou altera nenhuma entidade de dados, interface TypeScript,
`const enum` ou modelo de transação.

- Nenhum tipo novo em `src/functions/<domain>/types.ts` ou `src/types/`.
- Nenhuma alteração em `PlugPagTransactionResult` nem em qualquer outro modelo público.
- A Spec TurboModule (`NativePagseguroPlugpag.ts`) permanece **idêntica** (confirmado pelo
  diff binário — ver `research.md` Decisão 1).

As "entidades" conceituais da spec (`Versão do SDK alvo`, `Referências vivas de versão`) não
são estruturas de dados de runtime — são metadados de configuração/documentação, tratados no
mapa de referências de `research.md` (Decisão 3).
