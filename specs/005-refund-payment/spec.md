# Feature Specification: Estorno de Pagamento (doRefund)

**Feature Branch**: `feature/005-refund-payment`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "Crie uma spec a partir do arquivo PRD-refund-payment.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Estornar pagamento com cartão (crédito ou débito) (Priority: P1)

Um desenvolvedor de aplicativo para terminal PagBank SmartPOS precisa oferecer ao operador
a capacidade de cancelar/estornar uma transação de cartão já aprovada. O aplicativo chama
`doRefund` com o `transactionCode` e `transactionId` retornados pelo pagamento original,
informando `voidType: 'VOID_PAYMENT'`. A biblioteca comunica o estorno ao terminal e retorna
o resultado da operação — incluindo código e ID do estorno gerado — para que o aplicativo
possa exibir confirmação ao operador e ao portador do cartão.

**Why this priority**: Estorno de cartão é o caso de uso principal e mais comum. Sem ele,
a biblioteca não cobre o ciclo completo de uma transação (pagamento + cancelamento).

**Independent Test**: Pode ser testado de forma isolada chamando `doRefund` com dados de uma
transação de cartão e verificando que a promise resolve com um `PlugPagTransactionResult`
contendo os campos de identificação do estorno.

**Acceptance Scenarios**:

1. **Given** uma transação de crédito ou débito aprovada com `transactionCode` e `transactionId` válidos, **When** `doRefund` é chamado com `voidType: 'VOID_PAYMENT'`, **Then** a promise resolve com um `PlugPagTransactionResult` contendo `transactionCode` e `transactionId` do estorno gerado.
2. **Given** os mesmos dados de entrada, **When** o terminal rejeita o estorno (ex: transação já estornada), **Then** a promise rejeita com código `PLUGPAG_REFUND_ERROR` e objeto `userInfo` contendo `result`, `errorCode` e `message`.
3. **Given** qualquer plataforma iOS, **When** `doRefund` é chamado, **Then** a promise rejeita com mensagem de erro explicando que a funcionalidade está disponível apenas em Android.

---

### User Story 2 — Estornar pagamento PIX / QR Code (Priority: P2)

Um desenvolvedor precisa estornar uma transação PIX aprovada. O fluxo é idêntico ao estorno
de cartão, porém requer `voidType: 'VOID_QRCODE'`. A biblioteca mapeia esse valor para a
constante correta do SDK, garantindo que o terminal processe o estorno PIX sem erros
silenciosos.

**Why this priority**: PIX é suportado como método de pagamento desde a feature/003. Sem o
`voidType` correto, o SDK rejeita o estorno — é necessário expor essa distinção ao
consumidor da biblioteca para que não fique hardcoded como na biblioteca legada.

**Independent Test**: Pode ser testado chamando `doRefund` com `voidType: 'VOID_QRCODE'`
e verificando que a promise resolve corretamente.

**Acceptance Scenarios**:

1. **Given** uma transação PIX aprovada, **When** `doRefund` é chamado com `voidType: 'VOID_QRCODE'`, **Then** a promise resolve com `PlugPagTransactionResult` válido.
2. **Given** uma transação PIX, **When** `doRefund` é chamado com `voidType: 'VOID_PAYMENT'` (tipo incorreto para PIX), **Then** o SDK retorna erro e a promise rejeita com `PLUGPAG_REFUND_ERROR` — comportamento esperado e correto.

---

### User Story 3 — Acompanhar progresso do estorno via eventos (Priority: P3)

Durante a execução do estorno, o terminal emite eventos de progresso (ex: "Aproxime o
cartão", "Processando"). O desenvolvedor usa o hook `usePaymentProgress` ou a função
`subscribeToPaymentProgress` — já existentes na biblioteca — para exibir feedback visual
ao operador sem nenhuma mudança na API de eventos.

**Why this priority**: Melhora a experiência do operador em terminais que emitem eventos
durante o estorno, mas não bloqueia o uso básico da funcionalidade.

**Independent Test**: Pode ser testado registrando um listener em `onPaymentProgress` antes
de chamar `doRefund` e verificando que os eventos são recebidos durante o processamento.

**Acceptance Scenarios**:

1. **Given** um listener registrado em `onPaymentProgress`, **When** `doRefund` é executado e o terminal emite eventos, **Then** o callback é invocado com `{ eventCode: number, customMessage: string | null }`.
2. **Given** o estorno concluído (sucesso ou erro), **When** o fluxo é finalizado, **Then** o listener de eventos é removido e nenhum evento residual é emitido para chamadas subsequentes.

---

### Edge Cases

- O que acontece quando `transactionCode` ou `transactionId` estão ausentes ou em branco? → A biblioteca rejeita antes de acionar o terminal, com mensagem de erro clara identificando o campo inválido.
- O que acontece quando `voidType` recebe um valor fora do conjunto `{ 'VOID_PAYMENT', 'VOID_QRCODE' }`? → A biblioteca rejeita com mensagem orientando o uso de `PlugPagVoidType.VOID_PAYMENT` ou `PlugPagVoidType.VOID_QRCODE`.
- O que acontece quando `printReceipt` não é informado? → O estorno prossegue com `false` por padrão (sem impressão de comprovante).
- O que acontece quando o SDK lança uma exceção inesperada? → A promise rejeita com `PLUGPAG_INTERNAL_ERROR` e a mensagem da exceção.
- O que acontece quando `doRefund` é chamado durante um `doPayment` em andamento? → O comportamento não é garantido; chamadas concorrentes são responsabilidade do consumidor. O terminal PagBank serializa operações por hardware.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE expor a função `doRefund` que recebe os dados do estorno e retorna o resultado da operação.
- **FR-002**: A biblioteca DEVE expor o tipo `PlugPagVoidType` com os valores `'VOID_PAYMENT'` (cartão) e `'VOID_QRCODE'` (PIX/QR Code), sem expor os valores inteiros internos do SDK ao consumidor.
- **FR-003**: A biblioteca DEVE expor a interface `PlugPagRefundRequest` com os campos `transactionCode`, `transactionId`, `voidType` (obrigatórios) e `printReceipt` (opcional, padrão `false`).
- **FR-004**: `doRefund` DEVE rejeitar com mensagem de erro clara quando `transactionCode` estiver ausente ou em branco, sem acionar o terminal.
- **FR-005**: `doRefund` DEVE rejeitar com mensagem de erro clara quando `transactionId` estiver ausente ou em branco, sem acionar o terminal.
- **FR-006**: `doRefund` DEVE rejeitar com mensagem de erro clara quando `voidType` contiver valor fora do conjunto permitido, sem acionar o terminal.
- **FR-007**: `doRefund` DEVE rejeitar com mensagem prefixada com `[react-native-pagseguro-plugpag] ERROR:` quando chamado em plataforma iOS.
- **FR-008**: Quando o terminal rejeitar o estorno, `doRefund` DEVE rejeitar com código `PLUGPAG_REFUND_ERROR` e objeto `userInfo` contendo `result`, `errorCode` e `message`.
- **FR-009**: Quando uma exceção inesperada ocorrer, `doRefund` DEVE rejeitar com código `PLUGPAG_INTERNAL_ERROR` e `userInfo` com `result: -1`, `errorCode: 'INTERNAL_ERROR'` e `message`.
- **FR-010**: Durante o estorno, o terminal DEVE poder emitir eventos de progresso pelo canal `onPaymentProgress` existente, sem alterações na API de eventos.
- **FR-011**: O tipo de retorno `PlugPagTransactionResult` DEVE ser estendido com os campos opcionais `nsu`, `cardApplication`, `label`, `holderName`, `extendedHolderName` e `autoCode`, de forma retrocompatível com os consumidores existentes de `doPayment`.
- **FR-012**: O campo `printReceipt` DEVE assumir `false` quando não informado pelo consumidor.

### Key Entities

- **`PlugPagRefundRequest`**: Dados de entrada do estorno. Identifica a transação original pelo par `transactionCode` + `transactionId`, define o tipo de estorno via `voidType` e controla a impressão de comprovante via `printReceipt`.
- **`PlugPagVoidType`**: Conjunto fechado dos tipos de estorno suportados. `'VOID_PAYMENT'` para cartão (crédito/débito); `'VOID_QRCODE'` para PIX/QR Code. Os valores inteiros correspondentes do SDK são detalhes de implementação invisíveis ao consumidor.
- **`PlugPagTransactionResult`**: Resultado da operação de estorno (mesmo tipo do pagamento). Estendido com 6 campos opcionais que podem ser `null` dependendo do firmware do terminal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das funções exportadas pela feature possuem cobertura de testes unitários escritos antes da implementação (TDD), verificável pelo relatório do Jest.
- **SC-002**: `doRefund` rejeita corretamente em todos os cenários de entrada inválida sem acionar o terminal — 6 cenários de validação cobertos nos testes unitários.
- **SC-003**: A extensão de `PlugPagTransactionResult` com 6 campos opcionais não quebra nenhum teste existente das features 002 e 003, verificável por `yarn test` sem regressões.
- **SC-004**: O consumidor consegue estornar transações de cartão e PIX usando apenas os tipos e funções exportados, sem precisar conhecer nenhum valor inteiro interno do SDK.
- **SC-005**: `yarn test`, `yarn lint` e `yarn typecheck` passam sem erros ou avisos após a implementação completa.

## Assumptions

- O `transactionCode` e `transactionId` necessários foram previamente obtidos a partir do `PlugPagTransactionResult` retornado por `doPayment` ou `doAsyncPayment`.
- O terminal PagBank SmartPOS serializa operações de pagamento por hardware; chamadas concorrentes de `doRefund` e `doPayment` são consideradas uso indevido da biblioteca.
- Os 6 novos campos opcionais em `PlugPagTransactionResult` podem ser `null` dependendo da versão de firmware do terminal — isso é comportamento esperado do SDK.
- Não há variante assíncrona (`doAsyncRefund`) porque o SDK 1.33.0 não oferece listener/callback para `voidPayment`.

## Dependencies

- **feature/003 (Payment Methods)**: `doRefund` reutiliza o tipo `PlugPagTransactionResult`, o canal de eventos `onPaymentProgress` e os helpers de erro já implementados na camada nativa.
- **SDK `wrapper:1.33.0`**: Método `voidPayment` e os dois tipos de estorno suportados (`VOID_PAYMENT` e `VOID_QRCODE`).
