# Contrato: Exceção Condicional — `@expo/config-plugins` na Raiz

**Feature**: 013-expo-sdk-56-upgrade  
**Tipo**: Exceção ao escopo da Fase 1 (FR-002)  
**Arquivo alvo**: `package.json` (raiz)  
**Condição de ativação**: `npx expo-doctor` reportar saída classificada como `error` em
`@expo/config-plugins`

## Quando Aplicar

Esta exceção DEVE ser aplicada se e somente se:

1. `npx expo-doctor` executado após o bump do `example/` reportar uma linha com status
   `error` relacionada a `@expo/config-plugins` (incompatibilidade de peer com `expo@56`).
2. A saída indica que `@expo/config-plugins@^9.0.0` é incompatível com `expo@~56.0.0`.

Saídas classificadas como `warning` **não** ativam esta exceção.

## Mudança Aplicada (se ativada)

```diff
# package.json (raiz) — devDependencies
- "@expo/config-plugins": "^9.0.0",
+ "@expo/config-plugins": "~56.0.0",
```

## Validação Pós-Exceção

Após aplicar o bump na raiz, DEVE ser executado:

```bash
# 1. Reinstalar dependências
yarn install

# 2. Verificar que o deep import ainda funciona
yarn build:plugin
# Esperado: sem erros; artefatos em plugin/build/

# 3. Validar com prebuild
yarn example expo prebuild --platform android
# Esperado: sem erros; arquivos nativos gerados em example/android/
```

### Se `yarn build:plugin` falhar após o bump

O deep import `@expo/config-plugins/build/utils/generateCode` pode ter mudado o caminho
interno em `~56.0.0`. Ação:

1. Verificar se `mergeContents` ainda está disponível no mesmo caminho no pacote instalado.
2. Se o caminho mudou: substituir o import em `plugin/index.ts`:
   ```diff
   - import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
   + import { mergeContents } from 'expo/config-plugins/build/utils/generateCode';
   ```
   Ou, se `expo/config-plugins` não reexportar o utilitário interno:
   ```diff
   - import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
   + // copiar implementação minimal de mergeContents ou usar API pública equivalente
   ```
3. Documentar a mudança como parte da exceção no commit separado.

## Organização de Commits

Esta exceção DEVE ser entregue em **commit separado** do commit principal das mudanças do
`example/`. Mensagem de commit sugerida:

```
chore: bump @expo/config-plugins para ~56.0.0 na raiz (exceção Fase 1)

Exceção ao escopo da Fase 1 (feature/013): expo-doctor reportou incompatibilidade
de @expo/config-plugins@^9.0.0 com expo@~56.0.0. Antecipação pontual do item
previsto para a Fase 2 da atualização do Expo SDK 56.
```

## Critério de Aceitação Vinculado

- **FR-002**: Exceção aplicada no mesmo PR, em commit separado, identificado como exceção.
- **FR-003**: `expo-doctor` sem outputs de categoria `error` após a exceção ser aplicada.
- **FR-004**: `expo prebuild --platform android` conclui sem erros.
- **SC-006**: `git diff --name-only` aponta apenas `example/package.json` e `package.json`
  (raiz) — nenhum outro arquivo.
