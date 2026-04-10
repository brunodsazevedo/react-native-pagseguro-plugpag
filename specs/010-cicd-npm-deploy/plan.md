# Implementation Plan: Deploy Automatizado para npm (CI/CD)

**Branch**: `feature/010-cicd-npm-deploy` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-cicd-npm-deploy/spec.md`

---

## Summary

Adicionar um pipeline de CD ao workflow de CI existente para publicar automaticamente a biblioteca `react-native-pagseguro-plugpag` no npm quando um push ocorre na branch `main`. O CD depende do sucesso dos gates de qualidade (lint, test, build-library), verifica idempotência de versão, detecta automaticamente a dist-tag (`latest` vs `rc`) e inclui npm provenance. Complementado por scripts de release manual no `package.json` e criação do `CHANGELOG.md`.

---

## Technical Context

**Language/Version**: YAML (GitHub Actions), JSON (package.json), Markdown (CHANGELOG.md) — nenhuma alteração em TypeScript ou Kotlin
**Primary Dependencies**: GitHub Actions (CI/CD platform), npm registry, `actions/checkout@v5`, `actions/setup-node@v4`, `.github/actions/setup` (composite action existente)
**Storage**: N/A
**Testing**: Validação manual via `npm publish --dry-run` + verificação pós-publish no npmjs.com
**Target Platform**: Ubuntu latest (GitHub Actions runner)
**Project Type**: Configuração de CI/CD para biblioteca npm
**Performance Goals**: Job `cd` completo (build + publish) em menos de 5 minutos
**Constraints**: Node.js `v22.20.0` (.nvmrc), `yarn install --immutable` no CI, sem modificação dos jobs de CI existentes
**Scale/Scope**: 3 arquivos afetados — 1 renomeado+modificado (workflow), 1 modificado (package.json), 1 criado (CHANGELOG.md)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Esta feature modifica exclusivamente arquivos de configuração (YAML, JSON, Markdown). Nenhum código TypeScript ou Kotlin é adicionado ou alterado.

| Princípio | Aplicável? | Status |
|-----------|-----------|--------|
| I — TurboModules Only | Não (sem alteração de módulos nativos) | ✅ N/A |
| II — TypeScript Strict / Zero `any` | Não (sem alterações TypeScript) | ✅ N/A |
| III — Test-First / TDD | Parcial — o pipeline CI **reforça** este princípio ao executar testes como gate obrigatório antes de qualquer publicação | ✅ Compliant |
| IV — Clean Code + SOLID | Não (sem alterações de código) | ✅ N/A |
| V — Device Compatibility | Não (sem alterações de código) | ✅ N/A |
| VI — Android-Only Scope | Não (sem alterações de código) | ✅ N/A |

**Resultado**: Sem violações. Nenhuma justificativa de Complexity Tracking necessária.

**Nota pós-design**: O job `cd` adiciona `permissions.id-token: write` scoped ao job (não ao workflow), minimizando superfície de ataque — alinhado com o princípio de least-privilege implícito na constituição.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-cicd-npm-deploy/
├── plan.md              ← Este arquivo
├── research.md          ← Decisões técnicas e findings do codebase
├── data-model.md        ← N/A (feature de CI/CD não envolve entidades de dados)
├── contracts/
│   └── npm-package.md  ← Contrato do pacote publicado (files, dist-tags, exports)
├── quickstart.md        ← Guia de release para o mantenedor
├── checklists/
│   └── requirements.md ← Checklist de qualidade da spec
└── tasks.md             ← Gerado pelo /speckit.tasks (não criado aqui)
```

### Source Code (repository root)

```text
# Arquivo renomeado + modificado
.github/workflows/
├── ci.yml               ← RENOMEAR para ci-cd.yml
└── ci-cd.yml            ← RESULTADO: adicionar job `cd` ao final

# Arquivo modificado
package.json             ← Adicionar scripts de release

# Arquivo criado
CHANGELOG.md             ← Novo arquivo na raiz do projeto
```

**Structure Decision**: Feature de configuração pura — sem estrutura `src/` ou `tests/` envolvida. Os 3 arquivos afetados estão na raiz do repositório ou em `.github/workflows/`.

---

## Implementation Phases

### Phase A — Renomear e modificar o workflow

**Arquivo**: `.github/workflows/ci.yml` → `.github/workflows/ci-cd.yml`

Alterações no arquivo renomeado:
1. `name: CI` → `name: CI/CD`
2. Adicionar `permissions: contents: read` no nível do workflow (jobs de CI não precisam de `id-token`)
3. Adicionar o job `cd` ao final, com:
   - `needs: [lint, test, build-library]`
   - `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`
   - `permissions: contents: read` + `id-token: write` (scoped ao job)
   - Steps: Checkout → `.github/actions/setup` → `setup-node` (com `registry-url`) → `bob build` → `build:plugin` → verificação de artefatos → detecção de versão/dist-tag → `npm publish --provenance --access public --tag $dist_tag`

**Comportamento por evento após a mudança**:

| Evento | lint | test | build-library | build-android | cd |
|--------|------|------|---------------|---------------|----|
| Push para `main` | ✅ | ✅ | ✅ | ✅ | ✅ (se anteriores passaram) |
| PR para `main` | ✅ | ✅ | ✅ | ✅ | ⏭ pulado |
| merge_group | ✅ | ✅ | ✅ | ✅ | ⏭ pulado |

**Ordem crítica dos steps no job `cd`** (derivada de research.md §2):
```
1. actions/checkout
2. .github/actions/setup         ← instala dependências + node (sem registry-url)
3. actions/setup-node (registry) ← gera .npmrc com NODE_AUTH_TOKEN (DEVE ser o último setup)
4. yarn bob build
5. yarn build:plugin
6. Verificar artefatos (lib/, plugin/build/)
7. Detectar versão e dist-tag
8. npm publish (se não skip)
```

---

### Phase B — Adicionar scripts em package.json

Adicionar ao bloco `"scripts"`:

```json
"prepublishOnly": "yarn lint && yarn typecheck && yarn test && yarn bob build && yarn build:plugin",
"release:rc": "npm publish --tag rc",
"release:patch": "npm version patch && npm publish --tag latest",
"release:minor": "npm version minor && npm publish --tag latest",
"release:major": "npm version major && npm publish --tag latest",
"release:promote": "npm dist-tag add react-native-pagseguro-plugpag@$(node -p \"require('./package.json').version\") latest"
```

**Notas de implementação**:
- `prepublishOnly` usa `yarn bob build` + `yarn build:plugin` separadamente (não `yarn prepare`) para visibilidade individual de falhas.
- `release:promote` assume que `package.json` já contém a versão RC que deve ser promovida (ex: `"1.0.0-rc.1"`). O mantenedor executa este script com a versão RC no `package.json`, não na versão stable.
- `--access public` omitido dos scripts locais (pacote não tem escopo — é público por padrão). Mantido no workflow porque npm exige a flag em ambientes de CI para a primeira publicação.

---

### Phase C — Criar CHANGELOG.md

Criar `CHANGELOG.md` na raiz do projeto seguindo o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) com:
- Cabeçalho padrão
- Seção `[Unreleased]` (vazia — para acumular mudanças futuras)
- Seção `[1.0.0-rc.1] - YYYY-MM-DD` com o conteúdo das funcionalidades já implementadas

---

## Validation Plan

### Validação do workflow (manual, pré-primeiro publish)

```bash
# 1. Verificar que o workflow aparece corretamente no GitHub Actions
# (após push para develop ou PR)

# 2. Dry-run local do npm publish para conferir artefatos
npm publish --dry-run

# 3. Confirmar que lib/ e plugin/build/ aparecem no dry-run output
# e que spec/, example/, android/build/ NÃO aparecem
```

### Validação dos scripts (manual, ambiente local autenticado)

```bash
# Testar prepublishOnly sem publicar
npm publish --dry-run

# Confirmar que yarn release:rc usa a tag correta
# Em uma release branch com version "1.0.0-rc.1" no package.json:
# yarn release:rc → deve publicar com --tag rc
```

### Validação pós-primeiro publish

```bash
npm view react-native-pagseguro-plugpag dist-tags
# Esperado: { rc: '1.0.0-rc.1' }
# NÃO esperado: { latest: '1.0.0-rc.1' }
```

---

## Risk Register

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Ordem setup-node invertida (ENEEDAUTH) | Média (erro de implementação) | Alto (publish falha silenciosamente) | Research §2 documenta a ordem obrigatória; verificar action.yml do composite |
| Token NPM_TOKEN expirado (90 dias) | Alta (certeza após 90 dias) | Médio (publish falha, notificação por e-mail) | Documentado em quickstart.md; sem automação de renovação |
| `release:promote` com versão errada em package.json | Baixa | Alto (promove versão errada para latest) | Documentar claramente no quickstart.md que package.json deve ter a versão RC correta |
| Concurrent pushes para main | Muito baixa (git flow controlado) | Médio (publish interrompido) | Assumido como risco aceito (spec Assumptions) |
