# Research: Atualização do Expo Config Plugin para Expo SDK 56

**Feature**: 014-expo-config-plugin-sdk56  
**Data**: 2026-06-19  
**Branch**: `feature/014-expo-config-plugin-sdk56`

---

## Questão 1: Versão correta de `@expo/config-plugins` para Expo SDK 56

**Decision**: Usar `~56.0.9`

**Rationale**: O Expo SDK adotou versioning alinhado ao SDK para os pacotes do ecossistema. O Expo SDK 56 usa `@expo/config-plugins` na série `56.x.x`. A versão estável mais recente confirmada é `56.0.9`.

Verificado via `npm info expo@56 dependencies` — todas as versões do Expo SDK 56 (`56.0.0`–`56.0.12`) dependem de `@expo/config-plugins@~56.0.7` até `~56.0.9`. A versão máxima estável disponível é `56.0.9`.

**Alternatives considered**:
- `^56.0.0` — permite saltar para patch superior; `~56.0.9` é mais preciso e alinhado ao que o Expo SDK especifica internamente.
- `9.1.x` (versão atual) — correspondente ao Expo SDK 52/53. Incompatível com SDK 56.

**Impact on lockfile**: O `yarn.lock` já resolve `@expo/config-plugins@~56.0.9` para `56.0.9` (usado pelo app de exemplo). A mudança na devDep da biblioteca simplesmente reutiliza a entrada existente — sem novo download, sem conflito.

---

## Questão 2: API pública para `mergeContents` no `@expo/config-plugins` 56.x

**Decision**: Usar `CodeGenerator.mergeContents(...)` via `import { CodeGenerator } from '@expo/config-plugins'`

**Rationale**: No `@expo/config-plugins` 56.0.9, o `index.d.ts` exporta explicitamente:

```typescript
export { WarningAggregator, CodeGenerator, History, XML };
```

`CodeGenerator` é um namespace (re-export de `*` de `./utils/generateCode`). A função `mergeContents` está disponível como `CodeGenerator.mergeContents`.

A assinatura de `mergeContents` é **idêntica** entre v9 e v56:

```typescript
declare function mergeContents({src, newSrc, tag, anchor, offset, comment}: {
  src: string;
  newSrc: string;
  tag: string;
  anchor: string | RegExp;
  offset: number;
  comment: string;
}): MergeResults;
```

Nenhuma mudança de parâmetros ou tipo de retorno — a migração é transparente para o comportamento do plugin.

**Alternatives considered**:
- Continuar usando `@expo/config-plugins/build/utils/generateCode` — caminho interno que funcionaria com `./build/*` no exports map, mas não é coberto por garantia de estabilidade. É exatamente o que a FR-002 manda eliminar.
- Re-implementar `mergeContents` localmente — desnecessário; a API pública já expõe a função.

---

## Questão 3: Compatibilidade de comportamento (idempotência, valores Gradle)

**Decision**: A migração não altera o comportamento de saída do plugin.

**Rationale**: `CodeGenerator.mergeContents` é o mesmo código que `@expo/config-plugins/build/utils/generateCode`. É o mesmo arquivo, simplesmente acessado por um caminho diferente. Os valores de `tag`, `anchor`, `offset` e `comment` permanecem idênticos — as tags de idempotência (`pagseguro-plugpag-maven`, `pagseguro-plugpag-dependency`) são preservadas, garantindo idempotência no prebuild.

**Alternatives considered**: N/A — não há risco de mudança de comportamento.

---

## Questão 4: Impacto em outros arquivos

**Decision**: Apenas dois artefatos são modificados: `package.json` (devDep) + `plugin/index.ts` (import).

**Rationale**: 
- `plugin/index.ts` é o único arquivo fonte do plugin.
- A devDependency `@expo/config-plugins` em `package.json` é a que precisa ser atualizada.
- `plugin/build/` é artefato gerado — não alterado manualmente.
- `example/`, `src/`, `android/` são explicitamente fora de escopo (FR-004).
- A peerDependency na raiz do `package.json` não existe para `@expo/config-plugins` — não há nada a adicionar.

**Scope boundary confirmed**: `git diff` após implementação deve mostrar exatamente 2 arquivos.
