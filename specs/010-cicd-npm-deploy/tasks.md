# Tasks: Deploy Automatizado para npm (CI/CD)

**Input**: Design documents from `/specs/010-cicd-npm-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, contracts/npm-package.md ✅, quickstart.md ✅

**Testes**: Não há testes unitários automatizados para esta feature — validação é manual via `npm publish --dry-run` e verificação pós-publish no npmjs.com (conforme plan.md Validation Plan).

**Organização**: Tasks agrupadas por user story para permitir implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: Qual user story a task pertence (US1, US2, US3, US4)
- Caminhos de arquivo exatos em todas as descrições

---

## Phase 1: Setup

**Objetivo**: Renomear o arquivo de workflow para refletir o escopo expandido de CI/CD.

- [X] T001 Renomear `.github/workflows/ci.yml` para `.github/workflows/ci-cd.yml`

**Checkpoint**: Arquivo de workflow com novo nome pronto para receber modificações.

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Objetivo**: Ajustes de metadados no workflow que precedem qualquer implementação de job.

**⚠️ CRÍTICO**: Nenhuma user story pode ser iniciada antes desta fase estar completa.

- [X] T002 Atualizar `name: CI` para `name: CI/CD` em `.github/workflows/ci-cd.yml`
- [X] T003 Adicionar `permissions: contents: read` no nível do workflow em `.github/workflows/ci-cd.yml`

**Checkpoint**: Workflow com nome e permissões de baseline corretos — implementação das user stories pode começar.

---

## Phase 3: User Story 1 — Publicação automática validada ao finalizar uma release (Priority: P1) 🎯 MVP

**Objetivo**: Job `cd` funcional que publica no npm apenas quando: push para `main`, todos os gates de CI passaram, e a versão em `package.json` ainda não está publicada.

**Independent Test**: Fazer merge de uma release branch para `main` (com versão diferente da publicada no npm), verificar no GitHub Actions que o job `cd` executa após lint + test + build-library, e confirmar que o pacote aparece no npmjs.com na versão correta sem ação manual.

### Implementação User Story 1

- [X] T004 [US1] Adicionar esqueleto do job `cd` com `needs: [lint, test, build-library]`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, e `runs-on: ubuntu-latest` em `.github/workflows/ci-cd.yml`
- [X] T005 [US1] Adicionar permissões scoped ao job (`permissions: contents: read` + `id-token: write`) ao job `cd` em `.github/workflows/ci-cd.yml`
- [X] T006 [US1] Adicionar steps de setup ao job `cd` em `.github/workflows/ci-cd.yml`: (1) `actions/checkout` (mesmo hash SHA do CI), (2) `.github/actions/setup` (composite — instala deps + node sem registry), (3) `actions/setup-node` com `registry-url: 'https://registry.npmjs.org'` e `node-version-file: .nvmrc` (DEVE ser o último setup — pesquisa §2)
- [X] T007 [US1] Adicionar steps de build ao job `cd` em `.github/workflows/ci-cd.yml`: (1) `yarn bob build`, (2) `yarn build:plugin`, (3) step de verificação que confirma existência de `lib/` e `plugin/build/` antes de publicar
- [X] T008 [US1] Adicionar step de verificação de idempotência de versão ao job `cd` em `.github/workflows/ci-cd.yml`: ler versão de `package.json`, checar via `npm view react-native-pagseguro-plugpag@<version> version` se já publicada, definir output `skip_publish=true` se já existir (pesquisa §8)
- [X] T009 [US1] Adicionar step de `npm publish` ao job `cd` em `.github/workflows/ci-cd.yml`: `npm publish --provenance --access public --tag latest`, condicional a `skip_publish != 'true'`, usando `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`

**Checkpoint**: Job `cd` completo e funcional para versões estáveis. Publicação automática ao push para `main` com gate de CI + idempotência.

---

## Phase 4: User Story 2 — Suporte a versões pré-release (Release Candidate) (Priority: P2)

**Objetivo**: O job `cd` detecta automaticamente se a versão é pré-release e aplica a dist-tag correta (`rc` para `1.0.0-rc.1`, `latest` para `1.0.0`).

**Independent Test**: Publicar versão com sufixo `1.0.0-rc.1` e confirmar via `npm dist-tag ls react-native-pagseguro-plugpag` que somente a tag `rc` foi atualizada; `npm install react-native-pagseguro-plugpag` não deve instalar o RC.

### Implementação User Story 2

- [X] T010 [US2] Substituir `--tag latest` hardcoded por detecção dinâmica de dist-tag no job `cd` em `.github/workflows/ci-cd.yml`: antes do step de publish, extrair identificador de pré-release da versão (ex: `rc` de `1.0.0-rc.1`) via shell — se versão contém `-`, dist_tag = primeiro segmento após `-`; senão, dist_tag = `latest`; usar `$dist_tag` no `npm publish --tag $dist_tag`

**Checkpoint**: Publicação automática com dist-tag correta. Versões RC não contaminam a dist-tag `latest`.

---

## Phase 5: User Story 3 — Publicação manual com validação prévia (Priority: P3)

**Objetivo**: Scripts padronizados em `package.json` que executam lint + testes + build automaticamente antes de qualquer publish local.

**Independent Test**: Executar `npm publish --dry-run` localmente e confirmar que `prepublishOnly` executa lint → typecheck → test → bob build → build:plugin em sequência; qualquer falha aborta o publish.

### Implementação User Story 3

- [X] T011 [US3] Adicionar os seguintes scripts ao bloco `"scripts"` de `package.json`: `"prepublishOnly": "yarn lint && yarn typecheck && yarn test && yarn bob build && yarn build:plugin"`, `"release:rc": "npm publish --tag rc"`, `"release:patch": "npm version patch && npm publish --tag latest"`, `"release:minor": "npm version minor && npm publish --tag latest"`, `"release:major": "npm version major && npm publish --tag latest"`, `"release:promote": "npm dist-tag add react-native-pagseguro-plugpag@$(node -p \"require('./package.json').version\") latest"`

**Checkpoint**: Scripts de release disponíveis para uso local. `prepublishOnly` garante validação completa antes de qualquer publish.

---

## Phase 6: User Story 4 — Registro de mudanças por versão (Priority: P4)

**Objetivo**: Criar `CHANGELOG.md` na raiz do projeto seguindo o padrão Keep a Changelog com histórico inicial da versão `1.0.0-rc.1`.

**Independent Test**: Verificar existência de `CHANGELOG.md` na raiz do projeto com seção `[Unreleased]` (vazia) e seção `[1.0.0-rc.1]` com conteúdo das funcionalidades implementadas.

### Implementação User Story 4

- [X] T012 [US4] Criar `CHANGELOG.md` na raiz do projeto seguindo o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/): cabeçalho padrão, seção `[Unreleased]` vazia, seção `[1.0.0-rc.1] - 2026-04-07` com `Added` listando as funcionalidades implementadas (SDK Setup, PinPad Activation, Payment Methods, Refund, Custom Printing, TS Domain Split, documentação)

**Checkpoint**: CHANGELOG.md presente e documentado — pré-requisito para a primeira publicação.

---

## Phase 7: Polish & Validação

**Objetivo**: Validações manuais finais antes do primeiro publish e revisão do pipeline completo.

- [X] T013 [P] Executar `npm publish --dry-run` na raiz do projeto e verificar output: `lib/` e `plugin/build/` presentes; `spec/`, `example/`, `android/build/` ausentes (plan.md Validation Plan §1)
- [ ] T014 [P] Verificar que o workflow `ci-cd.yml` renomeado aparece corretamente no GitHub Actions após push para `develop` ou abertura de PR (sem job `cd` sendo disparado — apenas CI)
- [ ] T015 Verificar que o secret `NPM_TOKEN` está configurado no repositório GitHub (Settings → Secrets and variables → Actions) conforme quickstart.md Pré-requisitos

**Checkpoint**: Feature pronta para primeiro publish.

---

## Dependencies & Execution Order

### Dependências entre Fases

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende da conclusão do Setup (Phase 1) — BLOQUEIA todas as user stories
- **US1 (Phase 3)**: Depende da Foundational (Phase 2) — pode iniciar após conclusão
- **US2 (Phase 4)**: Depende da US1 (Phase 3) — modifica o job `cd` já criado em T004–T009
- **US3 (Phase 5)**: Depende da Foundational (Phase 2) — independente de US1, US2
- **US4 (Phase 6)**: Sem dependências de código — independente de todas as fases (apenas criação de arquivo)
- **Polish (Phase 7)**: Depende de US1 + US2 + US3 + US4 completos

### Dependências dentro de US1 (Phase 3)

```
T004 (esqueleto do job)
  → T005 (permissões)
    → T006 (steps de setup — ordem crítica: composite antes de setup-node com registry)
      → T007 (steps de build)
        → T008 (idempotência)
          → T009 (npm publish)
```

### Dependências dentro de US2 (Phase 4)

```
T009 (publish com --tag latest hardcoded) deve existir
  → T010 (substituir por detecção dinâmica de dist-tag)
```

### Oportunidades de Paralelismo

- T013 e T014 (Polish) marcados [P]: podem ser executados em paralelo após a implementação completa
- US3 (T011) e US4 (T012) são independentes entre si e podem ser trabalhadas em paralelo após a Foundational

---

## Parallel Example: US3 + US4

```bash
# Após Phase 2 (Foundational) completa, iniciar em paralelo:
Task T011: Adicionar scripts de release em package.json
Task T012: Criar CHANGELOG.md na raiz do projeto
# Ambas modificam arquivos diferentes — zero conflitos
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup (T001)
2. Completar Phase 2: Foundational (T002–T003)
3. Completar Phase 3: US1 (T004–T009)
4. **PARAR E VALIDAR**: Abrir PR para `main`, confirmar que job `cd` aparece mas não executa (apenas CI)
5. Fazer merge, confirmar publicação automática no npm

### Entrega Incremental

1. Setup + Foundational → Workflow renomeado e com permissões corretas
2. US1 → Publicação automática funcional (sempre publica como `latest`)
3. US2 → Suporte a dist-tags (RC não contamina `latest`)
4. US3 → Scripts de release local com validação integrada
5. US4 → CHANGELOG.md inicial criado
6. Polish → Dry-run e validação manual confirmados

---

## Notes

- **[P]** = arquivos diferentes, sem dependências mútuas
- **[Story]** = rastreabilidade de cada task à sua user story
- A ordem dos steps no job `cd` é **crítica**: `.github/actions/setup` DEVE preceder `setup-node` com `registry-url` — inverter causa `ENEEDAUTH` (research.md §2)
- `--access public` é necessário no workflow de CI para a primeira publicação (sem escopo de pacote); nos scripts locais é desnecessário pois o npm infere acesso público
- `release:promote` assume que `package.json` já contém a versão RC a ser promovida; executar apenas com a versão RC correta no arquivo
- Commitar após cada task ou grupo lógico
- Rodar `git status` após T001 (rename) para confirmar que o arquivo antigo foi removido e o novo foi criado
