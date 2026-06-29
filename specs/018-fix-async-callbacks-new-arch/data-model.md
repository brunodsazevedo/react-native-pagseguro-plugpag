# Phase 1 — Data Model: Correção de callbacks `doAsync*`

> Biblioteca **sem estado persistente**. Não há banco, schema nem migração. As "entidades" abaixo
> são conceituais — representam os atores do fluxo de threading nativo afetado pelo bug. Nenhum
> tipo de dado público é criado ou alterado por esta correção (FR-006).

## Entidades conceituais

### Método assíncrono `doAsync*`

Ponto de entrada nativo (TurboModule) que registra um listener do SDK PlugPag e cuja Promise deve
concluir ao chegar o callback terminal.

| Atributo | Descrição |
|---|---|
| Instâncias | 5: `doAsyncPayment`, `doAsyncInitializeAndActivatePinPad`, `doAsyncAbort`, `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt` |
| Thread de invocação (antes) | Thread do TurboModule, **sem `Looper`** → callback descartado (bug) |
| Thread de invocação (depois) | Main thread via `UiThreadUtil.runOnUiThread` → `Looper` válido |
| Estado da Promise (antes) | Pendente para sempre |
| Estado da Promise (depois) | `resolved` (sucesso) ou `rejected` (`PLUGPAG_<DOMAIN>_ERROR` / `PLUGPAG_INTERNAL_ERROR`) |

**Transição de estado da Promise (alvo da correção)**:

```
PENDING ──onSuccess(result)──▶ RESOLVED(tipo de retorno do domínio)
   │
   ├──onError(result)─────────▶ REJECTED(PLUGPAG_<DOMAIN>_ERROR)
   └──Exception (try/catch)───▶ REJECTED(PLUGPAG_INTERNAL_ERROR)
```

### Callback terminal do SDK

Evento `onSuccess`/`onError` entregue pelo wrapper PlugPag via RxJava/Handler, dependente de um
`Looper` ativo para disparar. É o elemento descartado silenciosamente na New Arch hoje.

| Listener do SDK | Método associado | Callbacks |
|---|---|---|
| `PlugPagPaymentListener` | `doAsyncPayment` | `onSuccess`, `onError`, `onPaymentProgress`, `onPrinterSuccess`, `onPrinterError` |
| `PlugPagActivationListener` | `doAsyncInitializeAndActivatePinPad` | `onActivationProgress`, `onSuccess`, `onError` |
| `PlugPagAbortListener` | `doAsyncAbort` | `onAbortRequested`, `onError` |
| `PlugPagPrinterListener` | `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt` | `onSuccess`, `onError` |

### `PlugPagTransactionResult` (tipo compartilhado — inalterado)

Resultado da transação devolvido na resolução do `doAsyncPayment`. Contrato já existente em
`src/types/sharedTypes.ts`. **Nenhuma alteração** — listado apenas como referência do payload de
resolução. Regra de validação: `onPaymentProgress` MUST continuar sendo emitido durante o fluxo
(FR-003) sem regressão.
