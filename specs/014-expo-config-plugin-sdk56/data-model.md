# Data Model: Atualização do Expo Config Plugin para SDK 56

**Feature**: 014-expo-config-plugin-sdk56  
**Data**: 2026-06-19

---

## Entidades Afetadas

Esta feature não introduz novas entidades de dados. Os tipos utilizados são provenientes de `@expo/config-plugins` e permanecem inalterados.

### Tipos existentes (sem alteração de estrutura)

```typescript
// @expo/config-plugins — exportado via namespace público CodeGenerator
type MergeResults = {
  contents: string;   // arquivo resultante com merge aplicado
  didClear: boolean;  // se tag anterior foi removida
  didMerge: boolean;  // se novo conteúdo foi inserido
};

// @expo/config-plugins — exportado diretamente pelo índice público
type ConfigPlugin<T = void> = (config: ExpoConfig, props: T) => ExpoConfig;
```

### Contrato do plugin (sem alteração)

```typescript
// plugin/index.ts — interface pública permanece idêntica
export default withPlugPag; // ConfigPlugin (default export)
```

---

## Mapeamento de Mudança de Importação

| Antes | Depois |
|---|---|
| `import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'` | `import { CodeGenerator } from '@expo/config-plugins'` |
| Uso: `mergeContents({...})` | Uso: `CodeGenerator.mergeContents({...})` |

### Invariantes preservados

- Todos os parâmetros de `mergeContents` usados no plugin permanecem idênticos:
  - `src`, `newSrc`, `tag`, `anchor`, `offset`, `comment`
- As tags de idempotência não mudam:
  - `'pagseguro-plugpag-maven'` (repositório Maven)
  - `'pagseguro-plugpag-dependency'` (dependência wrapper)
- O tipo de retorno `.contents` é acessado da mesma forma

---

## Regras de Validação (sem alteração)

O plugin não valida inputs além das garantias do Expo Prebuild. As âncoras regex são:

```typescript
// Repositório Maven — ancora no jitpack (único em allprojects.repositories)
/maven\s*\{\s*url\s*['"]https:\/\/www\.jitpack\.io['"]\s*\}/

// Dependência wrapper — ancora no bloco dependencies
/dependencies\s*\{/
```

Ambas as âncoras permanecem inalteradas.
