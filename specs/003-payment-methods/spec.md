# Feature Specification: Métodos de Pagamento (Crédito, Débito e PIX)

**Feature Branch**: `feature/003-payment-methods`
**Created**: 2026-03-24
**Status**: Ready for Implementation
**Input**: PRD — Feature 003: Métodos de Pagamento (Crédito, Débito e PIX)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pagamento via Crédito à Vista (Priority: P1)

Um desenvolvedor React Native integrando com um terminal PagSeguro chama `doPayment` com tipo `CREDIT`, valor em centavos, parcelamento `A_VISTA` e 1 parcela. Ele subscreve ao evento `onPaymentProgress` para atualizar a UI durante o fluxo (inserir cartão, digitar senha, processando). A chamada resolve com os dados da transação ou rejeita com erro estruturado.

**Why this priority**: Crédito à vista é o tipo de pagamento mais utilizado no mercado. É o caminho crítico que valida toda a arquitetura de eventos e o fluxo de `doPayment` ponta a ponta.

**Independent Test**: Pode ser testado de forma isolada chamando `doPayment` com dados de crédito válidos, verificando que a promise resolve com `PlugPagTransactionResult` contendo `transactionCode` preenchido, ou que a promise rejeita com um erro estruturado.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android com terminal ativado e cartão de crédito presente, **When** o desenvolvedor chama `doPayment({ type: 'CREDIT', amount: 1000, installmentType: 'A_VISTA', installments: 1, userReference: 'ORDER-001', printReceipt: true })`, **Then** a promise resolve com `PlugPagTransactionResult` contendo `transactionCode` não-nulo.

2. **Given** um app React Native no Android com terminal ativado, **When** o desenvolvedor chama `doPayment` e o SDK retorna resultado diferente de `RET_OK`, **Then** a promise rejeita com código `'PLUGPAG_PAYMENT_ERROR'` e `userInfo` estruturado contendo `result` (inteiro), `errorCode` (string) e `message` (string).

3. **Given** um app React Native no Android com uma falha interna inesperada no módulo, **When** o desenvolvedor chama `doPayment`, **Then** a promise rejeita com código `'PLUGPAG_INTERNAL_ERROR'` e `userInfo` estruturado com `result: -1`, `errorCode: 'INTERNAL_ERROR'` e a mensagem da exceção.

4. **Given** um app React Native rodando em iOS, **When** o desenvolvedor chama `doPayment`, **Then** a promise rejeita imediatamente com erro informativo prefixado com `[react-native-pagseguro-plugpag] ERROR:`, sem acesso ao módulo nativo.

---

### User Story 2 - Pagamento via Crédito Parcelado (Priority: P1)

Um desenvolvedor chama `doPayment` com tipo `CREDIT`, parcelamento `PARC_VENDEDOR` ou `PARC_COMPRADOR` e `installments >= 2`. O terminal guia o usuário pelo fluxo de parcelamento. O resultado da transação contém os dados de aprovação.

**Nota sobre crédito à vista vs. parcelado**: Crédito à vista (User Story 1) usa `installmentType: 'A_VISTA'` com `installments: 1`. Crédito parcelado usa `installmentType: 'PARC_VENDEDOR'` ou `'PARC_COMPRADOR'` com `installments >= 2`. A regra de validação JS é: se `installmentType` for `PARC_VENDEDOR` ou `PARC_COMPRADOR`, então `installments` DEVE ser `>= 2`.

**Why this priority**: Parcelamento é fundamental para o mercado brasileiro. A validação de que `installments >= 2` para parcelado e `installments == 1` para `A_VISTA` é crítica para evitar erros silenciosos no SDK.

**Independent Test**: Pode ser testado de forma isolada verificando que a chamada com `installmentType: 'PARC_VENDEDOR'` e `type: 'CREDIT'` não lança validação na camada JS e que os valores são corretamente serializados para o nativo.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android, **When** o desenvolvedor chama `doPayment` com `type: 'CREDIT'`, `installmentType: 'PARC_VENDEDOR'`, `installments: 3` e `amount: 30000`, **Then** a chamada não rejeita por validação JS e prossegue para o nativo.

2. **Given** um app React Native no Android, **When** o desenvolvedor chama `doPayment` com `installments: 0`, **Then** a promise rejeita imediatamente com erro de validação JS antes de chamar o módulo nativo.

3. **Given** um app React Native no Android, **When** o desenvolvedor chama `doPayment` com `installmentType: 'PARC_VENDEDOR'` e `installments: 1`, **Then** a promise rejeita imediatamente com erro de validação JS (parcelado exige `installments >= 2`).

4. **Given** um app React Native no Android, **When** o desenvolvedor chama `doPayment` com `type: 'PIX'` e `installmentType: 'PARC_VENDEDOR'`, **Then** a promise rejeita imediatamente com erro de validação JS (PIX só aceita `A_VISTA`).

5. **Given** um app React Native no Android, **When** o desenvolvedor chama `doPayment` com `type: 'DEBIT'` e `installmentType: 'PARC_COMPRADOR'`, **Then** a promise rejeita imediatamente com erro de validação JS (Débito só aceita `A_VISTA`).

---

### User Story 3 - Pagamento via PIX (Priority: P1)

Um desenvolvedor chama `doPayment` ou `doAsyncPayment` com tipo `PIX`, `installmentType: 'A_VISTA'` e `installments: 1`. O terminal exibe o QR Code ou aguarda a confirmação. A promise resolve quando o pagamento é confirmado ou rejeita se não aprovado.

**Why this priority**: PIX é amplamente utilizado no Brasil. O fluxo difere de cartão (sem inserção/PIN) e os eventos de progresso terão `eventCode`s distintos a serem documentados.

**Independent Test**: Pode ser testado de forma isolada verificando que `doPayment` com `type: 'PIX'` serializa corretamente a constante de tipo PIX no nativo e que os eventos de progresso são emitidos durante o fluxo.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android com terminal ativado, **When** o desenvolvedor chama `doPayment({ type: 'PIX', amount: 5000, installmentType: 'A_VISTA', installments: 1 })`, **Then** a chamada não rejeita por validação JS e prossegue ao nativo com os valores corretos.

2. **Given** um app React Native no Android, **When** o pagamento PIX é aprovado pelo SDK, **Then** a promise resolve com `PlugPagTransactionResult` válido.

---

### User Story 4 - Eventos de Progresso do Pagamento (Priority: P1)

Um desenvolvedor consome eventos de progresso do pagamento de duas formas possíveis, dependendo do contexto:

**Dentro de um componente React** — usa o hook `usePaymentProgress(callback)`. O hook registra o listener, repassa cada evento para o callback fornecido pelo consumidor, e remove o listener automaticamente no unmount. O consumidor é responsável por gerenciar seu próprio estado de UI a partir do callback.

**Fora de um componente React** (store Zustand, serviço, etc.) — usa a função utilitária `subscribeToPaymentProgress(callback)`, que retorna uma função `unsubscribe`. O consumidor chama `unsubscribe()` quando a transação terminar (no `finally` ou equivalente).

Em ambos os casos, o callback recebe `{ eventCode: number, customMessage: string | null }`.

**Why this priority**: Sem eventos de progresso, o consumidor não sabe quando exibir feedback visual. O terminal fica aguardando ação do usuário sem o app ter visibilidade — experiência de usuário inaceitável para uma aplicação de pagamentos.

**Design rationale — por que hook de callback, não hook de estado**:
A lib legada armazenava o evento como estado interno e o retornava — padrão que força re-render a cada evento e causa memory leak por ausência de cleanup. O padrão adotado aqui é o de **hook de callback**: o hook não possui estado, apenas conecta o listener nativo ao callback do consumidor, que decide o que fazer com o evento (atualizar estado, logar, acionar animação, etc.).

```typescript
// Padrão de uso — dentro de componente React
usePaymentProgress((event) => {
  setProgressMessage(event.customMessage);
  if (event.eventCode === PlugPagEventCode.WAITING_CARD) showInsertCardUI();
});

// Padrão de uso — fora de componente React
const unsubscribe = subscribeToPaymentProgress((event) => {
  store.setPaymentProgress(event);
});
try {
  await doPayment(data);
} finally {
  unsubscribe();
}
```

**Independent Test**: Pode ser testado verificando que o evento `'onPaymentProgress'` é emitido com os campos corretos (`eventCode`, `customMessage`) durante `doPayment`, e que os mecanismos de cleanup (unmount do hook / chamada de `unsubscribe`) removem o listener corretamente.

**Acceptance Scenarios**:

1. **Given** um componente React que usa `usePaymentProgress(callback)`, **When** o SDK emite um evento de progresso durante a transação, **Then** o callback recebe `{ eventCode: number, customMessage: string | null }` e nenhum re-render é causado pelo hook em si.

2. **Given** um componente React que usa `usePaymentProgress(callback)`, **When** o componente desmonta, **Then** o listener é removido automaticamente sem memory leak.

3. **Given** um código fora de componente React que usa `subscribeToPaymentProgress(callback)`, **When** `unsubscribe()` é chamado, **Then** o listener é removido e nenhum evento posterior é entregue ao callback.

4. **Given** um módulo que declara `addListener` e `removeListeners` na spec TurboModule, **When** o `NativeEventEmitter` é instanciado com o módulo nativo, **Then** nenhum warning do React Native é emitido sobre métodos ausentes.

---

### User Story 5 - Variante Assíncrona de Pagamento (Priority: P2)

Um desenvolvedor opta por usar `doAsyncPayment` em vez de `doPayment`. A experiência do desenvolvedor é idêntica: mesma assinatura de entrada (`PlugPagPaymentRequest`), mesmo formato de resultado (`PlugPagTransactionResult`), mesmos eventos de progresso, mesmo padrão de erros. A diferença arquitetural interna (listener como resolvedor primário) é transparente para o consumidor.

**Why this priority**: Fornece separação semântica entre as variantes síncrona e assíncrona, alinhada com o padrão estabelecido na feature/002. Permite evolução futura sem breaking change.

**Independent Test**: Pode ser testado de forma isolada verificando que `doAsyncPayment` resolve/rejeita com os mesmos formatos que `doPayment`, com os cenários: sucesso, erro SDK, erro interno e guard iOS.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android com terminal ativado, **When** o desenvolvedor chama `doAsyncPayment` com dados válidos, **Then** a promise resolve com o mesmo formato de `PlugPagTransactionResult` que `doPayment`.

2. **Given** um app React Native no Android, **When** o SDK reporta erro durante `doAsyncPayment`, **Then** a promise rejeita com código `'PLUGPAG_PAYMENT_ERROR'` no mesmo formato que `doPayment`.

3. **Given** um app React Native rodando em iOS, **When** o desenvolvedor chama `doAsyncPayment`, **Then** a promise rejeita com o mesmo erro informativo de guard iOS.

---

### User Story 6 - Demonstração no App de Exemplo (Priority: P3)

Um desenvolvedor que abre o app de exemplo vê uma demonstração funcional dos três tipos de pagamento (`doPayment`, `doAsyncPayment`) com subscrição ao evento `onPaymentProgress`.

**Why this priority**: O app de exemplo é a documentação viva da biblioteca. Demonstrar o uso correto dos três tipos de pagamento e dos eventos reduz a curva de adoção.

**Independent Test**: Pode ser verificado compilando o app de exemplo no Android e confirmando que o código de demonstração reflete os tipos e padrões corretos.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor que abre o app de exemplo no Android, **When** ele visualiza o app, **Then** o app demonstra `doPayment` e `doAsyncPayment` com subscrição ao evento `onPaymentProgress`.

2. **Given** o código do app de exemplo, **When** ele é inspecionado, **Then** não contém código de `multiply` nem imports não relacionados à feature de pagamento.

---

### Edge Cases

- O que acontece quando `amount = 0`? → Rejeita com erro de validação JS antes de chamar o nativo.
- O que acontece quando `amount` é negativo? → Rejeita com erro de validação JS (`amount <= 0`).
- O que acontece quando `installments = 0`? → Rejeita com erro de validação JS (`installments < 1`).
- O que acontece quando `installmentType: 'PARC_VENDEDOR'` e `installments: 1`? → Rejeita com erro de validação JS (parcelado exige `installments >= 2`).
- O que acontece quando `installmentType: 'A_VISTA'` e `installments: 3`? → Comportamento delegado ao SDK; a biblioteca não rejeita, pois o SDK PagSeguro ignora o valor de `installments` quando `installmentType` é `A_VISTA`.
- O que acontece quando `doPayment` é chamado sem o PinPad ativado? → O SDK retorna erro; a promise rejeita com `PLUGPAG_PAYMENT_ERROR`.
- O que acontece quando `doPayment` e `doAsyncPayment` são chamados simultaneamente? → Comportamento indefinido; chamadas concorrentes simultâneas não são suportadas. Responsabilidade do consumidor garantir serialização.
- O que acontece quando `userReference` não é fornecido? → Campo opcional; o nativo trata como `null` — comportamento padrão do SDK.
- O que acontece quando `userReference` tem mais de 10 caracteres? → Rejeita com erro de validação JS antes de chamar o nativo (FR-004a).
- O que acontece quando `printReceipt` não é fornecido? → Default `false`; sem impressão.
- O que acontece se o listener `onPaymentProgress` não for subscrito antes de `doPayment`? → O pagamento prossegue normalmente; eventos são emitidos mas não consumidos.

---

## Requirements *(mandatory)*

### Requisitos Não Funcionais

- **NFR-001**: `userReference` NUNCA deve ser logado nem incluído em mensagens de erro, saídas de log ou payloads de rejeição — é tratado como dado de referência do negócio do consumidor.
- **NFR-002**: `doPayment` DEVE executar a chamada SDK em thread de I/O — SDK bloqueante por IPC, executar na main thread causaria ANR. `doAsyncPayment` NÃO usa thread de I/O — usa listener nativo direto, sem coroutines, consistente com o padrão de `doAsyncInitializeAndActivatePinPad` da feature/002.
- **NFR-003**: `yarn lint` DEVE passar sem erros ou avisos após cada fase de implementação.
- **NFR-004**: Chamadas concorrentes simultâneas a `doPayment`/`doAsyncPayment` não são suportadas pela biblioteca. O consumidor é responsável pela serialização.

### Requisitos Funcionais

- **FR-001**: A biblioteca DEVE expor `doPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>` para pagamentos via chamada síncrona/bloqueante ao SDK.
- **FR-002**: A biblioteca DEVE expor `doAsyncPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult>` para pagamentos via listener nativo como resolvedor primário.
- **FR-003**: Ambas as funções DEVEM suportar os tipos `'CREDIT'`, `'DEBIT'` e `'PIX'`.
- **FR-004**: `amount` DEVE ser um inteiro positivo em centavos (ex: R$10,00 = 1000). Valor `<= 0` DEVE rejeitar com erro de validação JS.
- **FR-004a**: `userReference`, quando fornecido, DEVE ter no máximo 10 caracteres alfanuméricos — limite definido pelo SDK. Valor com comprimento `> 10` DEVE rejeitar com erro de validação JS antes de chamar o nativo.
- **FR-005**: `installments` DEVE ser um inteiro `>= 1`. Valor `< 1` DEVE rejeitar com erro de validação JS.
- **FR-005a**: Se `installmentType` for `'PARC_VENDEDOR'` ou `'PARC_COMPRADOR'`, então `installments` DEVE ser `>= 2`. Valor `< 2` com esses tipos DEVE rejeitar com erro de validação JS (parcelado exige pelo menos 2 parcelas).
- **FR-006**: `type = 'PIX'` ou `type = 'DEBIT'` com `installmentType != 'A_VISTA'` DEVE rejeitar com erro de validação JS antes de chamar o nativo.
- **FR-007**: A biblioteca DEVE emitir evento `'onPaymentProgress'` com `{ eventCode: number, customMessage: string | null }` durante a transação.
- **FR-007a**: A biblioteca DEVE exportar o hook `usePaymentProgress(callback: (event: PlugPagPaymentProgressEvent) => void): void` para uso em componentes React. O hook DEVE registrar o listener no mount e removê-lo automaticamente no unmount, sem armazenar estado interno.
- **FR-007b**: A biblioteca DEVE exportar a função utilitária `subscribeToPaymentProgress(callback: (event: PlugPagPaymentProgressEvent) => void): () => void` para uso fora de componentes React. O retorno é uma função `unsubscribe` que remove o listener quando chamada.
- **FR-008**: Ambas as funções DEVEM resolver com `PlugPagTransactionResult` quando o SDK retornar sucesso.
- **FR-009**: Ambas as funções DEVEM rejeitar com código `'PLUGPAG_PAYMENT_ERROR'` e `userInfo: { result: number, errorCode: string, message: string }` quando o SDK retornar erro.
- **FR-010**: Ambas as funções DEVEM rejeitar com código `'PLUGPAG_INTERNAL_ERROR'` e `userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message: string }` em caso de exceção inesperada.
- **FR-011**: Ambas as funções DEVEM rejeitar com erro prefixado `[react-native-pagseguro-plugpag] ERROR:` quando chamadas em iOS, antes de qualquer acesso ao módulo nativo.
- **FR-012**: `addListener(eventName: string): void` e `removeListeners(count: number): void` DEVEM ser declarados na spec TurboModule e implementados com corpo vazio no nativo — contratos obrigatórios para `NativeEventEmitter`.
- **FR-013**: O app de exemplo DEVE demonstrar `doPayment` e `doAsyncPayment` com subscrição ao evento `'onPaymentProgress'` para os três tipos de pagamento.
- **FR-014**: A suíte de testes Jest DEVE cobrir, para cada função de pagamento exportada: guard iOS, sucesso Android, erro SDK Android e erro interno Android (mínimo 8 cenários de pagamento). Adicionalmente, DEVE cobrir `usePaymentProgress` (cleanup no unmount, entrega de evento ao callback) e `subscribeToPaymentProgress` (entrega de evento, remoção via unsubscribe) — mínimo 4 cenários adicionais. DEVE cobrir ainda a validação de `userReference` com mais de 10 caracteres (FR-004a).
- **FR-015**: Testes unitários nativos DEVEM cobrir `doPayment` e `doAsyncPayment`: sucesso, erro SDK e erro interno (mínimo 6 cenários).

### Entidades Principais

- **PlugPagPaymentRequest**: Dados de entrada do pagamento. Campos: `type` (string enum: `'CREDIT' | 'DEBIT' | 'PIX'`), `amount` (inteiro em centavos), `installmentType` (string enum: `'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'`), `installments` (inteiro), `userReference?` (string, máx 10 chars alfanuméricos), `printReceipt?` (booleano, default `false`).
- **PlugPagTransactionResult**: Resultado de uma transação aprovada. Campos nullable: `transactionCode`, `transactionId`, `date`, `time`, `hostNsu`, `cardBrand`, `bin`, `holder`, `userReference`, `terminalSerialNumber`, `amount`, `availableBalance`.
- **PlugPagPaymentProgressEvent**: Evento de progresso emitido durante a transação. Campos: `eventCode` (inteiro), `customMessage` (string | null).
- **usePaymentProgress**: Hook React exportado. Assinatura: `(callback: (event: PlugPagPaymentProgressEvent) => void): void`. Registra o listener no mount, remove no unmount. Não armazena estado interno — zero re-renders causados pelo hook.
- **subscribeToPaymentProgress**: Função utilitária exportada para uso fora de componentes React. Assinatura: `(callback: (event: PlugPagPaymentProgressEvent) => void): () => void`. Retorna função `unsubscribe` que remove o listener quando chamada.
- **PlugPagPaymentType**: String literal type `'CREDIT' | 'DEBIT' | 'PIX'`. Mapeado para constantes do SDK no nativo.
- **PlugPagInstallmentType**: String literal type `'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR'`. Mapeado para constantes do SDK no nativo.
- **Erro de Pagamento (SDK)**: Erro estruturado com `result` (inteiro do SDK), `errorCode` (string do SDK) e `message`. Código de rejeição: `'PLUGPAG_PAYMENT_ERROR'`.
- **Erro de Pagamento (Interno)**: Erro estruturado com `result: -1`, `errorCode: 'INTERNAL_ERROR'` e mensagem da exceção. Código de rejeição: `'PLUGPAG_INTERNAL_ERROR'`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor React Native consegue realizar um pagamento de crédito, débito ou PIX em menos de 10 linhas de código de aplicação usando qualquer uma das funções de pagamento.
- **SC-002**: 100% dos cenários de erro de pagamento (erros do SDK e erros internos) são surfaceados via rejeição de promise — zero erros exigem inspecionar o valor resolvido.
- **SC-003**: O desenvolvedor consegue distinguir programaticamente entre falha reportada pelo SDK (`PLUGPAG_PAYMENT_ERROR`) e erro interno inesperado (`PLUGPAG_INTERNAL_ERROR`) sem parsear mensagens de string.
- **SC-004**: Eventos `'onPaymentProgress'` são recebidos no JS durante o fluxo de pagamento, permitindo controle de UI sem polling.
- **SC-005**: O app de exemplo compila e executa no Android, demonstrando `doPayment` e `doAsyncPayment` com eventos de progresso, sem erros de compilação.
- **SC-006**: Todos os cenários de teste Jest (mínimo 8) e nativos (mínimo 6) passam com taxa de sucesso de 100%.
- **SC-007**: `yarn lint` passa com zero erros ou avisos após a implementação completa.
- **SC-008**: Chamada a `doPayment` ou `doAsyncPayment` em iOS rejeita imediatamente com mensagem informativa, sem crash do app.

---

## Clarifications

### Resolvidas

- **C-001** *(RESOLVIDA)*: Os valores inteiros de tipos de pagamento **não são hardcoded na biblioteca**. O TypeScript expõe `const` objects com string keys (`'CREDIT'`, `'DEBIT'`, `'PIX'`); o nativo faz o mapeamento referenciando as constantes do SDK diretamente. Se a PagSeguro alterar os inteiros em versões futuras, o nativo os pega automaticamente — zero risco de dessincronização.
- **C-002** *(RESOLVIDA)*: Mapeamento dos tipos de parcelamento realizado pelo nativo referenciando as constantes do SDK diretamente.
- **C-003** *(RESOLVIDA)*: `PlugPagEventData` expõe `getEventCode(): Int` e `getCustomMessage(): String` — exatamente o shape `{ eventCode, customMessage }` do spec. Constantes disponíveis incluem: `EVENT_CODE_WAITING_CARD`, `EVENT_CODE_INSERTED_CARD`, `EVENT_CODE_PIN_REQUESTED`, `EVENT_CODE_PIN_OK`, `EVENT_CODE_AUTHORIZING`, `EVENT_CODE_SALE_END`, `EVENT_CODE_SALE_APPROVED`, `EVENT_CODE_SALE_NOT_APPROVED`, `EVENT_CODE_WAITING_REMOVE_CARD`, `EVENT_CODE_REMOVED_CARD`, `EVENT_CODE_QRCODE`, `EVENT_CODE_QRCODE_SHOWED`, `EVENT_CODE_CUSTOM_MESSAGE`, entre outros.
- **C-004** *(RESOLVIDA)*: `doAsyncPayment` usa `PlugPagPaymentListener` (não `PlugPagEventListener`). Essa interface possui `onSuccess(PlugPagTransactionResult)` e `onError(PlugPagTransactionResult)` dedicados — resolvedor primário confiável. Não é necessário fallback.
- **C-005** *(RESOLVIDA)*: `PlugPagEventListener` só tem `onEvent(PlugPagEventData)`. A arquitetura correta: `doPayment` registra `PlugPagEventListener` via `setEventListener` antes de chamar o SDK; `doAsyncPayment` usa `PlugPagPaymentListener` que implementa `onSuccess`, `onError` e `onPaymentProgress(PlugPagEventData)`.
- **C-006** *(RESOLVIDA)*: Conversão de tipos realizada exclusivamente no nativo. O consumidor JS usa strings (`PaymentType.CREDIT`), nunca inteiros do SDK.
- **C-007** *(RESOLVIDA)*: `PlugPagEventListener` lifecycle em `doPayment` — o listener DEVE ser substituído por um objeto no-op no bloco `finally` após a conclusão do pagamento. `setEventListener(null)` é **proibido** — o parâmetro é `@NotNull`.
- **C-008** *(RESOLVIDA)*: `PlugPagPaymentListener.onError(result)` em `doAsyncPayment` rejeita a promise diretamente com `PLUGPAG_PAYMENT_ERROR` sem verificar `result.result`. O contrato do SDK garante que `onError` é sempre falha.
- **C-009** *(RESOLVIDA)*: `addListener`/`removeListeners` — assinatura nativa correta: `count` é `Double` (não `Int`). O codegen do React Native mapeia `number` TypeScript para `Double` no Kotlin.
- **C-010** *(RESOLVIDA)*: Tipo de entrada renomeado para `PlugPagPaymentRequest` em toda a API pública JS/TS. `PlugPagPaymentData` descartado para evitar colisão com a classe de mesmo nome do SDK.
- **C-011** *(RESOLVIDA)*: `usePaymentProgress` e `subscribeToPaymentProgress` DEVEM usar `NativeEventEmitter` instanciado com o módulo nativo, não `DeviceEventEmitter`. A instância é compartilhada no módulo.

### Pendentes

Nenhuma clarificação bloqueante pendente. Todas as C-001 a C-011 foram resolvidas.

---

## Assumptions

- O SDK PagSeguro `wrapper:1.33.0` já está configurado como dependência no `android/build.gradle` a partir da feature/001.
- O terminal PagSeguro já foi ativado via feature/002 antes de chamar `doPayment`. A biblioteca não verifica estado de ativação — pré-condição do consumidor.
- A instância do SDK existente no módulo nativo será reutilizada sem criação de nova instância.
- A conversão dos string enums TypeScript para constantes inteiras do SDK ocorre exclusivamente no nativo, mantendo o consumidor JS isolado das constantes do SDK.
- Campos do `PlugPagTransactionResult` omitidos na v1 podem ser adicionados em versões futuras sem breaking change.
- O gerenciamento de timeout é delegado inteiramente ao SDK e ao Android OS.
- Chamadas concorrentes simultâneas a `doPayment`/`doAsyncPayment` não são suportadas; o consumidor é responsável pela serialização.
- `printReceipt` tem default `false` quando não fornecido pelo consumidor.
- A biblioteca não valida se o terminal suporta o tipo de pagamento solicitado — essa validação ocorre no SDK.
