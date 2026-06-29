# Phase 0 — Research: Correção de callbacks `doAsync*` na New Architecture

Todas as incógnitas técnicas foram resolvidas via PRD (raiz do projeto) e inspeção da codebase.
Nenhum item permanece como `NEEDS CLARIFICATION`.

---

## Decisão 1 — Causa raiz do bug (Issue #13)

- **Decision**: A causa raiz é a **ausência de `Looper` preparado** na thread de execução dos
  métodos do TurboModule na New Architecture. Os métodos `doAsync*` invocam
  `plugPag.doAsync*(...)` **diretamente** nessa thread. O wrapper PlugPag entrega os callbacks
  terminais (`onSuccess`/`onError`) via **RxJava amarrado a um `Handler`/`Looper`**; sem `Looper`
  ativo no contexto capturado, o callback é descartado silenciosamente e a Promise nunca conclui.
- **Rationale**: `onPaymentProgress` chega por outro caminho (loop EMV →
  `emitPaymentProgress` via `RCTDeviceEventEmitter`), o que explica o sintoma assimétrico
  (progresso chega, resultado não). Em `newArchEnabled=false` funciona porque os NativeModules
  legados rodam na `NativeModulesQueueThread`, que historicamente marshala para o main Looper.
- **Alternatives considered**: Nenhuma — confirmado por inspeção (`PagseguroPlugpagModule.kt`
  linhas ~206/268/349/496/539, todas com invocação direta) e pelo relato reproduzível da Issue #13.
- **Validação pendente**: confirmação empírica em terminal físico (gate bloqueante de merge).

## Decisão 2 — Técnica de correção: `UiThreadUtil.runOnUiThread` (Opção A)

- **Decision**: Envolver a invocação de cada `doAsync*` (e, por consequência, a subscrição do
  listener e a entrega dos callbacks) em `UiThreadUtil.runOnUiThread { ... }` de
  `com.facebook.react.bridge`.
- **Rationale**:
  - API **canônica do RN**, funciona em Old e New Architecture.
  - NÃO depende de `kotlinx-coroutines-android` prover o dispatcher Main (causa provável da
    falha do `Dispatchers.Main` sugerido na issue).
  - Garante `Looper` válido no momento da subscrição RxJava do SDK — exatamente o que falta hoje.
  - O `doAsync*` do SDK é **não-bloqueante** (apenas registra o listener e retorna); o trabalho
    pesado EMV/IPC roda em thread interna do SDK (`Schedulers.io()`) — portanto invocar na main
    thread **não causa ANR**.
  - Correção uniforme e mínima nos 5 métodos.
- **Alternatives considered**:
  - **Opção B — `CoroutineScope(Dispatchers.Main)`**: ❌ já testada pelo autor da issue, não
    funcionou; depende do linking do dispatcher Main do kotlinx.coroutines. Descartada.
  - **Opção C — delegar ao fluxo bloqueante (`Dispatchers.IO` + resolve na Main)**: ✅ reaproveita
    caminho comprovadamente funcional, mas perde o listener nativo e nem todo `doAsync*` tem
    equivalente bloqueante 1:1 (`doAsyncAbort`). **Mantida como fallback** caso a Opção A não se
    confirme em device.

## Decisão 3 — Remoção dos comentários `// EXCEPTION (Constituição Princípio VI)`

- **Decision**: Remover os 8 comentários `// EXCEPTION (Constituição Princípio VI)` dos métodos
  que gerenciam thread (`calculateInstallments`, `abort`, `initializeAndActivatePinPad`,
  `doPayment`, `doRefund`/`voidPayment`, `printFromFile`, `reprintCustomerReceipt`,
  `reprintEstablishmentReceipt`).
- **Rationale**: A Threading Policy v1.4.0 (Princípio VI) torna o gerenciamento de thread a
  **regra**, não a exceção. Os comentários ficaram redundantes e contraditórios com a constituição
  vigente. FR-009 exige a remoção.
- **Alternatives considered**: Manter os comentários — rejeitado por contrariar a constituição
  atual e poluir o código com "exceções" que são, na verdade, a norma.

## Decisão 4 — Spec TurboModule e Codegen

- **Decision**: NÃO alterar `src/NativePagseguroPlugpag.ts`; NÃO regenerar o codegen Android.
- **Rationale**: A correção não adiciona, remove nem altera assinatura de nenhum método nativo.
  A classe abstrata gerada (`NativePagseguroPlugpagSpec.java`) permanece válida. Regenerar seria
  desnecessário e fora do gatilho descrito no `CLAUDE.md`.
- **Alternatives considered**: N/A.

## Decisão 5 — Estratégia de testes Kotlin (ajuste de harness)

- **Decision**: Como a Opção A passa a invocar o SDK dentro de `UiThreadUtil.runOnUiThread { ... }`
  e o ambiente JUnit não possui main `Looper`, **mockar estaticamente** `UiThreadUtil` para
  executar o runnable de forma síncrona:
  ```kotlin
  mockkStatic(UiThreadUtil::class)
  every { UiThreadUtil.runOnUiThread(any()) } answers { firstArg<Runnable>().run() }
  ```
  Sem esse mock, o listener nunca é registrado e os testes que usam `capture(listenerSlot)` falham.
- **Rationale**: O ajuste é **somente de setup de threading do mock** — as asserções de contrato
  (resolve com `result: 'ok'` / `PlugPagTransactionResult`; reject com `PLUGPAG_<DOMAIN>_ERROR` /
  `PLUGPAG_INTERNAL_ERROR`) permanecem idênticas. Cobre FR-008.
- **Alternatives considered**: Robolectric com main Looper real — rejeitado por adicionar peso e
  dependência desnecessária ao harness JUnit 5 + Mockk já vigente.

## Decisão 6 — Testes JS e versionamento

- **Decision**: Testes JS dos `doAsync*` (`payment`, `activation`, `abort`, `print`) permanecem
  **inalterados**. Registrar o bugfix em `CHANGELOG.md` (`[Unreleased]` → `Fixed`) e bump de
  versão **patch** (`1.2.2` → `1.2.3`).
- **Rationale**: O threading é detalhe nativo, invisível à camada JS — FR-006/SC-004 (zero
  mudança exigida do consumidor). É uma correção de bug sem mudança de API → patch (SemVer).
  Cobre FR-010.
- **Alternatives considered**: Bump minor — rejeitado; não há nova funcionalidade nem mudança de
  contrato.
