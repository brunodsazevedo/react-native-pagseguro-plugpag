# Phase 1 — Data Model: `isAuthenticated`

## Entidade: Estado de Ativação do Terminal

Representação booleana de se existe um usuário autenticado / terminal ativado.

| Campo | Tipo | Descrição |
|---|---|---|
| (valor) | `boolean` | `true` = terminal ativado/autenticado; `false` = não ativado |

- **Sem objeto wrapper**: o retorno é um `boolean` puro (research.md Decisão 1). Não há interface
  nova em `src/functions/activation/types.ts` — o arquivo permanece inalterado.
- **Sem campos adicionais**: nesta versão não há `terminalSerialNumber` nem metadados. Dados extras
  futuros exigiriam novo método/mudança de contrato (decisão consciente — spec Key Entities).

## Regras de validação / semântica (da spec)

| Regra | Origem | Comportamento |
|---|---|---|
| `false` é resultado válido | FR-003, SC-002 | **Resolve** com `false` — nunca rejeita |
| Sem efeito colateral | FR-004 | Operação estritamente de leitura — não dispara ativação/transação |
| iOS rejeita | FR-005 | Guard Nível 2 lança `Error` prefixado antes de acessar o nativo |
| Erro de domínio (só async) | FR-006 | `onError` → reject `PLUGPAG_AUTHENTICATION_ERROR` (preserva mensagem) |
| Erro interno | FR-007 | Exceção não-SDK → reject `PLUGPAG_INTERNAL_ERROR` |

## Transições de estado

Não há máquina de estado interna na biblioteca — a consulta é um snapshot de leitura do estado
mantido pelo `PlugPagService` no terminal. As duas funções são idempotentes e sem efeito colateral.
