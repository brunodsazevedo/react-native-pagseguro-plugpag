# Research: Feature 005 — Estorno de Pagamento (doRefund)

**Branch**: `feature/005-refund-payment` | **Date**: 2026-03-28

---

## SDK API — `plugPag.voidPayment`

**Decision**: Usar `plugPag.voidPayment(PlugPagVoidData)` com `Dispatchers.IO` (bloqueante por IPC).

**Rationale**: O SDK 1.33.0 não oferece variante assíncrona (`PlugPagVoidPaymentListener`) para `voidPayment`. Diferente de `doAsyncPayment`, não existe listener de callback — apenas retorno síncrono bloqueante. Executar na main thread causaria ANR. O padrão `Dispatchers.IO` já aprovado na Constituição Princípio VI para `doPayment` aplica-se igualmente aqui.

**Alternatives considered**: Nenhuma — única API disponível no SDK.

---

## `PlugPagVoidData` — Estrutura e Constantes

**Decision**: Mapear string `voidType` ('VOID_PAYMENT' / 'VOID_QRCODE') para constantes inteiras do SDK em Kotlin.

```kotlin
// Package: br.com.uol.pagseguro.plugpagservice.wrapper
data class PlugPagVoidData(
    val transactionCode: String,
    val transactionId: String,
    val printReceipt: Boolean,
    val voidType: Int          // PlugPag.VOID_PAYMENT = 1 | PlugPag.VOID_QRCODE = 2
) : Serializable
```

**Constantes verificadas por inspeção de bytecode (wrapper-1.33.0.aar)**:

| Constante Kotlin | Valor Int | Uso |
|---|---|---|
| `PlugPag.VOID_PAYMENT` | `1` | Estorno cartão (crédito/débito) |
| `PlugPag.VOID_QRCODE` | `2` | Estorno PIX/QR Code |

**Rationale**: O consumidor da biblioteca nunca deve depender de valores inteiros internos do SDK. A camada TypeScript expõe `PlugPagVoidType.VOID_PAYMENT` e `PlugPagVoidType.VOID_QRCODE` como strings; a camada Kotlin faz o mapeamento. Padrão idêntico ao `PaymentType` da feature/003.

**Alternatives considered**: Expor os inteiros diretamente — rejeitado (viola Constituição Princípio IV: SDK internals não devem ser expostos).

---

## `PlugPagTransactionResult` — Extensão com 6 campos

**Decision**: Adicionar 6 campos opcionais a `PlugPagTransactionResult` em TypeScript e mapear no `buildTransactionResultMap` em Kotlin.

**Campos verificados por inspeção de JAR (todos existem como `private final java.lang.String` em `PlugPagTransactionResult`)**:

| Campo SDK | Tipo JS | Observação |
|---|---|---|
| `nsu` | `string \| null` | NSU da transação |
| `cardApplication` | `string \| null` | Aplicação do cartão (AID EMV) |
| `label` | `string \| null` | Label do cartão |
| `holderName` | `string \| null` | Nome completo do portador |
| `extendedHolderName` | `string \| null` | Nome estendido do portador |
| `autoCode` | `string \| null` | Código de autorização |

**Rationale**: Retro-compatível — novos campos são opcionais (`?`). Consumidores existentes de `doPayment` não são afetados. A extensão foi antecipada na feature/003 (campos existem no SDK mas não foram mapeados).

**Alternatives considered**: Criar um `PlugPagRefundResult` separado — rejeitado. O SDK retorna exatamente `PlugPagTransactionResult` para ambos pagamento e estorno; tipos distintos duplicariam estrutura sem benefício.

---

## Variante Assíncrona (`doAsyncRefund`)

**Decision**: NÃO implementar `doAsyncRefund`.

**Rationale**: O SDK 1.33.0 não oferece `PlugPagVoidPaymentListener` nem qualquer callback assíncrono para `voidPayment`. Qualquer wrapper assíncrono seria artificial e violaria o Princípio VI (Threading for SDK calls MUST use the SDK's own async methods directly).

**Alternatives considered**: Wrapper artificial com coroutine — rejeitado (não há ganho real e viola princípio da constituição).

---

## Canal de Eventos de Progresso

**Decision**: Reutilizar o canal `onPaymentProgress` existente. Configurar `plugPag.setEventListener(...)` antes de `voidPayment` e limpar no `finally`.

**Rationale**: O SDK emite eventos `PlugPagEventData` via `setEventListener` também durante `voidPayment`. O canal já existe, o tipo `PlugPagPaymentProgressEvent` já está definido e os consumidores já sabem como subscrevê-lo. Nenhuma mudança de API necessária.

**Alternatives considered**: Canal `onRefundProgress` separado — rejeitado. Semântica idêntica, API desnecessariamente duplicada.

---

## Validações JS antes de chamar o nativo

**Decision**: Validar `transactionCode`, `transactionId` e `voidType` em TypeScript, antes de qualquer chamada nativa.

**Campos e regras**:
- `transactionCode`: obrigatório, não pode ser string vazia
- `transactionId`: obrigatório, não pode ser string vazia
- `voidType`: obrigatório, deve ser `'VOID_PAYMENT'` ou `'VOID_QRCODE'`
- `printReceipt`: opcional, padrão `false` (sem impressão de comprovante)

**Rationale**: Evita round-trip IPC com terminal para erros previsíveis. Padrão estabelecido em `validatePaymentRequest` da feature/003.

---

## Codegen — Atualização de `NativePagseguroPlugpag.ts`

**Decision**: Adicionar `doRefund(data: Object): Promise<Object>` à spec.

**Rationale**: Toda chamada JS→Native deve passar pelo TurboModule Spec (Constituição Princípio I). A assinatura usa `Object` (exigência do codegen para tipos complexos) e é tipada com type assertion na camada pública.

**Impacto**: Codegen deve ser regenerado após a alteração da spec:
```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## Código de Erro

**Decision**: `PLUGPAG_REFUND_ERROR` para falhas do SDK; `PLUGPAG_INTERNAL_ERROR` para exceções inesperadas.

**Rationale**: Consistente com `PLUGPAG_PAYMENT_ERROR` e `PLUGPAG_INITIALIZATION_ERROR`. O prefixo `PLUGPAG_` + domínio (`REFUND`) + `_ERROR` é o padrão da biblioteca.
