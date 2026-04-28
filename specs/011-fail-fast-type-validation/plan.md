# Implementation Plan: Fail-Fast em Tipos de Pagamento, Parcelamento e Estorno

**Branch**: `bugfix/011-fail-fast-type-validation` | **Date**: 2026-04-28
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)
**Input**: Feature specification from `/specs/011-fail-fast-type-validation/spec.md`

## Summary

Bugfix TypeScript-only: adicionar validação explícita de `type` e `installmentType` em
`doPayment`/`doAsyncPayment`, e melhorar a mensagem de erro de `voidType` em `doRefund`,
para que valores inválidos em runtime sejam rejeitados com mensagens auto-descritivas
contendo o valor inválido recebido e os valores aceitos. Zero alterações nativas.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `verbatimModuleSyntax: true`)
**Primary Dependencies**: react-native (Platform), const objects de `types.ts`
**Storage**: N/A
**Testing**: Jest 29 + react-native preset
**Target Platform**: Android — PagBank SmartPOS (A920, A930, P2, S920)
**Project Type**: Biblioteca React Native (TurboModule / New Architecture)
**Performance Goals**: N/A — validação síncrona trivial
**Constraints**: Zero `any` sem exceção documentada; `yarn lint` sem erros; TDD (red→green→refactor)
**Scale/Scope**: 4 arquivos modificados; sem mudanças nativas; sem codegen

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Princípio | Status | Observação |
|---|---|---|
| I — TurboModules Only | ✅ PASS | Sem alteração em `NativePagseguroPlugpag.ts`; sem codegen |
| II — TypeScript Strict / Zero `any` | ✅ PASS | Nenhum `any` introduzido; `Object.values()` é type-safe |
| III — Test-First / TDD | ✅ PASS | Testes escritos antes da implementação (plano detalhado abaixo) |
| IV — Clean Code + SOLID | ✅ PASS | Mudanças confinadas a `functions/<domain>/index.ts`; const objects são a única fonte de verdade |
| V — Device Compatibility | ✅ PASS | Não afetado (validação é independente de plataforma POS) |
| VI — Android-Only Scope | ✅ PASS | Sem `.podspec`, sem `ios/`, sem lógica cross-platform |

**Violações**: Nenhuma. Sem necessidade de Complexity Tracking.

**Post-design re-check**: A abordagem de conversão `export { X } from './types'` →
`import { X } from './types'` + `export { X }` é idiomática TypeScript e não viola nenhuma
regra de import da Constituição (Princípio IV, Import Rules Between Layers).

## Project Structure

### Documentation (this feature)

```text
specs/011-fail-fast-type-validation/
├── plan.md              ← Este arquivo
├── spec.md              ← Especificação original
├── research.md          ← Decisões técnicas (Phase 0)
├── data-model.md        ← Entidades e regras de validação (Phase 1)
├── contracts/
│   └── validation-errors.md  ← Contrato de erros (Phase 1)
└── tasks.md             ← Gerado por /speckit-tasks (não criado aqui)
```

### Source Code (arquivos afetados)

```text
src/
├── functions/
│   ├── payment/
│   │   └── index.ts     ← ADD: validação de type + installmentType; CHANGE: import pattern
│   └── refund/
│       └── index.ts     ← CHANGE: mensagem de voidType; CHANGE: import pattern
└── __tests__/
    └── functions/
        ├── payment.test.ts  ← ADD: testes para type inválido + installmentType inválido
        └── refund.test.ts   ← UPDATE: teste de voidType com verificação de valor na mensagem
```

**Arquivos NÃO modificados**: `NativePagseguroPlugpag.ts`, `types.ts` (ambos os domínios),
`PagseguroPlugpagModule.kt`, `src/index.ts`, qualquer arquivo nativo.

## Implementation Detail

### 1 — `src/functions/payment/index.ts`

**Passo 1a — Converter re-export para import+export (para acesso como valor):**

```typescript
// ANTES
export { PaymentType, InstallmentType } from './types';

// DEPOIS — separar em import (valor disponível no escopo) + export (re-exportação)
import { PaymentType, InstallmentType } from './types';
// ... (no final do bloco de exports)
export { PaymentType, InstallmentType };
```

O `import type` para `PlugPagPaymentRequest` e `PlugPagInstallmentType` permanece como
`import type` (zero runtime effect com `verbatimModuleSyntax`).

**Passo 1b — Adicionar validações no início de `validatePaymentRequest`:**

```typescript
function validatePaymentRequest(data: PlugPagPaymentRequest): void {
  // NOVO: fail-fast para type inválido (deve vir ANTES das cross-validations)
  const validPaymentTypes = Object.values(PaymentType);
  if (!validPaymentTypes.includes(data.type)) {
    throw new Error(
      `[react-native-pagseguro-plugpag] ERROR: doPayment() — type "${String(data.type)}" is not valid. Accepted values: ${validPaymentTypes.join(', ')}.`
    );
  }

  // NOVO: fail-fast para installmentType inválido (deve vir ANTES das cross-validations)
  const validInstallmentTypes = Object.values(InstallmentType);
  if (!validInstallmentTypes.includes(data.installmentType)) {
    throw new Error(
      `[react-native-pagseguro-plugpag] ERROR: doPayment() — installmentType "${String(data.installmentType)}" is not valid. Accepted values: ${validInstallmentTypes.join(', ')}.`
    );
  }

  // validações existentes permanecem abaixo, sem alteração
  if (data.amount <= 0) { ... }
  // ...
}
```

**Ordem dos imports (obrigatória pela Constituição):**
```typescript
// Grupo 1 — external libraries
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

// Grupo 2 — internal project files (value imports)
import { InstallmentType, PaymentType } from './types';  // ← NOVO (ordem alfabética)

// Grupo 4 — type-only imports
import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagTransactionResult } from '../../types/sharedTypes';
import type { PlugPagPaymentProgressEvent, PlugPagPaymentRequest } from './types';
```

**Re-exports no final (sem `from` — usa o binding local):**
```typescript
export { PaymentType, InstallmentType };  // ← substitui o 'from' anterior
```

### 2 — `src/functions/refund/index.ts`

**Passo 2a — Converter re-export para import+export:**

```typescript
// ANTES
export { PlugPagVoidType } from './types';

// DEPOIS
import { PlugPagVoidType } from './types';
// ... (no final)
export { PlugPagVoidType };
```

**Passo 2b — Melhorar mensagem de voidType em `validateRefundRequest`:**

```typescript
function validateRefundRequest(data: PlugPagRefundRequest): void {
  if (data.transactionCode.trim() === '') { ... } // sem alteração
  if (data.transactionId.trim() === '') { ... }   // sem alteração

  // MUDANÇA: derivar do const object + incluir valor recebido na mensagem
  const validVoidTypes = Object.values(PlugPagVoidType);
  if (!validVoidTypes.includes(data.voidType)) {
    throw new Error(
      `[react-native-pagseguro-plugpag] ERROR: doRefund() — voidType "${String(data.voidType)}" is not valid. Accepted values: ${validVoidTypes.join(', ')}.`
    );
  }
}
```

**Ordem dos imports (obrigatória):**
```typescript
// Grupo 1
import { Platform } from 'react-native';

// Grupo 2
import { PlugPagVoidType } from './types';  // ← NOVO (valor)

// Grupo 4
import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagTransactionResult } from '../../types/sharedTypes';
import type { PlugPagRefundRequest } from './types';
```

### 3 — Testes TDD (escritos ANTES da implementação)

#### `src/__tests__/functions/payment.test.ts` — novos casos no bloco `validatePaymentRequest`

```typescript
// Dentro de describe('validatePaymentRequest', ...) — adicionar após os testes existentes:

it('rejects when type is invalid', async () => {
  await expect(
    doPayment({ ...validRequest, type: 'INVALID' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('type "INVALID" is not valid'),
  }));
  await expect(
    doPayment({ ...validRequest, type: 'INVALID' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('CREDIT, DEBIT, PIX'),
  }));
});

it('rejects when type is lowercase (case-sensitive)', async () => {
  await expect(
    doPayment({ ...validRequest, type: 'credit' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('type "credit" is not valid'),
  }));
});

it('rejects when installmentType is invalid', async () => {
  await expect(
    doPayment({ ...validRequest, installmentType: 'PARCELADO' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('installmentType "PARCELADO" is not valid'),
  }));
  await expect(
    doPayment({ ...validRequest, installmentType: 'PARCELADO' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR'),
  }));
});

// Consistência entre variantes síncrona e assíncrona (FR-007):
it('doAsyncPayment rejects invalid type identically to doPayment', async () => {
  await expect(
    doAsyncPayment({ ...validRequest, type: 'INVALID' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('type "INVALID" is not valid'),
  }));
});
```

#### `src/__tests__/functions/refund.test.ts` — atualizar teste existente

```typescript
// ANTES:
it('rejects when voidType is invalid', async () => {
  await expect(
    doRefund({ ...validRequest, voidType: 'INVALID' as any })
  ).rejects.toThrow('voidType');
});

// DEPOIS — verificar que a mensagem inclui valor recebido E valores aceitos (FR-005):
it('rejects when voidType is invalid', async () => {
  await expect(
    doRefund({ ...validRequest, voidType: 'INVALID' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('voidType "INVALID" is not valid'),
  }));
  await expect(
    doRefund({ ...validRequest, voidType: 'INVALID' as any })
  ).rejects.toThrow(expect.objectContaining({
    message: expect.stringContaining('VOID_PAYMENT, VOID_QRCODE'),
  }));
});
```

## Sequência de Execução (TDD)

1. Escrever novos testes em `payment.test.ts` → confirmar falha (`yarn test`)
2. Escrever novo teste em `refund.test.ts` → confirmar falha (`yarn test`)
3. Implementar mudanças em `payment/index.ts`
4. Implementar mudanças em `refund/index.ts`
5. Confirmar todos os testes passam (`yarn test`)
6. Confirmar `yarn lint` sem erros
7. Confirmar `yarn typecheck` sem erros

## Qualidade — Gates Obrigatórios

- [ ] `yarn test` — todos os testes passam (incluindo os novos)
- [ ] `yarn lint` — zero erros ou avisos
- [ ] `yarn typecheck` — zero erros
- [ ] Zero `any` introduzido (sem exceção não documentada)
- [ ] Nenhuma alteração em `NativePagseguroPlugpag.ts` (sem codegen necessário)
