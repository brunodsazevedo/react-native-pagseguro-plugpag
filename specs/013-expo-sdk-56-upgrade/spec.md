# Feature Specification: Atualização do Example para Expo SDK 56 (Fase 1)

**Feature Branch**: `feature/013-expo-sdk-56-upgrade`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: PRD — Fase 1: Atualização do Example para Expo SDK 56

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atualização de Dependências do Example (Priority: P1)

O mantenedor da biblioteca atualiza o app de exemplo para alinhar as versões de suas dependências à nova versão do SDK de plataforma móvel, sem alterar a raiz da biblioteca. A atualização garante que o app de exemplo permaneça buildável e válido para o ciclo de desenvolvimento atual.

**Why this priority**: O app de exemplo é o principal artefato de validação da biblioteca. Com o SDK defasado, qualquer validação de integração produz resultados incorretos em relação à versão em produção nos terminais PagBank. Manter o example atualizado é pré-requisito para a próxima fase de atualização da raiz.

**Independent Test**: Pode ser validado completamente verificando o `example/package.json` com as versões corretas de todas as dependências listadas no PRD, seguido da ausência de erros no diagnóstico de saúde do projeto.

**Acceptance Scenarios**:

1. **Given** o app de exemplo com SDK 55 e React Native 0.83.2, **When** as dependências são atualizadas conforme o PRD, **Then** o `example/package.json` reflete Expo SDK 56 e React Native 0.85.x, com `expo-status-bar`, `expo-dev-client`, `react-native-monorepo-config@^0.4.0` e `react-native-builder-bob@^0.43.0` nas versões compatíveis.
2. **Given** as dependências atualizadas, **When** o diagnóstico de saúde do projeto é executado, **Then** nenhum erro bloqueante é reportado.
3. **Given** as dependências atualizadas, **When** os arquivos que não precisam de alteração são inspecionados (`app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `App.tsx`, `react-native.config.js`, `index.js`), **Then** nenhum desses arquivos foi modificado.

---

### User Story 2 - Validação do Plugin Expo com o Novo SDK (Priority: P2)

O mantenedor executa o processo de build nativo do app de exemplo para confirmar que o plugin de configuração da biblioteca funciona corretamente com o novo SDK, detectando eventuais incompatibilidades antes que afetem os usuários da biblioteca.

**Why this priority**: O plugin de configuração é executado durante o processo de build nativo. Uma incompatibilidade silenciosa deixaria o pipeline de CI quebrando para todos os consumidores da biblioteca sem evidência clara da causa raiz.

**Independent Test**: Pode ser validado executando o prebuild para a plataforma Android e confirmando que o processo conclui sem erros e os arquivos nativos são gerados corretamente.

**Acceptance Scenarios**:

1. **Given** as dependências do example atualizadas para o novo SDK, **When** o prebuild do Android é executado, **Then** o processo conclui sem erros e os arquivos nativos Android são gerados.
2. **Given** uma potencial incompatibilidade do plugin de configuração com o novo SDK detectada pelo diagnóstico de saúde, **When** o conflito é identificado, **Then** a solução correta é aplicada (antecipação pontual da atualização do pacote afetado na raiz) e documentada como exceção ao escopo da Fase 1.

---

### User Story 3 - Confirmação de Nenhuma Regressão na Biblioteca Raiz (Priority: P3)

O mantenedor confirma que nenhuma regressão foi introduzida na biblioteca raiz ao atualizar o example, executando todos os gates de qualidade existentes do repositório.

**Why this priority**: O repositório é um monorepo que compartilha configurações. Qualquer interferência acidental na raiz quebraria a biblioteca publicada para os usuários finais.

**Independent Test**: Pode ser validado executando os quatro gates de qualidade (lint, checagem de tipos, testes e build da biblioteca) na raiz do projeto, todos com resultado zero erros.

**Acceptance Scenarios**:

1. **Given** o repositório com as dependências do example atualizadas, **When** a validação de estilo de código é executada na raiz, **Then** zero erros ou avisos são reportados.
2. **Given** o repositório com as dependências do example atualizadas, **When** a checagem de tipos e os testes unitários são executados, **Then** zero erros de tipagem e todos os testes passam.
3. **Given** os gates de lint e testes válidos, **When** o build da biblioteca é executado, **Then** os artefatos são gerados corretamente sem erros.
4. **Given** o branch com todas as alterações, **When** o job de CI de build Android é executado, **Then** o pipeline passa com sucesso.

---

### Edge Cases

- O que acontece se o plugin de configuração da biblioteca for incompatível com o novo SDK durante o prebuild por conta de uma versão desatualizada de sua dependência interna?
- O que acontece se o gerenciador de pacotes de monorepo (`react-native-monorepo-config@0.4.0`) alterar sua API de configuração de maneira incompatível?
- O que acontece se a nova engine JavaScript (incluída no RN 0.85) causar comportamento inesperado no app de exemplo?
- O que acontece se o job de CI de build Android falhar por incompatibilidade de configuração gradle não prevista localmente?
- O que acontece se houver conflito entre a versão do SDK no `example/` e a versão de dependências de desenvolvimento na raiz durante o processo de instalação?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: As dependências do app de exemplo DEVEM ser atualizadas para Expo SDK 56, React Native 0.85.x e versões compatíveis de `expo-status-bar`, `expo-dev-client`, `react-native-monorepo-config@^0.4.0` e `react-native-builder-bob@^0.43.0`.
- **FR-002**: Nenhum arquivo fora do diretório `example/` DEVE ser alterado nesta fase, exceto pontualmente o pacote de plugins de configuração na raiz — apenas se o diagnóstico de saúde confirmar incompatibilidade de categoria `error`. Quando aplicada, essa exceção DEVE ser entregue no mesmo PR em um **commit separado**, identificado explicitamente como exceção ao escopo da Fase 1.
- **FR-003**: O diagnóstico de saúde do projeto DEVE ser executado após o bump e não DEVE reportar nenhuma saída classificada como `error` — independente do pacote afetado. Saídas classificadas como `warning` são permitidas e não bloqueiam a progressão.
- **FR-004**: O processo de build nativo Android do app de exemplo DEVE concluir sem erros, validando a compatibilidade do plugin de configuração da biblioteca com o novo SDK.
- **FR-005**: Todos os gates de qualidade existentes (lint, checagem de tipos, testes unitários, build da biblioteca) DEVEM passar com zero erros após as atualizações.
- **FR-006**: O prebuild local do Android DEVE ser executado e concluir sem erros **antes de abrir o PR**. O job de CI de build Android DEVE também passar na branch como critério de merge.
- **FR-007**: Os arquivos identificados como agnósticos de versão (`app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `App.tsx`, `react-native.config.js`, `index.js`) DEVEM permanecer inalterados.
- **FR-008**: A atualização do build da biblioteca (`yarn prepare`) DEVE gerar os artefatos nos diretórios esperados sem erros.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O app de exemplo buildado com sucesso reflete Expo SDK 56 e React Native 0.85.x — verificável por inspeção direta do `example/package.json` e saída de build sem erros.
- **SC-002**: O diagnóstico de saúde do projeto conclui com zero saídas de categoria `error` (warnings são aceitáveis) — verificável pela saída do comando sem linhas classificadas como `error`.
- **SC-003**: O prebuild do Android conclui sem erros e gera os arquivos nativos do app de exemplo — verificável pela saída do processo e presença dos artefatos gerados.
- **SC-004**: Os quatro gates de qualidade (lint, tipos, testes, build) passam com 100% de sucesso e zero avisos — verificável pelas saídas dos comandos com código de saída 0.
- **SC-005**: O prebuild local do Android conclui sem erros antes da abertura do PR, e o pipeline de CI de build Android passa na branch antes do merge — ambos são critérios obrigatórios.
- **SC-006**: Zero arquivos fora do escopo definido são alterados — verificável por `git diff` na branch, que DEVE apontar apenas arquivos em `example/` (mais o pacote de plugins na raiz, se a exceção for aplicada).

## Clarifications

### Session 2026-06-18

- Q: O que define um "erro bloqueante" no diagnóstico de saúde do projeto (expo-doctor)? → A: Qualquer saída classificada como `error` pelo expo-doctor, independente do pacote afetado. Saídas classificadas como `warning` não são bloqueantes.
- Q: Se a exceção do plugin de configuração na raiz precisar ser aplicada, como deve ser organizada em termos de commits? → A: Mesmo PR que as demais alterações do `example/`, porém em commit separado e explicitamente identificado como exceção ao escopo da Fase 1.
- Q: O prebuild local do Android é obrigatório, ou o CI é suficiente como critério de validação Android? → A: O prebuild local é obrigatório e deve concluir sem erros antes de abrir o PR. O CI também deve passar antes do merge — ambos são critérios não-opcionais.

## Assumptions

- O ambiente de desenvolvimento possui Node v24.x instalado, atendendo o requisito mínimo de compatibilidade.
- A branch foi criada a partir de `develop` no estado atual, sem outras branches em andamento que alterem o `example/`.
- O Expo SDK 56 está disponível no registro público de pacotes no momento da execução.
- Se o plugin de configuração da biblioteca (`@expo/config-plugins`) na raiz for identificado como incompatível com o novo SDK pelo diagnóstico de saúde, o bump isolado desse único pacote na raiz é permitido como exceção pontual ao escopo da Fase 1.
- O Android SDK deve estar configurado localmente. O prebuild local é obrigatório antes de abrir o PR — não é suficiente confiar apenas no CI para a validação Android.
- A Fase 2 (atualização da raiz da biblioteca) será tratada em PR separado, após esta Fase 1 estar mesclada em `develop`.
- Os arquivos identificados como "não mudam" são agnósticos de versão e não exigem alteração manual; qualquer mudança nesses arquivos seria regressão e não parte do escopo.
