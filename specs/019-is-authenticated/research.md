# Phase 0 — Research: `isAuthenticated` & `asyncIsAuthenticated`

**Fonte primária**: `PRD.md` (raiz do projeto). Este documento consolida as decisões do PRD no
formato Decision/Rationale/Alternatives e confirma a ausência de NEEDS CLARIFICATION.

## Avaliação: PRD.md pode ser usado junto com a spec?

**Sim — totalmente.** PRD e spec são complementares e consistentes:

| Documento | Papel | Conteúdo |
|---|---|---|
| `spec.md` | O **quê** (requisitos) | User stories P1/P2, FR-001..FR-012, SC-001..SC-005, edge cases |
| `PRD.md` | O **como** (pesquisa técnica) | Assinaturas do SDK, threading, códigos de erro, mapa de arquivos, plano de testes, esboço de implementação |

Mapeamento de consistência verificado (sem divergências):

- PRD §3 Decisão 1 (boolean puro) ↔ spec FR-001/FR-002 + Assumptions ✅
- PRD §2.3 / §8 (`false` não é erro) ↔ spec FR-003 + Edge Cases + SC-002 ✅
- PRD §3 Decisão 2 (`PLUGPAG_AUTHENTICATION_ERROR`) ↔ spec FR-006 ✅
- PRD §3 Decisão 3 (threading) ↔ spec FR-009/FR-010 ✅
- PRD §1 / §3 (domínio activation) ↔ spec FR-008 ✅
- PRD §5 (plano de testes) ↔ spec FR-011 + SC-003 ✅

**Conclusão**: adotar o PRD como fonte de research desta feature, sem necessidade de pesquisa
adicional. Nenhum item NEEDS CLARIFICATION restante.

---

## Decisão 1 — Tipo de retorno: `boolean` puro

- **Decision**: Ambas as funções retornam `Promise<boolean>`. Na `Spec` do codegen, declarar
  `isAuthenticated(): Promise<boolean>` e `asyncIsAuthenticated(): Promise<boolean>` (não `Promise<Object>`).
- **Rationale**: Checagem de estado é booleana; retorno direto é idiomático e ergonômico. O codegen
  do RN suporta `boolean` como tipo de retorno primitivo — não há mapa a serializar.
- **Alternatives considered**: Objeto wrapper `{ authenticated: boolean }` (padrão "sempre objeto"
  do resto da lib) — rejeitado por overhead sem benefício. Caso dados extras (ex.:
  `terminalSerialNumber`) sejam necessários no futuro, será novo método/breaking change, aceito
  conscientemente. Sem alteração em `activation/types.ts`.

## Decisão 2 — Códigos de erro de domínio

- **Decision**: `asyncIsAuthenticated.onError` → rejeita com `PLUGPAG_AUTHENTICATION_ERROR`
  (preservando a mensagem do SDK). Exceções não-SDK em ambas → `PLUGPAG_INTERNAL_ERROR`. O síncrono
  `isAuthenticated` não tem caminho de erro de domínio do SDK (retorna boolean direto) → apenas
  `PLUGPAG_INTERNAL_ERROR` em caso de exceção.
- **Rationale**: Segue a convenção `PLUGPAG_<DOMAIN>_ERROR` vs `PLUGPAG_INTERNAL_ERROR` já adotada.
  Distinguir "não ativado" (resolve false) de "falha ao recuperar status" (reject) é requisito
  explícito (spec FR-003 vs FR-006).
- **Alternatives considered**: Reusar `PLUGPAG_INITIALIZATION_ERROR` — rejeitado: consulta não é
  ativação; código próprio é mais claro.

## Decisão 3 — Threading (Threading Policy — Constituição VI)

- **Decision**:
  - `isAuthenticated` (bloqueante por IPC/AIDL) → `CoroutineScope(Dispatchers.IO).launch { ... }`
    e resolver/rejeitar via `withContext(Dispatchers.Main)`.
  - `asyncIsAuthenticated` (listener RxJava) → invocar o SDK dentro de `UiThreadUtil.runOnUiThread { }`.
- **Rationale**: Padrão idêntico ao validado empiricamente em terminal físico na feature/018
  (callbacks RxJava exigem `Looper` ativo, ausente nas threads de background do TurboModule na New
  Arch — Issue #13). Não é mais "pendente de validação em device".
- **Alternatives considered**: `CoroutineScope(Dispatchers.Main)` para o async — **proibido** pela
  Constituição VI (não garante entrega do callback). Rodar `isAuthenticated` na main thread —
  rejeitado: risco de ANR mesmo sendo chamada barata.

## Decisão 4 — Pacote do listener nativo

- **Decision**: `import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagIsActivatedListener`.
- **Rationale**: Armadilha conhecida da feature/018 — listeners do SDK ficam em `.listeners`, não na
  raiz `wrapper.`. Callbacks: `onIsActivated(isActivated: Boolean)` e `onError(errorMessage: String)`.
- **Alternatives considered**: `wrapper.PlugPagIsActivatedListener` (raiz) — incorreto, quebra compilação.

## Decisão 5 — Codegen obrigatório

- **Decision**: Após editar `NativePagseguroPlugpag.ts`, rodar
  `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` antes de qualquer Kotlin.
- **Rationale**: A Spec gerada (`NativePagseguroPlugpagSpec.java`) é a classe abstrata que o módulo
  Kotlin estende; desatualizada → `'X' overrides nothing` e build quebra. BLOQUEANTE.
- **Alternatives considered**: Editar o `.java` gerado à mão — proibido.

## Riscos & Mitigações (PRD §8)

- ⚠️ **`false ≠ erro`** (regressão mais provável): cobertura de teste dedicada para
  `onIsActivated(false)` e `isAuthenticated() == false` resolverem (não rejeitarem) — ambas variantes.
- ⚠️ **Pacote do listener**: usar `.listeners.PlugPagIsActivatedListener`.
- ⚠️ **Codegen**: regenerar após editar a Spec.
- ✅ **Padrão async validado em device** (feature/018) — sem incerteza de device.
