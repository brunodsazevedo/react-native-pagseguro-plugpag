# Feature Specification: Fail-Fast em Tipos de Pagamento, Parcelamento e Estorno

**Feature Branch**: `bugfix/011-fail-fast-type-validation`
**Created**: 2026-04-28
**Status**: Draft
**Related**: [Issue #10](https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Rejeição de Tipo de Pagamento Inválido (Priority: P1)

Um integrador que usa a biblioteca envia uma requisição de pagamento com um valor de tipo
inválido (por exemplo, um typo, um valor vindo de uma API externa sem validação, ou código
JavaScript sem tipagem estrita). O sistema deve rejeitar a requisição imediatamente com uma
mensagem de erro clara que identifica o valor recebido e os valores aceitos.

**Why this priority**: É o caso de bug mais crítico — um pagamento sendo processado como
crédito quando o integrador pretendia débito ou PIX representa risco financeiro direto ao
negócio.

**Independent Test**: Pode ser testado enviando uma requisição de pagamento com
`type: "INVALIDO"` e verificando que a operação é rejeitada com mensagem de erro descritiva,
sem processar nenhuma transação.

**Acceptance Scenarios**:

1. **Given** um integrador envia uma requisição de pagamento com `type` contendo um valor não reconhecido pela biblioteca, **When** a requisição é processada, **Then** a operação é rejeitada com um erro explícito que identifica o valor inválido e lista os valores aceitos (`CREDIT`, `DEBIT`, `PIX`).
2. **Given** um integrador envia uma requisição de pagamento com `type` indefinido ou nulo, **When** a requisição é processada, **Then** a operação é rejeitada com um erro explícito.
3. **Given** um integrador envia uma requisição de pagamento com `type: "CREDIT"` (válido), **When** a requisição é processada, **Then** a operação prossegue normalmente sem nenhuma alteração de comportamento.

---

### User Story 2 — Rejeição de Tipo de Parcelamento Inválido (Priority: P2)

Um integrador envia uma requisição de pagamento com um valor de tipo de parcelamento
inválido. O sistema deve rejeitar a requisição imediatamente, evitando que uma venda
parcelada seja processada como à vista (ou vice-versa) sem nenhum aviso.

**Why this priority**: Processamento silencioso de parcelamento incorreto causa prejuízo
financeiro ao lojista sem nenhum diagnóstico disponível.

**Independent Test**: Pode ser testado enviando uma requisição de pagamento com
`installmentType: "PARCELADO"` (valor inválido) e verificando rejeição com mensagem
descritiva.

**Acceptance Scenarios**:

1. **Given** um integrador envia uma requisição de pagamento com `installmentType` contendo valor não reconhecido, **When** a requisição é processada, **Then** a operação é rejeitada com erro explícito indicando o valor inválido e os valores aceitos (`A_VISTA`, `PARC_VENDEDOR`, `PARC_COMPRADOR`).
2. **Given** um integrador envia uma requisição com `installmentType: "A_VISTA"` (válido), **When** a requisição é processada, **Then** a operação prossegue normalmente.

---

### User Story 3 — Rejeição de Tipo de Estorno Inválido (Priority: P3)

Um integrador envia uma requisição de estorno com um valor de tipo de estorno inválido.
O sistema deve rejeitar a requisição imediatamente, evitando que um estorno seja executado
com o tipo errado sem aviso ao integrador.

**Why this priority**: Estornos com tipo incorreto podem resultar em falhas silenciosas ou
inconsistências financeiras. Menos crítico que pagamento pois é menos frequente, mas
igualmente perigoso.

**Independent Test**: Pode ser testado enviando uma requisição de estorno com
`voidType: "ESTORNO"` (valor inválido) e verificando rejeição com mensagem descritiva.

**Acceptance Scenarios**:

1. **Given** um integrador envia uma requisição de estorno com `voidType` contendo valor não reconhecido, **When** a requisição é processada, **Then** a operação é rejeitada com erro explícito indicando o valor inválido e os valores aceitos (`VOID_PAYMENT`, `VOID_QRCODE`).
2. **Given** um integrador envia uma requisição de estorno com `voidType: "VOID_PAYMENT"` (válido), **When** a requisição é processada, **Then** a operação prossegue normalmente.

---

### Edge Cases

- O que acontece quando o valor de `type`, `installmentType` ou `voidType` é `null` ou `undefined`? → Deve ser rejeitado como valor inválido, com mensagem de erro descritiva.
- O que acontece quando o valor possui capitalização incorreta (ex: `"credit"` em vez de `"CREDIT"`)? → Deve ser rejeitado — o sistema não faz normalização silenciosa.
- O que acontece quando a requisição é enviada por código JavaScript puro (sem TypeScript) com valores incorretos? → O comportamento de rejeição deve ser idêntico ao de código TypeScript — a validação é feita na camada da biblioteca, não apenas em compile-time.
- O que acontece com chamadas síncronas e assíncronas do mesmo método de pagamento? → Ambas as variantes (`doPayment` e `doAsyncPayment`) devem rejeitar da mesma forma.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE rejeitar qualquer requisição de pagamento cujo campo `type` contenha um valor fora do conjunto `{CREDIT, DEBIT, PIX}`, retornando um erro com o código de erro interno e uma mensagem que inclua o valor inválido recebido e os valores esperados.
- **FR-002**: A biblioteca DEVE rejeitar qualquer requisição de pagamento cujo campo `installmentType` contenha um valor fora do conjunto `{A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR}`, com mensagem idêntica ao FR-001 na estrutura.
- **FR-003**: A biblioteca DEVE rejeitar qualquer requisição de estorno cujo campo `voidType` contenha um valor fora do conjunto `{VOID_PAYMENT, VOID_QRCODE}`, com mensagem idêntica ao FR-001 na estrutura.
- **FR-004**: Todas as requisições com valores válidos de `type`, `installmentType` e `voidType` DEVEM continuar sendo processadas normalmente, sem nenhuma alteração de comportamento.
- **FR-005**: A mensagem de erro retornada ao chamador DEVE incluir (a) o valor inválido recebido e (b) a lista de valores aceitos, para facilitar diagnóstico sem necessidade de consultar documentação.
- **FR-006**: A rejeição por valor inválido DEVE usar o mesmo código de erro já utilizado pela biblioteca para erros internos, mantendo consistência com a API de erros existente.
- **FR-007**: O comportamento de rejeição DEVE ser idêntico para as variantes síncrona e assíncrona de cada operação de pagamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das requisições de pagamento e estorno com valores de tipo inválidos são rejeitadas com erros explícitos — zero processamentos silenciosos com fallback.
- **SC-002**: A mensagem de erro permite ao integrador identificar e corrigir o problema sem consultar documentação externa (erro auto-documentado: contém o valor recebido e os valores aceitos).
- **SC-003**: 100% dos fluxos válidos de pagamento (crédito, débito, PIX) e estorno continuam funcionando corretamente após a correção — zero regressões.
- **SC-004**: O comportamento de rejeição é consistente entre as variantes síncrona e assíncrona da mesma operação — nenhuma discrepância entre variantes.
- **SC-005**: Integradores que usam JavaScript puro (sem TypeScript) recebem o mesmo comportamento de rejeição explícita que integradores TypeScript — a proteção não depende de verificação em tempo de compilação.

## Assumptions

- A biblioteca é consumida por desenvolvedores integrando terminais PagBank SmartPOS em aplicativos React Native Android.
- Integradores podem usar JavaScript puro (sem TypeScript), dados dinâmicos de APIs externas, ou código legado com supressão de tipagem — a validação não pode depender exclusivamente do sistema de tipos do TypeScript.
- O comportamento de erros existente na biblioteca (código de erro interno + mensagem descritiva) é o padrão a ser seguido — não é necessário introduzir um novo código de erro.
- Consumidores que já usam os valores corretos não serão impactados por esta correção.
- Consumidores que dependiam acidentalmente do comportamento de fallback silencioso precisarão corrigir seus inputs — este comportamento nunca foi documentado ou garantido.
- A correção é classificada como `patch` na semântica de versões, pois corrige comportamento incorreto e não documentado.
