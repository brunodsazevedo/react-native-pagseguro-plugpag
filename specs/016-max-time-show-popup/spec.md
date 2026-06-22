# Feature Specification: Suporte a `maxTimeShowPopup` do `PlugPagCustomPrinterLayout`

**Feature Branch**: `feature/016-max-time-show-popup`  
**Created**: 2026-06-22  
**Status**: Draft  
**Input**: User description: "crie a spec a partir do PRD.md" (PRD: Suporte a `maxTimeShowPopup` do `PlugPagCustomPrinterLayout`)
**Origem**: [Issue #12](https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/12) — sugerida por @marcelozepn

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Liberar o fluxo de pagamento após timeout do popup de impressão (Priority: P1)

Como desenvolvedor de um aplicativo que consome a biblioteca em um terminal PagBank,
quero definir um tempo máximo de exibição do popup de impressão de comprovante numa
operação de pagamento, para que o fluxo do `doPayment` não fique travado
indefinidamente esperando o operador interagir com o terminal.

**Why this priority**: É o caso de uso central relatado na issue de origem. Hoje, quando
a impressão dispara um popup que aguarda ação do operador, a Promise do `doPayment` fica
pendente, travando a UX da aplicação consumidora. Sem esta capacidade, não há solução
para o problema reportado.

**Independent Test**: Pode ser testado de forma independente chamando `doPayment` com o
campo `maxTimeShowPopup` preenchido e confirmando que o valor é repassado ao terminal,
fazendo o popup fechar automaticamente após o tempo definido e liberando a conclusão da
operação sem intervenção manual.

**Acceptance Scenarios**:

1. **Given** uma requisição de pagamento com `printReceipt: true` e `maxTimeShowPopup: 10`,
   **When** o desenvolvedor chama `doPayment`, **Then** o valor `10` (segundos) é aplicado
   ao layout de impressão antes da operação e o popup fecha automaticamente após esse tempo.
2. **Given** uma requisição de pagamento sem o campo `maxTimeShowPopup`, **When** o
   desenvolvedor chama `doPayment`, **Then** o comportamento atual é preservado integralmente
   (nenhum layout é aplicado e o popup aguarda o operador indefinidamente).
3. **Given** uma requisição com `maxTimeShowPopup` igual a um número negativo, **When** o
   desenvolvedor chama `doPayment`, **Then** a chamada é rejeitada com uma mensagem de erro
   prefixada `[react-native-pagseguro-plugpag] ERROR:` antes de qualquer chamada nativa.
4. **Given** uma requisição com `maxTimeShowPopup` não-inteiro (ex.: `1.5`), **When** o
   desenvolvedor chama `doPayment`, **Then** a chamada é rejeitada com a mesma mensagem de
   erro prefixada `ERROR:`.

---

### User Story 2 - Mesmo controle de timeout no estorno (refund) (Priority: P1)

Como desenvolvedor que processa estornos em terminal PagBank, quero o mesmo controle de
tempo máximo do popup de impressão na operação de estorno (`doRefund`), porque o estorno
dispara o mesmo popup bloqueante de impressão e sofre do mesmo travamento.

**Why this priority**: O estorno tem exatamente o mesmo bloqueio do pagamento. Embora a
issue original cobrisse apenas pagamento, deixar o refund de fora criaria uma inconsistência
de comportamento na biblioteca. Mantém a paridade de API entre operações que imprimem.

**Independent Test**: Pode ser testado de forma independente chamando `doRefund` com
`maxTimeShowPopup` preenchido e confirmando que o valor é aplicado antes da operação de
estorno, com o popup fechando automaticamente.

**Acceptance Scenarios**:

1. **Given** uma requisição de estorno com `maxTimeShowPopup: 10`, **When** o desenvolvedor
   chama `doRefund`, **Then** o valor é aplicado ao layout de impressão antes da operação
   de estorno.
2. **Given** uma requisição de estorno sem o campo, **When** o desenvolvedor chama
   `doRefund`, **Then** o comportamento atual é preservado (nenhum layout aplicado).
3. **Given** uma requisição de estorno com `maxTimeShowPopup` negativo ou não-inteiro,
   **When** o desenvolvedor chama `doRefund`, **Then** a chamada é rejeitada com mensagem
   prefixada `ERROR:`.

---

### User Story 3 - Paridade na variante assíncrona de pagamento (Priority: P2)

Como desenvolvedor que usa a variante assíncrona `doAsyncPayment`, quero o mesmo campo
`maxTimeShowPopup` disponível, para que o comportamento seja idêntico ao da variante
síncrona, sem surpresas dependendo de qual variante eu escolho.

**Why this priority**: Garante consistência de superfície de API entre as variantes
síncrona e assíncrona. Importante para previsibilidade, mas secundário em relação ao
caso de uso central (P1), pois reusa a mesma capacidade.

**Independent Test**: Pode ser testado chamando `doAsyncPayment` com `maxTimeShowPopup`
preenchido e confirmando que o valor é aplicado antes da operação assíncrona, exatamente
como na variante síncrona.

**Acceptance Scenarios**:

1. **Given** uma requisição assíncrona com `maxTimeShowPopup: 10`, **When** o desenvolvedor
   chama `doAsyncPayment`, **Then** o valor é aplicado antes da operação assíncrona,
   idêntico ao `doPayment`.

---

### Edge Cases

- **Plataforma não suportada (iOS)**: Mesmo com `maxTimeShowPopup` presente, a chamada em
  iOS deve ser rejeitada com erro prefixado `ERROR:` — o guard de plataforma precede e tem
  precedência sobre a validação do campo.
- **Valor `0` explícito**: Equivale ao default do SDK (popup aguarda o operador
  indefinidamente). Deve ser aceito como valor válido (>= 0).
- **Falha ao aplicar o layout no nativo**: Se a aplicação do layout falhar no lado nativo,
  a operação deve falhar de forma explícita (erro propagado ao consumidor) — nunca engolir
  a exceção silenciosamente nem seguir o fluxo como se nada tivesse acontecido.
- **Campo omitido**: A biblioteca não deve aplicar nenhum layout nem precisar "resetar"
  configuração entre transações — a ausência da chamada preserva o comportamento padrão
  naturalmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A requisição de pagamento MUST aceitar um campo opcional `maxTimeShowPopup`
  representando o tempo máximo de exibição do popup de impressão **em segundos**.
- **FR-002**: A requisição de estorno MUST aceitar o mesmo campo opcional `maxTimeShowPopup`,
  com semântica idêntica (segundos).
- **FR-003**: Quando `maxTimeShowPopup` é fornecido, o sistema MUST aplicar o valor ao
  layout de impressão do terminal **imediatamente antes** de iniciar a operação correspondente
  (`doPayment`, `doAsyncPayment` ou `doRefund`).
- **FR-004**: Quando `maxTimeShowPopup` é omitido, o sistema MUST preservar o comportamento
  atual integralmente, sem aplicar qualquer configuração de layout.
- **FR-005**: O sistema MUST repassar o valor cru (inteiro, em segundos) ao terminal, sem
  conversão de unidade.
- **FR-006**: O sistema MUST validar, antes de qualquer chamada nativa, que `maxTimeShowPopup`
  (quando fornecido) é um número inteiro maior ou igual a `0`; caso contrário MUST rejeitar a
  operação com erro prefixado `[react-native-pagseguro-plugpag] ERROR:`.
- **FR-007**: O sistema MUST aceitar `0` como valor válido, equivalente ao default do SDK
  (popup aguarda o operador indefinidamente).
- **FR-008**: Em plataforma não suportada (iOS), o sistema MUST rejeitar a operação com erro
  prefixado `ERROR:` mesmo quando `maxTimeShowPopup` está presente, com o guard de plataforma
  tendo precedência sobre a validação do campo.
- **FR-009**: Se a aplicação do layout falhar no lado nativo, o sistema MUST propagar o erro
  ao consumidor de forma explícita — fallback silencioso é proibido.
- **FR-010**: O campo MUST ser opcional e não introduzir breaking change — consumidores
  existentes que não usam o campo MUST observar comportamento idêntico ao atual.
- **FR-011**: A variante assíncrona de pagamento MUST oferecer o mesmo campo com comportamento
  idêntico à variante síncrona.
- **FR-012**: A documentação pública (tipos, README EN/PT-BR, inventário de tipos) MUST
  declarar explicitamente que a unidade do campo é **segundos**.

### Key Entities *(include if feature involves data)*

- **Requisição de Pagamento**: Conjunto de parâmetros para iniciar uma transação de pagamento.
  Ganha o atributo opcional `maxTimeShowPopup` (inteiro >= 0, em segundos).
- **Requisição de Estorno**: Conjunto de parâmetros para iniciar uma transação de estorno.
  Ganha o mesmo atributo opcional `maxTimeShowPopup` com semântica idêntica.
- **Layout de Impressão (popup)**: Configuração de exibição do popup de impressão do terminal.
  O único campo relevante para esta feature é o tempo máximo de exibição (`maxTimeShowPopup`,
  em segundos). Demais campos do layout (cores, título) ficam fora de escopo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma operação de pagamento com impressão de comprovante e `maxTimeShowPopup`
  definido em N segundos, o popup fecha automaticamente em até N segundos sem qualquer
  interação do operador, e a operação conclui.
- **SC-002**: 100% das operações que omitem `maxTimeShowPopup` apresentam comportamento
  idêntico ao da versão anterior (zero regressão observável).
- **SC-003**: 100% das três operações afetadas (`doPayment`, `doAsyncPayment`, `doRefund`)
  suportam o campo com comportamento consistente entre si.
- **SC-004**: Toda entrada inválida (negativa ou não-inteira) é rejeitada antes de qualquer
  interação com o terminal, com mensagem de erro identificável pelo prefixo padrão.
- **SC-005**: Nenhuma falha na aplicação do layout é mascarada — 100% das falhas resultam em
  erro explícito reportado ao consumidor.

## Assumptions

- A unidade do campo é **segundos** (confirmado por inspeção do bytecode do
  `wrapper-1.35.0.aar` e pelo sample oficial, que usa o valor `10`). A premissa de
  milissegundos da issue original foi descartada.
- O valor default do terminal é `0` (popup aguarda o operador indefinidamente) e não há
  valor mínimo imposto pelo terminal além de `0`.
- A aplicação da configuração de layout não persiste entre transações de forma a afetar
  operações subsequentes; ela é aplicada apenas quando o campo é informado, dispensando
  qualquer "reset" quando o campo é omitido.
- Apenas o tempo máximo de exibição do popup é exposto nesta feature; os demais campos do
  layout (cores, título, textos) ficam para uma feature futura, se houver demanda.
- A capacidade existe no terminal alvo (`PlugPagServiceWrapper:1.35.0`), já em uso pela
  biblioteca — nenhuma atualização de SDK é necessária para esta feature.
- O escopo é Android-only, consistente com o restante da biblioteca.
