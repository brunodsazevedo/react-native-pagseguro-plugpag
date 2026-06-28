# Feature Specification: Cálculo de Parcelas (`calculateInstallments`)

**Feature Branch**: `feature/017-calculate-installments`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User description: "crie uma spec a partir @prd.md" — PRD do método `calculateInstallments` para o domínio `payment`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar opções de parcelamento antes da venda (Priority: P1)

Um desenvolvedor que integra a biblioteca em um app de PDV (ponto de venda) precisa exibir
ao operador/cliente as opções de parcelamento disponíveis **antes** de iniciar o pagamento.
A partir de um valor de venda e de um tipo de parcelamento, o app obtém uma lista estruturada
de parcelas — quantidade, valor de cada parcela e total da transação — para montar a própria
tela de seleção, e só então chamar `doPayment`.

**Why this priority**: É o objetivo central da feature e o único fluxo de valor. Sem ele o
app não consegue apresentar opções de parcelamento de forma estruturada; hoje essa
capacidade não existe na biblioteca. O `SDK_COVERAGE_REPORT.md` marca este método como
prioridade **Alta**.

**Independent Test**: Em um terminal PagBank SmartPOS, chamar
`calculateInstallments({ amount: 10000, installmentType: 'PARC_COMPRADOR' })` e verificar
que a Promise resolve com `{ options: [...] }`, onde cada item contém `quantity`, `amount` e
`total` coerentes com o valor informado. Entrega valor de forma independente — o consumidor
já pode renderizar uma UI de parcelas sem depender de nenhuma outra feature.

**Acceptance Scenarios**:

1. **Given** um terminal PagBank SmartPOS e um valor de venda válido em centavos, **When** o
   app chama `calculateInstallments` com `installmentType` válido, **Then** a Promise resolve
   com `{ options: PlugPagInstallment[] }`, cada item contendo `quantity`, `amount` (valor de
   cada parcela em centavos) e `total` (total da transação em centavos).
2. **Given** um valor para o qual o SDK não retorna nenhuma opção de parcelamento, **When** o
   app chama `calculateInstallments`, **Then** a Promise resolve com `{ options: [] }` (lista
   vazia é resultado válido, não erro).

---

### User Story 2 - Validação fail-fast da requisição (Priority: P2)

Antes de qualquer chamada nativa, a requisição deve ser validada na camada JavaScript. Se o
valor ou o tipo de parcelamento forem inválidos, a operação deve falhar imediatamente com uma
mensagem clara e prefixada, sem acionar o SDK.

**Why this priority**: Protege o consumidor de erros nativos obscuros e mantém consistência
com o padrão de validação fail-fast já adotado na biblioteca (ex.: `maxTimeShowPopup`,
`doPayment`). Depende da existência da função (P1), mas é independentemente testável.

**Independent Test**: Chamar `calculateInstallments` com `amount = 0`, negativo, não-inteiro,
ou com `installmentType` inválido e verificar que a Promise rejeita com a mensagem prefixada
correspondente **sem** que o módulo nativo seja invocado.

**Acceptance Scenarios**:

1. **Given** uma requisição com `amount` igual a `0`, negativo ou não-inteiro, **When** o app
   chama `calculateInstallments`, **Then** a Promise rejeita com
   `[react-native-pagseguro-plugpag] ERROR: calculateInstallments() — amount must be an integer > 0.`
   antes de qualquer chamada nativa.
2. **Given** uma requisição com `installmentType` fora de `A_VISTA | PARC_VENDEDOR |
   PARC_COMPRADOR` (ex.: `'PARCELADO'` ou `null`), **When** o app chama
   `calculateInstallments`, **Then** a Promise rejeita com mensagem indicando que o
   `installmentType` informado não é válido e listando os valores aceitos.

---

### User Story 3 - Comportamento por plataforma e propagação de erro do SDK (Priority: P3)

A biblioteca é Android-only. Em iOS, qualquer chamada deve rejeitar com erro prefixado
capturável (sem travar o app no import). Em Android, erros do SDK devem ser propagados com
códigos de erro padronizados.

**Why this priority**: Garante consistência com o restante da API pública (guard de iOS de
dois níveis, tabela de códigos de erro da constituição). É comportamento transversal,
secundário ao fluxo principal.

**Independent Test**: Simular `Platform.OS = 'ios'` e verificar rejeição prefixada; em
Android, simular `PlugPagException` do SDK e verificar rejeição com `PLUGPAG_INSTALLMENTS_ERROR`.

**Acceptance Scenarios**:

1. **Given** a plataforma iOS, **When** o app chama `calculateInstallments` (mesmo com
   requisição inválida), **Then** a Promise rejeita com erro prefixado
   `[react-native-pagseguro-plugpag] ERROR:` contendo `calculateInstallments()`, e o guard de
   plataforma precede a validação de entrada.
2. **Given** Android, **When** o SDK lança `PlugPagException` durante o cálculo, **Then** a
   Promise rejeita com código `PLUGPAG_INSTALLMENTS_ERROR`, propagando `message` e `errorCode`
   do SDK.
3. **Given** Android, **When** ocorre qualquer outra exceção não originada do SDK, **Then** a
   Promise rejeita com código `PLUGPAG_INTERNAL_ERROR`.

---

### Edge Cases

- **Lista vazia**: quando o SDK não retorna opções, a operação resolve com `{ options: [] }` —
  não é tratado como erro.
- **`amount` não-inteiro** (ex.: `10.5`): rejeitado pela mesma regra de `amount` (`integer > 0`),
  mais rígida que `doPayment.amount`.
- **`installmentType` ausente ou `null`**: rejeitado pela validação de tipo de parcelamento.
- **iOS antes da validação**: o guard de plataforma sempre tem precedência sobre a validação de
  entrada — uma requisição inválida em iOS rejeita pela mensagem do guard, não pela de validação.
- **Falha de comunicação com o SDK (IPC)**: propagada como `PLUGPAG_INSTALLMENTS_ERROR` (se
  `PlugPagException`) ou `PLUGPAG_INTERNAL_ERROR` (qualquer outra exceção).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor uma função pública `calculateInstallments(data)` no domínio
  `payment`, que recebe um objeto de requisição e retorna uma Promise com as opções de
  parcelamento estruturadas.
- **FR-002**: A requisição MUST conter `amount` (valor da venda em centavos) e `installmentType`
  (tipo de parcelamento).
- **FR-003**: O sistema MUST validar que `amount` é um inteiro estritamente maior que zero;
  `0`, valores negativos e não-inteiros MUST ser rejeitados pela mesma regra e com a mesma
  mensagem (`amount must be an integer > 0.`).
- **FR-004**: O sistema MUST validar que `installmentType` pertence ao conjunto existente
  `A_VISTA | PARC_VENDEDOR | PARC_COMPRADOR`, reutilizando o tipo/enum já definido no domínio
  `payment` (sem novo enum). Valores fora do conjunto MUST ser rejeitados com mensagem que
  liste os valores aceitos.
- **FR-005**: Toda validação de entrada MUST ocorrer **antes** de qualquer chamada nativa
  (fail-fast), e MUST usar o estilo de mensagens prefixadas
  (`[react-native-pagseguro-plugpag] ERROR: ...`) já adotado na biblioteca.
- **FR-006**: Em sucesso, o sistema MUST resolver com um objeto `{ options: PlugPagInstallment[] }`,
  onde cada `PlugPagInstallment` contém `quantity` (número de parcelas), `amount` (valor de cada
  parcela em centavos) e `total` (total da transação em centavos).
- **FR-007**: Uma lista vazia retornada pelo SDK MUST ser resolvida como `{ options: [] }` e NÃO
  MUST ser tratada como erro.
- **FR-008**: Em iOS (qualquer plataforma diferente de Android), qualquer chamada MUST rejeitar
  com erro prefixado `[react-native-pagseguro-plugpag] ERROR:` contendo `calculateInstallments()`;
  o guard de plataforma MUST preceder a validação de entrada e NÃO MUST travar o app no import.
- **FR-009**: Quando o SDK sinalizar erro via exceção própria, o sistema MUST rejeitar com o
  código `PLUGPAG_INSTALLMENTS_ERROR`, preservando a mensagem e o código de erro originais do SDK.
- **FR-010**: Quando ocorrer qualquer exceção não originada do SDK durante o processamento
  nativo, o sistema MUST rejeitar com o código `PLUGPAG_INTERNAL_ERROR`.
- **FR-011**: O sistema MUST converter `amount` (centavos, inteiro na API pública) para o formato
  exigido pelo SDK na camada nativa, sem expor essa conversão ao consumidor.
- **FR-012**: A função e seus tipos MUST ser disponibilizados na superfície pública da biblioteca
  por meio dos mecanismos de re-export existentes do domínio `payment`.

### Key Entities *(include if feature involves data)*

- **CalculateInstallmentsRequest**: requisição de cálculo. Atributos: `amount` (centavos,
  inteiro > 0) e `installmentType` (um de `A_VISTA | PARC_VENDEDOR | PARC_COMPRADOR`).
- **PlugPagInstallment**: uma opção de parcelamento. Atributos: `quantity` (número de parcelas),
  `amount` (valor de cada parcela, em centavos), `total` (total da transação, em centavos).
- **CalculateInstallmentsResult**: resultado do cálculo. Atributo: `options` (lista de
  `PlugPagInstallment`; pode ser vazia).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em um terminal PagBank SmartPOS, 100% das chamadas com requisição válida resolvem
  com uma lista de opções estruturadas (`quantity`/`amount`/`total`) coerente com o valor
  informado.
- **SC-002**: 100% das requisições com `amount` inválido (`0`, negativo ou não-inteiro) ou
  `installmentType` inválido são rejeitadas **antes** de qualquer chamada nativa, com a mensagem
  prefixada esperada.
- **SC-003**: Em iOS, 100% das chamadas rejeitam com erro prefixado capturável e o app abre
  normalmente (o import não lança).
- **SC-004**: Erros do SDK são mapeados corretamente — `PLUGPAG_INSTALLMENTS_ERROR` para exceção
  do SDK e `PLUGPAG_INTERNAL_ERROR` para demais exceções — em 100% dos cenários de falha testados.
- **SC-005**: A feature é aditiva e não-breaking: nenhuma assinatura, tipo ou comportamento
  público existente é alterado (incluindo a validação atual de `doPayment`).
- **SC-006**: Cobertura de teste: 100% das novas funções exportadas têm teste unitário JS, e o
  novo método nativo tem teste de integração; validações de lint passam sem erros ou avisos.

## Assumptions

- O consumidor opera em terminal PagBank SmartPOS (A920, A930, P2, S920); iOS está explicitamente
  fora de escopo (Android-only).
- Apenas a **versão síncrona estruturada** do método é exposta; **não** há variante assíncrona
  nesta fase (a variante async do SDK devolve apenas strings formatadas e agrega pouco para uma
  leitura rápida).
- A entrada é fornecida como **objeto `request`** (não argumentos posicionais), consistente com
  `PlugPagPaymentRequest`.
- `amount` na API pública é expresso em **centavos** como inteiro, consistente com
  `PlugPagPaymentRequest.amount`; a conversão para o formato do SDK ocorre na camada nativa.
- O `installmentType` reutiliza o tipo/enum de parcelamento já existente no domínio `payment` —
  nenhum novo enum é introduzido.
- A capacidade de execução depende do SDK `PlugPagServiceWrapper` 1.35.0, cujas assinaturas
  relevantes foram confirmadas por decompilação do AAR em cache (versão síncrona estruturada
  disponível e não depreciada na 1.35.0).
- Tratamento de erro do método síncrono é por exceção do SDK (não há `result`/`RET_OK`), diferente
  do padrão de `doPayment`.
- A versão da biblioteca recebe um incremento aditivo (patch), por ser uma adição não-breaking.
