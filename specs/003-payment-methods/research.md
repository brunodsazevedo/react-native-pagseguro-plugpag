# Research: Métodos de Pagamento (Crédito, Débito e PIX)

**Feature**: feature/003-payment-methods
**Date**: 2026-03-24
**Status**: Complete — zero NEEDS CLARIFICATION pendentes

---

## R-001: Arquitetura de Listeners do SDK

**Decision**: Dois listeners distintos para `doPayment` e `doAsyncPayment`.

- `doPayment` (síncrono): `plugPag.setEventListener(listener)` com objeto `PlugPagEventListener` registrado **antes** da chamada bloqueante. Progresso chega via `onEvent(PlugPagEventData)`. Listener substituído por no-op em `finally` (não `null` — parâmetro é `@NotNull` conforme inspeção do JAR).
- `doAsyncPayment` (assíncrono): `plugPag.doAsyncPayment(data, listener)` com `PlugPagPaymentListener` que implementa `onSuccess`, `onError` e `onPaymentProgress(PlugPagEventData)`. Sem coroutines.

**Rationale**: `PlugPagEventListener` só tem `onEvent` — não possui callbacks de sucesso/erro. `PlugPagPaymentListener` é o resolvedor primário confiável para o fluxo assíncrono (C-004, C-005 do spec).

**Alternatives considered**:
- Usar `PlugPagEventListener` como resolvedor em `doAsyncPayment` — rejeitado: interface sem `onSuccess`/`onError` dedicados.
- Espelhar `doPayment` internamente em `doAsyncPayment` — rejeitado: `PlugPagPaymentListener` é o contrato correto do SDK.

---

## R-002: Threading em doPayment

**Decision**: `Dispatchers.IO` com `CoroutineScope` + `withContext(Dispatchers.Main)` para resolução da promise.

**Rationale**: `plugPag.doPayment()` é bloqueante por IPC (mesma natureza de `initializeAndActivatePinpad` da feature/002). Executar na main thread causaria ANR. Exceção documentada inline conforme Constituição Princípio VI.

**Alternatives considered**: Executar na thread caller sem wrap — rejeitado: bloqueio da main thread é ANR garantido.

---

## R-003: NativeEventEmitter para Eventos de Progresso

**Decision**: `NativeEventEmitter` instanciado com `NativeModules.PagseguroPlugpag`, **não** `DeviceEventEmitter`.

**Rationale**: `DeviceEventEmitter` é legado da Bridge. `NativeEventEmitter` é o contrato correto para TurboModules. React Native emite warnings se o módulo nativo não declarar `addListener`/`removeListeners` — esses métodos devem ser declarados na spec TurboModule com corpo vazio no Kotlin (C-009, C-011).

**Implementation**: Instância compartilhada criada uma vez no módulo `src/index.tsx`:
```typescript
const emitter = new NativeEventEmitter(
  NativeModules.PagseguroPlugpag as EventSubscriptionVendor
);
```

**Alternatives considered**:
- `DeviceEventEmitter` — rejeitado: legado, warnings no console, anti-padrão com New Architecture.
- Instância por hook — rejeitado: múltiplas instâncias podem causar duplicação de eventos.

---

## R-004: Assinatura Kotlin de addListener/removeListeners

**Decision**: `count` em `removeListeners` deve ser `Double`, não `Int`.

**Rationale**: O codegen do React Native mapeia `number` TypeScript para `Double` no Kotlin. Usar `Int` causaria erro de compilação ou type mismatch silencioso. Confirmado via inspeção de JAR (C-009).

```kotlin
override fun addListener(eventName: String) {}
override fun removeListeners(count: Double) {}
```

---

## R-005: Hook de Callback vs. Hook de Estado

**Decision**: `usePaymentProgress` como hook de callback puro — sem estado interno, sem re-renders.

**Rationale**: Armazenar evento como estado interno (padrão legado `useTransactionPaymentEvent`) força re-render a cada evento E causa memory leak por ausência de cleanup. O padrão de hook de callback (similar ao `useFocusEffect` do `react-navigation`) conecta o listener nativo ao callback do consumidor sem intermediar estado.

**Implementation**:
```typescript
export function usePaymentProgress(
  callback: (event: PlugPagPaymentProgressEvent) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    const sub = emitter.addListener('onPaymentProgress', (e: PlugPagPaymentProgressEvent) => {
      callbackRef.current(e);
    });
    return () => sub.remove();
  }, []); // dependency-free: callbackRef sempre atualizado via ref
}
```

**Alternatives considered**:
- Hook de estado (retorna evento) — rejeitado: re-renders + memory leak.
- `useCallback` no dep array — rejeitado: forçaria consumidor a memoizar callback.

---

## R-006: Mapeamento de String Enums para Constantes do SDK

**Decision**: Conversão exclusivamente no Kotlin via `when`. O TypeScript expõe string literals; o nativo mapeia para constantes `PlugPag.TYPE_*` e `PlugPag.INSTALLMENT_TYPE_*`.

**Rationale**: Hardcoding de inteiros no TS criaria risco de dessincronização em versões futuras do SDK. O `when` no Kotlin referencia as constantes do SDK diretamente — atualizações automáticas (C-001, C-002, C-006).

**Kotlin mapping**:
```kotlin
val paymentType = when (type) {
    "CREDIT" -> PlugPag.TYPE_CREDITO
    "DEBIT"  -> PlugPag.TYPE_DEBITO
    "PIX"    -> PlugPag.TYPE_PIX
    else     -> throw IllegalArgumentException("Invalid payment type: $type")
}
val installmentType = when (installmentType) {
    "A_VISTA"        -> PlugPag.INSTALLMENT_TYPE_A_VISTA
    "PARC_VENDEDOR"  -> PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR
    "PARC_COMPRADOR" -> PlugPag.INSTALLMENT_TYPE_PARC_COMPRADOR
    else             -> throw IllegalArgumentException("Invalid installment type: $installmentType")
}
```

---

## R-007: setEventListener — Cleanup com No-op

**Decision**: Substituir listener por objeto no-op em `finally`, nunca passar `null`.

**Rationale**: `PlugPag.setEventListener()` tem parâmetro `@NotNull` (confirmado via JAR wrapper-1.33.0.aar). Passar `null` causaria NPE no SDK. O no-op garante cleanup sem crash (C-007).

```kotlin
} finally {
    plugPag.setEventListener(object : PlugPagEventListener {
        override fun onEvent(eventData: PlugPagEventData) {}
    })
}
```

---

## R-008: Estrutura de PlugPagTransactionResult

**Decision**: Todos os campos são nullable — refletem o contrato do SDK.

**Campos mapeados** (da inspeção do SDK):
- `transactionCode: String?`
- `transactionId: String?`
- `date: String?`
- `time: String?`
- `hostNsu: String?`
- `cardBrand: String?`
- `bin: String?`
- `holder: String?`
- `userReference: String?`
- `terminalSerialNumber: String?`
- `amount: String?`
- `availableBalance: String?`

**Omitidos na v1** (sem breaking change): `holderName`, `extendedHolderName`, `cardApplication`, `label`, `cardIssuerNationality`.

---

## R-009: Validação JS — Camada Index

**Decision**: Validações executadas em `src/index.tsx` antes de qualquer chamada nativa. Reject imediato com mensagem descritiva.

**Validações obrigatórias** (ordem de verificação):
1. Guard iOS (`Platform.OS !== 'android'`) — rejeita com `[react-native-pagseguro-plugpag] ERROR:`
2. `amount <= 0` — rejeita com mensagem descritiva
3. `installments < 1` — rejeita
4. `installmentType` PARC_* com `installments < 2` — rejeita
5. `type` PIX ou DEBIT com `installmentType !== 'A_VISTA'` — rejeita
6. `userReference?.length > 10` — rejeita (FR-004a)

**Note**: Validações são throw (não reject explícito) — como a função é `async`, o throw é automaticamente convertido em promise rejeição.

---

## R-010: NFR-001 — userReference Privacy

**Decision**: `userReference` NUNCA aparece em logs, mensagens de erro ou payloads de rejeição.

**Rationale**: Dado de referência do negócio do consumidor — pode conter IDs de pedido, dados sensíveis. Tratado como PII por padrão.

**Implementation**: O campo é passado ao SDK via `PlugPagPaymentData` mas nunca incluído em `buildSdkErrorUserInfo` nem logado.

---

## R-011: Estrutura de Arquivos Novos

**Decision**: Novos tipos no arquivo `src/types/payment.ts`, exportado via `src/index.tsx`. Sem criação de novo módulo separado — a feature é adição ao domínio existente da biblioteca.

**Files affected**:
- `src/NativePagseguroPlugpag.ts` — adicionar `doPayment`, `doAsyncPayment`, `addListener`, `removeListeners`
- `src/index.tsx` — adicionar funções, hook, utility, tipos públicos
- `android/.../PagseguroPlugpagModule.kt` — implementar novos métodos
- `src/__tests__/index.test.tsx` — adicionar cenários de pagamento (mínimo 13 novos)
- `example/src/App.tsx` — demo de pagamento (substituir demo de ativação)

**Note**: Não há necessidade de `src/types/payment.ts` separado para esta feature — os tipos podem residir diretamente em `src/index.tsx` seguindo o padrão atual da biblioteca. A separação em `src/types/` pode ser feita em refactor futuro quando o número de tipos justificar.
