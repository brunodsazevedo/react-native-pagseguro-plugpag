# Quickstart: Fluxo de Release com CI/CD

**Feature**: 010-cicd-npm-deploy | **Após implementação desta feature**

---

## Pré-requisitos (uma vez)

1. Gerar token granular no npmjs.com:
   - Account → Access Tokens → Generate New Token → Granular Access Token
   - Expiration: 90 dias
   - Packages: selecionar apenas `react-native-pagseguro-plugpag` (Read & Write)

2. Configurar secret no GitHub:
   - Settings → Secrets and variables → Actions → New repository secret
   - Nome: `NPM_TOKEN` | Valor: token gerado acima

---

## Fluxo automático (recomendado)

### Publicar versão Release Candidate

```bash
# 1. Criar release branch
git flow release start v1.0.0-rc.1

# 2. Atualizar versão no package.json para "1.0.0-rc.1"
# 3. Atualizar CHANGELOG.md: mover [Unreleased] → [1.0.0-rc.1] - YYYY-MM-DD
# 4. Commitar
git add package.json CHANGELOG.md
git commit -m "chore: prepare release v1.0.0-rc.1"

# 5. Finalizar release (merge para main + tag + merge back para develop)
git flow release finish v1.0.0-rc.1

# → Push para main dispara o workflow ci-cd.yml
# → Job cd detecta dist_tag=rc e publica com --tag rc
# → npm install react-native-pagseguro-plugpag NÃO instala o RC por padrão
```

### Publicar versão estável após aprovação do RC

```bash
# 1. Criar release branch
git flow release start v1.0.0

# 2. Atualizar versão no package.json para "1.0.0"
# 3. Atualizar CHANGELOG.md
git add package.json CHANGELOG.md
git commit -m "chore: prepare release v1.0.0"

# 4. Finalizar release
git flow release finish v1.0.0

# → Push para main dispara o workflow ci-cd.yml
# → Job cd detecta dist_tag=latest e publica como versão padrão
```

**Alternativa**: Promover o RC existente para latest sem re-publicar:
```bash
# Confirmar que a versão no package.json é a RC aprovada (ex: "1.0.0-rc.1")
yarn release:promote
# → Executa: npm dist-tag add react-native-pagseguro-plugpag@1.0.0-rc.1 latest
```

---

## Fluxo manual (local)

> ⚠️ Executar exclusivamente de dentro de uma release branch (`release/vX.Y.Z`).

```bash
# Verificar que o ambiente local está autenticado no npm
npm whoami

# Patch (1.0.0 → 1.0.1): bump + lint + tests + build + publish latest
yarn release:patch

# Minor (1.0.0 → 1.1.0)
yarn release:minor

# Major (1.0.0 → 2.0.0)
yarn release:major

# RC (versão já em package.json, ex: "1.0.0-rc.1"): lint + tests + build + publish rc
yarn release:rc

# Promover RC aprovado para latest (sem re-publicar)
yarn release:promote
```

O hook `prepublishOnly` executa automaticamente antes de qualquer publish:
`lint` → `typecheck` → `test` → `bob build` → `build:plugin`

---

## Verificação pós-publicação

```bash
# Confirmar versão publicada como latest
npm view react-native-pagseguro-plugpag version

# Confirmar dist-tags disponíveis
npm dist-tag ls react-native-pagseguro-plugpag

# Verificar provenance do pacote
npm audit signatures
```

---

## Quando o pipeline pula a publicação

O job `cd` pula silenciosamente (sem falhar) se:
- A versão em `package.json` já está publicada no npm com a mesma dist-tag.
- O evento que disparou o workflow é um PR (não um push direto para `main`).

---

## Renovação do NPM_TOKEN

O token tem validade de 90 dias. Ao expirar, o job `cd` falha com erro de autenticação e o autor do push recebe notificação por e-mail. Para renovar:

1. Gerar novo token no npmjs.com (mesmas configurações acima).
2. Atualizar o secret `NPM_TOKEN` no GitHub (Settings → Secrets → Actions → editar).
