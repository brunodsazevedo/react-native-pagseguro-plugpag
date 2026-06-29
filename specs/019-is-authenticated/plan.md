# Implementation Plan: Consulta de Estado de Ativação do Terminal (`isAuthenticated`)

**Branch**: `feature/019-is-authenticated` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-is-authenticated/spec.md`
**Research source**: `PRD.md` (raiz do projeto — documento temporário) consolidado em [research.md](./research.md)

## Summary

Expor duas funções públicas no domínio `activation` que consultam o estado de ativação
do terminal PagBank SmartPOS sem disparar nenhum efeito colateral:

- `isAuthenticated(): Promise<boolean>` — consulta síncrona (SDK bloqueante por IPC → `Dispatchers.IO`).
- `asyncIsAuthenticated(): Promise<boolean>` — consulta assíncrona via listener RxJava do SDK
  (`UiThreadUtil.runOnUiThread` — padrão validado em device na feature/018).

Semântica central: `false` (terminal não ativado) é **resultado válido** e DEVE **resolver** a
Promise — nunca rejeitar. Apenas falha real do SDK (`onError` da variante assíncrona) rejeita com
`PLUGPAG_AUTHENTICATION_ERROR`; exceções não-SDK rejeitam com `PLUGPAG_INTERNAL_ERROR`.

O `PRD.md` é totalmente consistente com a spec e foi adotado como fonte primária de pesquisa: a
spec fornece o "o quê" (FR/SC), o PRD fornece o "como" (threading, códigos de erro, mapa de
arquivos, plano de testes e esboço de implementação). Nenhuma divergência entre os dois documentos.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`) + Kotlin 2.0.21
**Primary Dependencies**: React Native 0.83.2 (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.35.0`, kotlinx.coroutines (`Dispatchers.IO`), `UiThreadUtil` (RN)
**Storage**: N/A — biblioteca sem estado persistente
**Testing**: Jest 29 (unit JS, módulo nativo mockado) + JUnit 5 + Mockk (integração Kotlin)
**Target Platform**: Android-only (terminais PagBank SmartPOS A920/A930/P2/S920); iOS fora de escopo
**Project Type**: Biblioteca React Native (TurboModule) — single project
**Performance Goals**: Consulta de estado deve retornar rápido; sem ANR (chamada bloqueante fora da main thread)
**Constraints**: Zero `any`; `yarn lint`/`yarn typecheck`/`yarn test` verdes; codegen regenerado após editar a Spec
**Scale/Scope**: +2 métodos na Spec, +2 funções públicas, +2 overrides Kotlin, +2 describes de teste JS, +testes Kotlin estruturais

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Aplica | Conformidade do plano |
|---|---|---|
| I — TurboModules Only | ✅ | Métodos adicionados à `Spec` (`NativePagseguroPlugpag.ts`), única fonte de verdade JS↔Native. Sem Bridge. |
| II — TS Strict / Zero `any` | ✅ | Retorno público `Promise<boolean>`. Spec usa `boolean` (primitivo codegen-compatível). Sem `any`. |
| III — Test-First / TDD | ✅ | Testes JS escritos e confirmados falhando **antes** da implementação. 100% das funções exportadas cobertas. Testes Kotlin para os 2 novos métodos nativos. |
| IV — Clean Code + SOLID | ✅ | Funções no domínio `activation` (estado de ativação do terminal). `PlugPag` chamado só em `PagseguroPlugpagModule.kt`. Sem tipo novo (boolean puro). |
| V — Device Compatibility | ⚠️ DEFERRED | Princípio V (mock/fail-fast não-POS) permanece não implementado em toda a lib — fora do escopo desta feature, sem regressão introduzida. |
| VI — Android-Only + Threading Policy | ✅ | Guard Nível 2 em ambas as funções. `isAuthenticated` → `Dispatchers.IO`; `asyncIsAuthenticated` → `UiThreadUtil.runOnUiThread`. Sem `.podspec`/`ios/`. |
| API Contract | ✅ | Síncrono exposto como `Promise<T>`. Spec usa tipo primitivo `boolean`. Camada pública totalmente tipada. |

**Resultado do gate**: PASS — nenhuma violação. Sem entradas na Complexity Tracking.

**Pontos de atenção herdados (não são violações)**:
- Retorno `boolean` puro foge ao padrão "sempre objeto" (`{ result: 'ok' }`) do resto da lib —
  decisão consciente de ergonomia (research.md Decisão 1). Não viola o Princípio II.
- Dívida técnica conhecida: testes Kotlin são placeholders estruturais (feature/018). Mantida —
  não regride, e sua resolução é melhoria futura dedicada.

## Project Structure

### Documentation (this feature)

```text
specs/019-is-authenticated/
├── plan.md              # Este arquivo
├── spec.md              # Spec da feature (já existente)
├── research.md          # Phase 0 — decisões consolidadas do PRD.md
├── data-model.md        # Phase 1 — entidade "Estado de ativação"
├── quickstart.md        # Phase 1 — guia de uso/validação
├── contracts/
│   └── activation-isauthenticated.md   # Contrato das 2 funções públicas + Spec + Kotlin
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts            # +2 métodos na Spec (boolean) → DISPARA codegen
└── functions/
    └── activation/
        ├── types.ts                     # SEM mudança (retorno boolean puro)
        └── index.ts                     # +2 funções: isAuthenticated, asyncIsAuthenticated (guard Nível 2)

src/__tests__/functions/
└── activation.test.ts                   # +2 describes (cenários da spec §5.1 do PRD)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt            # +2 overrides + import wrapper.listeners.PlugPagIsActivatedListener

android/build/generated/source/codegen/java/com/pagseguroplugpag/
└── NativePagseguroPlugpagSpec.java      # REGENERADO via generateCodegenArtifactsFromSchema

android/src/test/...                     # +testes Kotlin (placeholders estruturais — feature/018)

README.md / README-PTBR.md               # Documentar os 2 métodos na seção de ativação
example/src/App.tsx                      # (Opcional) botão "Verificar ativação"
```

**Structure Decision**: Single project (biblioteca RN). A feature estende o domínio `activation`
existente — nenhuma estrutura nova de diretórios é criada. Tipos não mudam (`boolean` puro), então
`activation/types.ts` permanece intacto.

## Complexity Tracking

> Sem violações de constituição. Tabela não preenchida.
