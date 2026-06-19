# Quickstart: Atualização do Expo Config Plugin para SDK 56

**Feature**: 014-expo-config-plugin-sdk56

---

## Visão Geral

Esta feature é uma migração cirúrgica de 2 arquivos. Não há nova lógica — apenas mudança de versão de dependência e de caminho de importação.

---

## Mudanças Necessárias

### 1. `package.json` — Atualizar devDependency

```diff
- "@expo/config-plugins": "^9.0.0",
+ "@expo/config-plugins": "~56.0.9",
```

### 2. `plugin/index.ts` — Migrar para API pública

```diff
  import {
    withProjectBuildGradle,
    withAppBuildGradle,
    type ConfigPlugin,
+   CodeGenerator,
  } from '@expo/config-plugins';
- import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
```

E substituir o uso:

```diff
- mod.modResults.contents = mergeContents({
+ mod.modResults.contents = CodeGenerator.mergeContents({
```

(2 ocorrências — uma em `withPagSeguroMaven`, outra em `withPagSeguroDependency`)

---

## Comandos de Validação (executar em ordem)

```bash
# 1. Instalar dependência atualizada
yarn install

# 2. Build do plugin (TypeScript compile)
yarn build:plugin

# 3. Lint (zero erros ou avisos)
yarn lint

# 4. Type check completo
yarn typecheck

# 5. Testes unitários
yarn test

# 6. Build completo da biblioteca
yarn prepare

# 7. Validação do prebuild Android (app de exemplo)
cd example/android && ./gradlew clean && cd ../..
yarn example android --no-bundler || npx expo prebuild --platform android --clean --project-root example/
```

---

## Verificação de Saída

Após prebuild do app de exemplo, confirmar nos arquivos Gradle gerados:

```bash
# Deve conter a URL do Maven PagSeguro:
grep -n "pagseguro" example/android/build.gradle

# Deve conter a dependência wrapper:
grep -n "plugpagservice" example/android/app/build.gradle

# Deve conter tags de idempotência:
grep -n "pagseguro-plugpag-maven" example/android/build.gradle
grep -n "pagseguro-plugpag-dependency" example/android/app/build.gradle
```

---

## Critérios de Conclusão

- [ ] `yarn build:plugin` → código de saída 0, artefatos em `plugin/build/`
- [ ] `yarn lint` → zero erros ou avisos
- [ ] `yarn typecheck` → zero erros
- [ ] `yarn test` → todos os testes passam
- [ ] `plugin/index.ts` não contém nenhuma referência a `/build/utils/generateCode`
- [ ] `git diff --name-only` mostra exatamente `package.json` e `plugin/index.ts`
