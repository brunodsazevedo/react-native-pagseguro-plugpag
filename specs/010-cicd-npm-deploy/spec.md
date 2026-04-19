# Feature Specification: Deploy Automatizado para npm (CI/CD)

**Feature Branch**: `feature/010-cicd-npm-deploy`
**Created**: 2026-04-07
**Status**: Draft
**Input**: Deploy automatizado para npm via CI/CD (GitHub Actions) com publicação automática ao push na branch main, incluindo gate de qualidade CI, verificação de versão idempotente, suporte a dist-tags (latest e rc), e scripts de release manual no package.json

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicação automática validada ao finalizar uma release (Priority: P1)

Como mantenedor da biblioteca, ao finalizar uma release via git flow (merge de `release/*` ou `hotfix/*` para `main`), quero que a biblioteca seja publicada automaticamente no registro npm — **sem intervenção manual** — garantindo que apenas código que passou por lint, type-check e testes chegue aos consumidores.

**Why this priority**: É o objetivo central da feature. Elimina erros humanos, garante rastreabilidade e desacopla a publicação de ações manuais propensas a falhas. Sem isso, toda a feature não tem valor.

**Independent Test**: Pode ser validado criando uma release branch, atualizando a versão em `package.json`, fazendo o merge para `main` e verificando no registro npm que o pacote aparece na versão correta sem nenhuma ação manual adicional.

**Acceptance Scenarios**:

1. **Given** a versão em `package.json` é diferente da versão publicada no npm, **When** um merge é feito para a branch `main`, **Then** o pipeline executa lint + testes + build e, após todos passarem, publica o pacote no npm com a versão especificada em `package.json`.
2. **Given** o lint ou os testes falham durante o pipeline, **When** um merge é feito para `main`, **Then** a publicação é bloqueada e nenhum artefato chega ao npm.
3. **Given** a versão em `package.json` já existe no registro npm, **When** um merge é feito para `main`, **Then** o pipeline ignora a etapa de publicação silenciosamente, sem falhar.

---

### User Story 2 - Suporte a versões pré-release (Release Candidate) (Priority: P2)

Como mantenedor, quero publicar versões `rc` (Release Candidate) de forma segura, sem que essas versões sejam instaladas por padrão pelos consumidores da biblioteca. O consumidor deve fazer opt-in explícito para instalar um RC.

**Why this priority**: A primeira publicação planejada é uma versão RC. Publicar um RC como versão padrão (`latest`) exporia todos os consumidores a uma API ainda não estabilizada — risco alto de regressões em produção para adotantes da biblioteca.

**Independent Test**: Pode ser validado publicando uma versão com sufixo pré-release (ex: `1.0.0-rc.1`) e confirmando que `npm install react-native-pagseguro-plugpag` instala a versão estável anterior, enquanto `npm install react-native-pagseguro-plugpag@rc` instala o RC.

**Acceptance Scenarios**:

1. **Given** a versão em `package.json` contém um identificador de pré-release (ex: `1.0.0-rc.1`), **When** o pipeline publica o pacote, **Then** o pacote é publicado sob a dist-tag `rc` e a dist-tag `latest` não é atualizada.
2. **Given** a versão em `package.json` é estável (ex: `1.0.0`), **When** o pipeline publica o pacote, **Then** o pacote é publicado sob a dist-tag `latest`.
3. **Given** um pacote RC foi publicado com a tag `rc`, **When** um consumidor executa a instalação padrão sem especificar tag, **Then** a versão estável anterior continua sendo instalada.

---

### User Story 3 - Publicação manual com validação prévia (Priority: P3)

Como mantenedor, quero poder publicar a biblioteca a partir do meu ambiente local com um único comando, com a garantia de que lint, testes e build são executados automaticamente antes da publicação — sem pular etapas de validação.

**Why this priority**: Necessário para situações onde o mantenedor precisa publicar fora do fluxo automatizado (ex: primeiro publish, correções emergenciais locais). A validação automática garante que o processo manual tenha o mesmo nível de segurança que o automatizado.

**Independent Test**: Pode ser validado executando o script de release localmente e confirmando que o pacote aparece no npm somente após lint + testes + build completarem com sucesso.

**Acceptance Scenarios**:

1. **Given** o ambiente local está configurado e autenticado no npm, **When** o mantenedor executa um script de release (patch, minor, major ou rc), **Then** lint + testes + build são executados automaticamente antes da publicação; se qualquer etapa falhar, a publicação não ocorre.
2. **Given** um script de release stable é executado (patch/minor/major), **When** a publicação é concluída, **Then** a versão é incrementada automaticamente no `package.json` e um commit/tag git é criado.
3. **Given** o script de release RC é executado, **When** a publicação é concluída, **Then** o pacote é publicado com a dist-tag `rc`, sem alterar a versão no `package.json` (a versão RC deve estar pré-definida manualmente).
4. **Given** uma versão RC foi validada e aprovada para produção, **When** o mantenedor executa o script de promoção, **Then** a dist-tag `latest` passa a apontar para a versão RC existente no registro npm sem re-publicar nenhum artefato.

---

### User Story 4 - Registro de mudanças por versão (Priority: P4)

Como consumidor ou contribuidor da biblioteca, quero consultar um histórico de mudanças organizado por versão para entender o que foi adicionado, corrigido ou alterado em cada release.

**Why this priority**: Essencial para adotantes da biblioteca avaliarem impacto de upgrades. Prioridade menor que a automação em si, pois é um processo de documentação manual que complementa o ciclo de release.

**Independent Test**: Pode ser validado verificando a existência do arquivo `CHANGELOG.md` na raiz do projeto com seção `[Unreleased]` e pelo menos uma versão documentada.

**Acceptance Scenarios**:

1. **Given** uma nova versão está sendo preparada em uma release branch, **When** o mantenedor finaliza a release, **Then** as mudanças acumuladas na seção `[Unreleased]` do CHANGELOG foram movidas para uma seção versionada com data.
2. **Given** o CHANGELOG existe na raiz do projeto, **When** qualquer pessoa acessa o repositório, **Then** consegue identificar as mudanças de cada versão publicada sem precisar ler o histórico de commits.

---

### Edge Cases

- O que acontece se dois merges para `main` ocorrerem em sequência muito curta (ex: merge de release seguido de hotfix imediato)?
- O que acontece se a publicação no npm for interrompida no meio (ex: timeout de rede)?
- O que acontece se o `package.json` não tiver a versão atualizada antes do merge (mesma versão já publicada)? → Pipeline completa com sucesso, etapa de publicação ignorada silenciosamente (FR-003).
- O que acontece se o token de autenticação do npm estiver expirado ou inválido? → O job de CD falha com erro explícito; o mantenedor é notificado pela notificação padrão da plataforma de CI (e-mail para o autor do push). Nenhuma integração adicional de notificação é requerida.
- O que acontece se o build dos artefatos da biblioteca falhar durante o pipeline de CD? → Pipeline falha, publicação bloqueada; notificação padrão da plataforma (e-mail).
- O que acontece se um PR é aberto mas ainda não mergeado — o pipeline de CD deve ser acionado? → Não. O job de publicação é ignorado em eventos de PR; apenas o CI executa (FR-011).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de qualidade (lint, type-check, testes unitários e build) DEVE ser executado automaticamente a cada push para `main` e a cada pull request aberto ou atualizado contra `main`.
- **FR-002**: A publicação no registro npm DEVE ocorrer automaticamente apenas quando: (a) a branch é `main`, (b) o evento é um push direto (não PR), e (c) todos os jobs de qualidade passaram com sucesso.
- **FR-003**: O sistema DEVE verificar se a versão em `package.json` já está publicada no registro npm antes de tentar publicar — se já estiver, a etapa de publicação DEVE ser ignorada silenciosamente sem falhar o pipeline.
- **FR-004**: O sistema DEVE detectar automaticamente o tipo de versão (estável ou pré-release) a partir do identificador de versão em `package.json` e aplicar a dist-tag correspondente na publicação.
- **FR-005**: Cada pacote publicado DEVE incluir informações de proveniência vinculando o artefato ao commit e ao pipeline exatos que o geraram.
- **FR-006**: O mantenedor DEVE poder publicar a biblioteca a partir do ambiente local por meio de scripts padronizados que executem validação completa antes da publicação.
- **FR-007**: Os scripts de release DEVEM suportar os seguintes fluxos: incremento de versão patch, minor e major (estável); publicação de versão RC (pré-release); e promoção de uma versão RC já publicada para a dist-tag `latest` sem re-publicar o artefato.
- **FR-008**: O token de autenticação do registro npm DEVE ser armazenado como secret do repositório e nunca exposto em logs ou artefatos do pipeline.
- **FR-009**: O pipeline DEVE construir os artefatos da biblioteca (módulo JS, tipos TypeScript e Expo Config Plugin) durante o job de publicação, verificando que os artefatos esperados estão presentes antes de publicar.
- **FR-010**: O arquivo `CHANGELOG.md` DEVE existir na raiz do projeto, seguindo o padrão Keep a Changelog, com uma seção `[Unreleased]` para acumular mudanças durante o desenvolvimento.
- **FR-011**: O pipeline de CI DEVE continuar executando para PRs mesmo quando o job de publicação está configurado — PRs recebem apenas validação de qualidade, sem publicação.

### Key Entities

- **Pipeline de CI**: Conjunto de verificações de qualidade (lint, type-check, testes, build) que DEVE ser executado em todo push e PR. Representa o gate obrigatório antes de qualquer publicação.
- **Job de CD**: Etapa de publicação que depende do sucesso do CI. Executa apenas em push para `main`. Verifica versão, constrói artefatos e publica no registro npm.
- **Versão**: Identificador semântico em `package.json` que determina o que será publicado. Pode ser estável (ex: `1.0.0`) ou pré-release (ex: `1.0.0-rc.1`). Atualizado manualmente pelo mantenedor na release branch.
- **Dist-tag**: Rótulo no registro npm que controla qual versão é instalada por padrão. `latest` para versões estáveis; identificador extraído do pré-release (ex: `rc`) para versões RC.
- **CHANGELOG**: Arquivo de registro histórico das mudanças por versão. Mantido manualmente pelo mantenedor a cada release.
- **Script de release**: Comandos padronizados disponíveis ao mantenedor para publicação local com validação automática integrada.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após qualquer merge para `main`, a nova versão da biblioteca aparece publicada no registro npm em menos de 10 minutos, sem qualquer ação manual adicional do mantenedor.
- **SC-002**: 100% dos pushes para `main` passam por lint, type-check e testes unitários antes de qualquer publicação — zero artefatos publicados com falhas de validação.
- **SC-003**: Merges para `main` sem alteração de versão (ex: commits de documentação) completam o pipeline com sucesso sem publicar uma versão duplicada — zero falhas de pipeline por versão já existente.
- **SC-004**: A versão RC publicada não aparece como `latest` no registro npm — consumidores que executam a instalação padrão não instalam o RC acidentalmente.
- **SC-005**: O mantenedor consegue publicar uma nova versão a partir do ambiente local com um único comando, com lint + testes + build executados automaticamente — zero publicações locais sem validação prévia.
- **SC-006**: O `CHANGELOG.md` está presente na raiz do projeto com a seção `[Unreleased]` e o conteúdo da versão `1.0.0-rc.1` documentados antes da primeira publicação.

---

## Clarifications

### Session 2026-04-07

- Q: Quando o job de CD falha (token expirado, registry npm indisponível, erro de build), como o mantenedor deve ser notificado além do comportamento padrão do GitHub? → A: Notificação padrão da plataforma de CI (e-mail para o autor do push) — sem integração adicional de notificação.
- Q: A promoção de uma versão RC aprovada para a dist-tag `latest` deve ter um script dedicado no `package.json` ou ser documentada apenas como comando manual? → A: Adicionar `release:promote` aos scripts do `package.json` para promoção RC → latest.
- Q: O pipeline deve validar que o CHANGELOG.md foi atualizado para a versão sendo publicada antes de permitir a publicação? → A: Sem validação no pipeline — responsabilidade do mantenedor, reforçada por revisão de PR e checklist de release.

---

## Assumptions

- O repositório já possui um workflow de CI funcional que cobre lint, type-check, testes e build — a feature estende esse workflow com o job de CD, sem recriar a infraestrutura existente.
- O versionamento é feito manualmente pelo mantenedor na release branch antes do merge para `main` — a feature não implementa versionamento automático por convenção de commits.
- O mantenedor possui acesso para criar tokens granulares no registro npm e configurar secrets no repositório GitHub.
- Releases são infrequentes e controladas (git flow) — o risco de dois merges simultâneos para `main` é baixo e considerado aceitável sem mecanismo de fila de publicação.
- O arquivo `.gitignore` já exclui os diretórios de artefatos de build (`lib/`, `plugin/build/`) — a feature não precisa criar ou alterar configurações de ignore.
- A primeira publicação da biblioteca será uma versão Release Candidate (`1.0.0-rc.1`), não uma versão estável.
- A atualização do `CHANGELOG.md` não é validada pelo pipeline — é responsabilidade do mantenedor e reforçada por revisão de PR e checklist de release process.
