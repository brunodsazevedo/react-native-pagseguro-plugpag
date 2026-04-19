# Tasks: Ativação do PinPad

**Input**: Documentos de design de `/specs/002-pinpad-activation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Testes**: Incluídos — a Constituição Princípio III exige TDD estrito (Red → Green → Refatorar). Testes de unidade JS e testes de integração Kotlin são obrigatórios.

**Organização**: Tarefas agrupadas por User Story para permitir implementação e teste independentes.

## Formato: `[ID] [P?] [Story?] Descrição com caminho de arquivo`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User Story à qual a tarefa pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em cada tarefa

---

## Phase 1: Setup — Spec TurboModule

**Objetivo**: Atualizar o contrato JS↔Native que é a fonte de verdade para codegen. Bloqueia todas as User Stories.

**⚠️ CRÍTICO**: Nenhuma User Story pode começar antes desta fase estar completa.

- [X] T001 Atualizar `src/NativePagseguroPlugpag.ts` — remover `multiply(a: number, b: number): number` e adicionar `initializeAndActivatePinPad(activationCode: string): Promise<Object>` e `doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>` na interface `Spec`

**Checkpoint**: `src/NativePagseguroPlugpag.ts` deve exportar apenas os dois novos métodos. O build Android deve regenerar `NativePagseguroPlugpagSpec.java` com os dois métodos correspondentes.

---

## Phase 2: Foundational — Infraestrutura do Módulo Kotlin

**Objetivo**: Preparar o módulo Kotlin com os componentes compartilhados entre US1 e US2 (imports, lazy property, helpers privados) e remover o scaffold `multiply`.

**⚠️ CRÍTICO**: US1 e US2 dependem desta fase.

- [X] T002 Adicionar imports Kotlin necessários em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `PlugPag`, `PlugPagActivationData`, `PlugPagActivationListener`, `PlugPagAppIdentification`, `PlugPagEventData`, `PlugPagInitializationResult`, `Promise`, `WritableNativeMap`, `CoroutineScope`, `Dispatchers`, `launch`, `withContext`

- [X] T003 Adicionar `private val plugPag: PlugPag by lazy { ... }` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — usar `reactApplicationContext.packageManager.getPackageInfo(...)` para obter `packageName` e `versionName`; fallback `"1.0"` para `versionName` nulo

- [X] T004 Adicionar `private fun buildSdkErrorUserInfo(sdkResult: PlugPagInitializationResult): WritableNativeMap` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `putInt("result", sdkResult.result)`, `putString("errorCode", sdkResult.errorCode ?: "")`, `putString("message", sdkResult.errorMessage?.takeIf { it.isNotEmpty() } ?: "Unknown error")`

- [X] T005 Adicionar `private fun buildInternalErrorUserInfo(e: Exception): WritableNativeMap` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `putInt("result", -1)`, `putString("errorCode", "INTERNAL_ERROR")`, `putString("message", e.message ?: "Unknown error")`

- [X] T006 Remover `override fun multiply(a: Double, b: Double): Double` de `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt`

**Checkpoint**: `PagseguroPlugpagModule.kt` deve compilar sem erros com os dois novos métodos ainda não implementados (erros de `override` pendente são esperados — serão resolvidos em US1 e US2).

---

## Phase 3: User Story 1 — Ativação Simples do PinPad (Priority: P1) 🎯 MVP

**Objetivo**: Expor `initializeAndActivatePinPad` com contrato completo de sucesso/erro e guard de plataforma iOS.

**Independent Test**: Chamar `initializeAndActivatePinPad('403938')` em ambiente Android mockado e verificar que `{ result: 'ok' }` é retornado em sucesso e que erros do SDK chegam via `catch` com `error.code === 'PLUGPAG_INITIALIZATION_ERROR'`.

### Testes (RED — escrever antes da implementação) ⚠️

> **OBRIGATÓRIO**: Confirmar que os cenários abaixo FALHAM antes de implementar.

- [X] T007 [US1] Reescrever `src/__tests__/index.test.tsx` — substituir mock e testes de `multiply` pelo mock das duas novas funções e pelos 5 cenários de `initializeAndActivatePinPad`:
  - **Cenário 1**: iOS — aviso no import contém prefixo `'[react-native-pagseguro-plugpag] WARNING:'`
  - **Cenário 2**: iOS — `initializeAndActivatePinPad('403938')` rejeita com `Error` contendo prefixo `'[react-native-pagseguro-plugpag] ERROR:'`
  - **Cenário 3**: Android — resolve com `{ result: 'ok' }` para activationCode `'403938'`
  - **Cenário 4**: Android — erro do SDK: `error.code === 'PLUGPAG_INITIALIZATION_ERROR'`, `error.userInfo.result === 6`, `error.userInfo.errorCode === 'ABC123'`, `error.userInfo.message === 'Terminal não encontrado'`
  - **Cenário 5**: Android — erro interno: `error.code === 'PLUGPAG_INTERNAL_ERROR'`, `error.userInfo.result === -1`

- [X] T008 [US1] Executar `yarn test` e confirmar que os 5 cenários de `initializeAndActivatePinPad` FALHAM (RED obrigatório antes de prosseguir)

### Implementação

- [X] T009 [US1] Implementar em `src/index.tsx` — remover `multiply`; exportar interface `PlugPagActivationSuccess { result: 'ok' }`; implementar `export async function initializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>` com guard Nível 1 (module-level `console.warn`) e Nível 2 (throw no método) conforme Princípio VI; usar `require` condicional após o guard de método

- [X] T010 [US1] Implementar `override fun initializeAndActivatePinPad(activationCode: String, promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — `CoroutineScope(Dispatchers.IO).launch { ... }` com comentário `// EXCEPTION (Constituição Princípio VI): SDK initializeAndActivatePinpad é bloqueante por IPC — Dispatchers.IO é necessário`; verificar `result.result != PlugPag.RET_OK` → `promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))`; catch → `promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))`; `withContext(Dispatchers.Main)` em todas as chamadas de resolve/reject

- [X] T011 [P] [US1] Criar `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` (novo arquivo — criar diretório se necessário) com testes de integração JUnit 5 + Mockk para `initializeAndActivatePinPad`: (a) mock de `PlugPag` retornando `RET_OK` → verificar `promise.resolve` chamado com mapa `{ result: 'ok' }`; (b) mock retornando `result != RET_OK` → verificar `promise.reject("PLUGPAG_INITIALIZATION_ERROR", userInfo)` com `userInfo.result` como `Int`; (c) mock lançando exceção → verificar `promise.reject("PLUGPAG_INTERNAL_ERROR", userInfo)` com `result: -1`

- [X] T012 [US1] Executar `yarn test` e confirmar que todos os 5 cenários de `initializeAndActivatePinPad` PASSAM (GREEN)

**Checkpoint**: `initializeAndActivatePinPad` está completamente funcional e testada — MVP entregável. US2 pode começar em paralelo.

---

## Phase 4: User Story 2 — Ativação Assíncrona do PinPad (Priority: P2)

**Objetivo**: Expor `doAsyncInitializeAndActivatePinPad` com mesmo contrato de US1, usando o mecanismo assíncrono nativo do SDK via `PlugPagActivationListener`.

**Independent Test**: Chamar `doAsyncInitializeAndActivatePinPad('403938')` em ambiente Android mockado e verificar que sucesso e erros se comportam identicamente a `initializeAndActivatePinPad` (mesmo shape de resposta).

### Testes (RED — escrever antes da implementação) ⚠️

> **OBRIGATÓRIO**: Confirmar que os cenários abaixo FALHAM antes de implementar.

- [X] T013 [US2] Adicionar 4 cenários de `doAsyncInitializeAndActivatePinPad` em `src/__tests__/index.test.tsx`:
  - **Cenário 6**: iOS — `doAsyncInitializeAndActivatePinPad('403938')` rejeita com `Error` contendo prefixo `'[react-native-pagseguro-plugpag] ERROR:'`
  - **Cenário 7**: Android — resolve com `{ result: 'ok' }` para activationCode `'403938'`
  - **Cenário 8**: Android — erro do SDK: mesmo shape do Cenário 4
  - **Cenário 9**: Android — erro interno: mesmo shape do Cenário 5

- [X] T014 [US2] Executar `yarn test` e confirmar que os 4 cenários de `doAsyncInitializeAndActivatePinPad` FALHAM (RED obrigatório)

### Implementação

- [X] T015 [US2] Adicionar `export async function doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>` em `src/index.tsx` — guard Nível 2 idêntico ao de `initializeAndActivatePinPad`; usar `require` condicional após o guard; type assertion `as Promise<PlugPagActivationSuccess>`

- [X] T016 [US2] Implementar `override fun doAsyncInitializeAndActivatePinPad(activationCode: String, promise: Promise)` em `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` — sem corrotinas; `plugPag.doAsyncInitializeAndActivatePinpad(activationData, object : PlugPagActivationListener { ... })`; `onActivationProgress` implementado mas vazio (reservado para feature futura); `onSuccess` → `promise.resolve(map)`; `onError` → `promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))`; catch externo → `promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))`

- [X] T017 [P] [US2] Adicionar testes de integração Kotlin para `doAsyncInitializeAndActivatePinPad` em `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` — mock de `PlugPagActivationListener` capturando callbacks; verificar que `onSuccess` aciona `promise.resolve`; verificar que `onError` aciona `promise.reject("PLUGPAG_INITIALIZATION_ERROR", ...)`

- [X] T018 [US2] Executar `yarn test` e confirmar que todos os 9 cenários (5 de US1 + 4 de US2) PASSAM (GREEN)

**Checkpoint**: Ambas as funções de ativação estão completas e testadas. Todas as 9 obrigações de FR-012 atendidas.

---

## Phase 5: User Story 3 — Remoção da Funcionalidade de Scaffold (Priority: P3)

**Objetivo**: Eliminar qualquer referência a `multiply` do aplicativo de exemplo e garantir que a API pública contenha apenas funcionalidades PagSeguro.

> **Nota**: A remoção de `multiply` das demais camadas (spec TS, index.tsx, PagseguroPlugpagModule.kt, testes) já ocorreu nas fases anteriores (T001, T006, T007, T009).

**Independent Test**: Verificar que `multiply` não está exportada pelo módulo e que o exemplo demonstra ativação do PinPad.

- [X] T019 [US3] Substituir `example/src/App.tsx` — remover `import { multiply }` e `multiply(3, 7)`; adicionar importação de `initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad`; implementar dois botões com handlers async que chamam cada função com `'403938'` e exibem o resultado (`{ result: 'ok' }`) ou o erro (`error.code` + `error.userInfo.message`) em um `<Text>`

**Checkpoint**: App de exemplo compila e roda em Android demonstrando ambas as funções. FR-010 e FR-011 atendidos.

---

## Phase 6: Polish & Verificação Final

**Objetivo**: Garantir conformidade com PR Checklist da Constituição e NFR-001 (sensibilidade do código de ativação).

- [X] T020 Executar PR Checklist completo do `plan.md` — verificar: (a) nenhum `any` nos arquivos modificados; (b) `PlugPagActivationSuccess` exportado de `src/index.tsx`; (c) `NativePagseguroPlugpag.ts` sem `multiply` e com os dois novos métodos; (d) `PagseguroPlugpagModule.kt` sem `multiply` e com os dois novos overrides; (e) comentário de exceção Princípio VI presente na implementação de `initializeAndActivatePinPad`

- [X] T021 [P] Auditoria NFR-001 — buscar nos arquivos modificados por qualquer ocorrência do código de ativação ou do parâmetro `activationCode` em mensagens de log, mensagens de erro, ou payloads de rejeição; confirmar que nenhuma ocorrência existe

- [X] T022 Executar `yarn test` final — confirmar todos os 9 cenários passando, sem regressões nos testes existentes; registrar contagem de testes no PR

---

## Dependencies & Execution Order

### Dependências entre Fases

- **Phase 1 (Setup)**: Sem dependências — pode iniciar imediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 — bloqueia US1 e US2
- **Phase 3 (US1)**: Depende de Phase 2 — MVP entregável ao concluir
- **Phase 4 (US2)**: Depende de Phase 2 — pode iniciar após Phase 2 (ou em paralelo com Phase 3 se houver dois desenvolvedores)
- **Phase 5 (US3)**: Depende de Phase 3 e Phase 4 — apenas para garantir que a API de exemplo esteja completa
- **Phase 6 (Polish)**: Depende de todas as fases anteriores

### Dependências entre User Stories

- **US1 (P1)**: Inicia após Phase 2 — sem dependência de US2 ou US3
- **US2 (P2)**: Inicia após Phase 2 — sem dependência de US1; pode rodar em paralelo com US1
- **US3 (P3)**: Inicia após Phase 3 e 4 — depende de US1 e US2 apenas para garantir que a demo do exemplo seja completa

### Dentro de Cada User Story

- Testes DEVEM ser escritos e FALHAR antes da implementação (Princípio III)
- Implementação JS (`src/index.tsx`) antes da implementação Kotlin (valida o contrato da API)
- Implementação Kotlin antes dos testes de integração Kotlin
- Verificação GREEN antes de avançar para a próxima fase

### Oportunidades de Paralelismo

- T004 e T005 (helpers Kotlin): logicamente paralelos (mesma responsabilidade mas funções distintas) — na prática, executar sequencialmente no mesmo arquivo
- T011 e T012: paralelos — Kotlin integration test pode ser desenvolvido enquanto JS tests rodam
- T017 e T018: paralelos — mesmo padrão de US1
- T021 e T020: paralelos — auditoria NFR-001 independente do checklist de PR
- US1 e US2 inteiras podem ser desenvolvidas em paralelo por dois desenvolvedores após Phase 2

---

## Exemplo de Execução em Paralelo: US1 + US2

```bash
# Após Phase 2 estar completa:

# Desenvolvedor A — US1 (P1)
Tarefa: "T007 — Escrever testes de initializeAndActivatePinPad (RED)"
Tarefa: "T009 — Implementar src/index.tsx (initializeAndActivatePinPad)"
Tarefa: "T010 — Implementar Kotlin (initializeAndActivatePinPad)"

# Desenvolvedor B — US2 (P2) — em paralelo
Tarefa: "T013 — Escrever testes de doAsyncInitializeAndActivatePinPad (RED)"
Tarefa: "T015 — Implementar src/index.tsx (doAsyncInitializeAndActivatePinPad)"
Tarefa: "T016 — Implementar Kotlin (doAsyncInitializeAndActivatePinPad)"

# Após ambos concluírem:
Tarefa: "T018 — Verificar GREEN (todos os 9 cenários)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Apenas)

1. Concluir Phase 1: Setup (T001)
2. Concluir Phase 2: Foundational (T002–T006) ⚠️ CRÍTICO
3. Concluir Phase 3: User Story 1 (T007–T012)
4. **PARAR E VALIDAR**: `initializeAndActivatePinPad` funcionando — 5 testes passando
5. Entregar demo ou continuar para US2

### Entrega Incremental

1. Phase 1 + 2 → Base Kotlin pronta
2. US1 → `initializeAndActivatePinPad` completa → **Demo MVP**
3. US2 → `doAsyncInitializeAndActivatePinPad` completa → **Demo com ambas as funções**
4. US3 → Example app atualizado → **Feature completa**
5. Polish → PR pronto para merge

---

## Notes

- **[P]** = arquivos diferentes, sem dependências entre si
- **[Story]** = rastreabilidade com User Story da spec
- Todo cenário de teste deve ser verificado como FALHANDO antes de implementar (Princípio III)
- O código de ativação `'403938'` deve ser usado em TODOS os cenários de teste e no app de exemplo (código de desenvolvimento PagSeguro)
- O comentário de exceção do Princípio VI é obrigatório no código Kotlin (NFR de governança)
- NFR-001: o parâmetro `activationCode` nunca deve aparecer em mensagens de erro ou logs — não usar em string interpolation em nenhuma camada
- Fazer commit após cada checkpoint ou grupo lógico de tarefas
- Parar em qualquer checkpoint para validar a User Story de forma independente
