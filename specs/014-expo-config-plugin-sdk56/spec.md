# Feature Specification: Atualização do Expo Config Plugin para Expo SDK 56

**Feature Branch**: `feature/014-expo-config-plugin-sdk56`  
**Created**: 2026-06-19  
**Status**: Draft  
**Input**: PRD — Atualização do Expo Config Plugin para Expo SDK 56

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compatibilidade do Plugin com Expo SDK 56 (Priority: P1)

O consumidor da biblioteca que usa Expo SDK 56 inclui a biblioteca em seu projeto e executa o processo de build nativo sem necessidade de workarounds adicionais. A devDependency interna do plugin passa a usar a versão da família SDK 56 do pacote de suporte a plugins, eliminando conflitos de versão ao rodar o build do projeto consumidor.

**Why this priority**: Sem essa atualização, consumidores em SDK 56 podem enfrentar erros de versão ao executar o prebuild ou obter comportamento inesperado causado por incompatibilidade de versão do plugin builder. Esse é o bloqueio direto para adoção da biblioteca em projetos Expo SDK 56.

**Independent Test**: Pode ser validado executando o build do plugin na raiz do projeto com a versão atualizada da devDependency e confirmando saída sem erros e artefatos gerados no diretório de build do plugin.

**Acceptance Scenarios**:

1. **Given** a biblioteca com a devDependency do suporte a plugins na versão anterior (`^9.0.0`), **When** a dependência é atualizada para a versão compatível com Expo SDK 56, **Then** o build do plugin conclui sem erros e os artefatos são gerados no diretório de build esperado.
2. **Given** a devDependency atualizada, **When** o prebuild Android do app de exemplo é executado, **Then** o processo conclui sem erros e os arquivos nativos Android são gerados corretamente.

---

### User Story 2 - Estabilidade Futura do Plugin via API Pública (Priority: P2)

O mantenedor substitui o acesso a um caminho interno do pacote de suporte a plugins por um namespace de API pública oficialmente suportado e formalizado no Expo SDK 56, garantindo que atualizações futuras do pacote não quebrem silenciosamente a geração do código nativo.

**Why this priority**: O uso de caminhos internos não documentados é tecnicamente funcional hoje mas não é coberto por qualquer garantia de compatibilidade — qualquer refatoração interna do pacote pode remover esse caminho sem aviso prévio. A migração para a API pública elimina esse risco e alinha o plugin ao contrato estável publicado.

**Independent Test**: Pode ser validado confirmando que o código-fonte do plugin não contém nenhuma importação de caminhos internos do pacote de suporte a plugins, e que o build do plugin gera artefatos corretos.

**Acceptance Scenarios**:

1. **Given** o plugin com importação de caminho interno do pacote de suporte a plugins, **When** a migração para o namespace da API pública é aplicada, **Then** o build do plugin passa e o artefato compilado não referencia caminhos internos do pacote.
2. **Given** a importação migrada para API pública, **When** o prebuild Android é executado, **Then** as injeções de configuração (repositório Maven e dependência wrapper) são inseridas corretamente nos arquivos Gradle gerados.

---

### User Story 3 - Continuidade da Injeção Android após Migração (Priority: P3)

O mantenedor confirma que o comportamento de injeção das configurações Android produzido pelo plugin após a migração é funcionalmente idêntico ao comportamento anterior — mesmos valores, mesmas tags de controle de idempotência, mesma estrutura nos arquivos Gradle gerados.

**Why this priority**: A migração não deve alterar o comportamento externo do plugin. Um consumidor que já executou prebuild e tem os arquivos Gradle gerados não deve ver divergências ao re-executar com a versão atualizada da biblioteca, garantindo idempotência e ausência de duplicações.

**Independent Test**: Pode ser validado inspecionando o conteúdo dos arquivos Gradle gerados no app de exemplo após prebuild com limpeza de cache — confirmando presença do repositório Maven, dependência wrapper e tags de controle de idempotência.

**Acceptance Scenarios**:

1. **Given** o plugin migrado e o prebuild Android executado com limpeza de cache, **When** o arquivo Gradle raiz do Android é inspecionado, **Then** contém a URL do repositório Maven da PagSeguro e a tag de idempotência correspondente.
2. **Given** o plugin migrado e o prebuild Android executado com limpeza de cache, **When** o arquivo Gradle do módulo app é inspecionado, **Then** contém a declaração de dependência do wrapper PagSeguro e a tag de idempotência correspondente.
3. **Given** o prebuild executado duas vezes sem limpeza de cache, **When** os arquivos Gradle são inspecionados, **Then** nenhuma entrada duplicada existe (idempotência preservada).

---

### Edge Cases

- O que acontece se o namespace público da nova versão do pacote de suporte a plugins não expuser a função de mesclagem de conteúdo com assinatura compatível com o uso atual no plugin?
- O que acontece se o consumidor usar o prebuild sem limpeza de cache e já tiver arquivos Gradle gerados pela versão anterior do plugin?
- O que acontece se a versão atualizada do pacote de suporte a plugins exigir mudanças adicionais no plugin além do identificado no PRD?
- O que acontece se a devDependency atualizada conflitar com alguma versão já travada no lockfile do monorepo?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A devDependency do pacote de suporte a plugins de configuração Expo na raiz da biblioteca DEVE ser atualizada para a versão compatível com a família do Expo SDK 56, substituindo a versão anterior.
- **FR-002**: O plugin DEVE importar a funcionalidade de mesclagem de conteúdo exclusivamente via namespace da API pública do pacote de suporte a plugins — qualquer importação de caminho interno do pacote DEVE ser removida.
- **FR-003**: O uso da função de mesclagem de conteúdo no corpo do plugin DEVE ser atualizado para utilizar o namespace público da API, onde anteriormente era chamada via importação interna.
- **FR-004**: Nenhum outro arquivo da biblioteca DEVE ser alterado — especificamente: código-fonte TypeScript (`src/`), código nativo Android (`android/`), spec do TurboModule e arquivos do `example/` (já atualizados na feature 013).
- **FR-005**: O build do plugin DEVE concluir sem erros após as alterações, gerando artefatos no diretório de build esperado.
- **FR-006**: O prebuild Android do app de exemplo DEVE concluir sem erros, com os arquivos Gradle contendo os valores esperados de repositório Maven, dependência wrapper e tags de idempotência.
- **FR-007**: Todos os gates de qualidade existentes (lint, checagem de tipos, testes unitários, build da biblioteca) DEVEM passar com zero erros após as alterações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O build do plugin conclui com código de saída 0 e artefatos presentes no diretório de build do plugin — verificável pela saída do comando de build.
- **SC-002**: O prebuild Android do app de exemplo conclui sem erros e gera os arquivos nativos — verificável pela saída do processo e presença dos artefatos gerados.
- **SC-003**: Os arquivos Gradle gerados contêm os valores esperados de repositório Maven, dependência wrapper e tags de controle de idempotência — verificável por inspeção direta dos arquivos após prebuild com limpeza de cache.
- **SC-004**: Zero importações de caminhos internos do pacote de suporte a plugins permanecem no código-fonte do plugin — verificável por inspeção do arquivo de origem.
- **SC-005**: Os quatro gates de qualidade (lint, tipos, testes, build da biblioteca) passam com 100% de sucesso — verificável pelas saídas dos comandos com código de saída 0.
- **SC-006**: Zero arquivos fora do escopo definido (`package.json` devDependency + código-fonte do plugin) são alterados — verificável por `git diff` na branch.

## Assumptions

- O Expo SDK 56 disponibiliza o pacote de suporte a plugins na versão da família `56.0.x`, e essa versão está disponível no registro público de pacotes.
- A API pública da versão `56.0.x` do pacote de suporte a plugins expõe a funcionalidade de mesclagem de conteúdo via namespace público com assinatura compatível com o uso atual no plugin.
- A feature 013 (atualização do `example/`) está concluída antes da implementação desta feature.
- O namespace público promovido no SDK 56 é o contrato estável para versões futuras do pacote — a migração é uma melhoria de longo prazo, não apenas uma correção pontual.
- A devDependency atualizada é usada apenas no contexto de build do plugin da biblioteca — não afeta o ambiente do consumidor, que recebe o plugin já compilado.
- O ambiente de desenvolvimento local tem o gerenciador de pacotes configurado para resolver a nova versão da devDependency sem conflitos no lockfile.
