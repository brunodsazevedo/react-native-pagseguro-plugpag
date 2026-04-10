# Research: Deploy Automatizado para npm (CI/CD)

**Feature**: 010-cicd-npm-deploy | **Date**: 2026-04-07

---

## 1. Baseline do workflow de CI existente

**Decision**: O arquivo `.github/workflows/ci.yml` existente será renomeado para `ci-cd.yml` e receberá o job `cd` ao final. Os jobs de CI existentes não são alterados.

**Rationale**: O workflow atual já cobre os 4 jobs de qualidade (`lint`, `test`, `build-library`, `build-android`) com a estrutura correta. Adicionar o job `cd` no mesmo arquivo evita triggers sobrepostos e mantém a visibilidade do pipeline em um único lugar.

**Findings do arquivo existente**:
- Triggers: `push` para `main`, `pull_request` para `main`, `merge_group`
- Concurrency: `group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`
- Action versions usadas: `actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8`, `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`, `actions/cache@5a3ec84eff668545956fd18022155c47e93e2684`
- Composite action `.github/actions/setup` chama `setup-node` **sem** `registry-url`

---

## 2. Comportamento crítico: setup-node e NODE_AUTH_TOKEN

**Decision**: O job `cd` deve chamar o composite action `.github/actions/setup` primeiro e depois invocar `actions/setup-node` uma segunda vez **com** `registry-url: 'https://registry.npmjs.org'`.

**Rationale**: O composite action `.github/actions/setup` já chama `setup-node` internamente (linha 3–6 de `action.yml`) — mas sem `registry-url`. Esse primeiro `setup-node` configura o cache de `node_modules` e instala dependências. Se chamarmos `setup-node` com `registry-url` ANTES do composite action, o `.npmrc` gerado com `NODE_AUTH_TOKEN` seria sobrescrito pelo segundo `setup-node` do composite. A ordem correta é:

```
1. uses: ./.github/actions/setup        ← instala dependências + cache
2. uses: actions/setup-node (registry)  ← gera .npmrc com NODE_AUTH_TOKEN
```

Inverter essa ordem resulta em `npm publish` falhando com `ENEEDAUTH`.

**Alternatives considered**:
- Modificar o composite action para aceitar `registry-url` como input → rejeitado: modifica um componente compartilhado por todos os jobs de CI sem necessidade.
- Usar apenas um `setup-node` com registry-url → rejeitado: o composite action rodaria setup-node novamente e sobrescreveria o .npmrc.

---

## 3. Controle do que é publicado no npm

**Decision**: Nenhuma alteração no `package.json` `files` ou criação de `.npmignore` é necessária.

**Rationale**: O campo `files` em `package.json` já define explicitamente os artefatos publicados:

```json
"files": [
  "src", "lib", "android", "app.plugin.js", "plugin/build",
  "react-native.config.js",
  "!android/build", "!android/gradle", "!android/gradlew",
  "!android/gradlew.bat", "!android/local.properties",
  "!**/__tests__", "!**/__fixtures__", "!**/__mocks__", "!**/.*"
]
```

Os diretórios `lib/` e `plugin/build/` estão incluídos — artefatos de build chegam ao npm. Eles estão no `.gitignore` (comportamento correto: build não vai ao git, vai ao npm).

**Alternatives considered**:
- Criar `.npmignore` → rejeitado: o campo `files` é a abordagem recomendada (whitelist vs blacklist). `.npmignore` coexistindo com `files` é confuso.

---

## 4. Node.js e versão do ambiente

**Decision**: Usar `.nvmrc` (`v22.20.0`) como fonte única de verdade para a versão Node tanto no CI quanto nos scripts locais.

**Rationale**: O composite action `.github/actions/setup` já usa `node-version-file: .nvmrc`. O segundo `setup-node` para o job `cd` deve fazer o mesmo, garantindo consistência entre todos os jobs.

---

## 5. Build no job cd: separado ou via yarn prepare?

**Decision**: Usar `yarn bob build` e `yarn build:plugin` como steps separados no job `cd`, não `yarn prepare`.

**Rationale**: `yarn prepare` executa ambos em sequência, mas sem visibilidade individual nos logs do GitHub Actions. Steps separados permitem atribuir falhas ao componente correto (biblioteca JS vs Expo Config Plugin). Adicionalmente, `yarn prepare` pode incluir passos adicionais futuros que não devem fazer parte do fluxo de publicação.

---

## 6. Scripts de release: npm version vs semver manual

**Decision**: Os scripts de release stable (`release:patch`, `release:minor`, `release:major`) usam `npm version <bump>` para incrementar a versão antes de publicar. O script `release:rc` publica sem bumpar versão (versão RC já definida manualmente em `package.json`).

**Rationale**: `npm version` cria automaticamente um commit com mensagem `vX.Y.Z` e uma tag git `vX.Y.Z` — integrando-se naturalmente ao histórico de commits. Para RC, a versão é definida manualmente na release branch pelo desenvolvedor, então `npm version` seria redundante.

**Constraint**: Os scripts `release:patch/minor/major` DEVEM ser executados de dentro de uma release branch (`release/vX.Y.Z`), nunca de `develop` ou `main`. Caso contrário, o commit criado por `npm version` polui essas branches.

---

## 7. Script release:promote (RC → latest)

**Decision**: Adicionar `release:promote` ao `package.json` que executa a promoção da versão RC para a dist-tag `latest` sem re-publicar o artefato.

**Rationale**: Clarificação Q2 da sessão de `/speckit.clarify` — consistência com os outros scripts de release, torna o passo descobrível e evita que o desenvolvedor precise lembrar a sintaxe do comando npm.

**Command pattern**: `npm dist-tag add react-native-pagseguro-plugpag@$(node -p "require('./package.json').version") latest`

---

## 8. Verificação de versão antes de publicar (idempotência)

**Decision**: Antes de `npm publish`, o job `cd` verifica se a versão em `package.json` já está publicada. Para pré-releases, a verificação usa a dist-tag extraída do identificador (ex: `@rc`). Para estável, usa `npm view pkg version`.

**Rationale**: Merges de commits de documentação, README ou configuração para `main` não devem falhar o pipeline por tentar re-publicar uma versão já existente. A verificação torna o job idempotente.

---

## 9. npm provenance (OIDC)

**Decision**: Publicar com `--provenance` no job `cd`. Requer `permissions.id-token: write` no nível do job (não do workflow).

**Rationale**: npm provenance vincula cada artefato publicado ao commit e workflow exatos que o geraram — rastreabilidade para consumidores. A permissão `id-token: write` é scoped ao job `cd` para minimizar superfície de ataque; os jobs de CI não precisam dela.

**Alternatives considered**:
- Sem provenance → rejeitado: rastreabilidade é requisito explícito (FR-005).
- `id-token: write` no nível do workflow → rejeitado: jobs de CI não precisam de OIDC; expõe a permissão desnecessariamente.
