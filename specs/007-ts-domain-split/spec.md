# Feature Specification: Refatoração JS/TS — Clean Code & Separação de Domínios

**Feature Branch**: `007-ts-domain-split`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Refatoração JS/TS: Clean Code e Separação de Domínios baseada no PRD.md"

## Contexto

Esta feature é uma refatoração interna da camada TypeScript da biblioteca. Os "usuários" aqui são **contribuidores da biblioteca** (quem adiciona features, mantém e testa) e **consumidores da biblioteca** (quem importa a API pública em apps React Native). Nenhuma mudança funcional é visível para o usuário final do app.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Contribuidor adiciona um novo domínio sem tocar em outros (Priority: P1)

Um contribuidor precisa implementar suporte a NFC (ou outro domínio futuro). Com a estrutura atual, ele precisaria editar `src/index.tsx`, o que mistura código de todos os domínios. Com a nova estrutura, ele cria uma pasta isolada para o novo domínio e o arquivo raiz permanece um barrel puro.

**Why this priority**: Desbloqueia o crescimento sustentável da biblioteca. Sem essa separação, cada nova feature aumenta o acoplamento em `index.tsx`, tornando o projeto cada vez mais difícil de manter e revisar.

**Independent Test**: Pode ser testado criando uma pasta de novo domínio (`functions/nfc/`) e verificando que nenhum outro arquivo de domínio precisa ser alterado além do barrel raiz.

**Acceptance Scenarios**:

1. **Given** a biblioteca tem a estrutura de domínios separados, **When** um contribuidor adiciona um novo domínio (`functions/<novo-dominio>/`), **Then** nenhum arquivo de domínio existente precisa ser modificado — apenas o barrel raiz recebe um novo `export *`.
2. **Given** cada domínio vive em sua própria pasta, **When** um contribuidor modifica a lógica de pagamento, **Then** os domínios de impressão, estorno e ativação não são tocados e seus testes continuam passando sem alterações.
3. **Given** a validação de cada domínio está encapsulada na pasta do domínio, **When** um contribuidor revisa o código de estorno, **Then** toda a lógica relevante (tipos, validação, funções) está em um único lugar.

---

### User Story 2 — Consumidor da biblioteca atualiza sem quebrar seus imports (Priority: P1)

Um app React Native que já usa `react-native-pagseguro-plugpag` faz upgrade para a versão refatorada. Todos os imports existentes continuam funcionando sem qualquer alteração no código do app.

**Why this priority**: Refatoração sem compatibilidade de API pública é um breaking change não intencional. A continuidade da API pública é requisito mínimo para que a refatoração seja segura.

**Independent Test**: Pode ser testado executando o app de exemplo existente após a refatoração — todos os imports e chamadas devem funcionar identicamente.

**Acceptance Scenarios**:

1. **Given** um app importa `doPayment`, `PaymentType`, `PrintQuality`, `doRefund` e `usePaymentProgress` da biblioteca, **When** a biblioteca é atualizada para a versão refatorada, **Then** todos os imports continuam resolvendo sem erros de compilação.
2. **Given** a API pública permanece inalterada, **When** o app consome `usePaymentProgress`, **Then** o hook funciona exatamente como antes — mesma assinatura, mesmo comportamento.
3. **Given** a refatoração introduz tipagem mais estrita em `PrintRequest.printerQuality`, **When** um consumidor passa um número fora do intervalo válido (ex: `99`), **Then** um erro de compilação é emitido (não um erro silencioso em runtime).

---

### User Story 3 — Contribuidor testa a lógica de validação diretamente (Priority: P2)

Hoje, `validatePaymentRequest`, `validateRefundRequest` e `validatePrintRequest` estão em `index.tsx` e só podem ser testadas indiretamente via `doPayment`, `doRefund` e `printFromFile`. Um contribuidor quer escrever testes focados apenas nas regras de validação, sem precisar mockar toda a infraestrutura de uma função de pagamento.

**Why this priority**: Melhora a qualidade e a granularidade dos testes. Falhas de validação ficam mais fáceis de diagnosticar quando os testes apontam diretamente para a regra violada.

**Independent Test**: Pode ser testado criando um arquivo de teste que importa apenas a lógica de validação de um domínio e verifica cada regra isoladamente.

**Acceptance Scenarios**:

1. **Given** a validação de cada domínio está encapsulada em sua pasta, **When** um contribuidor escreve um teste para `validatePaymentRequest`, **Then** o teste pode importar e chamar a função diretamente, sem precisar chamar `doPayment`.
2. **Given** validações são funções privadas dentro do módulo de domínio, **When** os testes de domínio cobrem cada regra de validação, **Then** uma função pública como `doPayment` recebe indiretamente a cobertura dessas regras pelos testes de domínio.

---

### User Story 4 — Contribuidor mantém o guard de plataforma iOS em cada função (Priority: P2)

Cada função exportada da biblioteca deve se proteger contra execução no iOS, lançando um erro com mensagem padronizada. Com a separação de domínios, cada pasta de domínio deve conter esse guard localmente — não pode depender de um guard central no barrel raiz.

**Why this priority**: Garante que o contrato de segurança da biblioteca seja mantido na nova estrutura. Uma função de domínio re-exportada pelo barrel não herda guards do barrel.

**Independent Test**: Pode ser testado importando uma função de domínio diretamente (ex: `functions/payment/index`) e chamando-a em um ambiente simulado de iOS — deve lançar o erro esperado.

**Acceptance Scenarios**:

1. **Given** `doPayment` é chamado em um ambiente iOS, **When** a função executa, **Then** um erro com prefixo `[react-native-pagseguro-plugpag] ERROR:` é lançado antes de qualquer tentativa de acesso ao módulo nativo.
2. **Given** o barrel raiz (`src/index.ts`) contém apenas um aviso de nível 1, **When** a biblioteca é importada no iOS, **Then** o app abre normalmente sem crash — o aviso é logado, não um erro fatal.
3. **Given** qualquer função de domínio é chamada no iOS, **Then** o módulo nativo jamais é acessado (o guard interrompe a execução antes do `require`).

---

### User Story 5 — Contribuidor atualiza a Constituição do projeto (Priority: P3)

Após a refatoração, a Constituição do projeto (CLAUDE.md e constitution.md) deve refletir a nova estrutura de pastas, as regras de import entre camadas e os destinos corretos para tipos de domínio versus tipos compartilhados.

**Why this priority**: Sem documentação atualizada, o próximo contribuidor pode regredir a estrutura ou adicionar código no lugar errado. A Constituição é o contrato de como o projeto cresce.

**Independent Test**: Pode ser testado lendo CLAUDE.md e constitution.md após a refatoração — a estrutura de pastas, as regras de import e o destino de tipos devem estar consistentes com a implementação real.

**Acceptance Scenarios**:

1. **Given** a Constituição menciona onde os tipos de domínio devem ser criados, **When** um contribuidor lê as regras, **Then** fica claro que tipos específicos de domínio vão em `functions/<dominio>/types.ts` e tipos compartilhados (usados por ≥2 domínios) vão em `src/types/`.
2. **Given** a Constituição descreve os guards iOS, **When** um contribuidor lê a regra, **Then** fica claro que o Nível 1 (`console.warn`) fica no barrel raiz e o Nível 2 (`throw`) fica em cada função de domínio.
3. **Given** a Constituição tem exemplos de import do módulo nativo, **When** um contribuidor implementa uma nova função de domínio, **Then** o caminho correto do `require` para `NativePagseguroPlugpag` está documentado.

---

### Edge Cases

- O que acontece se a pasta `src/types/` for criada vazia? A estrutura deve tolerar a ausência de arquivos nela sem quebrar o build ou o lint.
- O que acontece se um contribuidor, por engano, importar um domínio de dentro de outro domínio (ex: `payment` importando de `refund`)? A regra de import proibido deve ser capturável por lint ou type-check.
- O que acontece se `PrintRequest.printerQuality` receber um valor numérico fora do intervalo — o erro de compilação deve ser claro o suficiente para o consumidor entender qual valor é válido?
- O que acontece com testes existentes em `__tests__/index.test.tsx` após a refatoração — os caminhos de mock do módulo nativo mudam?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE exportar todas as funções e tipos atualmente disponíveis na API pública, sem remoções ou renomeações visíveis ao consumidor.
- **FR-002**: Cada domínio (ativação, pagamento, estorno, impressão) DEVE ser encapsulado em sua própria unidade isolada, sem dependências cruzadas entre domínios.
- **FR-003**: Cada função exportada DEVE incluir proteção contra execução em plataformas não suportadas (iOS), lançando erro com mensagem padronizada antes de qualquer acesso ao módulo nativo.
- **FR-004**: O acesso ao módulo nativo DEVE ser lazy — realizado somente após o guard de plataforma, nunca no momento de carregamento do módulo.
- **FR-005**: A validação de entrada de cada domínio DEVE estar encapsulada dentro da unidade do domínio correspondente e DEVE ser coberta por testes unitários diretos.
- **FR-006**: Tipos específicos de um domínio DEVEM ser definidos dentro da unidade do domínio; tipos usados por dois ou mais domínios DEVEM ser definidos em um local compartilhado separado.
- **FR-007**: O tipo `PrintRequest.printerQuality` DEVE restringir os valores aceitos ao conjunto válido em tempo de compilação, eliminando a necessidade de validação em runtime para valores fora do intervalo.
- **FR-008**: Hooks React DEVEM ser separados das funções de domínio, em unidade própria, para evitar dependência do React no barrel de domínios.
- **FR-009**: O barrel raiz da biblioteca DEVE conter apenas o guard de plataforma de nível 1 (aviso, não erro) e re-exportações — zero lógica de negócio.
- **FR-010**: A Constituição do projeto (documentação de regras) DEVE ser atualizada para refletir a nova estrutura de pastas, as regras de import entre camadas e o destino correto de tipos.
- **FR-011**: Todos os testes existentes DEVEM continuar passando após a refatoração, sem mudanças de comportamento observável.
- **FR-012**: Novos testes DEVEM ser criados para cobrir as funções de domínio em suas novas localizações, incluindo cenários de iOS e cenários de erro do SDK nativo.

### Key Entities

- **Domínio**: Unidade funcional autônoma da biblioteca (ativação, pagamento, estorno, impressão). Contém seus próprios tipos e funções, sem dependências de outros domínios.
- **Barrel raiz**: Ponto de entrada único da biblioteca. Re-exporta todos os domínios e hooks. Contém apenas o guard de plataforma de nível 1.
- **Barrel de funções**: Agrega os re-exports de todos os domínios para consumo pelo barrel raiz.
- **Hook React**: Função que usa primitivos de ciclo de vida do React. Separada dos domínios por depender do runtime do React.
- **Tipos compartilhados**: Tipos usados por dois ou mais domínios. Mantidos em local separado dos domínios individuais.
- **Guard de plataforma**: Verificação executada antes de qualquer acesso ao módulo nativo. Nível 1: aviso não fatal no carregamento do módulo. Nível 2: erro fatal em cada função, bloqueando acesso nativo.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das funções atualmente exportadas pela biblioteca continuam exportadas com a mesma assinatura após a refatoração — zero breaking changes na API pública (exceto a tipagem mais estrita de `PrintRequest.printerQuality`, documentada como breaking change intencional pré-1.0).
- **SC-002**: Cada domínio pode ser modificado, testado e validado de forma isolada — mudanças em um domínio não causam falha nos testes de outro domínio.
- **SC-003**: 100% das funções exportadas possuem cobertura de teste unitário, incluindo o cenário de execução em iOS e o cenário de erro do SDK nativo.
- **SC-004**: Zero dependências cruzadas entre domínios — nenhum domínio importa de outro domínio.
- **SC-005**: O lint, o type-check e os testes passam sem erros ou avisos após a conclusão de cada domínio migrado.
- **SC-006**: A Constituição do projeto está consistente com a implementação real — um contribuidor que lê a documentação consegue implementar um novo domínio corretamente sem precisar inferir regras do código existente.
- **SC-007**: O tempo de análise de impacto de uma mudança em um domínio se reduz — um contribuidor consegue identificar todos os arquivos relevantes de um domínio em menos de 30 segundos navegando pela estrutura de pastas.

---

## Assumptions

- A refatoração é realizada em uma única branch (`feature/007-ts-domain-split`) sem subdivisão por domínio em branches separadas.
- A tipagem mais estrita de `PrintRequest.printerQuality` é um breaking change intencional e aceitável por a biblioteca estar em versão pré-1.0.
- A pasta `src/types/` nasce vazia — nenhum tipo compartilhado entre domínios existe atualmente; a pasta é criada para suportar casos futuros.
- A extensão do barrel raiz muda de `.tsx` para `.ts` — o hook `usePaymentProgress` será movido para `hooks/`, eliminando a necessidade de `.tsx` no barrel.
- A ordem de execução (TDD) é: testes primeiro, depois implementação, domínio por domínio.
- Nenhuma alteração em `NativePagseguroPlugpag.ts` é necessária — o contrato do TurboModule permanece inalterado.

---

## Dependencies & Constraints

- A refatoração não deve alterar `NativePagseguroPlugpag.ts` — alterações nesse arquivo exigem regeneração do codegen Android, o que está fora do escopo desta feature.
- A API pública deve permanecer compatível com o app de exemplo (`example/src/App.tsx`).
- Cada fase de migração deve passar em `yarn lint && yarn typecheck && yarn test` antes de avançar para o próximo domínio.
- A Constituição (CLAUDE.md e constitution.md) deve ser atualizada antes de fechar a branch — documentação desatualizada é considerada entrega incompleta.
