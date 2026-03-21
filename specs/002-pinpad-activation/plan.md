# Plano de Implementação: Ativação do PinPad

**Branch**: `feature/002-pinpad-activation` | **Data**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-pinpad-activation/spec.md`

---

## Sumário

Implementar duas funções de ativação do PinPad PagSeguro no TurboModule (`initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad`), expondo-as para o lado JavaScript com contrato de erro estruturado e guard de plataforma iOS. Simultaneamente, remover a função de scaffold `multiply` de todas as camadas. A variante síncrona do SDK é executada em corrotina `Dispatchers.IO` (blocking I/O exigido pelo SDK); a variante assíncrona usa o mecanismo de listener nativo do SDK sem corrotinas.

---

## Technical Context

**Language/Version**: TypeScript 5.9 (camada JS + spec TurboModule) + Kotlin 2.0.21 (módulo nativo Android)
**Primary Dependencies**: react-native 0.83.2, PlugPagServiceWrapper 1.33.0, kotlinx.coroutines (para variante síncrona)
**Storage**: N/A
**Testing**: Jest (testes de unidade JS), JUnit 5 + Mockk (integração Kotlin — novo, ainda não configurado)
**Target Platform**: Android — PagBank SmartPOS (A920, A930, P2, S920)
**Project Type**: Biblioteca React Native (TurboModule / New Architecture)
**Performance Goals**: Sem timeout imposto pela biblioteca — delegado ao SDK e Android OS (ver clarificação Q1)
**Constraints**: Android-only; sem chamadas paralelas simultâneas; código de ativação nunca logado (NFR-001)
**Scale/Scope**: Operação de inicialização única por sessão (retries sequenciais permitidos)

---

## Constitution Check

*GATE: Deve passar antes da Fase 0. Re-verificado após Fase 1.*

| Princípio | Status | Observação |
|---|---|---|
| **I. TurboModules Only** | ✅ PASS | `Promise<Object>` na spec codegen; JSI via TurboModule; sem Bridge |
| **II. Zero `any`** | ✅ PASS | `Object` na spec é exigência do codegen (permitida); `PlugPagActivationSuccess` tipado na camada pública; nenhum `any` |
| **III. Test-First / TDD** | ✅ PASS | 9 cenários de teste definidos na spec (FR-012); Kotlin integration tests requeridos |
| **IV. Clean Code + SOLID** | ✅ PASS | Domínio `activation` isolado; `PlugPag` confinado ao `PagseguroPlugpagModule.kt`; sem lógica de negócio no Kotlin além de serialização e chamada SDK |
| **V. Device Compatibility** | ⚠️ DEFERRED | Detecção de dispositivo POS vs não-POS não está no escopo desta feature — ver Complexity Tracking |
| **VI. Android-Only Scope** | ✅ PASS (com exceção justificada) | Guard de dois níveis mantido; `.podspec` e `ios/` já removidos (feature 001); `Dispatchers.IO` justificado — SDK síncrono é bloqueante por natureza (IPC) |

**Exceção justificada — Princípio VI (Dispatchers.IO)**:
O Princípio VI proíbe corrotinas salvo quando o SDK as exige. O método `initializeAndActivatePinpad` do SDK é **bloqueante** (comunicação IPC com o PlugPagService). Executá-lo na thread principal causaria ANR. O uso de `Dispatchers.IO` é portanto tecnicamente exigido pelo comportamento do SDK. Esta exceção deve ser documentada com comentário inline no código Kotlin.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-pinpad-activation/
├── plan.md              ← este arquivo
├── spec.md              ← especificação da feature
├── research.md          ← decisões de pesquisa (Phase 0)
├── data-model.md        ← modelo de dados e tipos (Phase 1)
├── contracts/
│   └── api.md           ← contrato da API pública (Phase 1)
├── checklists/
│   └── requirements.md  ← checklist de qualidade da spec
└── tasks.md             ← gerado pelo /speckit.tasks (não por este comando)
```

### Source Code (repository root)

```text
src/
├── NativePagseguroPlugpag.ts   ← spec TurboModule (modificar)
├── index.tsx                   ← API pública (modificar)
└── __tests__/
    └── index.test.tsx          ← testes de unidade (modificar)

android/src/main/java/com/pagseguroplugpag/
└── PagseguroPlugpagModule.kt   ← módulo Kotlin (modificar)

example/src/
└── App.tsx                     ← app de exemplo (modificar)
```

**Structure Decision**: Projeto de biblioteca React Native — estrutura existente, sem novos diretórios no source. Todos os arquivos envolvidos já existem; esta feature os modifica.

---

## Complexity Tracking

| Violação | Por que necessário | Alternativa Simples Rejeitada Porque |
|---|---|---|
| `Dispatchers.IO` (Princípio VI exceção) | SDK `initializeAndActivatePinpad` é bloqueante por IPC; não pode ser chamado na main thread | `ExecutorService` (legado Java) — padrão não idiomático em Kotlin 2.x; corrotinas são a abordagem canônica |
| Princípio V não implementado | Fora do escopo do PRD desta feature | Incluir detecção de dispositivo agora expandiria escopo além do especificado; deve ser feature dedicada (003-device-detection) |

---

## Fase 0: Pesquisa

*Completa. Ver [research.md](research.md) para decisões detalhadas.*

**Resumo das decisões-chave**:
1. Threading: `CoroutineScope(Dispatchers.IO)` para variante síncrona; sem corrotinas para variante assíncrona (SDK gerencia via listener).
2. Reject: `promise.reject(code, userInfo: WritableMap)` — variante 2-arg válida na API RN.
3. Dois códigos de erro distintos: `PLUGPAG_INITIALIZATION_ERROR` vs `PLUGPAG_INTERNAL_ERROR`.
4. Sucesso: `{ result: 'ok' }` — payload mínimo e não-ambíguo.
5. Detecção de dispositivo (Princípio V): deferida para feature 003.

---

## Fase 1: Design e Contratos

*Completa. Ver [data-model.md](data-model.md) e [contracts/api.md](contracts/api.md).*

---

## Fase 2: Plano de Implementação

> A ordem abaixo segue estritamente o ciclo TDD da Constituição Princípio III:
> **Vermelho → Verde → Refatorar** — testes escritos e confirmados falhando ANTES da implementação.

### Etapa 1 — Atualizar TurboModule Spec (`src/NativePagseguroPlugpag.ts`)

**O que fazer**: Remover `multiply`; adicionar `initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad` como `Promise<Object>`.

**Resultado esperado**:
```typescript
export interface Spec extends TurboModule {
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;
}
```

**Gate**: O codegen deve regenerar `NativePagseguroPlugpagSpec.java` com os dois novos métodos ao executar o build Android.

---

### Etapa 2 — Escrever Testes de Unidade (RED) (`src/__tests__/index.test.tsx`)

**O que fazer**: Substituir testes e mock de `multiply` pelos 9 cenários da spec. Confirmar que **todos falham** antes de implementar.

**Mock do módulo nativo**:
```typescript
jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    initializeAndActivatePinPad: jest.fn().mockResolvedValue({ result: 'ok' }),
    doAsyncInitializeAndActivatePinPad: jest.fn().mockResolvedValue({ result: 'ok' }),
  },
}));
```

**9 cenários obrigatórios**:

*Para `initializeAndActivatePinPad`:*
1. iOS — aviso no import com prefixo `[react-native-pagseguro-plugpag] WARNING:`
2. iOS — rejeição na chamada com prefixo `[react-native-pagseguro-plugpag] ERROR:`
3. Android — sucesso: resolve com `{ result: 'ok' }` usando activationCode `'403938'`
4. Android — erro do SDK: `error.code === 'PLUGPAG_INITIALIZATION_ERROR'`, `error.userInfo.result === 6`, `error.userInfo.errorCode === 'ABC123'`, `error.userInfo.message === 'Terminal não encontrado'`
5. Android — erro interno: `error.code === 'PLUGPAG_INTERNAL_ERROR'`, `error.userInfo.result === -1`

*Para `doAsyncInitializeAndActivatePinPad`:*
6. iOS — rejeição na chamada com prefixo `[react-native-pagseguro-plugpag] ERROR:`
7. Android — sucesso: resolve com `{ result: 'ok' }` usando activationCode `'403938'`
8. Android — erro do SDK: mesmo shape do cenário 4
9. Android — erro interno: mesmo shape do cenário 5

**Helpers de erro para os cenários 4/5/8/9**:
```typescript
// Cenários 4 e 8 — erro mapeado pelo SDK
const sdkError = Object.assign(new Error('PlugPag SDK error'), {
  code: 'PLUGPAG_INITIALIZATION_ERROR',
  userInfo: { result: 6, errorCode: 'ABC123', message: 'Terminal não encontrado' },
});

// Cenários 5 e 9 — exceção inesperada
const internalError = Object.assign(new Error('Unexpected failure'), {
  code: 'PLUGPAG_INTERNAL_ERROR',
  userInfo: { result: -1, errorCode: 'INTERNAL_ERROR', message: 'Unexpected failure' },
});
```

---

### Etapa 3 — Implementar API Pública (GREEN) (`src/index.tsx`)

**O que fazer**: Remover `multiply`; adicionar `PlugPagActivationSuccess` como tipo exportado; adicionar `initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad` com guard de dois níveis.

**Estrutura de cada função**:
```typescript
// Nível 2 — guard de método
if (Platform.OS !== 'android') {
  throw new Error('[react-native-pagseguro-plugpag] ERROR: <nome>() is not available on iOS. PagSeguro PlugPag SDK is Android-only.');
}
// Require condicional após o guard (nunca antes)
const PagseguroPlugpag = (require('./NativePagseguroPlugpag') as { default: Spec }).default;
return PagseguroPlugpag.<método>(activationCode) as Promise<PlugPagActivationSuccess>;
```

**Guard de nível 1** (nível de módulo, já existente — apenas ajustar se necessário):
```typescript
if (Platform.OS !== 'android') {
  console.warn('[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.');
}
```

**Gate**: `yarn test` com todos os 9 cenários passando (GREEN).

---

### Etapa 4 — Implementar Módulo Kotlin (GREEN) (`android/.../PagseguroPlugpagModule.kt`)

**O que fazer**: Remover `multiply`; adicionar `plugPag` lazy, helpers privados, e as duas funções de ativação.

**Componentes a implementar**:

**4a. Lazy property `plugPag`**:
```kotlin
private val plugPag: PlugPag by lazy {
  val packageInfo = reactApplicationContext.packageManager
      .getPackageInfo(reactApplicationContext.packageName, 0)
  val appId = PlugPagAppIdentification(
      reactApplicationContext.packageName,
      packageInfo.versionName ?: "1.0"
  )
  PlugPag(reactApplicationContext, appId)
}
```

**4b. Helper `buildSdkErrorUserInfo`**:
```kotlin
private fun buildSdkErrorUserInfo(sdkResult: PlugPagInitializationResult): WritableNativeMap =
  WritableNativeMap().apply {
    putInt("result", sdkResult.result)
    putString("errorCode", sdkResult.errorCode ?: "")
    putString("message", sdkResult.errorMessage?.takeIf { it.isNotEmpty() } ?: "Unknown error")
  }
```

**4c. Helper `buildInternalErrorUserInfo`**:
```kotlin
private fun buildInternalErrorUserInfo(e: Exception): WritableNativeMap =
  WritableNativeMap().apply {
    putInt("result", -1)
    putString("errorCode", "INTERNAL_ERROR")
    putString("message", e.message ?: "Unknown error")
  }
```

**4d. `initializeAndActivatePinPad`** — variante síncrona com Dispatchers.IO:
```kotlin
// EXCEPTION (Constituição Princípio VI): SDK initializeAndActivatePinpad é bloqueante por IPC.
// Dispatchers.IO é necessário para evitar ANR na thread principal.
override fun initializeAndActivatePinPad(activationCode: String, promise: Promise) {
  CoroutineScope(Dispatchers.IO).launch {
    try {
      val activationData = PlugPagActivationData(activationCode)
      val result = plugPag.initializeAndActivatePinpad(activationData)
      if (result.result != PlugPag.RET_OK) {
        withContext(Dispatchers.Main) {
          promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))
        }
        return@launch
      }
      val map = WritableNativeMap().apply { putString("result", "ok") }
      withContext(Dispatchers.Main) { promise.resolve(map) }
    } catch (e: Exception) {
      withContext(Dispatchers.Main) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
      }
    }
  }
}
```

**4e. `doAsyncInitializeAndActivatePinPad`** — variante assíncrona via listener:
```kotlin
override fun doAsyncInitializeAndActivatePinPad(activationCode: String, promise: Promise) {
  try {
    val activationData = PlugPagActivationData(activationCode)
    plugPag.doAsyncInitializeAndActivatePinpad(activationData, object : PlugPagActivationListener {
      override fun onActivationProgress(data: PlugPagEventData) {
        // Progresso não exposto nesta versão — reservado para feature futura via DeviceEventEmitter
      }
      override fun onSuccess(result: PlugPagInitializationResult) {
        val map = WritableNativeMap().apply { putString("result", "ok") }
        promise.resolve(map)
      }
      override fun onError(result: PlugPagInitializationResult) {
        promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))
      }
    })
  } catch (e: Exception) {
    promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
  }
}
```

**Gate**: Build Android sem erros de compilação.

---

### Etapa 5 — Testes de Integração Kotlin

**O que fazer**: Criar testes JUnit 5 + Mockk para validar serialização/deserialização entre JS e SDK para ambos os métodos.

**Localização**: `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` (novo arquivo)

**Cenários mínimos**:
- Mock do `PlugPag` com Mockk; verificar que `promise.resolve` é chamado com mapa `{ result: 'ok' }` quando SDK retorna `RET_OK`.
- Verificar que `promise.reject("PLUGPAG_INITIALIZATION_ERROR", userInfo)` é chamado com `userInfo.result` como Int (não String) quando SDK retorna erro.
- Verificar que `promise.reject("PLUGPAG_INTERNAL_ERROR", userInfo)` é chamado com `result: -1` quando ocorre exceção inesperada.

---

### Etapa 6 — Atualizar Aplicativo de Exemplo (`example/src/App.tsx`)

**O que fazer**: Remover importação e uso de `multiply`; adicionar demonstração de ambas as funções de ativação usando o código `'403938'` (código de desenvolvimento PagSeguro).

**Estrutura sugerida**:
- Botão para `initializeAndActivatePinPad('403938')` com exibição de resultado/erro.
- Botão para `doAsyncInitializeAndActivatePinPad('403938')` com exibição de resultado/erro.

---

### Etapa 7 — Verificação Final (PR Checklist da Constituição)

- [ ] 9 cenários de teste de unidade passando com cobertura 100% das funções exportadas.
- [ ] Nenhum `any` — verificação manual além do ESLint.
- [ ] `PlugPagActivationSuccess` exportado de `src/index.tsx`.
- [ ] `NativePagseguroPlugpag.ts` atualizado (sem `multiply`, com as duas novas funções).
- [ ] `PagseguroPlugpagModule.kt` atualizado.
- [ ] Testes de integração Kotlin criados.
- [ ] `multiply` removido de todas as camadas (spec, index, Kotlin, testes, example).
- [ ] Comentário inline documentando exceção Dispatchers.IO (Princípio VI).
- [ ] Código de ativação nunca aparece em logs ou mensagens de erro (NFR-001).
