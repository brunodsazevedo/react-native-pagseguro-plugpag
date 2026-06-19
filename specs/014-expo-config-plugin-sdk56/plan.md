# Implementation Plan: Atualização do Expo Config Plugin para Expo SDK 56

**Branch**: `feature/014-expo-config-plugin-sdk56` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/014-expo-config-plugin-sdk56/spec.md`

## Summary

Migração cirúrgica de 2 arquivos: atualização da devDependency `@expo/config-plugins` de `^9.0.0` para `~56.0.9` (alinhada ao Expo SDK 56), e migração da importação de `mergeContents` de caminho interno (`/build/utils/generateCode`) para o namespace público `CodeGenerator` exportado pelo índice principal do pacote. Nenhuma mudança de comportamento do plugin — mesmos valores Gradle, mesmas tags de idempotência, mesma assinatura de função.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`) — `tsconfig.plugin.json`  
**Primary Dependencies**: `@expo/config-plugins@~56.0.9` (devDep, build-time only)  
**Storage**: N/A  
**Testing**: `yarn build:plugin` (tsc compile) + `yarn lint` + `yarn typecheck` + `yarn test`  
**Target Platform**: Expo SDK 56 / React Native 0.85.x / Android  
**Project Type**: Biblioteca React Native com Expo Config Plugin  
**Performance Goals**: N/A  
**Constraints**: Escopo limitado a `package.json` (devDep) + `plugin/index.ts`. Zero mudança de comportamento do plugin.  
**Scale/Scope**: 2 arquivos, ~4 linhas de diff efetivo

## Constitution Check

*GATE: Verificado antes da Fase 0. Re-verificado pós-design.*

| Princípio | Status | Observação |
|---|---|---|
| I — TurboModules Only | ✅ PASS | Nenhuma comunicação JS↔Native alterada |
| II — TypeScript Strict / Zero `any` | ✅ PASS | `tsconfig.plugin.json` tem `strict: true`; `CodeGenerator.mergeContents` tem tipagem completa; assinatura idêntica à v9 |
| III — Test-First / TDD | ✅ PASS | Nenhuma nova função exportada de `src/index.ts`. Princípio se aplica a funções públicas da biblioteca. Gates de qualidade (lint + typecheck + build + unit tests) são os testes de aceitação desta feature. |
| IV — Clean Code + SOLID | ✅ PASS | Usar `CodeGenerator.mergeContents` (namespace público) é mais limpo que caminho interno |
| V — Device Compatibility | ✅ PASS | Não afetado |
| VI — Android-Only Scope | ✅ PASS | Não afetado; plugin é Android-only por natureza |

**Gate result**: PASS — sem violações. Prosseguir para implementação.

## Project Structure

### Documentation (this feature)

```text
specs/014-expo-config-plugin-sdk56/
├── plan.md              ← Este arquivo (/speckit-plan output)
├── spec.md              ← Feature specification
├── research.md          ← Phase 0 output (gerado)
├── data-model.md        ← Phase 1 output (gerado)
├── quickstart.md        ← Phase 1 output (gerado)
├── contracts/
│   └── plugin-contract.md  ← Phase 1 output (gerado)
└── tasks.md             ← Phase 2 output (/speckit-tasks — NÃO criado por /speckit-plan)
```

### Source Code (arquivos alterados)

```text
package.json                 ← devDependency @expo/config-plugins: ^9.0.0 → ~56.0.9
plugin/
└── index.ts                 ← importação mergeContents → CodeGenerator.mergeContents
```

**Arquivos NÃO alterados** (per FR-004):

```text
src/                         ← código TypeScript da biblioteca — inalterado
android/                     ← código Kotlin nativo — inalterado
example/                     ← app de exemplo — inalterado (atualizado na feature 013)
plugin/build/                ← artefato gerado pelo build — não editar manualmente
```

**Structure Decision**: Feature de escopo mínimo — apenas os 2 arquivos especificados. Sem nova estrutura de diretórios.

## Complexity Tracking

> Nenhuma violação de constituição identificada. Seção não aplicável.

---

## Phase 0: Research — Concluído

Detalhes completos em [research.md](research.md).

### Achados Principais

| Questão | Resolução |
|---|---|
| Versão de `@expo/config-plugins` para SDK 56 | `~56.0.9` — confirmado via `npm info expo@56 dependencies` |
| API pública para `mergeContents` | `CodeGenerator.mergeContents` — exportado em `export { ..., CodeGenerator, ... }` no `index.d.ts` |
| Compatibilidade de assinatura | Idêntica entre v9 e v56 — zero ajuste de chamada necessário |
| Impacto no lockfile | Nenhum conflito — `56.0.9` já resolvido no `yarn.lock` pelo app de exemplo |
| Outros arquivos afetados | Nenhum — escopo confirmado como 2 arquivos |

---

## Phase 1: Design & Contracts — Concluído

### Data Model

Ver [data-model.md](data-model.md). Nenhuma entidade nova — apenas mapeamento de mudança de importação com invariantes de saída preservados.

### Contracts

Ver [contracts/plugin-contract.md](contracts/plugin-contract.md). Interface pública `ConfigPlugin` e os dois efeitos Gradle garantidos (Maven + dependency) são documentados e permanecem inalterados.

### Quickstart

Ver [quickstart.md](quickstart.md). Inclui diff preciso das mudanças, comandos de validação em ordem, e critérios de conclusão verificáveis.

---

## Implementation Checklist

- [ ] Atualizar `package.json` devDep: `"@expo/config-plugins": "^9.0.0"` → `"@expo/config-plugins": "~56.0.9"`
- [ ] Atualizar `plugin/index.ts`: adicionar `CodeGenerator` ao import de `@expo/config-plugins`
- [ ] Remover linha: `import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'`
- [ ] Substituir `mergeContents({` por `CodeGenerator.mergeContents({` (2 ocorrências)
- [ ] Executar `yarn install`
- [ ] Verificar `yarn build:plugin` → código de saída 0
- [ ] Verificar `yarn lint` → zero erros/avisos
- [ ] Verificar `yarn typecheck` → zero erros
- [ ] Verificar `yarn test` → todos passam
- [ ] Confirmar `git diff --name-only` mostra apenas `package.json` e `plugin/index.ts`
- [ ] Confirmar ausência de `/build/utils/generateCode` no código-fonte do plugin
