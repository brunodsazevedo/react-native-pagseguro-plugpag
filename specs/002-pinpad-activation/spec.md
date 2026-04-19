# Feature Specification: Ativação do PinPad

**Feature Branch**: `feature/002-pinpad-activation`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Descrição do usuário: "Implementar initializeAndActivatePinPad e doAsyncInitializeAndActivatePinPad no TurboModule PagSeguro PlugPag"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ativação Simples do PinPad (Priority: P1)

Um desenvolvedor React Native integrando com um terminal de pagamento PagSeguro chama uma única função com um código de ativação para inicializar e ativar o dispositivo PinPad. A chamada pode ser bem-sucedida ou falhar, e o desenvolvedor trata ambos os resultados via async/await com try/catch.

**Why this priority**: É o ponto de entrada obrigatório para qualquer operação com o terminal de pagamento. Nenhum fluxo de pagamento pode ser realizado sem a ativação bem-sucedida do PinPad. Equivalente à biblioteca legado usada em produção.

**Independent Test**: Pode ser testado de forma isolada chamando a função de ativação com um código de ativação de desenvolvimento e verificando que o valor retornado confirma o sucesso, ou que o erro capturado contém informações estruturadas de erro.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android com um terminal PagSeguro conectado, **When** o desenvolvedor chama `initializeAndActivatePinPad` com um código de ativação válido, **Then** a chamada resolve com um indicador de sucesso e o terminal está pronto para operações de pagamento.

2. **Given** um app React Native no Android com um terminal inacessível, **When** o desenvolvedor chama `initializeAndActivatePinPad` com um código de ativação válido, **Then** a chamada rejeita com um erro estruturado contendo um código de resultado numérico do SDK, um código de erro em string e uma mensagem descritiva.

3. **Given** um app React Native no Android com uma falha interna inesperada, **When** o desenvolvedor chama `initializeAndActivatePinPad`, **Then** a chamada rejeita com um erro estruturado claramente distinguível dos erros do SDK, contendo um código de resultado sentinela de -1 e um código de erro interno.

4. **Given** um app React Native rodando em iOS, **When** o desenvolvedor chama `initializeAndActivatePinPad`, **Then** a chamada rejeita com uma mensagem de erro informativa explicando que a biblioteca é exclusiva para Android.

5. **Given** um app React Native rodando em iOS no momento do import, **When** o módulo é carregado, **Then** um aviso é registrado no console sem que o app quebre.

---

### User Story 2 - Ativação Assíncrona do PinPad (Priority: P2)

Um desenvolvedor React Native chama uma função de ativação alternativa que usa o mecanismo assíncrono nativo do SDK. O desenvolvedor utiliza o mesmo padrão de async/await e tratamento de erros da User Story 1. Essa variante é projetada para que, em versões futuras, possa expor eventos de progresso da ativação sem exigir quebras de API.

**Why this priority**: Fornece uma alternativa alinhada ao SDK que preserva a compatibilidade futura para feedback de progresso, reduzindo custos de migração. A experiência do desenvolvedor é idêntica ao P1 do ponto de vista do consumidor.

**Independent Test**: Pode ser testado de forma isolada chamando a função de ativação assíncrona com um código de ativação de desenvolvimento e verificando que os resultados de sucesso e erro se comportam de forma idêntica à User Story 1.

**Acceptance Scenarios**:

1. **Given** um app React Native no Android com um terminal PagSeguro conectado, **When** o desenvolvedor chama `doAsyncInitializeAndActivatePinPad` com um código de ativação válido, **Then** a chamada resolve com um indicador de sucesso idêntico em formato à User Story 1.

2. **Given** um app React Native no Android com um terminal que retorna erro, **When** o desenvolvedor chama `doAsyncInitializeAndActivatePinPad`, **Then** a chamada rejeita com o mesmo formato de erro da User Story 1 (código de resultado numérico, código de erro em string, mensagem descritiva).

3. **Given** um app React Native no Android com uma falha interna inesperada, **When** o desenvolvedor chama `doAsyncInitializeAndActivatePinPad`, **Then** a chamada rejeita com o mesmo formato de erro interno da User Story 1.

4. **Given** um app React Native rodando em iOS, **When** o desenvolvedor chama `doAsyncInitializeAndActivatePinPad`, **Then** a chamada rejeita com uma mensagem de erro informativa explicando que a biblioteca é exclusiva para Android.

---

### User Story 3 - Remoção da Funcionalidade de Scaffold (Priority: P3)

Um desenvolvedor que usa a biblioteca não vê mais a função de placeholder `multiply` gerada automaticamente durante o setup da biblioteca. A API pública contém apenas funcionalidades específicas do PagSeguro.

**Why this priority**: A limpeza do código de scaffold garante que a superfície da API pública seja limpa e sem ambiguidades. Embora não seja impactante funcionalmente, evita confusão do desenvolvedor e mantém a profissionalidade da biblioteca.

**Independent Test**: Pode ser testado de forma isolada verificando que o import da biblioteca não expõe nenhuma função `multiply`, e que o aplicativo de exemplo demonstra a ativação do PinPad.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor que importa a biblioteca, **When** ele inspeciona a API exportada, **Then** `multiply` não está disponível como função.

2. **Given** um desenvolvedor que abre o aplicativo de exemplo, **When** ele visualiza o app, **Then** o app demonstra a ativação de ambas as funções do PinPad usando o código de ativação de desenvolvimento, e não um exemplo de multiplicação.

---

### Edge Cases

- O que acontece quando o código de ativação é uma string vazia? — A chamada prossegue e a resposta do SDK determina o resultado (erro esperado do SDK).
- O que acontece quando o código de ativação é válido mas o serviço PlugPag não está instalado no dispositivo? — A chamada rejeita com um erro estruturado do SDK ou um erro interno.
- O que acontece quando ambas as funções de ativação são chamadas simultaneamente (em paralelo, não sequencialmente)? — O comportamento é indefinido; chamadas paralelas simultâneas não são suportadas. Re-chamadas sequenciais (retry após falha) são totalmente suportadas e esperadas.
- O que acontece quando o módulo é importado em iOS mas a função de ativação nunca é chamada? — Apenas o aviso de console é emitido no momento do import; nenhum erro é lançado.

## Requirements *(mandatory)*

### Requisitos Não Funcionais

- **NFR-001**: A biblioteca NÃO DEVE registrar em log o código de ativação nem incluí-lo em nenhuma mensagem de erro, saída de log ou payload de rejeição — ele é tratado como dado de credencial sensível independente do ambiente.

### Requisitos Funcionais

- **FR-001**: A biblioteca DEVE expor uma função `initializeAndActivatePinPad` que aceita um único código de ativação em string e retorna uma promise.
- **FR-002**: A biblioteca DEVE expor uma função `doAsyncInitializeAndActivatePinPad` que aceita um único código de ativação em string e retorna uma promise.
- **FR-003**: Ambas as funções DEVEM resolver com `{ result: 'ok' }` quando o PinPad for inicializado e ativado com sucesso.
- **FR-004**: Ambas as funções DEVEM rejeitar com um erro estruturado quando o SDK reportar falha na ativação, contendo: um código de resultado numérico do SDK (`result`), um código de erro em string do SDK (`errorCode`) e uma mensagem legível por humanos (`message`).
- **FR-005**: Ambas as funções DEVEM rejeitar com um erro estruturado distinto quando ocorrer uma falha interna inesperada, contendo um código de resultado sentinela de `-1`, um código de erro interno fixo e a mensagem da exceção.
- **FR-006**: O consumidor da biblioteca DEVE ser capaz de distinguir erros do SDK de erros internos sem parsear mensagens de string — a diferenciação ocorre via um código de erro de nível superior no objeto de erro rejeitado.
- **FR-007**: O consumidor da biblioteca NÃO DEVE precisar inspecionar o valor resolvido para detectar erros — todos os casos de falha chegam exclusivamente via promise rejeitada.
- **FR-008**: Ambas as funções DEVEM rejeitar com um erro informativo quando chamadas em iOS, antes de tentar qualquer acesso ao módulo nativo.
- **FR-009**: O módulo DEVE emitir um aviso de console não-crashante quando carregado em plataforma não-Android.
- **FR-010**: A função de placeholder `multiply` DEVE ser removida de todas as superfícies de API pública, módulos nativos e do aplicativo de exemplo.
- **FR-011**: O aplicativo de exemplo DEVE demonstrar o uso de ambas as funções de ativação usando o código de ativação de desenvolvimento.
- **FR-012**: A suíte de testes DEVE cobrir: guard de plataforma iOS (aviso e erro), sucesso no Android, erro do SDK no Android e erro interno no Android — para ambas as funções de ativação (9 cenários no total).

### Entidades Principais

- **Código de Ativação**: Um identificador em string utilizado para autorizar um terminal PagSeguro. Em ambientes de desenvolvimento, um código bem conhecido é utilizado. Em produção, cada terminal possui um código único atribuído pela PagSeguro.
- **Resultado de Ativação (Sucesso)**: Um objeto confirmando a ativação bem-sucedida: `{ result: 'ok' }`. Não contém metadados adicionais.
- **Erro de Ativação (SDK)**: Um erro estruturado contendo um código de resultado numérico do SDK, um código de erro em string e uma mensagem descritiva. Indica que o SDK processou a requisição e reportou uma falha.
- **Erro de Ativação (Interno)**: Um erro estruturado com valores sentinela (`result: -1`, `errorCode: 'INTERNAL_ERROR'`) indicando uma falha inesperada em runtime não relacionada à lógica de ativação do SDK.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor React Native consegue ativar um PinPad PagSeguro em menos de 5 linhas de código de aplicação usando qualquer uma das funções de ativação.
- **SC-002**: 100% dos cenários de erro de ativação (erros do SDK e erros internos) são surfaceados via o caminho de rejeição da promise — zero erros exigem inspecionar o valor resolvido.
- **SC-003**: O desenvolvedor consegue distinguir programaticamente entre uma falha de ativação reportada pelo SDK e um erro interno inesperado sem parsear mensagens de string.
- **SC-004**: O aplicativo de exemplo compila e executa no Android, demonstrando ambas as funções de ativação sem erros de compilação.
- **SC-005**: Todos os 9 cenários de teste definidos passam com taxa de sucesso de 100%.
- **SC-006**: Importar a biblioteca em iOS produz exatamente um aviso de console e não causa crash no aplicativo.
- **SC-007**: A superfície da API pública não contém nenhuma função não relacionada à funcionalidade PagSeguro após o merge desta feature.

## Clarifications

### Session 2026-03-21

- Q: A biblioteca deve impor tempo máximo de espera para ativação, ou delegar inteiramente ao SDK/OS? → A: Delegar inteiramente ao SDK/OS; sem timeout no nível da biblioteca.
- Q: A biblioteca deve suportar chamadas repetidas às funções de ativação na mesma sessão do app? → A: Sim, suportado sem restrição — sem limite imposto pela biblioteca.
- Q: O código de ativação deve ser tratado como dado sensível que a biblioteca nunca loga nem inclui em mensagens de erro? → A: Sim — o código de ativação nunca deve aparecer em logs ou mensagens de erro produzidos pela biblioteca.

## Assumptions

- O SDK PagSeguro já está configurado como dependência no projeto Android a partir da feature anterior (001-pagseguro-sdk-setup).
- A biblioteca é exclusiva para Android; suporte a iOS está permanentemente fora do escopo, a menos que seja oficialmente suportado pela PagSeguro.
- Chamadas repetidas às funções de ativação na mesma sessão são suportadas sem restrição da biblioteca (ex: primeira tentativa falha, desenvolvedor tenta novamente). Chamadas *concorrentes simultâneas* continuam não suportadas.
- O código de ativação de desenvolvimento utilizado em testes e no app de exemplo é um valor bem conhecido para terminais de desenvolvimento PagSeguro.
- A função `doAsyncInitializeAndActivatePinPad` NÃO expõe eventos de progresso nesta versão; essa capacidade é adiada para uma iteração futura, e a arquitetura preserva a capacidade de adicioná-la sem quebras de API.
- O payload de sucesso `{ result: 'ok' }` é suficiente para o release inicial; nenhum metadado adicional é necessário no valor resolvido.
- O gerenciamento de timeout é inteiramente delegado ao SDK e ao Android OS; a biblioteca não impõe tempo máximo de espera. Se o terminal travar indefinidamente, isso é uma preocupação de nível de OS/serviço fora do escopo da biblioteca.
