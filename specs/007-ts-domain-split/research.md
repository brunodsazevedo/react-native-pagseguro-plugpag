# Research: Refatoração JS/TS — Clean Code & Separação de Domínios

**Feature**: `007-ts-domain-split` | **Date**: 2026-03-29

---

## R1 — Padrão `getNativeModule()` em arquivos de domínio

**Decisão**: Cada `functions/<domain>/index.ts` declara uma função `getNativeModule()` privada que encapsula o `require` lazy do módulo nativo.

**Rationale**: `NativePagseguroPlugpag.ts` executa `TurboModuleRegistry.getEnforcing(...)` **no momento em que o módulo é avaliado** (linha 18). Um `import` ES no topo de qualquer arquivo de domínio provocaria esse `getEnforcing` antes de qualquer guard de plataforma, causando crash nativo não capturável no iOS. O padrão `getNativeModule()` garante que o `require` só ocorre após o guard Nível 2 ter sido executado.

**Alternativas consideradas**:
- `require` inline em cada função: funciona, mas repete a mesma expressão de cast em cada função. `getNativeModule()` resolve isso sem adicionar overhead (funções inline são otimizadas pelo bundler).
- `import` ES com `// @ts-ignore`: proibido pela Constituição (Princípio II).

**Padrão exato** (retirado da Constituição v1.3.0):

```typescript
// Group 4 — type-only import (zero runtime effect with verbatimModuleSyntax)
import type { Spec } from '../../NativePagseguroPlugpag';

// EXCEPTION: require() is necessary here — NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
// NEVER call getNativeModule() before the Level 2 platform guard.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}
```

---

## R2 — Exportação de `const` objects com `verbatimModuleSyntax: true`

**Decisão**: `const` objects (`PaymentType`, `InstallmentType`, `PlugPagVoidType`, `PrintQuality`) DEVEM ser exportados com `export { ... }` (valor), nunca com `export type { ... }` (tipo).

**Rationale**: Com `verbatimModuleSyntax: true` (habilitado na Constituição), `export type` instrui o compilador a remover o export em runtime. `const` objects são **valores**, não tipos — remover o export em runtime os tornaria inacessíveis para código como `PaymentType.CREDIT`. O compilador TypeScript emite erro `Re-exporting a type when the '--verbatimModuleSyntax' flag is provided requires using 'export type'` ao contrário — se um `const` for erroneamente exportado como `type`.

**Padrão correto** para `functions/payment/index.ts`:

```typescript
// Valores (const objects) — export normal
export { PaymentType, InstallmentType } from './types';

// Tipos puros — export type
export type {
  PlugPagPaymentType,
  PlugPagInstallmentType,
  PlugPagPaymentRequest,
  PlugPagTransactionResult,
  PlugPagPaymentProgressEvent,
} from './types';
```

**Alternativas consideradas**: Nenhuma — a regra é derivada diretamente da semântica de `verbatimModuleSyntax` do TypeScript.

---

## R3 — Path relativo do `require` em arquivos de domínio

**Decisão**: De dentro de `functions/<domain>/index.ts`, o path para `NativePagseguroPlugpag` é `'../../NativePagseguroPlugpag'`.

**Rationale**: O arquivo `NativePagseguroPlugpag.ts` fica em `src/`. Os arquivos de domínio ficam em `src/functions/<domain>/`. A profundidade de dois níveis (`../..`) sobe de `<domain>/` para `functions/` e depois para `src/`.

**Mapeamento de paths**:

| Arquivo | Path para NativePagseguroPlugpag |
|---|---|
| `src/index.ts` (anterior) | `'./NativePagseguroPlugpag'` |
| `src/functions/<domain>/index.ts` | `'../../NativePagseguroPlugpag'` |
| `src/__tests__/index.test.ts` | `'../NativePagseguroPlugpag'` |
| `src/__tests__/functions/<domain>.test.ts` | `'../../NativePagseguroPlugpag'` |

**Alternativas consideradas**: Path absoluto via `tsconfig.json` `paths` alias — rejeitado por adicionar complexidade de configuração desnecessária para um projeto com estrutura estável de dois níveis.

---

## R4 — Remoção do check de runtime para `printerQuality`

**Decisão**: Após a correção de `PrintRequest.printerQuality?: number` para `PrintRequest.printerQuality?: PrintQualityValue`, o check de runtime `printerQuality < 1 || printerQuality > 4` em `validatePrintRequest` DEVE ser removido.

**Rationale**: `PrintQualityValue` é o tipo `1 | 2 | 3 | 4` (union literal derivado de `PrintQuality` as const). Passar um valor fora desse conjunto resulta em erro de compilação. O check de runtime era necessário apenas porque o tipo era `number` — com o tipo mais estrito, qualquer valor inválido é detectado em compile time, tornando o check em runtime código morto que o TypeScript não consegue alcançar.

**Breaking change**: Consumidores que passavam `printerQuality` como `number` arbitrário vão receber erro de compilação após a atualização. Por ser uma biblioteca pré-1.0, esse breaking change é aceito.

**Validações mantidas em `validatePrintRequest`**:
- `filePath.trim() === ''` → erro (string vazia não é detectável em compile time)
- `steps !== undefined && steps < 0` → erro (intervalo de número não é detectável em compile time)

---

## R5 — `PlugPagTransactionResult` é compartilhado entre `payment` e `refund`

**Decisão**: `PlugPagTransactionResult` vai para `src/types/sharedTypes.ts` (tipos compartilhados), pois é retornado tanto por `doPayment` quanto por `doRefund`.

**Rationale**: A Constituição v1.3.0 (Princípio IV — Type Placement Rule) é explícita:
> _"Is the type used by more than one domain? YES → src/types/ (shared)"_

`PlugPagTransactionResult` é retornado por:
- `doPayment()` / `doAsyncPayment()` → domínio `payment`
- `doRefund()` → domínio `refund`

Colocar em `functions/payment/types.ts` e importar de `refund` violaria a regra de import da Constituição (cross-domain imports proibidos). Colocar em `functions/refund/types.ts` e importar de `payment` violaria igualmente.

**Consequência**: A pasta `src/types/` **não nasce vazia** — recebe `sharedTypes.ts` desde o início.

**Arquivo `src/types/sharedTypes.ts`**:

```typescript
export interface PlugPagTransactionResult {
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
```

**Import em domínios**:
```typescript
// functions/payment/index.ts e functions/refund/index.ts
import type { PlugPagTransactionResult } from '../../types/sharedTypes';
```

**Import em `src/index.ts`**:
```typescript
export type { PlugPagTransactionResult } from './types/sharedTypes';
```

**Alternativas consideradas**:
- Duplicar o tipo em ambos os domínios: rejeitado — dois tipos com o mesmo nome e estrutura divergiriam com o tempo.
- Criar `PlugPagPaymentTransactionResult` (cópia em payment) e `PlugPagRefundTransactionResult` (cópia em refund): rejeitado — cria confusão de nomenclatura sem benefício.

---

## R6 — Ordem de migração dos testes existentes

**Decisão**: O arquivo `src/__tests__/index.test.tsx` contém testes de todos os domínios. Durante a migração, cada domínio recebe seus próprios testes em `__tests__/functions/<domain>.test.ts`. O arquivo original `index.test.tsx` é mantido até a Etapa 6, quando é substituído por `index.test.ts` (apenas iOS guard Nível 1).

**Rationale**: Manter o arquivo original durante as etapas intermediárias evita quebras de teste enquanto a migração está em progresso. Em cada etapa, os novos testes de domínio são adicionados ao lado dos testes existentes — não em substituição. O arquivo original só é removido quando todos os domínios foram migrados e seus testes estão passando.

**Alternativas consideradas**: Deletar `index.test.tsx` desde o início e migrar todos os testes de uma vez — rejeitado por eliminar a rede de segurança durante a migração incremental.

---

## R7 — Extensão `index.tsx` → `index.ts`

**Decisão**: O barrel raiz é renomeado de `src/index.tsx` para `src/index.ts` como parte da Etapa 6.

**Rationale**: Após mover `usePaymentProgress` para `src/hooks/`, o barrel raiz não contém mais nenhuma dependência React (`useRef`, `useEffect`) nem JSX. A extensão `.tsx` sinalizaria incorretamente a presença de JSX para linters, bundlers e revisores de código. A Constituição v1.3.0 já usa `src/index.ts` em toda a documentação — CLAUDE.md estava desalinhado com a extensão `.tsx`.

**Alternativas consideradas**: Manter `.tsx` — rejeitado por ser tecnicamente incorreto e por contrariar o que a Constituição já documenta.

---

## R8 — `NativeModules.PagseguroPlugpag` e o cast `any` no emitter

**Decisão**: O cast `any` existente em `getEmitter()` (`NativeModules.PagseguroPlugpag as any`) é mantido e re-documentado em `functions/payment/index.ts` com o comentário de exceção original.

**Rationale**: `NativeModules` é dinamicamente tipado no React Native — não existe uma interface estática para `NativeModules.PagseguroPlugpag`. O cast é necessário para satisfazer a tipagem do construtor de `NativeEventEmitter`. A Constituição permite `any` com documentação explícita (Princípio II).

**Comentário a preservar**:
```typescript
// EXCEPTION: NativeModules is dynamically typed. PagseguroPlugpag implements
// the NativeEventEmitter NativeModule contract (addListener + removeListeners).
_emitter = new NativeEventEmitter(NativeModules.PagseguroPlugpag as any); // EXCEPTION: dynamic NativeModules type
```
