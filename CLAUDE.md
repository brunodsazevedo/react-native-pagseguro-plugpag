# react-native-pagseguro-plugpag

## Visão Geral do Projeto

Biblioteca React Native (TurboModule / New Architecture) que expõe o SDK
`PlugPagServiceWrapper` da PagSeguro para aplicativos React Native. Foco exclusivo em
Android — terminals PagBank SmartPOS (A920, A930, P2, S920). iOS é explicitamente fora
de escopo (guarda de dois níveis em `src/index.tsx`).

**Package**: `react-native-pagseguro-plugpag` | **Versão**: 0.1.0
**SDK Alvo**: `br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0`
**Maven**: `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master`
**Mínimo Android SDK**: 24 | **Compile/Target SDK**: 36

---

## Stack de Tecnologias

| Camada | Tecnologia |
|---|---|
| JS / Spec | TypeScript 5.9 (`strict: true`) |
| Native Android | Kotlin 2.0.21 |
| Framework | React Native 0.83.2 (New Architecture) |
| Build | react-native-builder-bob 0.40.18 |
| Expo Plugin | @expo/config-plugins ^9.0.0 |
| Threading nativo | kotlinx.coroutines (somente quando SDK exige blocking I/O) |
| Testes JS | Jest 29 + react-native preset |
| Testes Kotlin | JUnit 5 + Mockk |
| Lint | ESLint (flat config) + Prettier |
| Package manager | Yarn 4.11.0 |

---

## Estrutura de Arquivos Críticos

```
src/
├── NativePagseguroPlugpag.ts   ← Spec TurboModule (fonte da verdade do contrato JS↔Native)
├── index.tsx                   ← API pública exportada (com iOS guards)
└── __tests__/
    └── index.test.tsx          ← Testes unitários JS

android/src/main/java/com/pagseguroplugpag/
├── PagseguroPlugpagModule.kt   ← Implementação Kotlin do TurboModule
└── PagseguroPlugpagPackage.kt  ← Registro do módulo React Native

android/build.gradle            ← Configuração Android + dependência SDK PagBank

specs/                          ← Documentação especkit por feature
├── 001-pagseguro-sdk-setup/
└── 002-pinpad-activation/

example/src/App.tsx             ← App de demonstração
```

---

## Constituição do Projeto (v1.2.0)

A constituição completa está em `.specify/memory/constitution.md`. Os princípios são
**NON-NEGOTIABLE** exceto quando explicitamente justificado.

### Princípio I — TurboModules Only

- Toda comunicação JS↔Native DEVE usar JSI/TurboModule. Bridge legada é **proibida**.
- `NativePagseguroPlugpag.ts` é a **única fonte de verdade** do contrato JS↔Native.
- `.podspec` e `ios/` NÃO DEVEM existir no repositório.
- React Native mínimo: 0.76.

### Princípio II — TypeScript Strict — Zero `any`

- `tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- `any` é **proibido**. Toda exceção DEVE ser documentada com `// EXCEPTION: <razão>`.
- `@ts-ignore` / `@ts-expect-error` são **proibidos** sem justificativa documentada.
- Tipos complexos usam `Object` na spec do codegen (exigência do codegen — permitido)
  e são tipados com type assertion segura na camada pública.
- Enums DEVEM ser `const` objects (não `enum` nativo do TypeScript) — tree-shakeable.
- Interfaces DEVEM ser usadas para todos os modelos de dados; `object` genérico é proibido.

### Princípio III — Test-First / TDD

- Testes DEVEM ser escritos **antes** da implementação e confirmados como falhando.
- 100% das funções exportadas de `src/index.tsx` DEVEM ter cobertura de teste unitário.
- Todo novo método nativo DEVE ter teste de integração Kotlin (JUnit 5 + Mockk).
- O módulo nativo (`NativePagseguroPlugpag`) DEVE sempre ser mockado em testes unitários JS.
- PR que quebra teste existente é **bloqueado**.

### Princípio IV — Clean Code + SOLID

- Cada módulo TypeScript possui um único domínio (`payment`, `print`, `nfc`, `activation`).
- `PlugPag` (SDK) DEVE ser instanciado e chamado **somente** dentro de
  `PagseguroPlugpagModule.kt`. Nenhuma lógica de negócio além de serialização e chamadas
  SDK é permitida no módulo Kotlin.
- Tipos DEVEM ser estendidos via union types; contratos existentes NÃO DEVEM ser quebrados.
- O módulo nativo DEVE ser acessado sempre via interface Spec, nunca diretamente.

### Princípio V — Device Compatibility & Fail-Fast

- A biblioteca DEVE detectar se está rodando em terminal PagBank SmartPOS.
- **Dispositivo POS**: SDK roda normalmente.
- **Não-POS + `__DEV__ = true`**: warning + respostas mock (cobre toda a API surface).
- **Não-POS + produção**: qualquer chamada DEVE lançar erro explícito. Fallback silencioso
  é **proibido**.
- **Status**: ⚠️ DEFERRED — não implementado ainda; será feature dedicada.

### Princípio VI — Android-Only Scope

- Todo código nativo DEVE ser Kotlin 2.x.
- Threading para chamadas SDK DEVE usar os métodos async do próprio SDK diretamente.
  `Dispatchers.IO` / coroutines são **proibidos** salvo quando o SDK exige (blocking IPC).
- **Exceção justificada**: `initializeAndActivatePinpad` é bloqueante por IPC.
  Executar na main thread causaria ANR. `Dispatchers.IO` é tecnicamente exigido.
  A exceção DEVE ser documentada com comentário inline no Kotlin.

#### iOS Runtime Guard (Dois Níveis — src/index.tsx)

```typescript
// Nível 1 — top-level do módulo (não lança, apenas avisa)
if (Platform.OS !== 'android') {
  console.warn('[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.');
}

// Nível 2 — dentro de cada função exportada (lança erro capturável)
if (Platform.OS !== 'android') {
  throw new Error('[react-native-pagseguro-plugpag] ERROR: <methodName>() is not available on iOS. PagSeguro PlugPag SDK is Android-only.');
}
```

Regras:
- O import warning NÃO deve lançar — o app DEVE abrir normalmente no iOS.
- Toda função exportada DEVE incluir o guard Nível 2 **antes** de qualquer chamada nativa.
- `TurboModuleRegistry.getEnforcing` NUNCA deve ser chamado sem guard de plataforma precedente.
- Os prefixos exatos `[react-native-pagseguro-plugpag] WARNING:` e
  `[react-native-pagseguro-plugpag] ERROR:` DEVEM ser preservados (grep-ability).
- O import do módulo nativo DEVE ser lazy (via `require(...)`) — somente após o guard.

---

## Padrões de Código

### TypeScript — API Pública (`src/index.tsx`)

```typescript
// Padrão de import lazy (NUNCA importar antes do guard)
const PagseguroPlugpag = (
  require('./NativePagseguroPlugpag') as { default: Spec }
).default;

// Tipos de retorno devem ser type assertion explícita (não 'as any')
return PagseguroPlugpag.someMethod(param) as Promise<DefinedType>;
```

### Kotlin — Módulo Nativo

```kotlin
// Instância única e lazy do PlugPag
private val plugPag: PlugPag by lazy { ... }

// Helpers de erro estruturado (WritableNativeMap, nunca strings soltas)
private fun buildSdkErrorUserInfo(result: SdkResult): WritableNativeMap { ... }
private fun buildInternalErrorUserInfo(e: Exception): WritableNativeMap { ... }

// Variante síncrona bloqueante: DEVE usar Dispatchers.IO
// EXCEPTION (Constituição Princípio VI): SDK é bloqueante por IPC — Dispatchers.IO é necessário
CoroutineScope(Dispatchers.IO).launch {
    val result = plugPag.blockingMethod(data)
    withContext(Dispatchers.Main) {
        if (result.result != PlugPag.RET_OK) {
            promise.reject("PLUGPAG_<DOMAIN>_ERROR", buildSdkErrorUserInfo(result))
        } else {
            promise.resolve(successMap)
        }
    }
}

// Variante assíncrona: listener nativo do SDK (SEM coroutines)
plugPag.doAsyncMethod(data, object : SdkListener {
    override fun onSuccess(result: SdkResult) { promise.resolve(...) }
    override fun onError(result: SdkResult) { promise.reject(...) }
})
```

### Códigos de Erro

| Código | Quando usar |
|---|---|
| `PLUGPAG_<DOMAIN>_ERROR` | SDK retornou `result != RET_OK` (ex: `PLUGPAG_INITIALIZATION_ERROR`, `PLUGPAG_PAYMENT_ERROR`) |
| `PLUGPAG_INTERNAL_ERROR` | Exception não-SDK capturada (result: -1, errorCode: "INTERNAL_ERROR") |

### Convenções de Nomenclatura

| Artefato | Convenção | Exemplo |
|---|---|---|
| Interface de dados | PascalCase + sufixo descritivo | `PaymentData`, `TransactionResult` |
| Const enum object | PascalCase | `PaymentType`, `InstallmentType` |
| Funções exportadas | camelCase | `doPayment`, `initializeAndActivatePinPad` |
| Hooks | `use` + PascalCase | `useTransactionPaymentEvent` |
| Arquivos de tipo | kebab-case | `payment.ts`, `nfc.ts` |
| Spec TurboModule | `Native<ModuleName>.ts` | `NativePagseguroPlugpag.ts` |
| Classes Kotlin | PascalCase | `PagseguroPlugpagModule` |
| Constantes Kotlin | UPPER_SNAKE_CASE | `MAX_RETRIES` |

---

## Validações Obrigatórias

### yarn lint (BLOQUEANTE)

```bash
yarn lint   # ESLint sobre **/*.{js,ts,tsx} — DEVE passar sem erros ou avisos
```

`yarn lint` DEVE ser executado e passar sem erros ou avisos após cada fase de
implementação. Nenhum PR pode ser aberto ou mergeado com falhas de lint.
Formalizado na Constituição v1.2.0 — PR Checklist e Absolute Prohibitions.

### Codegen Android (BLOQUEANTE)

Toda vez que `src/NativePagseguroPlugpag.ts` for alterada — seja por adição de novo
método, remoção ou mudança de assinatura — o codegen Android **DEVE ser regenerado**
antes de qualquer implementação Kotlin.

O arquivo gerado
`android/build/generated/source/codegen/java/com/pagseguroplugpag/NativePagseguroPlugpagSpec.java`
é a **classe abstrata Java que o módulo Kotlin estende**. Se estiver desatualizado, todos
os `override` do Kotlin falham com `'X' overrides nothing` e o build quebra.

**Comando para regenerar (executar a partir da raiz do projeto):**

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

**Quando executar obrigatoriamente:**

- Ao adicionar qualquer novo método em `NativePagseguroPlugpag.ts`
- Ao remover ou renomear qualquer método existente
- Ao alterar a assinatura (parâmetros ou tipo de retorno) de qualquer método
- Ao iniciar uma nova feature que envolva integração nativa
- Ao fazer checkout de uma branch com spec diferente da atual

**Sinal de alerta**: se o Android Studio mostrar `'X' overrides nothing` em
`PagseguroPlugpagModule.kt`, o codegen está desatualizado — regenerar antes de qualquer
outra ação.

### PR Checklist Completo

- [ ] Testes unitários para todo código novo — 100% de cobertura das adições.
- [ ] `yarn lint` passa com zero erros ou avisos.
- [ ] Zero `any` — verificar além do output do lint.
- [ ] Tipos adicionados/atualizados e re-exportados corretamente.
- [ ] Método exposto em `src/index.tsx` se faz parte da API pública.
- [ ] Spec TurboModule (`NativePagseguroPlugpag.ts`) atualizada se novo método nativo.
- [ ] **Codegen regenerado** (`generateCodegenArtifactsFromSchema`) se `NativePagseguroPlugpag.ts` foi alterado.
- [ ] Implementação Kotlin atualizada em `PagseguroPlugpagModule.kt`.
- [ ] Teste de integração Kotlin para qualquer novo método nativo.

### Proibições Absolutas

- Commitar código sem testes.
- Abrir ou mergear PR com falhas de `yarn lint`.
- Usar `any` sem exceção documentada.
- Expor internos do SDK diretamente — todos os tipos DEVEM ser mapeados para tipos da biblioteca.
- Chamar `PlugPag` fora de `PagseguroPlugpagModule.kt`.
- Adicionar lógica de negócio no módulo Kotlin além de serialização e chamadas SDK.
- Re-introduzir padrões de comunicação via Bridge.
- Alterar `NativePagseguroPlugpag.ts` sem regenerar o codegen — o Kotlin nunca compila com spec desatualizada.

---

## Status das Features

| Feature | Branch | Status |
|---|---|---|
| 001 — SDK Setup & Expo Plugin | `feature/001-pagseguro-sdk-setup` | ✅ Completo |
| 002 — PinPad Activation | `feature/002-pinpad-activation` | ✅ Completo |
| 003 — Payment Methods (Credit/Debit/PIX) | `develop` (PRD em elaboração) | 🚧 Em spec |

### Feature/002 — Estado Atual (API Pública)

```typescript
// Ativação do PinPad — variante síncrona (SDK bloqueante → Dispatchers.IO)
initializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>

// Ativação do PinPad — variante assíncrona (SDK listener nativo)
doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>

// Tipo de retorno
interface PlugPagActivationSuccess { result: 'ok' }
```

### Feature/003 — Próxima Feature (Planejada)

Métodos a implementar no TurboModule:
- `doPayment(data: Object): Promise<Object>` — variante síncrona (Dispatchers.IO)
- `doAsyncPayment(data: Object): Promise<Object>` — variante assíncrona (SDK listener)
- `addListener(eventName: string): void` — contrato NativeEventEmitter (placeholder)
- `removeListeners(count: number): void` — contrato NativeEventEmitter (placeholder)

Evento: `onPaymentProgress` (NativeEventEmitter → JS)

---

## Padrão de Testes JS

```typescript
// Estrutura de mock do módulo nativo (sempre mockado em unit tests)
const mockMethod = jest.fn();
jest.mock('../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: { methodName: mockMethod },
}));

// Cenários obrigatórios por função:
// 1. iOS → rejeita com Error prefixado
// 2. Android + sucesso → resolve com tipo correto
// 3. Android + erro SDK → rejeita com PLUGPAG_<DOMAIN>_ERROR
// 4. Android + exceção interna → rejeita com PLUGPAG_INTERNAL_ERROR
```

---

## Padrão de Testes Kotlin

```kotlin
// JUnit 5 + Mockk — mock do PlugPag, verificação de serialização e resolução de promise
@Test
fun `método resolve com sucesso quando SDK retorna RET_OK`() { ... }

@Test
fun `método rejeita com PLUGPAG_X_ERROR quando SDK retorna erro`() { ... }

@Test
fun `método rejeita com PLUGPAG_INTERNAL_ERROR quando SDK lança exceção`() { ... }
```

---

## Comandos de Desenvolvimento

```bash
yarn lint                    # ESLint — DEVE passar antes de qualquer PR
yarn typecheck               # TypeScript type-check completo
yarn test                    # Jest unit tests
yarn example android         # Rodar app de exemplo no Android
yarn example start           # Metro bundler
yarn prepare                 # Build da biblioteca (bob build + plugin)

# Codegen Android — OBRIGATÓRIO após qualquer alteração em NativePagseguroPlugpag.ts
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## Documentos Temporários na Raiz do Projeto

Arquivos como `PRD.md` e similares na raiz do projeto são documentos **temporários de
pesquisa e discussão**. NÃO devem ser incluídos em diagramas de estrutura de diretórios,
seções de arquivos afetados, ou qualquer representação arquitetural do projeto — a menos
que o usuário explicitamente solicite.

A documentação permanente das features fica em `specs/<NNN>-<nome-feature>/`.

---

## TODOs da Constituição (Pendentes)

- `TODO(RESULT_CODES)`: Mapear lista completa de result codes do SDK PagBank.
- `TODO(EVENT_SUBSCRIPTION)`: Modelo de subscription para `PlugPagEventListener` ainda
  não formalizado. Não bloqueia implementações atuais.
- `TODO(DEVICE_COMPAT)`: Princípio V (device compatibility) ainda não implementado.
  Será feature dedicada após feature/003.

## Active Technologies
- TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21 + React Native 0.83.2 (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.33.0`, kotlinx.coroutines (somente `doPayment` — bloqueante por IPC), NativeEventEmitter (RN built-in) (feature/003-payment-methods)

## Recent Changes
- feature/003-payment-methods: Added TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21 + React Native 0.83.2 (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.33.0`, kotlinx.coroutines (somente `doPayment` — bloqueante por IPC), NativeEventEmitter (RN built-in)
