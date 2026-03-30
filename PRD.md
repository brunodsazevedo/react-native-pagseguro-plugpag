# PRD — Refatoração JS/TS: Clean Code & Separação de Domínios

**Tipo**: Documento temporário de análise e discussão
**Data**: 2026-03-29
**Escopo**: `src/index.tsx`, `src/printing.ts`, `src/NativePagseguroPlugpag.ts`
**Objetivo**: Identificar oportunidades de clean code, separação de responsabilidades e alinhamento com a Constituição do projeto.

---

## 1. Diagnóstico: Estado Atual

### 1.1 Estrutura atual de `src/`

```
src/
├── NativePagseguroPlugpag.ts   ← contrato TurboModule
├── printing.ts                 ← tipos do domínio de impressão
├── index.tsx                   ← TUDO mais: tipos, validações, funções (375 linhas)
└── __tests__/
    └── index.test.tsx
```

### 1.2 O problema central: `index.tsx` é um monolito

`index.tsx` carrega **quatro domínios distintos** ao mesmo tempo:

| Domínio | O que está em `index.tsx` |
|---|---|
| **Activation** | `PlugPagActivationSuccess`, `initializeAndActivatePinPad`, `doAsyncInitializeAndActivatePinPad` |
| **Payment** | `PaymentType`, `InstallmentType`, `PlugPagPaymentRequest`, `PlugPagTransactionResult`, `PlugPagPaymentProgressEvent`, `validatePaymentRequest`, `doPayment`, `doAsyncPayment`, `usePaymentProgress`, `subscribeToPaymentProgress`, singleton `getEmitter` |
| **Refund** | `PlugPagVoidType`, `PlugPagVoidTypeValue`, `PlugPagRefundRequest`, `validateRefundRequest`, `doRefund` |
| **Print** | `validatePrintRequest`, `printFromFile`, `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt` |

Isso viola diretamente o **Princípio IV da Constituição**: _"Cada módulo TypeScript possui um único domínio"_.

---

## 2. Análise por Arquivo

### 2.1 `src/NativePagseguroPlugpag.ts`

**Estado**: ✅ Correto conforme as regras do projeto.

- O uso de `Object` nos parâmetros e retornos é **obrigatório** pelo codegen React Native — está documentado na Constituição.
- É a única fonte de verdade do contrato JS↔Native.
- Não deve ser alterado salvo quando um novo método nativo for adicionado.

**Sem problemas a corrigir.**

---

### 2.2 `src/printing.ts`

**Estado**: ✅ Bom exemplo do padrão correto. Serve de modelo para os outros domínios.

**Pontos positivos:**
- Único domínio (impressão).
- Tipos bem definidos: `PrintQuality` como `const` object, `PrintQualityValue` como type derivado.
- Constante `MIN_PRINTER_STEPS` bem posicionada.

**Problema 1 — Tipo fraco em `PrintRequest.printerQuality`:**

```typescript
// printing.ts — atual
export interface PrintRequest {
  filePath: string;
  printerQuality?: number;  // ⚠️ aceita qualquer número
  steps?: number;
}

// proposto
export interface PrintRequest {
  filePath: string;
  printerQuality?: PrintQualityValue;  // restringe a 1 | 2 | 3 | 4 em compile time
  steps?: number;
}
```

`printerQuality` aceita qualquer `number`, mas o tipo correto é `PrintQualityValue` (1 | 2 | 3 | 4). A validação em runtime existe em `index.tsx`, mas o contrato TypeScript não a expressa — permite `printerQuality: 99` sem erro de compilação. Com `PrintQualityValue`, a validação em runtime também pode ser removida.

**Problema 2 — Nomenclatura de arquivo:**

A Constituição lista os domínios como `payment`, `print`, `nfc`, `activation`, mas o arquivo se chama `printing.ts`. O padrão esperado seria `print.ts`.

> **Limitante da Constituição**: Renomear exige atualizar imports em `index.tsx`, testes e consumidores externos. É seguro tecnicamente, mas requer validação completa com `yarn lint && yarn typecheck && yarn test`.

---

### 2.3 `src/index.tsx`

**Estado**: ⚠️ Viola o Princípio IV. Cresce com cada feature nova.

#### Problema 1 — Extensão `.tsx` sem JSX

O arquivo usa `.tsx` sem conter JSX. A única razão é o hook `usePaymentProgress`, que usa `useRef` e `useEffect`. Se o hook for movido para `payment.ts`, `index` pode ser `.ts`. A extensão `.tsx` sinaliza incorretamente "este arquivo pode ter JSX" para linters e bundlers.

#### Problema 2 — Tipos de domínio definidos no ponto de entrada

Todos os tipos abaixo estão em `index.tsx`, mas pertencem aos seus domínios:

```typescript
// Deveria estar em activation.ts:
interface PlugPagActivationSuccess

// Deveria estar em payment.ts:
const PaymentType
const InstallmentType
interface PlugPagPaymentRequest
interface PlugPagTransactionResult
interface PlugPagPaymentProgressEvent

// Deveria estar em refund.ts:
const PlugPagVoidType
interface PlugPagRefundRequest
```

`printing.ts` já faz isso corretamente — os tipos de print vivem no domínio. Os outros domínios devem seguir o mesmo padrão.

#### Problema 3 — Funções de validação no arquivo errado

`validatePaymentRequest`, `validateRefundRequest` e `validatePrintRequest` estão em `index.tsx`. Pertencem aos seus módulos de domínio (junto com os tipos que validam). A consequência prática é que hoje só é possível testá-las indiretamente via `doPayment`, `doRefund`, `printFromFile`.

#### Problema 4 — Singleton `getEmitter` acoplado ao index

```typescript
// index.tsx
let _emitter: NativeEventEmitter | null = null;
function getEmitter(): NativeEventEmitter { ... }
```

Essa infraestrutura de eventos pertence ao domínio de pagamento — é usada exclusivamente por `usePaymentProgress` e `subscribeToPaymentProgress`. Acoplá-la ao `index` impede a extração natural do domínio payment.

#### Problema 5 — `usePaymentProgress` e `subscribeToPaymentProgress` no index

O hook e a função de subscription são API de pagamento. Por estarem em `index.tsx`, obrigam o import de `useRef` e `useEffect` no ponto de entrada da biblioteca — adicionando dependência React desnecessária ao módulo raiz.

#### Problema 6 — Comentários de seção como substituto de módulos

```typescript
// --- Activation (feature/002) ---
// --- Payment (feature/003) ---
// --- Printing (feature/006) ---
// --- Refund (feature/005) ---
// --- Event System (feature/003) ---
```

Esses comentários são um sinal claro de que `index.tsx` sabe que está misturando domínios e usa comentários para compensar. A solução correta é cada seção ser seu próprio arquivo.

---

## 3. Mapeamento Constituição × Problemas

| Princípio | Regra | Situação Atual |
|---|---|---|
| **IV** | "Cada módulo TypeScript possui um único domínio" | ❌ `index.tsx` tem 4 domínios |
| **II** | Zero `any` sem documentação | ✅ As duas exceções estão documentadas |
| **II** | `const` objects, não `enum` nativo | ✅ `PaymentType`, `InstallmentType`, `PlugPagVoidType`, `PrintQuality` |
| **II** | Interfaces para modelos de dados | ✅ Todos os modelos usam `interface` |
| **IV** | Import do módulo nativo via interface Spec | ✅ Sempre lazy via `require('./NativePagseguroPlugpag')` |
| **VI** | Guard iOS de dois níveis | ✅ `console.warn` no topo + `throw` em cada função |

---

## 4. Referências Externas — Padrão Domain-Folder + Barrel

A proposta de separação em pastas por domínio com `index.ts` + `types.ts` é o padrão amplamente adotado no ecossistema TypeScript/React Native para bibliotecas. Abaixo, os exemplos mais próximos do contexto deste projeto:

### stripe/stripe-react-native

O caso mais próximo: biblioteca de pagamento React Native. Estrutura usada:

```
src/
├── hooks/
├── components/
├── functions/
├── types/
│   ├── index.ts           ← re-exporta todos os tipos
│   ├── PaymentSheet.ts    ← tipos por domínio
│   └── ConfirmationToken.ts
├── connect/
│   ├── connectTypes.ts
│   └── Components.ts
└── index.tsx              ← re-exporta hooks, functions, types
```

O barrel raiz re-exporta todos os domínios. O `src/types/index.ts` é o barrel de tipos.
Referência: [github.com/stripe/stripe-react-native](https://github.com/stripe/stripe-react-native)

### mrousavy/react-native-vision-camera

Estrutura com subpastas por domínio, cada uma auto-contida:

```
src/
├── devices/        ← funções + types de device
├── hooks/
├── frame-processors/
├── skia/
└── index.ts        ← export * from './devices', etc.
```

Referência: [github.com/mrousavy/react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)

### callstack/react-native-paper

```
src/
├── components/
│   ├── Button/        ← Button/index.tsx (self-contained por domínio)
│   ├── Card/
│   └── ...
└── index.tsx          ← re-exporta todos os componentes
```

Cada domínio/componente tem seu próprio `index.tsx`. O barrel raiz importa diretamente.
Referência: [github.com/callstack/react-native-paper](https://github.com/callstack/react-native-paper)

### Consenso da comunidade

A distinção crítica que a comunidade faz é: barrel files em **aplicações** são problemáticos (impacto em build time, tree-shaking); em **bibliotecas** são legítimos e recomendados — são a forma padrão de definir a API pública.

> _"Libraries like @tanstack/react-query require a single entry point in package.json to define their public interface. This is the **only** place where a barrel makes sense."_
> — [tkdodo.eu: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files)

O TypeScript Deep Dive ([basarat.gitbook.io/typescript/main-1/barrel](https://basarat.gitbook.io/typescript/main-1/barrel)) define formalmente o padrão `index.ts` por pasta re-exportando o que a pasta expõe — exatamente o que está sendo proposto.

---

## 5. Proposta de Refatoração — Domain-first com Hooks e Types Compartilhados Separados

O domínio continua sendo a unidade principal de organização. A diferença em relação à proposta inicial é:

- **Hooks** saem dos domínios e ganham pasta própria — por dependerem de React e das Rules of Hooks.
- **`types/`** existe exclusivamente para tipos **compartilhados entre domínios**. Tipos específicos de um domínio ficam dentro da pasta do domínio.

### 5.1 Estrutura de diretórios proposta

```
src/
├── NativePagseguroPlugpag.ts        ← sem alterações
│
├── functions/
│   ├── activation/
│   │   ├── types.ts                 ← PlugPagActivationSuccess
│   │   └── index.ts                 ← initializeAndActivatePinPad, doAsyncInitializeAndActivatePinPad
│   ├── payment/
│   │   ├── types.ts                 ← PaymentType, InstallmentType, PlugPagPaymentRequest, PlugPagTransactionResult, PlugPagPaymentProgressEvent
│   │   └── index.ts                 ← doPayment, doAsyncPayment, subscribeToPaymentProgress (+ emitter e validação privados)
│   ├── refund/
│   │   ├── types.ts                 ← PlugPagVoidType, PlugPagVoidTypeValue, PlugPagRefundRequest
│   │   └── index.ts                 ← doRefund (+ validação privada)
│   ├── print/                       ← substitui printing.ts
│   │   ├── types.ts                 ← PrintQuality, PrintQualityValue, PrintRequest, PrintResult, MIN_PRINTER_STEPS
│   │   └── index.ts                 ← printFromFile, reprintCustomerReceipt, doAsyncReprintCustomerReceipt, etc. (+ validação privada)
│   └── index.ts                     ← barrel: agrega todos os domínios para src/index.tsx
│
├── hooks/
│   └── usePaymentProgress.ts        ← sem barrel; src/index.tsx importa diretamente
│
├── types/                           ← APENAS tipos compartilhados entre ≥2 domínios
│   └── (arquivos adicionados conforme necessário; src/index.tsx importa diretamente)
│
├── index.tsx                        ← barrel raiz: iOS warn + re-exports de todos
│
└── __tests__/
    ├── functions/
    │   ├── activation.test.ts
    │   ├── payment.test.ts
    │   ├── refund.test.ts
    │   └── print.test.ts
    ├── hooks/
    │   └── usePaymentProgress.test.ts
    └── index.test.ts                ← apenas iOS warn Nível 1
```

### 5.2 Critério de decisão: onde vai o tipo?

```
O tipo é usado por mais de um domínio?
├── SIM → src/types/          (compartilhado)
└── NÃO → <domain>/types.ts   (específico do domínio)
```

**Estado atual**: nenhum tipo é compartilhado entre domínios. A pasta `types/` nasce vazia e cresce conforme necessário — por exemplo, se um tipo de resposta base de SDK for reutilizado por `payment` e `refund`.

### 5.3 Responsabilidades por arquivo

#### Domínios — padrão `functions/<domain>/types.ts`

Contém **apenas** definições de tipo do domínio: interfaces, const objects, type aliases. Sem lógica, sem imports de React ou SDK.

**`functions/payment/types.ts`**
```typescript
export const PaymentType = { ... } as const;
export type PlugPagPaymentType = typeof PaymentType[keyof typeof PaymentType];
export const InstallmentType = { ... } as const;
export type PlugPagInstallmentType = typeof InstallmentType[keyof typeof InstallmentType];
export interface PlugPagPaymentRequest { ... }
export interface PlugPagTransactionResult { ... }
export interface PlugPagPaymentProgressEvent { ... }
```

**`functions/print/types.ts`** (conteúdo de `printing.ts` movido aqui + correção de tipo)
```typescript
export const PrintQuality = { ... } as const;
export type PrintQualityValue = typeof PrintQuality[keyof typeof PrintQuality];
export interface PrintRequest {
  filePath: string;
  printerQuality?: PrintQualityValue;  // corrigido de `number` — ver seção 5.5
  steps?: number;
}
export interface PrintResult { result: 'ok' }
export const MIN_PRINTER_STEPS = 1;
```

---

#### Domínios — padrão `functions/<domain>/index.ts`

Funções exportadas da API pública + validações e infraestrutura privadas. Importa tipos sempre de `./types` (nunca via barrel de outro domínio).

**`functions/payment/index.ts`**
```typescript
import type { PlugPagPaymentRequest, PlugPagTransactionResult } from './types';

// Privado — não exportado
let _emitter: NativeEventEmitter | null = null;
function getEmitter(): NativeEventEmitter { ... }
function validatePaymentRequest(data: PlugPagPaymentRequest): void { ... }

// Exportados
export type { PaymentType, InstallmentType, PlugPagPaymentRequest, PlugPagTransactionResult, PlugPagPaymentProgressEvent } from './types';
export function doPayment(...): Promise<PlugPagTransactionResult> { ... }
export function doAsyncPayment(...): Promise<PlugPagTransactionResult> { ... }
export function subscribeToPaymentProgress(...): () => void { ... }
```

**`functions/index.ts`** (barrel interno da pasta)
```typescript
export * from './activation';
export * from './payment';
export * from './refund';
export * from './print';
```

---

#### `src/hooks/`

Hooks React separados de `functions/` porque dependem de React (`useRef`, `useEffect`) e das Rules of Hooks. Sem barrel interno — `src/index.tsx` importa cada hook diretamente.

**`hooks/usePaymentProgress.ts`**
```typescript
import { useRef, useEffect } from 'react';
import { subscribeToPaymentProgress } from '../functions/payment/index';
import type { PlugPagPaymentProgressEvent } from '../functions/payment/types';

export function usePaymentProgress(
  onProgress: (event: PlugPagPaymentProgressEvent) => void
): void { ... }
```

---

#### `src/index.tsx` (barrel raiz)

```typescript
import { Platform } from 'react-native';

// Nível 1 — iOS guard (não lança, apenas avisa)
if (Platform.OS !== 'android') {
  console.warn('[react-native-pagseguro-plugpag] WARNING: ...');
}

// functions — via barrel interno (agrega todos os domínios)
export * from './functions';

// hooks — import direto por arquivo (sem barrel interno)
export * from './hooks/usePaymentProgress';

// types — import direto por arquivo quando tipos compartilhados surgirem
// export * from './types/sharedExample';
```

---

### 5.4 Regra de imports entre módulos

| Origem | Pode importar de | Proibido |
|---|---|---|
| `functions/<domain>/types.ts` | nada interno | qualquer outro domínio |
| `functions/<domain>/index.ts` | `./types` diretamente | outro domínio, `hooks/`, barrel raiz |
| `functions/index.ts` | `./<domain>` de cada domínio | `hooks/`, `types/` |
| `hooks/<hook>.ts` | `../functions/<domain>/index` ou `../functions/<domain>/types` diretamente | `../functions/index` (circular via barrel), barrel raiz `'../index'` |
| `index.tsx` | `'./functions'` (barrel), `'./hooks/<hook>'` (direto), `'./types/<file>'` (direto) | — |

Imports entre domínios distintos dentro de `functions/` são proibidos — cada domínio acessa o SDK diretamente via `NativePagseguroPlugpag`. A única dependência cruzada permitida é `hooks/ → functions/<domain>/`.

### 5.5 Correção de tipo em `PrintRequest`

```typescript
// Antes (printing.ts)
export interface PrintRequest {
  printerQuality?: number;  // aceita qualquer número em runtime
}

// Depois (print/types.ts)
export interface PrintRequest {
  printerQuality?: PrintQualityValue;  // restringe a 1 | 2 | 3 | 4 em compile time
}
```

Com `PrintQualityValue`, o check em runtime `printerQuality < 1 || printerQuality > 4` em `validatePrintRequest` pode ser removido.

> **Nota sobre breaking change**: Tipagem mais estrita quebraria consumidores que passam `printerQuality` como número arbitrário em compile time (não em runtime). Por ser biblioteca pré-1.0, é aceitável.

---

## 6. Análise de Consistência — PRD × Constituição (CLAUDE.md + constitution.md)

Esta seção documenta cada ponto de conflito ou lacuna encontrado na leitura cruzada dos três documentos: este PRD, `CLAUDE.md` e `.specify/memory/constitution.md`.

---

### 6.1 Conflitos que exigem atualização da Constituição

#### C1 — PR Checklist: `src/types/` como destino obrigatório de tipos

**constitution.md — PR Checklist:**
> "Types added/updated in `src/types/` and re-exported from `src/types/index.ts`."

**constitution.md — Before Implementing Any Feature, step 3:**
> "Confirm the return type is defined in `src/types/`; add it if missing."

**Conflito com o PRD**: A proposta coloca tipos de domínio em `functions/<domain>/types.ts` — não em `src/types/`. A `src/types/` na nova estrutura é reservada para tipos compartilhados entre domínios, que atualmente não existem.

**Resolução necessária**: Atualizar o PR Checklist e o workflow "Before Implementing" da constituição para refletir a nova regra:
- Tipos de domínio → `src/functions/<domain>/types.ts`
- Tipos compartilhados (≥2 domínios) → `src/types/`

---

#### C2 — `src/index.ts` vs `src/index.tsx` — inconsistência pré-existente entre documentos

**constitution.md — Princípio III:**
> "100% of functions exported from `src/index.ts` MUST have unit test coverage."

**constitution.md — PR Checklist:**
> "Method exposed in `src/index.ts` if part of the public API."

**CLAUDE.md** usa `src/index.tsx` em todo o documento.

**Conflito**: Os dois documentos já estavam em desacordo sobre a extensão antes desta refatoração. A proposta do PRD mantém `index.tsx` na árvore mas em seção 2.3 sugere conversão para `.ts`.

**Resolução necessária**: Decidir e unificar. A constituição já usa `.ts` — o que sugere que `.ts` era a intenção original. Com o hook `usePaymentProgress` movido para `hooks/`, não há mais JSX ou imports React diretos no barrel raiz.

**Decisão proposta**: `src/index.tsx` → `src/index.ts`. Atualizar CLAUDE.md para alinhar com constitution.md.

---

#### C3 — "Hooks são separados dos módulos" — Princípio IV já valida a proposta, mas sem estrutura de pasta definida

**constitution.md — Princípio IV:**
> "**I** (Interface Segregation): TurboModule spec is separate from domain types; **hooks are separate from modules**."

**CLAUDE.md — Princípio IV:**
> "Cada módulo TypeScript possui um único domínio (`payment`, `print`, `nfc`, `activation`)."

A Constituição valida que hooks devem ser separados dos módulos de domínio, mas não especifica onde ficam. A CLAUDE.md lista domínios sem mencionar a estrutura de pastas `functions/`.

**Resolução necessária**: Adicionar à constituição a estrutura de pastas acordada (`functions/`, `hooks/`, `types/`) como extensão formal do Princípio IV, incluindo as regras de import entre camadas.

---

### 6.2 Lacunas críticas do PRD — não documentadas, bloqueiam implementação

#### L1 — iOS Guard Nível 2: onde vai depois da refatoração? (CRÍTICO)

**constitution.md e CLAUDE.md — Princípio VI:**
> "Every exported method MUST include the Level 2 guard **before** any native call."
> "O import do módulo nativo DEVE ser lazy (via `require(...)`) — somente após o guard."

**Situação atual**: o guard Nível 2 está em cada função dentro de `src/index.tsx`. Ao mover as funções para `functions/<domain>/index.ts`, o guard deve ir junto — não pode ficar em `src/index.tsx`, pois as funções são re-exportadas diretamente (sem wrapper).

**O PRD não documenta isso.** Esta é a lacuna mais crítica: sem o guard Nível 2 em cada função dentro dos arquivos de domínio, a Constituição seria violada.

**Resolução**: Documentar explicitamente que cada função em `functions/<domain>/index.ts` DEVE manter o guard Nível 2 idêntico ao atual. O Nível 1 (`console.warn`) permanece exclusivamente em `src/index.tsx` (ou `index.ts`).

```
src/index.ts          → Nível 1 apenas (console.warn no topo)
functions/<domain>/   → Nível 2 em cada função exportada (throw new Error)
```

---

#### L2 — Path do import lazy de `NativePagseguroPlugpag` muda (CRÍTICO)

**CLAUDE.md — Padrões de Código:**
```typescript
const PagseguroPlugpag = (
  require('./NativePagseguroPlugpag') as { default: Spec }
).default;
```

**Após a refatoração**, de dentro de `functions/payment/index.ts`, o caminho relativo passa a ser:
```typescript
const PagseguroPlugpag = (
  require('../../NativePagseguroPlugpag') as { default: Spec }
).default;
```

O PRD não documenta essa mudança de caminho. Se implementado com o caminho errado, o require falha silenciosamente em runtime.

**Resolução**: Documentar que o padrão de import lazy muda de `'./NativePagseguroPlugpag'` para `'../../NativePagseguroPlugpag'` em todos os arquivos de domínio dentro de `functions/`.

---

#### L3 — Paths de mock nos testes mudam (IMPORTANTE)

**constitution.md — Padrão de Testes JS:**
```typescript
jest.mock('../NativePagseguroPlugpag', () => ({ ... }));
```

Testes em `__tests__/functions/payment.test.ts` precisarão:
```typescript
jest.mock('../../NativePagseguroPlugpag', () => ({ ... }));
```

O PRD não menciona essa mudança de caminho relativo nos mocks.

---

#### L4 — Erro de sintaxe TypeScript no exemplo de código do PRD (IMPORTANTE)

**PRD seção 5.3:**
```typescript
export type { PaymentType, InstallmentType, PlugPagPaymentRequest, ... } from './types';
```

`PaymentType` e `InstallmentType` são `const` objects — **valores**, não tipos. `export type` para valores é inválido em TypeScript com `verbatimModuleSyntax: true` (que a Constituição exige). O correto é:

```typescript
// valores (const objects)
export { PaymentType, InstallmentType } from './types';
// tipos puros
export type { PlugPagPaymentType, PlugPagInstallmentType, PlugPagPaymentRequest, PlugPagTransactionResult, PlugPagPaymentProgressEvent } from './types';
```

---

### 6.3 Inconsistências internas do PRD

| # | Localização | Inconsistência |
|---|---|---|
| I1 | Seções 2.3 vs 5.1 vs nota em 5.3 | Três posições diferentes sobre `index.tsx` vs `index.ts` — sem decisão clara |
| I2 | Seção 6.3, passo 4 | Menciona `src/index.ts` mas o resto do PRD usa `index.tsx` |
| I3 | Seção 2.2, "Problema 2" | Menciona renomear `printing.ts` para `print.ts` — a proposta final cria `functions/print/`, tornando essa seção desatualizada |

---

### 6.4 O que está alinhado entre PRD e Constituição

| Item | Referência Constituição | Status no PRD |
|---|---|---|
| Princípio IV — único domínio por módulo | constitution.md §IV | ✅ Cumprido pela estrutura `functions/<domain>/` |
| Hooks separados dos módulos | constitution.md §IV (Interface Segregation) | ✅ `hooks/` separado de `functions/` |
| Zero `any` sem documentação | constitution.md §II | ✅ PRD preserva exceções documentadas |
| `const` objects, não `enum` | constitution.md §II | ✅ Mantidos em `functions/<domain>/types.ts` |
| Interfaces para modelos de dados | constitution.md §II | ✅ Mantidos |
| Import nativo sempre via Spec | constitution.md §IV | ✅ Lazy require em cada domínio (caminho a corrigir — ver L2) |
| Contratos públicos não quebram | constitution.md §IV | ✅ `src/index.ts` re-exporta tudo |
| TDD obrigatório | constitution.md §III | ✅ Documentado na seção 6.3 |

---

### 6.5 O que precisa ser atualizado na Constituição após esta refatoração

| Documento | Seção | Mudança necessária |
|---|---|---|
| `constitution.md` | PR Checklist | Substituir "Types in `src/types/`" por regra com critério de decisão (domínio vs. compartilhado) |
| `constitution.md` | Before Implementing, step 3 | Atualizar destino de tipos para `functions/<domain>/types.ts` |
| `constitution.md` | Princípio IV | Adicionar estrutura de pastas `functions/`, `hooks/`, `types/` e regras de import entre camadas |
| `constitution.md` | Princípio VI — iOS Guard | Explicitar que Nível 1 fica em `src/index.ts` e Nível 2 fica em cada `functions/<domain>/index.ts` |
| `CLAUDE.md` | Estrutura de Arquivos Críticos | Atualizar para a nova hierarquia de pastas |
| `CLAUDE.md` | Padrões de Código (TypeScript) | Atualizar path do require de `'./NativePagseguroPlugpag'` para `'../../NativePagseguroPlugpag'` |
| `CLAUDE.md` | Referências a `src/index.tsx` | Unificar para `src/index.ts` (alinhando com constitution.md) |

---

## 7. Restrições e Sequência de Execução

### 7.1 Regras que devem ser respeitadas durante a implementação

- ❌ Funções exportadas em `functions/<domain>/index.ts` DEVEM ter o guard Nível 2 — sem exceção.
- ❌ Import do módulo nativo DEVE ser lazy e DEVE vir após o guard — path `'../../NativePagseguroPlugpag'`.
- ❌ `export type` não pode ser usado para `const` objects (`PaymentType`, `InstallmentType`, `PlugPagVoidType`, `PrintQuality`).
- ❌ `src/index.ts` DEVE conter apenas o Nível 1 e re-exports — zero lógica.
- ⚠️ Testes DEVEM ser escritos antes do código (TDD — Princípio III).
- ⚠️ `yarn lint && yarn typecheck && yarn test` ao final de cada domínio.

### 7.2 Sequência por domínio (TDD)

1. Criar `functions/<domain>/types.ts` e `functions/<domain>/index.ts` vazios.
2. Criar `__tests__/functions/<domain>.test.ts` importando do novo caminho (falha — red).
3. Mover tipos para `types.ts` e funções para `index.ts`, com guard Nível 2 e lazy require corretos (green).
4. Adicionar `export * from './functions/<domain>'` em `functions/index.ts`.
5. Confirmar que `__tests__/index.test.ts` continua passando.
6. `yarn lint && yarn typecheck && yarn test`.

---

## 8. Impacto na API Pública

Transparente para consumidores. Nenhum import externo precisa mudar:

```typescript
// Antes e depois: idêntico para o consumidor
import {
  doPayment,
  PaymentType,
  PrintQuality,
  doRefund,
  usePaymentProgress,
} from 'react-native-pagseguro-plugpag';
```

O único breaking change intencional é a tipagem mais estrita de `PrintRequest.printerQuality`.

---

## 9. Resumo de Ações

| # | Ação | Arquivos | Benefício |
|---|---|---|---|
| A1 | Criar `functions/activation/` com `types.ts` e `index.ts` | `functions/activation/` (novo) | Domínio isolado |
| A2 | Criar `functions/payment/` com `types.ts` e `index.ts` | `functions/payment/` (novo) | Domínio isolado; emitter e validação privados |
| A3 | Criar `functions/refund/` com `types.ts` e `index.ts` | `functions/refund/` (novo) | Domínio isolado |
| A4 | Criar `functions/print/` substituindo `printing.ts` | `functions/print/` (novo); remove `printing.ts` | Convenção de nomenclatura + domínio completo |
| A5 | Criar `functions/index.ts` como barrel da pasta | `functions/index.ts` | Ponto único de re-export das funções |
| A6 | Mover `validatePrintRequest` e demais validações para seus domínios (privadas) | `functions/print/index.ts`, `functions/payment/index.ts`, `functions/refund/index.ts` | Validações no lugar certo, não exportadas |
| A7 | Mover emitter singleton para `functions/payment/index.ts` (privado) | `functions/payment/index.ts` | Infraestrutura de evento no seu domínio |
| A8 | Corrigir `printerQuality?: number` → `printerQuality?: PrintQualityValue` | `functions/print/types.ts` | Type safety em compile time |
| A9 | Criar `hooks/usePaymentProgress.ts` sem barrel interno | `hooks/usePaymentProgress.ts` (novo) | Hooks separados; React isolado em `hooks/` |
| A10 | Criar pasta `types/` vazia (placeholder para tipos compartilhados futuros) | `types/` | Estrutura pronta para crescer sem barrel desnecessário |
| A11 | Atualizar `index.tsx` como barrel raiz | `index.tsx` | `export * from './functions'` + import direto de hooks e types |
| A12 | Criar testes em `__tests__/functions/` e `__tests__/hooks/` | arquivos `.test.ts` novos | Espelha a estrutura de pastas |
| A13 | Validação final | — | `yarn lint && yarn typecheck && yarn test` |
| **Constituição** | | | |
| C1 | Atualizar PR Checklist — regra de destino de tipos | `constitution.md`, `CLAUDE.md` | Alinha com nova estrutura `functions/<domain>/types.ts` |
| C2 | Atualizar "Before Implementing" step 3 | `constitution.md` | Substitui referência a `src/types/` |
| C3 | Adicionar estrutura de pastas ao Princípio IV | `constitution.md`, `CLAUDE.md` | Formaliza `functions/`, `hooks/`, `types/` e regras de import |
| C4 | Explicitar destino dos guards Nível 1 e Nível 2 no Princípio VI | `constitution.md`, `CLAUDE.md` | Nível 1 em `index.ts`; Nível 2 em cada `functions/<domain>/index.ts` |
| C5 | Atualizar path do require em Padrões de Código | `CLAUDE.md` | `'./NativePagseguroPlugpag'` → `'../../NativePagseguroPlugpag'` |
| C6 | Unificar `index.tsx` → `index.ts` | `CLAUDE.md` | Alinha com constitution.md que já usa `.ts` |

---

_Documento temporário de análise. Não representa código implementado._
