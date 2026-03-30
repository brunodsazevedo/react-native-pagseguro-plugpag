# Quickstart: Como adicionar um novo domínio

**Feature**: `007-ts-domain-split` | **Date**: 2026-03-29

Este guia descreve como um contribuidor adiciona um novo domínio (ex: NFC) à biblioteca após a refatoração. Siga as etapas em ordem — a Constituição v1.3.0 é não-negociável.

---

## Pré-requisitos

- Branch criada a partir de `develop`
- `yarn install` executado
- `yarn lint && yarn typecheck && yarn test` passando na branch base

---

## Etapa 1 — Criar a estrutura de pastas

```bash
mkdir -p src/functions/<domain>
touch src/functions/<domain>/types.ts
touch src/functions/<domain>/index.ts
touch src/__tests__/functions/<domain>.test.ts
```

Exemplo para NFC:
```bash
mkdir -p src/functions/nfc
touch src/functions/nfc/types.ts
touch src/functions/nfc/index.ts
touch src/__tests__/functions/nfc.test.ts
```

---

## Etapa 2 — Escrever os testes primeiro (TDD — Princípio III)

Abra `src/__tests__/functions/<domain>.test.ts` e escreva os testes **antes** de qualquer implementação. Os testes devem **falhar** neste momento.

```typescript
// src/__tests__/functions/nfc.test.ts
import { Platform } from 'react-native';

// Mock do módulo nativo — path de dois níveis acima
jest.mock('../../NativePagseguroPlugpag', () => ({
  __esModule: true,
  default: {
    readNfcTag: mockReadNfcTag,
  },
}));

const mockReadNfcTag = jest.fn();

// Cenário obrigatório 1: iOS guard Nível 2
it('rejects on iOS with prefixed error', async () => {
  jest.spyOn(Platform, 'OS', 'get').mockReturnValue('ios');
  await expect(readNfcTag()).rejects.toThrow(
    '[react-native-pagseguro-plugpag] ERROR: readNfcTag()'
  );
});

// Cenário obrigatório 2: Android + sucesso
it('resolves on Android when SDK returns success', async () => {
  jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
  mockReadNfcTag.mockResolvedValue({ tagId: 'ABC123' });
  const result = await readNfcTag();
  expect(result).toEqual({ tagId: 'ABC123' });
});

// Cenário obrigatório 3: Android + erro SDK
it('rejects with PLUGPAG_NFC_ERROR when SDK returns error', async () => {
  jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
  mockReadNfcTag.mockRejectedValue({ code: 'PLUGPAG_NFC_ERROR' });
  await expect(readNfcTag()).rejects.toMatchObject({ code: 'PLUGPAG_NFC_ERROR' });
});
```

Execute `yarn test` — os testes **devem falhar** (red). Se passarem, a implementação já existe e o TDD foi pulado.

---

## Etapa 3 — Definir os tipos do domínio

Abra `src/functions/<domain>/types.ts` e defina apenas tipos: interfaces, const objects, type aliases. **Sem lógica, sem imports de React ou SDK.**

```typescript
// src/functions/nfc/types.ts

export const NfcTagType = {
  ISO_14443: 'ISO_14443',
  ISO_15693: 'ISO_15693',
} as const;

export type NfcTagTypeValue = typeof NfcTagType[keyof typeof NfcTagType];

export interface NfcReadRequest {
  tagType?: NfcTagTypeValue;
}

export interface NfcReadResult {
  tagId: string;
  tagType: NfcTagTypeValue;
}
```

**Regra de placement de tipos**:

```
O tipo é usado por mais de um domínio?
├── SIM → src/types/sharedTypes.ts
└── NÃO → src/functions/<domain>/types.ts   ← caso padrão
```

---

## Etapa 4 — Implementar as funções do domínio

Abra `src/functions/<domain>/index.ts`. Siga o padrão exato abaixo — sem exceções.

```typescript
// src/functions/nfc/index.ts

// Grupo 1 — bibliotecas externas
import { Platform } from 'react-native';

// Grupo 4 — type-only imports
import type { Spec } from '../../NativePagseguroPlugpag';
import type { NfcReadRequest, NfcReadResult } from './types';

// Acessor lazy privado — NUNCA chamar antes do guard Nível 2
// EXCEPTION: require() é necessário aqui — NativePagseguroPlugpag.ts chama
// TurboModuleRegistry.getEnforcing() na avaliação do módulo. Um ES import causaria crash no iOS.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

// Re-export de tipos (valores com export normal; tipos com export type)
export { NfcTagType } from './types';
export type { NfcTagTypeValue, NfcReadRequest, NfcReadResult } from './types';

// Funções exportadas
export async function readNfcTag(data?: NfcReadRequest): Promise<NfcReadResult> {
  // Guard Nível 2 — DEVE vir antes de qualquer acesso nativo
  if (Platform.OS !== 'android') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: readNfcTag() is not supported on iOS. ' +
        'PagSeguro PlugPag SDK is Android-only.'
    );
  }

  return getNativeModule().readNfcTag(data ?? {}) as Promise<NfcReadResult>;
}
```

**Checklist obrigatório por função**:
- [ ] Guard `Platform.OS !== 'android'` **antes** de `getNativeModule()`
- [ ] Mensagem de erro com prefixo exato `[react-native-pagseguro-plugpag] ERROR: <methodName>()`
- [ ] `getNativeModule()` chamado somente após o guard
- [ ] Return type explicitamente tipado
- [ ] Zero `any` sem comentário `// EXCEPTION: <razão>`

---

## Etapa 5 — Registrar no barrel de funções

Abra `src/functions/index.ts` e adicione a linha do novo domínio:

```typescript
// src/functions/index.ts
export * from './activation';
export * from './nfc';       // ← adicionar aqui em ordem alfabética
export * from './payment';
export * from './print';
export * from './refund';
```

---

## Etapa 6 — Verificar que `src/index.ts` exporta tudo

O barrel raiz `src/index.ts` já faz `export * from './functions'`, então o novo domínio é automaticamente exposto via barrel. **Nenhuma alteração necessária em `src/index.ts`** salvo se o domínio incluir um hook React (ver Etapa 7).

---

## Etapa 7 — Hooks React (se necessário)

Se o domínio incluir um hook React, crie em `src/hooks/` (não em `functions/`):

```typescript
// src/hooks/useNfcTag.ts
import { useEffect, useRef } from 'react';
import { readNfcTag } from '../functions/nfc/index';
import type { NfcReadResult } from '../functions/nfc/types';

export function useNfcTag(onTagRead: (result: NfcReadResult) => void): void {
  const callbackRef = useRef(onTagRead);
  callbackRef.current = onTagRead;

  useEffect(() => {
    // implementação com subscription
  }, []);
}
```

Adicione o export diretamente em `src/index.ts` (sem barrel interno em `hooks/`):

```typescript
// src/index.ts — adicionar linha
export * from './hooks/useNfcTag';
```

---

## Etapa 8 — Atualizar a Spec TurboModule (se novo método nativo)

Se a feature exige um novo método nativo, atualize `src/NativePagseguroPlugpag.ts`:

```typescript
// Adicionar na interface Spec
readNfcTag(data: Object): Promise<Object>;
```

E execute o codegen:

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

**Atenção**: O codegen DEVE ser regenerado antes de qualquer implementação Kotlin. Ver CLAUDE.md §Codegen Android.

---

## Etapa 9 — Validação final do domínio

```bash
yarn lint && yarn typecheck && yarn test
```

Todos os três DEVEM passar sem erros ou avisos antes de abrir PR.

---

## Resumo do fluxo

```
1. mkdir src/functions/<domain>/{types,index}.ts
2. Escrever testes (falham — red)
3. Definir tipos em types.ts
4. Implementar funções em index.ts (guard + getNativeModule)
5. Adicionar export * em functions/index.ts
6. (Opcional) Criar hook em hooks/ + export em index.ts
7. (Se nativo) Atualizar NativePagseguroPlugpag.ts + regenerar codegen
8. yarn lint && yarn typecheck && yarn test (verde)
```
