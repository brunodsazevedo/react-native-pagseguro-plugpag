# Diagnóstico de Problemas de Build — `PagseguroPlugpagModule.kt`

**Contexto**: `feature/003-payment-methods`
**Data**: 2026-03-25
**Status**: Aguardando implementação

Ao abrir o projeto no Android Studio (build via `example/`), o módulo
`PagseguroPlugpagModule.kt` apresenta erros de compilação. Este documento registra a
causa raiz, os erros derivados e o plano de resolução sequencial.

---

## Erro 1 — Codegen Desatualizado (BLOQUEANTE)

### Causa Raiz

O arquivo gerado automaticamente pelo React Native codegen está **obsoleto**:

```
android/build/generated/source/codegen/java/com/pagseguroplugpag/NativePagseguroPlugpagSpec.java
```

Esse arquivo foi gerado a partir da versão **inicial** da spec TypeScript (template padrão
do `create-react-native-library`) e define apenas um único método abstrato:

```java
public abstract double multiply(double a, double b);
```

A spec atual em `src/NativePagseguroPlugpag.ts` define 6 métodos completamente
diferentes. O `PagseguroPlugpagModule.kt` estende `NativePagseguroPlugpagSpec` e tenta
fazer `override` de métodos que **não existem** na classe abstrata gerada. Além disso,
`multiply` é abstrato mas não implementado no módulo Kotlin.

### Erros de Compilação Gerados

| Erro no Kotlin | Causa |
|---|---|
| `'initializeAndActivatePinPad' overrides nothing` | Método ausente na spec gerada |
| `'doAsyncInitializeAndActivatePinPad' overrides nothing` | Método ausente na spec gerada |
| `'doPayment' overrides nothing` | Método ausente na spec gerada |
| `'doAsyncPayment' overrides nothing` | Método ausente na spec gerada |
| `'addListener' overrides nothing` | Método ausente na spec gerada |
| `'removeListeners' overrides nothing` | Método ausente na spec gerada |
| `Class is not abstract and does not implement abstract member 'multiply'` | `multiply` é abstrato e não implementado |

### Resolução

Executar o codegen a partir da raiz do projeto:

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

Isso lê `src/NativePagseguroPlugpag.ts` e sobrescreve `NativePagseguroPlugpagSpec.java`
com a classe abstrata correta contendo todos os 6 métodos atuais.

---

## Erro 2 — `PlugPagPaymentData` com Named Parameters (POTENCIAL)

### Causa Raiz

Linhas [172–179](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt#L172-L179)
e [222–229](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt#L222-L229)
usam sintaxe de **named parameters** Kotlin ao construir `PlugPagPaymentData`:

```kotlin
// Atual — falha: PlugPagPaymentData é classe Java, não Kotlin
val paymentData = PlugPagPaymentData(
  type = type,
  amount = data.getInt("amount"),
  installmentType = installmentType,
  installments = data.getInt("installments"),
  userReference = if (data.hasKey("userReference")) data.getString("userReference") else null,
  printReceipt = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false
)
```

Named parameters só funcionam em classes Kotlin. `PlugPagPaymentData` é uma classe
**Java** do SDK — o compilador Kotlin rejeita o uso de named parameters nesse contexto.

### Resolução

Substituir por construtor posicional, confirmando a ordem dos parâmetros via inspeção
do `.aar` do SDK (`wrapper-1.33.0.aar`):

```kotlin
// Correto — parâmetros posicionais conforme construtor Java do SDK
val paymentData = PlugPagPaymentData(
  type,
  amount,
  installmentType,
  installments,
  userReference,
  printReceipt
)
```

A assinatura exata deve ser verificada no SDK antes da implementação. As duas ocorrências
(`doPayment` e `doAsyncPayment`) precisam ser corrigidas.

---

## Erro 3 — Nullable em Campos de `PlugPagTransactionResult` (POTENCIAL)

### Causa Raiz

`buildTransactionResultMap` (linha [61–76](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt#L61-L76))
passa campos diretamente para `putString()` sem null check:

```kotlin
map.putString("transactionCode", result.transactionCode)
map.putString("cardBrand", result.cardBrand)
// ...
```

Se o SDK declara esses campos como `@Nullable String` em Java (o que é comum), o
compilador Kotlin pode emitir warnings de nullability ou o código pode gerar NPE em
runtime ao ser chamado com resultado de erro.

### Resolução

Verificar as anotações de nullability do `PlugPagTransactionResult` no SDK. Para campos
`@Nullable`, aplicar null-safety explícita:

```kotlin
// Opção A — string vazia como fallback (perde informação de ausência)
map.putString("transactionCode", result.transactionCode ?: "")

// Opção B — preserva null semantics no mapa (preferível)
val tc = result.transactionCode
if (tc != null) map.putString("transactionCode", tc) else map.putNull("transactionCode")
```

A opção correta depende do contrato semântico de cada campo — definir antes de implementar.

---

## Erro 4 — Acesso a `PlugPagEventData.customMessage` (POTENCIAL)

### Causa Raiz

Linha [89](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt#L89)
acessa `eventData.customMessage` como propriedade Kotlin:

```kotlin
val msg = eventData.customMessage
```

O Kotlin converte automaticamente `getCustomMessage()` Java para `.customMessage`. Se o
getter Java do SDK tiver nome diferente (ex: `getMessage()` ou `getCustomMsg()`), o
acesso falha com erro de propriedade não encontrada.

### Resolução

Inspecionar `PlugPagEventData` no `.aar` do SDK para confirmar o nome exato do getter.
Segundo a clarificação C-003 do `SPEC.md`, o SDK expõe `getCustomMessage(): String` —
o que significa que `eventData.customMessage` está correto. Confirmar em compilação após
o Erro 1 ser resolvido.

---

## Ordem de Execução

```
Passo 1 — Regenerar codegen          → desbloqueante para todos os demais
Passo 2 — Construtor posicional      → corrigir PlugPagPaymentData (2 ocorrências)
Passo 3 — Null-safety nos campos     → verificar e corrigir PlugPagTransactionResult
Passo 4 — Confirmar customMessage    → verificar getter PlugPagEventData no SDK
```

Os passos 2–4 só ficam visíveis após o Passo 1 ser concluído — o codegen desatualizado
mascara os demais erros porque o build falha antes de checar as assinaturas.
