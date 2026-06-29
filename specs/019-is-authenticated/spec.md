# Feature Specification: Consulta de Estado de Ativação do Terminal (`isAuthenticated`)

**Feature Branch**: `feature/019-is-authenticated`
**Created**: 2026-06-29
**Status**: Draft
**Input**: User description: "vamos criar uma spec a partir da PRD.md (Feature 019 — isAuthenticated & asyncIsAuthenticated)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar ativação antes de iniciar uma venda (Priority: P1)

Como desenvolvedor de um app de PDV rodando em terminal PagBank SmartPOS, preciso saber
se o terminal já está ativado/autenticado **antes** de abrir a tela de venda, para decidir
se devo ou não disparar o fluxo de ativação do PinPad. Hoje a única forma de descobrir o
estado é tentar ativar (ou iniciar uma transação) e observar o resultado — o que dispara um
fluxo de ativação desnecessário e prejudica a experiência do operador.

**Why this priority**: É o caso de uso central da feature e a razão de existir — sem ele, o
consumidor da biblioteca continua sem uma maneira limpa de checar o estado de ativação. Entrega
valor sozinho e é um MVP completo.

**Independent Test**: Pode ser totalmente testado chamando a função de consulta em um terminal
ativado (espera-se `true`) e em um terminal não ativado (espera-se `false`), sem necessidade de
nenhum outro método da feature.

**Acceptance Scenarios**:

1. **Given** um terminal PagBank já ativado, **When** o app consulta o estado de ativação,
   **Then** a consulta retorna verdadeiro sem disparar nenhum fluxo de ativação.
2. **Given** um terminal PagBank ainda não ativado, **When** o app consulta o estado de ativação,
   **Then** a consulta retorna falso (resultado válido, não um erro) sem disparar fluxo de ativação.
3. **Given** o resultado da consulta, **When** o resultado é falso, **Then** o app pode encadear o
   fluxo de ativação existente (`initializeAndActivatePinPad`); **When** o resultado é verdadeiro,
   **Then** o app segue direto para a tela de venda.

---

### User Story 2 - Consulta assíncrona via listener nativo (Priority: P2)

Como desenvolvedor que prefere a variante assíncrona baseada em callback do SDK (consistente com
os demais métodos `doAsync*` da biblioteca), preciso de uma variante assíncrona da consulta de
ativação que entregue o resultado de forma não bloqueante e que se comporte de forma confiável na
New Architecture do React Native.

**Why this priority**: Complementa a P1 oferecendo paridade com o padrão assíncrono já existente na
biblioteca (`doAsyncInitializeAndActivatePinPad`). É importante para consistência de API, mas a
consulta síncrona (P1) já entrega o valor essencial — por isso P2.

**Independent Test**: Pode ser testado independentemente invocando a variante assíncrona e
verificando que ela resolve com verdadeiro/falso conforme o estado do terminal, e que falhas
reais de recuperação de status são reportadas como erro distinto.

**Acceptance Scenarios**:

1. **Given** um terminal ativado, **When** o app usa a consulta assíncrona, **Then** a operação
   resolve com verdadeiro.
2. **Given** um terminal não ativado, **When** o app usa a consulta assíncrona, **Then** a operação
   resolve com falso (não é tratado como erro).
3. **Given** uma falha real ao recuperar o status do terminal, **When** o app usa a consulta
   assíncrona, **Then** a operação rejeita com um erro de domínio identificável, distinto do
   resultado "não ativado".

---

### Edge Cases

- **Plataforma não suportada (iOS)**: qualquer chamada de consulta de ativação em iOS DEVE rejeitar
  com erro explícito e prefixado (a biblioteca é Android-only), conforme o guard de plataforma de
  Nível 2 já adotado em todas as funções exportadas.
- **`false` não é erro**: o estado "terminal não ativado" é um resultado **válido** e DEVE resolver
  a operação com falso — nunca rejeitar. Este é o ponto de regressão mais provável e deve ter
  cobertura de teste dedicada em ambas as variantes (síncrona e assíncrona).
- **Falha interna inesperada**: exceções não originadas no SDK (ex.: falha de serialização ou
  invocação) DEVEM rejeitar com um erro interno genérico identificável, distinto do erro de domínio.
- **Falha de recuperação de status (apenas variante assíncrona)**: quando o SDK sinaliza falha ao
  recuperar o status (callback de erro), a operação DEVE rejeitar com erro de domínio próprio,
  preservando a mensagem de falha do SDK.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca MUST expor uma função pública de consulta síncrona do estado de ativação
  do terminal que resolva com um valor booleano (`true` = terminal ativado/autenticado, `false` =
  não ativado).
- **FR-002**: A biblioteca MUST expor uma função pública de consulta assíncrona (baseada no listener
  nativo do SDK) do estado de ativação do terminal que resolva com um valor booleano.
- **FR-003**: Ambas as funções MUST resolver com `false` quando o terminal não está ativado — `false`
  é um resultado válido e NÃO DEVE ser tratado como erro nem rejeitar a operação.
- **FR-004**: Nenhuma das funções de consulta MUST disparar fluxo de ativação, transação, ou qualquer
  efeito colateral no terminal — são operações estritamente de leitura de estado.
- **FR-005**: Ambas as funções MUST rejeitar com erro explícito e prefixado quando invocadas em
  plataforma diferente de Android (iOS), antes de qualquer acesso ao módulo nativo.
- **FR-006**: A variante assíncrona MUST rejeitar com um código de erro de domínio identificável
  (`PLUGPAG_AUTHENTICATION_ERROR`) quando o SDK reportar falha ao recuperar o status do terminal,
  preservando a mensagem de falha original do SDK.
- **FR-007**: Ambas as funções MUST rejeitar com um código de erro interno identificável
  (`PLUGPAG_INTERNAL_ERROR`) quando ocorrer uma exceção não originada no SDK.
- **FR-008**: As funções MUST pertencer ao domínio `activation` da biblioteca (mesma relação
  semântica do ciclo de ativação do terminal).
- **FR-009**: A consulta síncrona MUST executar a chamada bloqueante do SDK fora da thread principal
  para evitar ANR, e resolver/rejeitar a promessa na thread principal.
- **FR-010**: A consulta assíncrona MUST seguir o padrão de threading validado para callbacks do SDK
  na New Architecture (invocação na main thread com Looper ativo), garantindo que o callback terminal
  resolva/rejeite a promessa de forma confiável.
- **FR-011**: As funções públicas exportadas MUST ter cobertura de teste unitário cobrindo: rejeição
  em iOS, resolução com `true`, resolução com `false`, erro de domínio (apenas assíncrona) e erro
  interno.
- **FR-012**: A documentação pública (README EN/PT-BR) MUST descrever as duas novas funções na seção
  de ativação, incluindo a semântica de que `false` significa "não ativado" (não um erro).

### Key Entities

- **Estado de ativação do terminal**: representação booleana de se existe um usuário
  autenticado/terminal ativado (`true`) ou não (`false`). É o único dado retornado por ambas as
  funções; não há campos adicionais nesta versão (decisão consciente — dados adicionais futuros, como
  número de série do terminal, exigiriam novo método).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor consegue descobrir o estado de ativação do terminal com uma única
  chamada, sem disparar nenhum fluxo de ativação ou transação.
- **SC-002**: Em terminal não ativado, 100% das consultas (síncrona e assíncrona) resolvem com `false`
  — zero rejeições para o caminho "não ativado".
- **SC-003**: 100% das funções públicas exportadas pela feature possuem cobertura de teste unitário
  para todos os cenários definidos (iOS, `true`, `false`, erro de domínio quando aplicável, erro
  interno).
- **SC-004**: Em plataforma não suportada (iOS), 100% das chamadas rejeitam com erro explícito
  prefixado, sem acessar o módulo nativo.
- **SC-005**: A feature não introduz nenhuma regressão na suíte de testes existente (todos os gates
  de lint, typecheck e testes permanecem verdes).

## Assumptions

- A "consulta de estado" abrange exatamente os dois métodos do SDK descritos no PRD
  (`isAuthenticated` síncrono e `asyncIsAuthenticated` por listener); outros estados do terminal
  (ex.: saúde do hardware, conectividade) estão fora de escopo.
- O retorno é um booleano puro (sem objeto wrapper). Esta é uma decisão de ergonomia já tomada no
  PRD; caso dados adicionais sejam necessários no futuro, será um novo método/mudança de contrato.
- A consulta síncrona é assumida como bloqueante por IPC (comunicação com o serviço do terminal) e,
  por segurança contra ANR, executada fora da thread principal mesmo que seja barata.
- O padrão de threading para a variante assíncrona reaproveita o padrão já validado em terminal
  físico (feature/018) para callbacks do SDK na New Architecture — não há incerteza de validação em
  device.
- A biblioteca permanece Android-only; iOS continua fora de escopo com os guards de plataforma de
  dois níveis já existentes.
- A demonstração no app de exemplo (`example/`) é desejável, porém opcional, e não bloqueia a entrega
  da feature.
