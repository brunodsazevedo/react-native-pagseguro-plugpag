# Implementation Plan: Correção de entrega de callbacks nos métodos `doAsync*` na New Architecture

**Branch**: `bugfix/018-fix-async-callbacks-new-arch` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-fix-async-callbacks-new-arch/spec.md`

## Summary

Os 5 métodos `doAsync*` do TurboModule (`doAsyncPayment`, `doAsyncInitializeAndActivatePinPad`,
`doAsyncAbort`, `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt`) invocam
o SDK PlugPag **diretamente na thread de chamada do TurboModule**, que na New Architecture não
possui `Looper` preparado. Os callbacks RxJava terminais (`onSuccess`/`onError`) do wrapper são
descartados silenciosamente e a Promise nunca conclui (Issue #13). O evento `onPaymentProgress`
chega por outro caminho e continua funcionando — daí o sintoma assimétrico.

**Abordagem técnica (Opção A do PRD, decidida)**: envolver a invocação de cada `doAsync*` em
`UiThreadUtil.runOnUiThread { ... }` (`com.facebook.react.bridge`), garantindo `Looper` válido
no momento da subscrição RxJava do SDK e na entrega dos callbacks. A correção é cirúrgica:
nenhuma mudança de API pública, tipos ou códigos de erro. Remove-se também os 8 comentários
`// EXCEPTION (Constituição Princípio VI)` agora redundantes, conforme Threading Policy v1.4.0.
**Fallback (Opção C)**: caso a validação em terminal físico não confirme a resolução, delegar ao
caminho bloqueante (`Dispatchers.IO` + resolve na Main), tratando `doAsyncAbort` caso a caso.

## Technical Context

**Language/Version**: Kotlin 2.0.21 (nativo Android); TypeScript 5.9 (`strict: true`) — sem alterações TS de runtime  
**Primary Dependencies**: PlugPagServiceWrapper `wrapper:1.35.0`; `UiThreadUtil` de `com.facebook.react.bridge`; React Native 0.83.2+ (New Architecture / TurboModules + JSI); kotlinx.coroutines (mantido apenas nos métodos bloqueantes)  
**Storage**: N/A — biblioteca sem estado persistente  
**Testing**: JUnit 5 + Mockk (Kotlin); Jest 29 + react-native preset (JS, inalterados)  
**Target Platform**: Android-only — terminais PagBank SmartPOS (A920, A930, P2, S920)  
**Project Type**: Mobile library (React Native TurboModule, Android-only)  
**Performance Goals**: `doAsync*` do SDK é não-bloqueante (apenas registra listener); invocá-lo na main thread NÃO deve travar a UI — processamento EMV/IPC roda em thread interna do SDK (`Schedulers.io()`)  
**Constraints**: `newArchEnabled=true` é a configuração primária e única suportada — NÃO pode ser desabilitada como solução; API pública (assinaturas, tipos, códigos de erro) MUST permanecer inalterada; validação de aceitação depende de terminal físico PagBank (gate bloqueante de merge)  
**Scale/Scope**: 5 métodos nativos `doAsync*` no único arquivo `PagseguroPlugpagModule.kt`; remoção de 8 comentários `EXCEPTION`; testes de integração Kotlin; CHANGELOG + bump de versão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Avaliação |
|---|---|---|
| **I — TurboModules Only** | ✅ PASS | Correção 100% interna ao TurboModule; nenhum padrão Bridge reintroduzido. `NativePagseguroPlugpag.ts` permanece a fonte de verdade e NÃO é alterada (sem novo método). |
| **II — TypeScript Strict / Zero `any`** | ✅ PASS | Nenhuma alteração TypeScript de runtime. Zero `any` introduzido. |
| **III — Test-First / TDD** | ✅ PASS | Testes de integração Kotlin (resolução/rejeição) escritos/ajustados antes da implementação; harness ajustado com `mockkStatic(UiThreadUtil)` para executar o runnable síncronamente. Testes JS dos `doAsync*` permanecem verdes sem mudança de asserção. |
| **IV — Clean Code + SOLID** | ✅ PASS | `PlugPag` continua chamado apenas dentro de `PagseguroPlugpagModule.kt`; nenhuma lógica de negócio nova — apenas marshalling de thread (serialização/chamada SDK). |
| **V — Device Compatibility & Fail-Fast** | ✅ N/A | Princípio V permanece DEFERRED; fora de escopo desta correção (feature separada). |
| **VI — Android-Only Scope + Threading Policy** | ✅ PASS | Correção implementa **exatamente** a Threading Policy v1.4.0 para métodos async baseados em listener: invocação e entrega via `UiThreadUtil.runOnUiThread`. Remoção dos comentários `EXCEPTION` está alinhada à regra ("threading é regra, não exceção"). |

**Resultado**: PASS — nenhum desvio. A constituição **já está em v1.4.0** (atualizada em
2026-06-28); esta feature **consome** a Threading Policy, NÃO a reabre nem re-executa
`/speckit-constitution` (ver PRD §5.3 e Assumptions da spec).

**Complexity Tracking**: N/A — sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/018-fix-async-callbacks-new-arch/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — causa raiz + decisão UiThreadUtil + harness de teste
├── data-model.md        # Phase 1 — entidades conceituais (sem schema persistente)
├── quickstart.md        # Phase 1 — validação em device + gates locais
├── contracts/           # Phase 1 — contrato observável dos doAsync* (inalterado)
│   └── doAsync-contract.md
├── spec.md              # /speckit-specify (já existente)
└── tasks.md             # /speckit-tasks (NÃO criado por /speckit-plan)
```

### Source Code (repository root)

```text
android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt        # ÚNICO arquivo de produção alterado
                                     #  - doAsyncAbort (linha ~206)
                                     #  - doAsyncInitializeAndActivatePinPad (linha ~268)
                                     #  - doAsyncPayment (linha ~349)
                                     #  - doAsyncReprintCustomerReceipt (linha ~496)
                                     #  - doAsyncReprintEstablishmentReceipt (linha ~539)
                                     #  - remoção de 8 comentários // EXCEPTION (Princípio VI)

android/src/test/java/com/pagseguroplugpag/
└── PagseguroPlugpagModuleTest.kt    # Ajuste de harness: mockkStatic(UiThreadUtil)
                                     #  + testes de resolução/rejeição dos doAsync*

CHANGELOG.md                         # Entrada do bugfix em [Unreleased] → Fixed
package.json                         # Bump de versão (patch: 1.2.2 → 1.2.3)

# INALTERADOS (somente leitura/verificação):
src/NativePagseguroPlugpag.ts        # Spec NÃO muda → codegen NÃO precisa regenerar
src/functions/**/index.ts            # Camada JS inalterada (threading é detalhe nativo)
src/__tests__/functions/*.test.ts    # Testes JS dos doAsync* permanecem verdes sem mudança
```

**Structure Decision**: Mobile library Android-only. A correção é confinada a um único arquivo
de produção Kotlin (`PagseguroPlugpagModule.kt`) e seu correspondente de teste. Como
`NativePagseguroPlugpag.ts` **não** é alterada (nenhum método novo, removido ou com assinatura
diferente), o **codegen Android NÃO precisa ser regenerado** — a classe abstrata gerada
permanece válida. A camada JS de domínio (`functions/`) e seus testes Jest ficam intactos, pois
o threading nativo é invisível ao contrato JS↔Native.

## Complexity Tracking

> Não aplicável — Constitution Check passou sem violações.
