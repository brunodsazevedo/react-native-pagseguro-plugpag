# Contrato: Pacote npm `react-native-pagseguro-plugpag`

**Tipo**: Pacote npm (biblioteca React Native)
**Registry**: https://registry.npmjs.org/

---

## Conteúdo publicado

Definido pelo campo `files` em `package.json`. Lista final de artefatos incluídos:

| Path | Conteúdo |
|------|----------|
| `src/` | Código-fonte TypeScript (para desenvolvimento e debugging) |
| `lib/module/index.js` | Bundle ESM compilado (runtime) |
| `lib/typescript/src/index.d.ts` | Tipos TypeScript exportados |
| `android/` | Código nativo Kotlin + build.gradle (excluindo `android/build/`, `android/gradle/`, etc.) |
| `app.plugin.js` | Entry point do Expo Config Plugin |
| `plugin/build/` | Expo Config Plugin compilado |
| `react-native.config.js` | Configuração React Native CLI |

Artefatos **excluídos** explicitamente: `android/build/`, `android/gradle/`, `android/gradlew`, `android/gradlew.bat`, `android/local.properties`, `**/__tests__/`, `**/__fixtures__/`, `**/__mocks__/`, `**/.*`

---

## Dist-tags

| Tag | Quando usada | Instalação pelo consumidor |
|-----|--------------|---------------------------|
| `latest` | Versões estáveis (`1.0.0`, `1.0.1`, …) | `npm install react-native-pagseguro-plugpag` (padrão) |
| `rc` | Versões Release Candidate (`1.0.0-rc.1`, `1.0.0-rc.2`, …) | `npm install react-native-pagseguro-plugpag@rc` (opt-in) |

**Regra**: Versões com identificador de pré-release no semver (ex: `-rc.1`) são detectadas automaticamente pelo pipeline e publicadas com a dist-tag extraída do sufixo. Versões sem identificador de pré-release são publicadas como `latest`.

---

## Versioning

Segue [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/). Versionamento é manual — o mantenedor define a versão na release branch antes do merge para `main`.

| Tipo de mudança | Bump | Exemplo |
|-----------------|------|---------|
| Correção de bug | patch | `1.0.0` → `1.0.1` |
| Nova funcionalidade retrocompatível | minor | `1.0.0` → `1.1.0` |
| Quebra de API pública | major | `1.0.0` → `2.0.0` |
| Pre-release | pre-release suffix | `1.0.0` → `1.0.0-rc.1` |

---

## Provenance

Cada versão publicada via pipeline automatizado inclui npm provenance — vínculo criptográfico entre o artefato publicado e o commit + workflow do GitHub Actions que o gerou. Verificável via `npm audit signatures`.

---

## Campos do package.json relevantes para consumidores

```json
{
  "main": "./lib/module/index.js",
  "types": "./lib/typescript/src/index.d.ts",
  "exports": {
    ".": {
      "types": "./lib/typescript/src/index.d.ts",
      "default": "./lib/module/index.js"
    },
    "./app.plugin": "./app.plugin.js"
  }
}
```

O campo `exports` define os entry points suportados. Consumidores devem importar via `import { ... } from 'react-native-pagseguro-plugpag'` (entry point `.`) ou usar o plugin Expo via `./app.plugin`.
