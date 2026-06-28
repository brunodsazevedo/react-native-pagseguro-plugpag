# Quickstart — Validação da correção `doAsync*`

## Pré-requisitos

- Terminal físico PagBank (Moderninha Smart ou equivalente SmartPOS) — **gate bloqueante de merge**.
- App de exemplo com `newArchEnabled=true` (configuração padrão da lib).

## Gates locais (devem passar antes de qualquer PR)

```bash
yarn lint        # ESLint — zero erros/avisos
yarn typecheck   # TypeScript strict
yarn test        # Jest — testes JS dos doAsync* permanecem verdes sem mudança
```

## Testes de integração Kotlin

```bash
cd example/android && ./gradlew :react-native-pagseguro-plugpag:test
```

O harness mocka `UiThreadUtil.runOnUiThread` para executar o runnable de forma síncrona:

```kotlin
mockkStatic(UiThreadUtil::class)
every { UiThreadUtil.runOnUiThread(any()) } answers { firstArg<Runnable>().run() }
```

Cada `doAsync*` deve ter cobertura de:
1. Resolução no sucesso (`onSuccess` → `promise.resolve(<tipo do domínio>)`).
2. Rejeição no erro do SDK (`onError` → `promise.reject("PLUGPAG_<DOMAIN>_ERROR", ...)`).
3. Rejeição em exceção interna (`promise.reject("PLUGPAG_INTERNAL_ERROR", ...)`).

## Build do app de exemplo

```bash
yarn example android
```

## Validação em terminal físico (aceitação — SC-001 a SC-003)

Com `newArchEnabled=true` e terminal conectado:

1. **`doAsyncPayment` — sucesso**: iniciar venda, aprovar no terminal → a Promise **resolve** com
   `PlugPagTransactionResult` populado. (Hoje: pendente para sempre.)
2. **`doAsyncPayment` — falha/cancelamento**: negar/cancelar → a Promise **rejeita** com
   `PLUGPAG_PAYMENT_ERROR` e payload estruturado.
3. **Progresso**: durante a venda, confirmar que `onPaymentProgress` continua chegando ao JS
   (zero regressão).
4. **Paridade dos demais `doAsync*`**: exercitar `doAsyncInitializeAndActivatePinPad`,
   `doAsyncAbort`, `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt` e
   confirmar resolução/rejeição equivalente às variantes bloqueantes.
5. **UI não trava**: confirmar que invocar `doAsync*` a partir da main thread não congela a UI
   (SDK é não-bloqueante; processamento pesado roda em thread interna do SDK).

## Fallback (Opção C) — se a validação em device falhar

Se os callbacks ainda não dispararem com `UiThreadUtil`, delegar ao caminho bloqueante
(`Dispatchers.IO` + resolve na Main), tratando `doAsyncAbort` caso a caso (sem equivalente
bloqueante 1:1). Ver [research.md](./research.md) Decisão 2.

## Critério de conclusão

- [ ] `yarn lint`, `yarn typecheck`, `yarn test` verdes (SC-005).
- [ ] Build Android do example concluído (SC-005).
- [ ] Testes Kotlin de resolução/rejeição dos `doAsync*` passando (SC-006).
- [ ] Validação em terminal físico OK (SC-001, SC-002, SC-003) — **bloqueante de merge**.
- [ ] 8 comentários `// EXCEPTION (Princípio VI)` removidos (FR-009).
- [ ] `CHANGELOG.md` + bump de versão patch (FR-010).
