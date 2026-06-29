# Feature Specification: Correção de entrega de callbacks nos métodos `doAsync*` na New Architecture

**Feature Branch**: `bugfix/018-fix-async-callbacks-new-arch`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User description: "crie um bugfix a partir de PRD.md" (Issue #13 — `doAsync*` nunca resolve/rejeita a Promise com New Architecture habilitada)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pagamento assíncrono resolve a Promise (Priority: P1)

Um desenvolvedor que integra a biblioteca chama `doAsyncPayment` em um aplicativo React Native com a New Architecture habilitada (configuração padrão a partir do RN ≥ 0.76, e única suportada por esta lib). A transação é processada no terminal PagBank, os eventos de progresso chegam normalmente, e ao final a Promise **resolve** com o resultado da transação (sucesso) ou **rejeita** com erro estruturado (falha). Hoje a Promise fica pendente para sempre.

**Why this priority**: É o método mais usado da biblioteca e o caso reportado na Issue #13. Sem ele, o fluxo de venda assíncrono é inutilizável na configuração padrão de todos os consumidores — não é edge case, é a falha central que justifica o bugfix.

**Independent Test**: Pode ser testado isoladamente em terminal físico chamando `doAsyncPayment` e verificando que a Promise resolve com `PlugPagTransactionResult` ao aprovar a transação e rejeita com `PLUGPAG_PAYMENT_ERROR` ao falhar/cancelar — com `newArchEnabled=true`.

**Acceptance Scenarios**:

1. **Given** New Architecture habilitada e terminal PagBank conectado, **When** o desenvolvedor chama `doAsyncPayment` e a transação é aprovada, **Then** a Promise resolve com `PlugPagTransactionResult` populado.
2. **Given** New Architecture habilitada, **When** a transação é negada ou cancelada no terminal, **Then** a Promise rejeita com código `PLUGPAG_PAYMENT_ERROR` e payload de erro estruturado.
3. **Given** o fluxo de pagamento assíncrono em andamento, **When** o SDK emite estágios de processamento, **Then** o evento `onPaymentProgress` continua sendo entregue ao JS normalmente, sem regressão.

---

### User Story 2 - Paridade dos demais métodos `doAsync*` (Priority: P1)

O mesmo defeito de threading afeta todos os métodos assíncronos baseados em listener do SDK. O desenvolvedor que chama `doAsyncInitializeAndActivatePinPad`, `doAsyncAbort`, `doAsyncReprintCustomerReceipt` ou `doAsyncReprintEstablishmentReceipt` deve observar a Promise resolvendo/rejeitando exatamente como nas variantes que já funcionam.

**Why this priority**: A correção é estrutural (mesma causa raiz de Looper ausente). Corrigir só `doAsyncPayment` deixaria os outros 4 métodos quebrados pelo mesmo motivo — a paridade é parte indivisível do bugfix.

**Independent Test**: Cada método pode ser exercido individualmente em device verificando resolução/rejeição da Promise; em ambiente de teste, cobrir via integração Kotlin que o listener é registrado e o callback resolve/rejeita a Promise.

**Acceptance Scenarios**:

1. **Given** New Architecture habilitada, **When** o desenvolvedor chama qualquer um dos 5 métodos `doAsync*` com resultado de sucesso do SDK, **Then** a Promise correspondente resolve com o tipo de retorno documentado.
2. **Given** New Architecture habilitada, **When** o SDK retorna erro para qualquer `doAsync*`, **Then** a Promise rejeita com o `PLUGPAG_<DOMAIN>_ERROR` correspondente.

---

### User Story 3 - Compatibilidade preservada e contrato JS estável (Priority: P2)

O desenvolvedor que já usa a biblioteca não precisa alterar nenhuma linha de código JS após a correção. A assinatura pública, os tipos de retorno e os códigos de erro permanecem idênticos — muda apenas o comportamento interno: a Promise passa a efetivamente concluir.

**Why this priority**: Garante que o bugfix seja cirúrgico e não quebre consumidores existentes. É importante mas decorre naturalmente do escopo restrito; por isso P2.

**Independent Test**: Os testes JS existentes dos `doAsync*` (payment, activation, abort, print) devem continuar passando sem alteração de asserções.

**Acceptance Scenarios**:

1. **Given** um app consumidor já integrado, **When** ele atualiza para a versão corrigida, **Then** nenhuma mudança de código JS é necessária e o comportamento observável passa de "Promise pendente" para "Promise concluída".
2. **Given** a suíte de testes JS existente, **When** executada após a correção, **Then** todos os cenários de contrato (`result: 'ok'` / `PlugPagTransactionResult`; reject `PLUGPAG_*`) continuam verdes sem mudança de asserção.

---

### Edge Cases

- **New Architecture desabilitada** (`newArchEnabled=false`): o fluxo já funcionava antes; a correção não deve introduzir regressão nesse modo legado.
- **Trabalho pesado antes do retorno do método async**: o método `doAsync*` do SDK é não-bloqueante por contrato (apenas registra o listener); confirmar em device que invocá-lo a partir da main thread não trava a UI.
- **SDK captura o Looper em ponto interno diferente**: risco de a correção principal não resolver em device — nesse caso, fallback descrito nas Assumptions (delegar ao caminho bloqueante já funcional).
- **`doAsyncAbort` sem equivalente bloqueante 1:1**: o fallback eventual precisa ser tratado caso a caso para esse método.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O método `doAsyncPayment` MUST resolver a Promise com `PlugPagTransactionResult` quando a transação é aprovada e rejeitar com `PLUGPAG_PAYMENT_ERROR` quando falha, com `newArchEnabled=true`.
- **FR-002**: Os métodos `doAsyncInitializeAndActivatePinPad`, `doAsyncAbort`, `doAsyncReprintCustomerReceipt` e `doAsyncReprintEstablishmentReceipt` MUST resolver/rejeitar suas Promises de forma equivalente ao seu domínio, com `newArchEnabled=true`.
- **FR-003**: O evento `onPaymentProgress` MUST continuar sendo emitido normalmente ao JS durante o fluxo assíncrono, sem regressão.
- **FR-004**: A correção MUST garantir paridade total de comportamento observável entre a variante bloqueante (ex.: `doPayment`) e a variante assíncrona (ex.: `doAsyncPayment`) de cada domínio.
- **FR-005**: A biblioteca MUST manter `newArchEnabled=true` como configuração suportada e primária; desabilitar a New Architecture NÃO é solução aceitável.
- **FR-006**: A API pública (assinaturas, tipos de retorno e códigos de erro dos `doAsync*`) MUST permanecer inalterada — nenhuma mudança de código JS deve ser exigida dos consumidores.
- **FR-007**: A correção MUST seguir a Threading Policy já vigente no Princípio VI da Constituição (v1.4.0): métodos async baseados em listener invocados e entregues na main thread via `UiThreadUtil.runOnUiThread`.
- **FR-008**: Os testes de integração Kotlin MUST cobrir resolução e rejeição das Promises dos métodos `doAsync*`, com o harness ajustado para executar o runnable da main thread de forma síncrona no ambiente de teste.
- **FR-009**: Os comentários `// EXCEPTION (Constituição Princípio VI)` MUST ser removidos dos métodos nativos onde a gerência de thread passou a ser regra, não exceção.
- **FR-010**: `CHANGELOG.md` e o versionamento MUST ser atualizados para registrar o bugfix.

### Key Entities

- **Método assíncrono `doAsync*`**: ponto de entrada nativo que registra um listener do SDK e cuja Promise deve concluir ao chegar o callback terminal. Cinco instâncias: payment, activation, abort, reprint-customer, reprint-establishment.
- **Callback terminal do SDK**: evento `onSuccess`/`onError` entregue pelo wrapper PlugPag via RxJava/Handler, que depende de um `Looper` ativo para disparar.
- **`PlugPagTransactionResult`**: resultado da transação devolvido na resolução do `doAsyncPayment` (contrato compartilhado já existente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em terminal físico PagBank com `newArchEnabled=true`, 100% das chamadas `doAsyncPayment` concluem a Promise (resolve no sucesso, reject na falha) — eliminando o estado "pendente para sempre".
- **SC-002**: Os 5 métodos `doAsync*` apresentam paridade de comportamento com suas variantes bloqueantes verificada em device.
- **SC-003**: 100% dos eventos `onPaymentProgress` esperados continuam chegando ao JS durante o fluxo assíncrono (zero regressão de progresso).
- **SC-004**: Zero mudanças de código exigidas dos consumidores JS existentes para se beneficiar da correção.
- **SC-005**: `yarn lint`, `yarn typecheck` e `yarn test` verdes; build Android do app de exemplo concluído com sucesso.
- **SC-006**: Testes de integração Kotlin cobrindo resolução/rejeição dos `doAsync*` adicionados e passando.

## Assumptions

- A causa raiz é a ausência de `Looper` ativo na thread de execução do TurboModule na New Architecture, descartando silenciosamente os callbacks RxJava do SDK (hipótese técnica do PRD, a confirmar em device).
- A abordagem decidida é a **Opção A** do PRD: invocar cada `doAsync*` e entregar seus callbacks via `UiThreadUtil.runOnUiThread`. Caso a validação em terminal físico não confirme a resolução, o **fallback** é a **Opção C**: reaproveitar o caminho bloqueante já funcional (`Dispatchers.IO` + resolve na main), tratando `doAsyncAbort` caso a caso por não ter equivalente bloqueante 1:1.
- A Constituição (Princípio VI → Threading Policy) e o `CLAUDE.md` **já foram atualizados** para v1.4.0 em 2026-06-28; esta feature **NÃO** deve reabrir nem reexecutar essa atualização — apenas consumir a política vigente.
- A validação final depende de acesso a um terminal físico PagBank (Moderninha Smart ou equivalente); sem ela, o merge fica bloqueado e a correção permanece em branch.
- O escopo exclui: alterar a configuração de New Architecture (permanece `true`), refatorar métodos bloqueantes que já funcionam (apenas remoção dos comentários `EXCEPTION`), e implementar o Princípio V (device compatibility — feature separada).
- Os testes JS dos `doAsync*` permanecem inalterados, pois o threading é detalhe nativo invisível à camada JS.

## Dependencies

- PlugPagServiceWrapper `wrapper:1.35.0` (SDK alvo vigente).
- `UiThreadUtil` de `com.facebook.react.bridge` (API canônica do RN para execução na main thread).
- Terminal físico PagBank para validação de aceitação (critério bloqueante de merge).
