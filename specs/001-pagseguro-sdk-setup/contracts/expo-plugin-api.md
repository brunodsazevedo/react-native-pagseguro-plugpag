# Contract: Expo Config Plugin API

**Feature**: 001-pagseguro-sdk-setup
**Date**: 2026-03-21

---

## Visão Geral

O Config Plugin é o contrato público entre a biblioteca `react-native-pagseguro-plugpag` e os projetos Expo que a consomem. Ele é invocado automaticamente durante o `expo prebuild` e configura o ambiente Android sem intervenção manual do desenvolvedor.

## Registro do Plugin

### Como funciona a resolução

O Expo CLI resolve plugins da seguinte forma quando o consumidor usa o nome do pacote:

1. Expo procura `node_modules/react-native-pagseguro-plugpag/app.plugin.js`
2. `app.plugin.js` re-exporta o plugin compilado de `./plugin/build/index`
3. O plugin é executado durante o `expo prebuild`

### Registro no `app.json` do consumidor

```json
{
  "expo": {
    "plugins": ["react-native-pagseguro-plugpag"]
  }
}
```

Essa é a única forma necessária — o mesmo padrão de `@react-native-firebase/app`, `expo-camera`, `expo-notifications`, etc. Nenhum caminho de arquivo precisa ser memorizado pelo desenvolvedor.

## Opções do Plugin

**Nenhuma opção configurável na v1.** O plugin é totalmente automático — todas as configurações (repositório maven, versão do SDK) são fixadas internamente pela biblioteca.

```typescript
// Assinatura do plugin
const withPlugPag: ConfigPlugin = (config) => config;
```

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| *(nenhum)* | — | — | — | Plugin não aceita opções configuráveis |

## Efeitos do Plugin (comportamento observável)

Após `expo prebuild --platform android`, o plugin garante:

### 1. `settings.gradle` — repositório maven injetado

```gradle
dependencyResolutionManagement {
    repositories {
        // Added by pagseguro-plugpag-maven
        maven { url "https://github.com/pagseguro/PlugPagServiceWrapper/raw/master" }
        // end pagseguro-plugpag-maven
        // ... outros repositórios
    }
}
```

### 2. `android/app/build.gradle` — dependência do SDK injetada

```gradle
dependencies {
    // Added by pagseguro-plugpag-dependency
    implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'
    // end pagseguro-plugpag-dependency
    // ... outras dependências
}
```

## Garantias de idempotência

- Executar `expo prebuild` N vezes produz o mesmo resultado — sem duplicação de entradas.
- A presença das tags `pagseguro-plugpag-maven` e `pagseguro-plugpag-dependency` nos arquivos é o mecanismo de deduplicação.

## Contrato de Plataforma (runtime)

A biblioteca expõe guards de plataforma que fazem parte do contrato público:

### Comportamento em Android (plataforma suportada)
- Todas as funções executam normalmente via TurboModule.

### Comportamento em iOS (plataforma não suportada)

| Evento | Comportamento |
|--------|---------------|
| Import do módulo | `console.warn` com prefixo `[react-native-pagseguro-plugpag] WARNING:` |
| Chamada de qualquer função | `throw new Error` com prefixo `[react-native-pagseguro-plugpag] ERROR:` |
| Crash nativo (`getEnforcing`) | **Nunca ocorre** — acesso ao TurboModule é condicional |

### Formato das mensagens (exato, para grep-ability)

```
WARNING: [react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.
ERROR:   [react-native-pagseguro-plugpag] ERROR: <methodName>() is not supported on iOS. PagSeguro PlugPag SDK is Android-only.
```
