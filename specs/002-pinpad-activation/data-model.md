# Modelo de Dados — Feature 002: Ativação do PinPad

**Branch**: `feature/002-pinpad-activation`
**Data**: 2026-03-21

---

## Tipos TypeScript (Camada Pública — `src/index.tsx`)

### `PlugPagActivationSuccess`

Payload de resolução quando a ativação é bem-sucedida.

```typescript
interface PlugPagActivationSuccess {
  result: 'ok';
}
```

**Regras de validação**:
- `result` DEVE ser literalmente `'ok'` — discriminante de union type para tipo de resposta.
- Nenhum campo adicional é esperado ou permitido.

---

### `PlugPagActivationErrorInfo`

Shape do objeto `error.userInfo` disponível no bloco `catch` para ambos os tipos de erro.

```typescript
interface PlugPagActivationErrorInfo {
  result: number;      // Código numérico do SDK (ex: 6); sentinela -1 para erros internos
  errorCode: string;   // Código string do SDK (ex: 'E001'); 'INTERNAL_ERROR' para erros internos
  message: string;     // Mensagem descritiva; nunca vazia (fallback: 'Unknown error')
}
```

**Regras de validação**:
- `result`: número inteiro; `-1` é valor sentinela para erros internos (não vem do SDK).
- `errorCode`: string; pode ser vazia se o SDK não fornecer (preservada como-está); `'INTERNAL_ERROR'` fixo para erros internos.
- `message`: string nunca vazia — fallback é `'Unknown error'` quando SDK não fornece mensagem.
- O código de ativação NUNCA deve aparecer em nenhum desses campos (NFR-001).

---

## Códigos de Erro RN (Discriminantes no `catch`)

| `error.code` | Origem | Quando ocorre |
|---|---|---|
| `'PLUGPAG_INITIALIZATION_ERROR'` | SDK | `result != PlugPag.RET_OK` — SDK processou e reportou falha |
| `'PLUGPAG_INTERNAL_ERROR'` | Runtime | Exceção inesperada antes/durante a chamada ao SDK |

---

## Payload de Sucesso do SDK (Camada Nativa — Kotlin)

O mapa `WritableNativeMap` enviado para `promise.resolve()` em caso de sucesso:

```
WritableNativeMap {
  "result": "ok"   // String — discriminante para o consumidor JS
}
```

---

## Payloads de Erro do SDK (Camada Nativa — Kotlin)

### Para `PLUGPAG_INITIALIZATION_ERROR` (falha mapeada pelo SDK)

`WritableNativeMap` enviado como `userInfo` para `promise.reject()`:

```
WritableNativeMap {
  "result":    Int     // PlugPagInitializationResult.result (ex: 6) — via putInt
  "errorCode": String  // PlugPagInitializationResult.errorCode (ex: 'E001') — via putString; fallback ""
  "message":   String  // PlugPagInitializationResult.errorMessage se não vazio; senão "Unknown error"
}
```

### Para `PLUGPAG_INTERNAL_ERROR` (exceção inesperada em runtime)

`WritableNativeMap` enviado como `userInfo` para `promise.reject()`:

```
WritableNativeMap {
  "result":    -1               // Int — sentinela via putInt
  "errorCode": "INTERNAL_ERROR" // String fixa via putString
  "message":   String           // e.message ?: "Unknown error"
}
```

---

## Fluxo de Estado do Terminal

```
[Não inicializado]
       │
       ▼
initializeAndActivatePinPad(code) ─── FALHA ──► [Não inicializado] (retry permitido)
  ou
doAsyncInitializeAndActivatePinPad(code) ─── FALHA ──► [Não inicializado]
       │
    SUCESSO
       │
       ▼
[Inicializado e Ativo] ──► pronto para operações de pagamento
```

**Notas sobre estado**:
- Re-chamadas sequenciais são suportadas sem restrição da biblioteca (ver clarificação Q2).
- O estado é gerenciado internamente pelo SDK; a biblioteca não mantém estado de ativação próprio.
- Chamadas paralelas simultâneas ao mesmo terminal são indefinidas e não suportadas.
