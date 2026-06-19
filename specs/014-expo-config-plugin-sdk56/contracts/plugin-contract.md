# Contrato Público: Expo Config Plugin

**Feature**: 014-expo-config-plugin-sdk56  
**Arquivo**: `app.plugin.js` → `plugin/index.ts`

---

## Interface Pública (sem alteração após migração)

```typescript
// Tipo: ConfigPlugin<void> — exportado como default
// Importado pelo app consumidor via: app.plugin.js
export default withPlugPag; // (config: ExpoConfig) => ExpoConfig
```

### Como o consumidor usa

```json
// app.json ou app.config.js do projeto consumidor
{
  "expo": {
    "plugins": ["react-native-pagseguro-plugpag"]
  }
}
```

---

## Efeitos garantidos pelo contrato (invariantes de saída)

### 1. Repositório Maven injetado em `android/build.gradle` (allprojects.repositories)

```gradle
// BEGIN pagseguro-plugpag-maven
    maven { url "https://github.com/pagseguro/PlugPagServiceWrapper/raw/master" }
// END pagseguro-plugpag-maven
```

- **Tag de idempotência**: `pagseguro-plugpag-maven`
- **Inserção**: após a linha `maven { url 'https://www.jitpack.io' }`
- **Idempotência**: inserção dupla não duplica entrada

### 2. Dependência wrapper injetada em `android/app/build.gradle` (dependencies)

```gradle
// BEGIN pagseguro-plugpag-dependency
    implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'
// END pagseguro-plugpag-dependency
```

- **Tag de idempotência**: `pagseguro-plugpag-dependency`
- **Inserção**: após abertura do bloco `dependencies {`
- **Idempotência**: inserção dupla não duplica entrada

---

## Compatibilidade

| Expo SDK | `@expo/config-plugins` devDep | Status |
|---|---|---|
| 52 | `^9.0.0` | Versão anterior (substituída) |
| 56 | `~56.0.9` | ✅ Versão alvo desta feature |

**Nota**: A biblioteca publica o plugin já compilado. O consumidor não precisa da devDep — ele recebe o artefato `plugin/build/index.js` pré-compilado.
