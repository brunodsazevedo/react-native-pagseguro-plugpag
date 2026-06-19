# Contrato: `example/package.json` (Estado Alvo)

**Feature**: 013-expo-sdk-56-upgrade  
**Tipo**: Arquivo de configuração de dependências  
**Arquivo alvo**: `example/package.json`

## Estado Alvo Esperado

Após a execução do bump + `expo install --fix`, o arquivo DEVE refletir:

```json
{
  "name": "react-native-pagseguro-plugpag-example",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android"
  },
  "dependencies": {
    "expo": "~56.0.0",
    "expo-status-bar": "<versão alinhada ao SDK 56 pelo expo install --fix>",
    "react": "19.2.0",
    "react-native": "0.85.3",
    "react-native-pagseguro-plugpag": "workspace:*"
  },
  "private": true,
  "devDependencies": {
    "expo-dev-client": "<versão alinhada ao SDK 56 pelo expo install --fix>",
    "react-native-builder-bob": "^0.43.0",
    "react-native-monorepo-config": "^0.4.0"
  }
}
```

> **Nota**: Os valores marcados como `<versão alinhada pelo expo install --fix>` são
> determinados pelo Expo CLI em runtime, não por este documento. O contrato garante
> apenas que esses campos existam e que a versão seja compatível com Expo SDK 56.

## Invariantes do Contrato

- `expo` DEVE ter range `~56.x` (não `~55.x`).
- `react-native` DEVE ter versão `0.85.x` (não `0.83.x` nem `0.86.x`).
- `react` DEVE permanecer `19.2.0` (sem mudança).
- `react-native-pagseguro-plugpag` DEVE permanecer `workspace:*` (sem mudança).
- `react-native-builder-bob` DEVE ter range `^0.43.0`.
- `react-native-monorepo-config` DEVE ter range `^0.4.0`.
- `scripts`, `name`, `version`, `main`, `private` DEVEM permanecer inalterados.

## Validação

Verificar após o bump:

```bash
# Verificar versão do expo
node -e "console.log(require('./example/package.json').dependencies.expo)"
# Esperado: ~56.x.x

# Verificar versão do react-native  
node -e "console.log(require('./example/package.json').dependencies['react-native'])"
# Esperado: 0.85.x

# Verificar devDeps manuais
node -e "const p = require('./example/package.json'); console.log(p.devDependencies['react-native-builder-bob'], p.devDependencies['react-native-monorepo-config'])"
# Esperado: ^0.43.0  ^0.4.0
```

## Critério de Aceitação Vinculado

- **SC-001**: `example/package.json` reflete Expo SDK 56 e React Native 0.85.x.
- **FR-001**: Todas as dependências listadas atualizadas para as versões especificadas.
- **FR-007**: Nenhum campo de `scripts`, `name`, `main`, `private` foi alterado.
