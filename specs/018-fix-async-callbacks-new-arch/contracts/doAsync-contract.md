# Contrato observável dos métodos `doAsync*` (INALTERADO)

> Esta correção é **cirúrgica**: NÃO altera assinaturas, tipos de retorno nem códigos de erro
> (FR-006). O contrato JS↔Native abaixo já existe e permanece idêntico — muda apenas o
> comportamento interno: a Promise passa de "pendente para sempre" para "efetivamente concluída".
> O contrato serve como **oráculo de teste**: o comportamento observável após a correção DEVE
> corresponder exatamente a esta tabela.

## Assinaturas públicas (sem mudança)

| Método | Entrada | Resolve com | Rejeita com |
|---|---|---|---|
| `doAsyncPayment` | `PlugPagPaymentRequest` | `PlugPagTransactionResult` | `PLUGPAG_PAYMENT_ERROR` / `PLUGPAG_INTERNAL_ERROR` |
| `doAsyncInitializeAndActivatePinPad` | `activationCode: string` | `{ result: 'ok' }` | `PLUGPAG_INITIALIZATION_ERROR` / `PLUGPAG_INTERNAL_ERROR` |
| `doAsyncAbort` | — | `{ result: 'ok' }` | `PLUGPAG_ABORT_ERROR` / `PLUGPAG_INTERNAL_ERROR` |
| `doAsyncReprintCustomerReceipt` | — | `{ result: 'ok', steps: number }` | `PLUGPAG_PRINT_ERROR` / `PLUGPAG_INTERNAL_ERROR` |
| `doAsyncReprintEstablishmentReceipt` | — | `{ result: 'ok', steps: number }` | `PLUGPAG_PRINT_ERROR` / `PLUGPAG_INTERNAL_ERROR` |

## Estrutura do payload de erro (WritableNativeMap — inalterado)

```
{
  result: number,       // -1 para erro interno; código do SDK para erro de SDK
  errorCode: string,    // "INTERNAL_ERROR" | código do SDK | código específico do domínio
  message: string       // mensagem legível
}
```

## Eventos (inalterado)

- `onPaymentProgress` — emitido via `RCTDeviceEventEmitter` durante `doAsyncPayment`.
  MUST continuar chegando ao JS sem regressão (FR-003 / SC-003).

## Invariantes de threading verificáveis (novidade da correção — caminho interno)

Estes NÃO são parte do contrato JS, mas são as condições que a implementação DEVE satisfazer e que
os testes de integração Kotlin verificam:

1. A invocação de `plugPag.doAsync*(...)` ocorre **dentro** de `UiThreadUtil.runOnUiThread { }`.
2. Em ambiente de teste, `UiThreadUtil.runOnUiThread` é mockado para executar o runnable
   síncronamente (`firstArg<Runnable>().run()`), permitindo `capture(listenerSlot)`.
3. `onSuccess` → `promise.resolve(<tipo do domínio>)`.
4. `onError` → `promise.reject("PLUGPAG_<DOMAIN>_ERROR", <userInfo>)`.
5. Exception capturada → `promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))`.

## Testes JS (inalterados)

Os testes em `src/__tests__/functions/{payment,activation,refund,print}.test.ts` que cobrem os
`doAsync*` permanecem com as **mesmas asserções** — o mock do módulo nativo já simula resolve/
reject e o threading é invisível à camada JS.
