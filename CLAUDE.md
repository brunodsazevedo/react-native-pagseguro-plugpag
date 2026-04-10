# react-native-pagseguro-plugpag

## Visão Geral do Projeto

Biblioteca React Native (TurboModule / New Architecture) que expõe o SDK
`PlugPagServiceWrapper` da PagSeguro para aplicativos React Native. Foco exclusivo em
Android — terminals PagBank SmartPOS (A920, A930, P2, S920). iOS é explicitamente fora
de escopo (guarda de dois níveis em `src/index.ts`).

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
├── NativePagseguroPlugpag.ts        ← Spec TurboModule
├── functions/
│   ├── activation/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── payment/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── refund/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── print/
│   │   ├── types.ts
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   └── usePaymentProgress.ts
├── types/
│   └── sharedTypes.ts               ← PlugPagTransactionResult (compartilhado por payment e refund)
└── index.ts                         ← barrel raiz (iOS guard Nível 1 + re-exports)

src/__tests__/
├── functions/
│   ├── activation.test.ts
│   ├── payment.test.ts
│   ├── refund.test.ts
│   └── print.test.ts
├── hooks/
│   └── usePaymentProgress.test.ts
└── index.test.ts                    ← apenas iOS guard Nível 1

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

## Constituição do Projeto (v1.3.0)

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
- 100% das funções exportadas de `src/index.ts` DEVEM ter cobertura de teste unitário.
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

#### iOS Runtime Guard (Dois Níveis — src/index.ts)

```typescript
// Nível 1 — top-level do módulo em src/index.ts (não lança, apenas avisa)
if (Platform.OS !== 'android') {
  console.warn('[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.');
}

// Nível 2 — dentro de cada função exportada em functions/<domain>/index.ts (lança erro capturável)
if (Platform.OS !== 'android') {
  throw new Error('[react-native-pagseguro-plugpag] ERROR: <methodName>() is not available on iOS. PagSeguro PlugPag SDK is Android-only.');
}
```

Placement após domain split:
- Nível 1 (`console.warn`) vive **exclusivamente** em `src/index.ts` (top-level do módulo).
- Nível 2 (`throw new Error`) DEVE estar presente em **cada função exportada** dentro de
  `functions/<domain>/index.ts`. NÃO pode ficar somente em `src/index.ts` porque as funções
  de domínio são re-exportadas diretamente (sem wrapper).
- `getNativeModule()` DEVE ser chamado somente após o Nível 2, nunca no top-level do módulo.

Regras:
- O import warning NÃO deve lançar — o app DEVE abrir normalmente no iOS.
- Toda função exportada DEVE incluir o guard Nível 2 **antes** de qualquer chamada nativa.
- `TurboModuleRegistry.getEnforcing` NUNCA deve ser chamado sem guard de plataforma precedente.
- Os prefixos exatos `[react-native-pagseguro-plugpag] WARNING:` e
  `[react-native-pagseguro-plugpag] ERROR:` DEVEM ser preservados (grep-ability).
- O acesso ao módulo nativo DEVE ser lazy via `getNativeModule()` — somente após o guard.

---

## Padrões de Código

### TypeScript — Arquivos de Domínio (`src/functions/<domain>/index.ts`)

```typescript
// import type no topo (Grupo 4) — zero efeito em runtime com verbatimModuleSyntax
import type { Spec } from '../../NativePagseguroPlugpag';

// Accessor lazy privado — NativePagseguroPlugpag.ts executa TurboModuleRegistry.getEnforcing()
// ao ser avaliado. Um import ES causaria crash no iOS antes de qualquer guard.
// EXCEPTION: require() é necessário aqui — única exceção ao padrão ES import no projeto.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

// Uso dentro de função exportada, sempre após o guard Nível 2:
export async function doPayment(data: PlugPagPaymentRequest): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doPayment() ...');
  }
  return getNativeModule().doPayment(data) as Promise<PlugPagTransactionResult>;
}
```

### TypeScript — Organização de Imports (ordem obrigatória)

```typescript
// Grupo 1 — bibliotecas externas (react, react-native, pacotes npm)
import { Platform } from 'react-native';

// Grupo 2 — arquivos internos do projeto (value imports)
import { validatePaymentRequest } from './validation';

// Grupo 3 — hooks internos (quando aplicável — omitir grupo se não houver)

// Grupo 4 — imports de tipagem (import type — sempre no último grupo)
import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagPaymentRequest } from './types';
```

Regras derivadas:
- `import type` SEMPRE no último grupo — nunca misturado com value imports.
- Dentro de cada grupo, ordenar alfabeticamente pelo caminho do módulo.
- Grupos vazios são omitidos (sem linhas em branco desnecessárias).
- Aplica-se a todos os arquivos em `functions/`, `hooks/`, `types/` e `src/index.ts`.

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
| Arquivos de tipo de domínio | `functions/<domain>/types.ts` | `functions/payment/types.ts` |
| Arquivos index de domínio | `functions/<domain>/index.ts` | `functions/payment/index.ts` |
| Arquivos de hook | `hooks/<hookName>.ts` | `hooks/usePaymentProgress.ts` |
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
Formalizado na Constituição v1.3.0 — PR Checklist e Absolute Prohibitions.

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
- [ ] Tipos posicionados corretamente: domínio específico em `src/functions/<domain>/types.ts`;
      tipos compartilhados entre ≥2 domínios em `src/types/`.
- [ ] Método exposto em `src/index.ts` se faz parte da API pública.
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
| 007 — TS Domain Split (Clean Code) | `feature/007-ts-domain-split` | ✅ Completo |
| 009 — Library Docs | `feature/009-library-docs` | ✅ Completo |
| 010 — CI/CD npm Deploy | `feature/010-cicd-npm-deploy` | ✅ Completo |

### Feature/002 — Estado Atual (API Pública)

```typescript
// Ativação do PinPad — variante síncrona (SDK bloqueante → Dispatchers.IO)
initializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>

// Ativação do PinPad — variante assíncrona (SDK listener nativo)
doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<PlugPagActivationSuccess>

// Tipo de retorno
interface PlugPagActivationSuccess { result: 'ok' }
```

### API Pública — Tipagens Exportadas por `src/index.ts`

Commit `8a533fd` adicionou `export type *` de todos os domínios. Abaixo o inventário
completo de tipos disponíveis para consumidores da biblioteca:

```typescript
// --- Compartilhado (src/types/sharedTypes.ts) ---
interface PlugPagTransactionResult {
  transactionCode: string | null;
  transactionId: string | null;
  date: string | null;
  time: string | null;
  hostNsu: string | null;
  cardBrand: string | null;
  bin: string | null;
  holder: string | null;
  userReference: string | null;
  terminalSerialNumber: string | null;
  amount: string | null;
  availableBalance: string | null;
  nsu?: string | null;
  cardApplication?: string | null;
  label?: string | null;
  holderName?: string | null;
  extendedHolderName?: string | null;
  autoCode?: string | null;
}

// --- Activation (src/functions/activation/types.ts) ---
interface PlugPagActivationSuccess { result: 'ok' }

// --- Payment (src/functions/payment/types.ts) ---
const PaymentType = { CREDIT, DEBIT, PIX } as const;
type PlugPagPaymentType = 'CREDIT' | 'DEBIT' | 'PIX';

const InstallmentType = { A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR } as const;
type PlugPagInstallmentType = 'A_VISTA' | 'PARC_VENDEDOR' | 'PARC_COMPRADOR';

interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
}

interface PlugPagPaymentProgressEvent {
  eventCode: number;
  customMessage: string | null;
}

// --- Print (src/functions/print/types.ts) ---
const PrintQuality = { LOW: 1, MEDIUM: 2, HIGH: 3, MAX: 4 } as const;
type PrintQualityValue = 1 | 2 | 3 | 4;

interface PrintRequest {
  filePath: string;
  printerQuality?: PrintQualityValue;
  steps?: number;
}

interface PrintResult { result: 'ok'; steps: number }

const MIN_PRINTER_STEPS = 70;   // constante de valor, não apenas tipo

// --- Refund (src/functions/refund/types.ts) ---
const PlugPagVoidType = { VOID_PAYMENT, VOID_QRCODE } as const;
type PlugPagVoidTypeValue = 'VOID_PAYMENT' | 'VOID_QRCODE';

interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;
  printReceipt?: boolean;
}
```

> **Nota**: `MIN_PRINTER_STEPS` é um valor (`const`), exportado junto com os tipos via
> `export type *` — disponível para validação no lado do consumidor.

---

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
// Path em src/__tests__/functions/<domain>.test.ts:
const mockMethod = jest.fn();
jest.mock('../../NativePagseguroPlugpag', () => ({
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

## CI/CD (feature/010)

### Arquivos

- **Workflow**: `.github/workflows/ci-cd.yml`
- **Composite action**: `.github/actions/setup/action.yml` — configura Node.js e cache do yarn; usado por todos os jobs

### Estrutura do Pipeline

```
ci ──────────────────┐
                     ├──▶ cd (apenas push para main)
build-android ───────┘
```

| Job | Triggers | O que faz |
|---|---|---|
| `ci` | push + PR → main | lint → typecheck → testes JS → `yarn prepare` |
| `build-android` | push + PR → main | expo prebuild + gradle build do example app |
| `cd` | push → main (após ci + build-android) | `yarn prepare` → verify artifacts → npm publish |

### Regras de publicação

- **Gate de CI obrigatório**: `cd` só roda se `ci` e `build-android` passarem com sucesso.
- **Idempotência**: versão já publicada no npm é silenciosamente ignorada (sem falha de pipeline).
- **Dist-tag automático**: versão com sufixo (ex: `1.0.0-rc.1`) → tag `rc`; versão estável → tag `latest`.
- **Provenance**: todo artefato publicado inclui attestation vinculando ao commit e pipeline.
- **Autenticação**: `NPM_TOKEN` lido via `secrets.NPM_TOKEN` — nunca exposto em logs.

### Duplo `setup-node` no job `cd`

O job `cd` chama `.github/actions/setup` (que restaura o cache do yarn) e logo depois chama
`actions/setup-node` novamente com `registry-url`. Isso é intencional: o segundo `setup-node`
sobrescreve o `.npmrc` com a configuração de autenticação necessária para `NODE_AUTH_TOKEN`
funcionar com `npm publish`. Sem ele, o token é ignorado.

### Scripts de release local

```bash
yarn release:rc                 # publica versão pré-release com dist-tag rc
yarn release:patch              # incrementa patch, publica com dist-tag latest
yarn release:minor              # incrementa minor, publica com dist-tag latest
yarn release:major              # incrementa major, publica com dist-tag latest
yarn release:promote            # promove versão RC existente para dist-tag latest (sem re-publicar)
```

Todos os scripts de release stable (`patch/minor/major`) executam `prepublishOnly` automaticamente
(lint + typecheck + testes + build) antes de publicar.

---

## Expo Config Plugin (app.plugin.js)

O arquivo `app.plugin.js` DEVE exportar a função plugin diretamente:

```js
module.exports = require('./plugin/build/index').default;
```

O `.default` é obrigatório porque o TypeScript compila `export default` para `exports.default`
no CJS. Sem ele, o Expo recebe um objeto `{ default: fn }` em vez da função — o runtime do
Expo consegue resolver, mas o validador do VS Code (Expo extension) emite `INVALID_PLUGIN_IMPORT`.

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
- Kotlin 2.0.21 (nativo) — sem alterações TypeScrip + PlugPagServiceWrapper `wrapper:1.33.0`, React Native 0.83.2 (New Architecture), Android Gradle Plugin 8.7.2 (bugfix/004-fix-android-studio-errors)
- TypeScript 5.9 (strict) + Kotlin 2.0.21 + PlugPagServiceWrapper `wrapper:1.33.0`, React Native 0.83.2 (New Architecture / TurboModules + JSI) (feature/005-refund-payment)
- TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21 + PlugPagServiceWrapper 1.33.0, React Native 0.83.2 (New Architecture / TurboModules + JSI) (feature/006-custom-printing)
- TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`) + React Native 0.83.2 (New Architecture / TurboModules), Jest 29 + react-native preset, @testing-library/react-native (feature/007-ts-domain-split)
- N/A — biblioteca sem estado persistente (feature/007-ts-domain-split)
- N/A — sem estado persistente (bugfix/008-fix-print-validation-tests)
- Markdown (documentation files only — no TypeScript or Kotlin changes) + None (shield.io for badges — external, no build dependency) (feature/009-library-docs)
- File system — 4 Markdown files at repo roo (feature/009-library-docs)
- YAML (GitHub Actions), JSON (package.json), Markdown (CHANGELOG.md) — nenhuma alteração em TypeScript ou Kotlin + GitHub Actions (CI/CD platform), npm registry, `actions/checkout@v5`, `actions/setup-node@v4`, `.github/actions/setup` (composite action existente) (feature/010-cicd-npm-deploy)

## Recent Changes
- feature/010-cicd-npm-deploy: Adicionado `.github/workflows/ci-cd.yml` com pipeline CI (lint + typecheck + testes JS + build) + build-android (example app) + CD (publish npm com dist-tag automático e idempotência). Corrigido `app.plugin.js` para exportar `.default` explicitamente, eliminando `INVALID_PLUGIN_IMPORT` no VS Code.
- feature/009-library-docs (commit `8a533fd`): `src/index.ts` agora re-exporta `export type *` de todos os domínios (`activation`, `payment`, `print`, `refund`) além do `PlugPagTransactionResult` compartilhado. Superfície completa de tipos disponível para consumidores da biblioteca.
- feature/003-payment-methods: Added TypeScript 5.9 (`strict: true`) + Kotlin 2.0.21 + React Native 0.83.2 (New Architecture / TurboModules + JSI), PlugPagServiceWrapper `wrapper:1.33.0`, kotlinx.coroutines (somente `doPayment` — bloqueante por IPC), NativeEventEmitter (RN built-in)
