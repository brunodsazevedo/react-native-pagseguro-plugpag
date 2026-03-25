# Tasks: Correção de Erros Android Studio — PagseguroPlugpagModule

**Input**: Design documents from `/specs/004-fix-android-studio-errors/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: FR-009 e Constituição Princípio III exigem TDD para FIX-003 (CAUSA-3).
FIX-001 é configuração de build (sem lógica nova, sem teste necessário).
FIX-002 tem comportamento de runtime idêntico (sem novo teste necessário).

**Organization**: 3 user stories independentes entre si — podem ser implementadas em qualquer ordem.
Ordem abaixo reflete prioridade (P1 antes de P2) e risco (runtime > IDE > aviso).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[US1/2/3]**: User story mapeada do spec.md
- Caminhos absolutos a partir da raiz do repositório

---

## Phase 1: Setup (Pré-condição de Verificação)

**Purpose**: Garantir que o artefato codegen existe antes de aplicar FIX-001 e verificar o baseline de erros.

- [x] T001 Executar `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` para garantir que `android/build/generated/source/codegen/java/com/pagseguroplugpag/NativePagseguroPlugpagSpec.java` existe

**Checkpoint**: Artefato codegen gerado — FIX-001 pode ser aplicado e verificado.

---

## Phase 2: Foundational (Bloqueadores Compartilhados)

**Purpose**: Nenhum. As três correções são independentes entre si e independentes de pré-requisitos
de código novos. Fase não aplicável a este bugfix.

> Nenhuma tarefa — avançar diretamente para as fases de User Story.

---

## Phase 3: User Story 3 — Pagamento com resultado nulo não causa crash (Priority: P1) 🎯 MVP

**Goal**: Proteger `buildSdkPaymentErrorUserInfo` contra NPE quando `PlugPagTransactionResult.result`
é `null` (campo `java.lang.Integer` boxed, confirmado por bytecode AAR `wrapper-1.33.0`).

**Independent Test**: Simular `result.result = null` com MockK — `doPayment` e `doAsyncPayment`
devem rejeitar a promise com `PLUGPAG_PAYMENT_ERROR` e `result = -1`, sem lançar exceção não capturada.

### Testes para User Story 3 (TDD — ESCREVER ANTES DA IMPLEMENTAÇÃO) ⚠️

> **CRITICAL**: Escrever estes testes PRIMEIRO e confirmar que FALHAM antes de implementar FIX-003.

- [x] T002 [P] [US3] Escrever teste Kotlin `doPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` — usar `every { nullResult.result } returns null` (Mockk); confirmar que falha com NPE antes do fix
- [x] T003 [P] [US3] Escrever teste Kotlin `doAsyncPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` — simular `onError(nullResult)` via listener slot; confirmar que falha com NPE antes do fix

### Implementação para User Story 3

- [x] T004 [US3] Corrigir linha 83 em `buildSdkPaymentErrorUserInfo` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`: substituir `map.putInt("result", result.result)` por `map.putInt("result", result.result ?: -1)` — o valor sentinela `-1` é consistente com `buildInternalErrorUserInfo` (linha 53)
- [x] T005 [US3] Executar testes Kotlin (T002 + T003) e confirmar que agora passam — `./gradlew test` ou via Android Studio Run Tests

**Checkpoint**: US3 completa — `doPayment` e `doAsyncPayment` rejeitam corretamente quando `result = null`. Testável de forma independente.

---

## Phase 4: User Story 1 — Desenvolvedor abre projeto Android sem erros de IDE (Priority: P1)

**Goal**: Declarar o diretório codegen como `sourceSets` no Gradle para que o Android Studio indexe
`NativePagseguroPlugpagSpec` e elimine os ~8 erros de `Unresolved reference` / `overrides nothing`.

**Independent Test**: Após Gradle Sync, `PagseguroPlugpagModule.kt` não exibe nenhum marcador
vermelho de erro no Android Studio. Verificável independentemente sem depender de US2/US3.

### Implementação para User Story 1

- [x] T006 [US1] Adicionar bloco `sourceSets` dentro de `android { }` em `android/build.gradle`:
  ```groovy
  sourceSets {
    main {
      java {
        srcDirs += ["${buildDir}/generated/source/codegen/java"]
      }
    }
  }
  ```
  O path `${buildDir}/generated/source/codegen/java` é idempotente — ignorado silenciosamente se o diretório não existir (repo recém-clonado satisfaz FR-002)
- [x] T007 [US1] Executar `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` para regenerar o artefato após a mudança no build.gradle; em seguida realizar **File → Sync Project with Gradle Files** no Android Studio
- [ ] T008 [US1] Verificar no Android Studio que `PagseguroPlugpagModule.kt` exibe zero erros — se erros persistirem após Sync, executar **File → Invalidate Caches → Invalidate and Restart** (SC-001)

**Checkpoint**: US1 completa — Android Studio mostra zero erros em `PagseguroPlugpagModule.kt`.

---

## Phase 5: User Story 2 — Código Kotlin compatível com Android API 24–36 sem avisos de depreciação (Priority: P2)

**Goal**: Substituir `getPackageInfo(String, int)` (depreciado na API 33) por um branch de versão:
API ≥ 33 usa `PackageInfoFlags.of(0L)`; API < 33 usa a variante legada com `@Suppress("DEPRECATION")`.

**Independent Test**: Após a mudança, o Android Studio não exibe aviso de depreciação na região
`plugPag by lazy` de `PagseguroPlugpagModule.kt`. Verificável independentemente sem depender de US1/US3.

### Implementação para User Story 2

- [x] T009 [US2] Adicionar imports `import android.content.pm.PackageManager` e `import android.os.Build` ao topo de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` (após os imports existentes do SDK PagSeguro)
- [x] T010 [US2] Substituir o bloco `private val plugPag: PlugPag by lazy { ... }` (linhas 27–36) em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` pelo bloco com branch de versão conforme `quickstart.md` (seção FIX-002) — incluir o comentário inline obrigatório explicando o `@Suppress("DEPRECATION")` para APIs 24–32

**Checkpoint**: US2 completa — Android Studio não exibe aviso de depreciação. Comportamento de runtime idêntico nas APIs 24–36 (SC-004).

---

## Phase 6: Polish & Verificação Final

**Purpose**: Validação cruzada das três correções e checklist de PR da Constituição.

- [x] T011 Executar `yarn lint` a partir da raiz do projeto — deve passar com **zero erros ou avisos** (Constituição Princípio II + PR Checklist — BLOQUEANTE para PR)
- [x] T012 Executar `yarn test` a partir da raiz do projeto — todos os testes JS existentes devem passar; confirmar **zero regressões** (SC-005)
- [x] T013 [P] Confirmar que `android/build.gradle` não introduziu novos avisos de build — executar `cd example/android && ./gradlew :react-native-pagseguro-plugpag:assembleDebug` e verificar output sem erros (SC-002)
- [x] T014 [P] Confirmar que `PlugPagInitializationResult.result` (linha 42 de `PagseguroPlugpagModule.kt`) **não foi alterado** — campo é `int` primitivo (não nullable), nenhuma mudança necessária (edge case do spec)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — executar imediatamente
- **US3 (Phase 3)**: Independente — pode iniciar após Phase 1 (T001)
- **US1 (Phase 4)**: Independente — pode iniciar após Phase 1 (T001); T007/T008 dependem de T006
- **US2 (Phase 5)**: Independente — pode iniciar a qualquer momento; T010 depende de T009
- **Polish (Phase 6)**: Depende de US1 + US2 + US3 completas

### User Story Dependencies

- **US3 (P1)**: Sem dependências de outras stories — iniciar primeiro (risco runtime maior)
- **US1 (P1)**: Sem dependências de outras stories — pode ser paralelo com US3
- **US2 (P2)**: Sem dependências de outras stories — iniciar após as P1

### Dentro de cada User Story

- US3: T002 + T003 (testes, paralelos) → T004 (implementação) → T005 (verificação)
- US1: T006 (build.gradle) → T007 (codegen + sync) → T008 (verificação IDE)
- US2: T009 (imports) → T010 (implementação)

### Parallel Opportunities

- T002 e T003 são paralelos (ambos são testes novos, mesmo arquivo mas seções diferentes)
- US3 e US1 são paralelos (arquivos diferentes: `.kt` vs `build.gradle`)
- US1 e US2 são paralelos após T001 (ambos editam `.kt` mas em linhas distantes e independentes)
- T013 e T014 são paralelos (verificações independentes)

---

## Parallel Example: US3 + US1

```bash
# Paralelo — diferentes arquivos, sem dependências cruzadas:
Task T002: "Escrever teste doPayment result null em PagseguroPlugpagModuleTest.kt"
Task T006: "Adicionar sourceSets em android/build.gradle"
```

---

## Implementation Strategy

### MVP First (US3 — Risco de Runtime)

1. Executar Phase 1: Setup (T001 — gerar codegen)
2. Executar Phase 3: US3 (T002 → T003 → T004 → T005)
3. **STOP e VALIDAR**: Testes Kotlin passam; NPE eliminado
4. Continuar com US1 e US2

### Incremental Delivery

1. Phase 1 (T001) → Pré-condição pronta
2. US3 (T002–T005) → Proteção runtime → Validar
3. US1 (T006–T008) → IDE sem erros → Validar
4. US2 (T009–T010) → Sem avisos de depreciação → Validar
5. Polish (T011–T014) → PR pronto

### Single Developer (Ordem Recomendada)

T001 → T002 + T003 (paralelo) → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 + T014 (paralelo)

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências incompletas
- [US1/2/3] mapeia para user stories do spec.md
- US3 é a única com testes TDD obrigatórios (FR-009, Constituição Princípio III)
- FIX-001 é configuração de build pura — sem teste de código necessário
- FIX-002 tem comportamento de runtime idêntico — testes existentes cobrem sem modificação
- `yarn lint` (T011) é BLOQUEANTE para PR — não abrir PR sem passar
- Commit sugerido por fix: 3 commits atômicos (FIX-001, FIX-002, FIX-003) ou 1 commit único "fix(android): resolve Android Studio errors — codegen indexing, getPackageInfo deprecation, null safety"
