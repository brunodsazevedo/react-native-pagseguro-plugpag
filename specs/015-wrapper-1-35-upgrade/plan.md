# Implementation Plan: Atualização do PlugPagServiceWrapper 1.33.0 → 1.35.0

**Branch**: `feature/015-wrapper-1-35-upgrade` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-wrapper-1-35-upgrade/spec.md`

## Summary

Subir a dependência do SDK PagBank `PlugPagServiceWrapper` de `1.33.0` para `1.35.0` e
sincronizar todas as referências "vivas" de versão no repositório. O upgrade é **drop-in
compatible** (diff binário autoritativo: 343 → 343 classes, zero quebra de API nos símbolos
consumidos pelo módulo — ver `RELATORIO-WRAPPER-1.35.0.md`). Não há mudança no contrato
nativo (Spec TurboModule), portanto **codegen não é regenerado**. A abordagem é: alterar a
coordenada Gradle + a injeção do plugin Expo, sincronizar documentação permanente/READMEs e
adicionar entrada no CHANGELOG, validando tudo pelos gates de qualidade existentes (lint,
typecheck, test, build Android).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21 (sem alterações de código fonte)
**Primary Dependencies**: `br.com.uol.pagseguro.plugpagservice.wrapper:wrapper` `1.33.0` → `1.35.0`; React Native 0.85.3 (New Architecture); `@expo/config-plugins` ~56
**Storage**: N/A — biblioteca sem estado persistente
**Testing**: Jest 29 (JS) + JUnit 5/Mockk (Kotlin) — suíte existente reutilizada como gate; sem novos testes (FR-006)
**Target Platform**: Android-only — terminais PagBank SmartPOS (A920, A930, P2, S920; SDK adiciona GPOS780S/N950S, fora de escopo)
**Project Type**: Biblioteca React Native (TurboModule / New Architecture) com Expo config plugin
**Performance Goals**: N/A — bump de dependência, sem mudança de comportamento em runtime
**Constraints**: Zero breaking change na API pública (FR-003); URL Maven inalterada; especificações históricas preservadas (FR-007)
**Scale/Scope**: ~8 arquivos vivos com referência de versão; nenhum arquivo de código TS/Kotlin de produção alterado funcionalmente

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.3.0. Avaliação por princípio:

| Princípio | Avaliação | Status |
|---|---|---|
| I — TurboModules Only | Sem alteração no contrato JS↔Native; `NativePagseguroPlugpag.ts` intocado. | ✅ N/A |
| II — TypeScript Strict / Zero `any` | Nenhum código TS de produção adicionado; sem `any`. | ✅ N/A |
| III — Test-First / TDD | Nenhuma função exportada nova → nada a testar. FR-006 reusa os gates existentes; PR bloqueia se algum quebrar. | ✅ Compatível |
| IV — Clean Code + SOLID | Estrutura de diretórios e responsabilidades inalteradas. | ✅ N/A |
| V — Device Compatibility & Fail-Fast | Comportamento de guarda iOS e fail-fast inalterado. | ✅ N/A |
| VI — Android-Only Scope | Bump de dependência Android; Kotlin permanece 2.x; sem iOS/podspec. | ✅ Aderente |

**Nota de governança**: a constituição (§ SDK Version, linha 262) referencia `1.33.0`. FR-004
exige sincronizar essa referência para `1.35.0`. É edição de **referência factual de versão**,
não alteração de princípio — não requer bump de versão da constituição.

**Resultado do gate**: ✅ PASS — nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/015-wrapper-1-35-upgrade/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões de upgrade e mapa de referências
├── data-model.md        # Phase 1 — N/A documentado (sem entidades de dados)
├── quickstart.md        # Phase 1 — passos de validação do upgrade
├── contracts/           # Phase 1 — N/A documentado (sem mudança de contrato externo)
├── checklists/          # Checklists da feature
└── tasks.md             # Phase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

Arquivos com **referência viva** de versão a sincronizar (nenhuma mudança de lógica):

```text
android/build.gradle                                   # L76 — coordenada Gradle (FR-001)
plugin/index.ts                                        # L11 — injeção do plugin Expo (FR-002)
README.md                                              # L32 — doc pública EN (FR-004)
README-PTBR.md                                         # L33 — doc pública PT-BR (FR-004)
CLAUDE.md                                              # L11 "SDK Alvo" + L262-equivalentes vivas (FR-004)
.specify/memory/constitution.md                        # L262 — referência factual de versão (FR-004)
android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt  # L31 — comentário de versão
CHANGELOG.md                                           # nova entrada de upgrade (FR-005), preservando L39 histórica
```

Artefatos de build a regenerar (propagam a versão sem edição manual):

```text
plugin/build/index.js   # gerado por `yarn prepare` — runtime do plugin Expo lê daqui (edge case da spec)
```

**Structure Decision**: Feature de manutenção/version-bump. Não introduz novos módulos de
domínio, tipos, hooks ou métodos nativos. Mantém integralmente a estrutura `src/functions/`,
`src/hooks/`, `src/types/` definida no Princípio IV. As mudanças se restringem a configuração
de build, injeção do plugin Expo e documentação. **Codegen NÃO é regenerado** (Spec
TurboModule inalterada — Assumption da spec confirmada pelo diff binário).

## Complexity Tracking

> Não aplicável — Constitution Check passou sem violações.
