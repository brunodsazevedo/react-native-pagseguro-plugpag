# Feature Specification: PagSeguro SDK Setup & iOS Removal

**Feature Branch**: `feature/001-pagseguro-sdk-setup`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Configuração inicial de dependência do projeto para utilizar a SDK PagSeguro — setup do SDK Android (maven + dependências via Expo Config Plugin idempotente) e remoção de suporte iOS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Integrar a biblioteca em projeto Expo/Android (Priority: P1)

Um desenvolvedor adiciona `react-native-pagseguro-plugpag` como dependência em seu projeto Expo. Ao rodar o prebuild, o repositório maven da PagSeguro e a dependência do SDK são automaticamente configurados no projeto Android gerado — sem intervenção manual nos arquivos nativos e sem duplicação em execuções repetidas.

**Why this priority**: É o objetivo central da feature. Sem a configuração do SDK, a biblioteca não funciona em nenhum cenário de uso real.

**Independent Test**: Pode ser testado de forma isolada adicionando a lib a um projeto Expo limpo, rodando o prebuild e verificando se os arquivos de configuração do projeto Android contêm as entradas esperadas do PagSeguro.

**Acceptance Scenarios**:

1. **Given** um projeto Expo sem configuração manual de maven, **When** o desenvolvedor executa o prebuild pela primeira vez, **Then** os arquivos de configuração do projeto Android são atualizados com o repositório maven e a dependência do SDK PagSeguro.
2. **Given** um projeto Expo com o SDK já configurado (prebuild já executado anteriormente), **When** o desenvolvedor executa o prebuild novamente, **Then** nenhuma entrada duplicada é inserida nos arquivos de configuração.
3. **Given** um projeto que usa a lib de forma standalone (sem Expo), **When** o desenvolvedor sincroniza o projeto Android, **Then** as configurações de maven e dependência estão presentes nas definições de build da própria biblioteca.

---

### User Story 2 - Comportamento seguro em ambiente iOS (Priority: P2)

Um desenvolvedor que, por engano ou desconhecimento, tenta usar a biblioteca em um app iOS recebe feedback imediato e claro sobre a limitação de plataforma — sem que o aplicativo quebre de forma críptica ou silenciosa.

**Why this priority**: Garante experiência de desenvolvimento segura e comunicação clara da limitação de plataforma, evitando horas de debugging em erros incompreensíveis.

**Independent Test**: Pode ser testado de forma isolada importando a biblioteca em um projeto configurado para iOS e verificando que um aviso aparece no console sem crash no startup, e que chamar qualquer método lança um erro com mensagem acionável.

**Acceptance Scenarios**:

1. **Given** um projeto iOS que importa a biblioteca, **When** o módulo é carregado pelo bundler, **Then** um aviso descritivo aparece no terminal indicando que a plataforma não é suportada e o aplicativo continua funcionando normalmente (sem crash).
2. **Given** um projeto iOS que importa a biblioteca, **When** o desenvolvedor chama qualquer função exportada pela lib, **Then** um erro com mensagem clara e acionável é lançado, indicando que a funcionalidade não está disponível em iOS.
3. **Given** um projeto iOS com autolinking habilitado, **When** o React Native CLI tenta resolver dependências nativas, **Then** a biblioteca é ignorada pelo autolinking e nenhum arquivo nativo iOS é vinculado.

---

### User Story 3 - Projeto livre de artefatos iOS (Priority: P3)

O repositório da biblioteca não contém arquivos de código nativo iOS, especificação CocoaPod, referências iOS em metadados do pacote, ou configurações de CI para build iOS — refletindo que se trata de uma biblioteca exclusivamente Android.

**Why this priority**: Elimina ambiguidade sobre suporte a plataformas, reduz superfície de manutenção e evita que ferramentas de automação (CocoaPods, CI, package managers) tentem processar artefatos iOS inexistentes.

**Independent Test**: Pode ser testado verificando a ausência dos arquivos e configurações iOS no repositório após a limpeza, e rodando o CI para confirmar que apenas jobs Android são executados.

**Acceptance Scenarios**:

1. **Given** o repositório após a feature, **When** inspecionado, **Then** não existem arquivos de implementação nativa iOS nem especificação CocoaPod.
2. **Given** o pipeline de CI, **When** executado, **Then** apenas o job de build Android é processado; nenhum job iOS existe ou é tentado.
3. **Given** os metadados publicados do pacote npm, **When** inspecionados, **Then** iOS não aparece em keywords, lista de arquivos distribuídos ou campos de configuração de plataformas.

---

### Edge Cases

- O que acontece se o prebuild for executado em um ambiente sem acesso ao repositório maven da PagSeguro? O build falha com mensagem de erro de dependência não resolvida — comportamento esperado do sistema de build, sem ação adicional da lib.
- O que acontece se a biblioteca for adicionada a um projeto React Native CLI (sem Expo) sem configuração manual de maven? A dependência do SDK não será injetada automaticamente — o Config Plugin é Expo-specific. Para projetos CLI, a configuração presente nas definições de build da própria biblioteca é suficiente.
- O que acontece se um desenvolvedor iOS tentar ignorar o warning e chamar métodos da lib? Cada chamada lança um erro com mensagem clara, catchable via try/catch — nunca resulta em crash nativo críptico.
- O que acontece se a biblioteca for publicada no npm sem remover iOS de `files`? Ferramentas como CocoaPods e Expo podem tentar processar artefatos inexistentes — por isso a remoção dos metadados é obrigatória junto com a remoção dos arquivos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE disponibilizar um mecanismo que configure automaticamente o repositório maven da PagSeguro no projeto Android durante o processo de prebuild de projetos Expo.
- **FR-002**: O mecanismo de configuração DEVE ser idempotente — executar o prebuild múltiplas vezes NÃO DEVE duplicar as entradas de maven ou dependência nos arquivos de configuração gerados.
- **FR-003**: A biblioteca DEVE incluir a dependência do SDK PagSeguro versão 1.33.0 no projeto Android do consumidor durante o prebuild.
- **FR-004**: As definições de build da própria biblioteca DEVEM declarar o repositório maven e a dependência do SDK para suporte a projetos que não utilizam Expo.
- **FR-005**: O autolinking do React Native DEVE ser configurado para ignorar a plataforma iOS ao resolver dependências da biblioteca.
- **FR-006**: A biblioteca DEVE emitir um aviso descritivo no console quando importada em uma aplicação rodando em iOS, sem interromper a inicialização do aplicativo.
- **FR-007**: Cada função pública exportada pela biblioteca DEVE lançar um erro com mensagem clara e acionável quando chamada em iOS.
- **FR-008**: O repositório DEVE ser limpo de todos os arquivos de implementação nativa iOS e da especificação CocoaPod.
- **FR-009**: O pipeline de CI DEVE ser atualizado para remover qualquer job de build ou validação iOS.
- **FR-010**: Os metadados do pacote DEVEM refletir suporte exclusivo a Android, removendo referências a iOS em keywords, arquivos distribuídos e campos de configuração de plataformas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor consegue adicionar a biblioteca a um projeto Expo e ter o SDK PagSeguro configurado e pronto para compilação no Android após executar o prebuild, sem editar manualmente nenhum arquivo nativo.
- **SC-002**: Executar o prebuild N vezes consecutivas produz exatamente o mesmo resultado — zero entradas duplicadas nos arquivos de configuração (idempotência 100%).
- **SC-003**: Um desenvolvedor que importa a biblioteca em iOS vê um aviso no console em menos de 1 segundo após o carregamento do módulo, sem crash no app.
- **SC-004**: 100% das funções públicas da biblioteca lançam erros com mensagens acionáveis em iOS, sem nenhuma chegando ao crash críptico nativo.
- **SC-005**: O repositório não contém nenhum arquivo de código nativo iOS ou referência a CocoaPods após a conclusão da feature.
- **SC-006**: O pipeline de CI não executa nenhum job relacionado a iOS após a atualização.

## Assumptions

- O projeto example usa Expo Prebuild como mecanismo de geração do código nativo Android — o mecanismo de configuração automática é direcionado a esse fluxo.
- Projetos que usam a biblioteca sem Expo (React Native CLI puro) precisarão configurar manualmente o maven repo em seus arquivos de build, pois o Config Plugin não se aplica a esse caso. A configuração presente nas definições de build da própria biblioteca suporta esse cenário parcialmente.
- A versão 1.33.0 do SDK PagSeguro é a versão estável e suportada conforme documentação oficial — não há necessidade de deixar a versão configurável nesta fase.
- O histórico git anterior contendo arquivos iOS será mantido via commit normal, sem reescrita de histórico — padrão do ecossistema React Native para remoção de código de plataforma.
- O ambiente de build já utiliza uma versão de Kotlin compatível com o SDK e não requer alteração nessa dependência.
