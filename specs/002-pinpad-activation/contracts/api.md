# Contrato de API Pública — Feature 002: Ativação do PinPad

**Branch**: `feature/002-pinpad-activation`
**Data**: 2026-03-21
**Arquivo de referência**: `src/index.tsx`

---

## Funções Exportadas

### `initializeAndActivatePinPad`

```typescript
export async function initializeAndActivatePinPad(
  activationCode: string
): Promise<PlugPagActivationSuccess>
```

**Parâmetros**:
- `activationCode: string` — código de ativação do terminal PagSeguro. Não pode ser vazio (validação é responsabilidade do SDK). Tratado como credencial sensível — nunca deve ser logado.

**Retorno em sucesso**:
```typescript
{ result: 'ok' }
```

**Rejeição — erro do SDK** (`error.code === 'PLUGPAG_INITIALIZATION_ERROR'`):
```typescript
error.userInfo = {
  result: number,    // código numérico do SDK (ex: 6)
  errorCode: string, // código string do SDK (ex: 'E001'); pode ser ''
  message: string    // mensagem do SDK; nunca vazia
}
```

**Rejeição — erro interno** (`error.code === 'PLUGPAG_INTERNAL_ERROR'`):
```typescript
error.userInfo = {
  result: -1,
  errorCode: 'INTERNAL_ERROR',
  message: string  // mensagem da exceção; nunca vazia
}
```

**Rejeição — plataforma iOS** (`error.message` contém `'[react-native-pagseguro-plugpag] ERROR:'`):
- Lançado antes de qualquer acesso ao módulo nativo.
- O app iOS recebe um `Error` catchável — sem crash nativo.

**Comportamento de threading**:
- A variante síncrona do SDK é executada em background thread (gerenciado pela biblioteca).
- A função é segura para chamar na thread JS sem bloqueio.
- Re-chamadas sequenciais são permitidas (ex: retry após falha).

---

### `doAsyncInitializeAndActivatePinPad`

```typescript
export async function doAsyncInitializeAndActivatePinPad(
  activationCode: string
): Promise<PlugPagActivationSuccess>
```

**Parâmetros**: idênticos a `initializeAndActivatePinPad`.

**Retorno em sucesso**: idêntico a `initializeAndActivatePinPad` — `{ result: 'ok' }`.

**Rejeições**: idênticas a `initializeAndActivatePinPad` (mesmos `error.code` e shape de `userInfo`).

**Diferença em relação a `initializeAndActivatePinPad`**:
- Usa a variante assíncrona do SDK internamente (o SDK gerencia threading via listener).
- Arquitetura permite adição futura de eventos de progresso sem quebra de API.
- Preferida quando a futura integração com feedback de progresso for necessária.

---

## Tipos Exportados

```typescript
export interface PlugPagActivationSuccess {
  result: 'ok';
}
```

---

## TurboModule Spec (Contrato Interno — `src/NativePagseguroPlugpag.ts`)

```typescript
export interface Spec extends TurboModule {
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;
}
```

**Nota**: `Promise<Object>` é a forma requerida pelo codegen do React Native para tipos de retorno de objeto. O tipo concreto `PlugPagActivationSuccess` é aplicado via type assertion segura na camada pública (`src/index.tsx`), não na spec.

---

## Padrão de Consumo Recomendado

```typescript
import {
  initializeAndActivatePinPad,
  type PlugPagActivationSuccess,
} from 'react-native-pagseguro-plugpag';

try {
  const result: PlugPagActivationSuccess = await initializeAndActivatePinPad(activationCode);
  // result.result === 'ok' — terminal pronto
} catch (error: unknown) {
  if (error instanceof Error && 'code' in error) {
    const e = error as Error & { code: string; userInfo: { result: number; errorCode: string; message: string } };
    if (e.code === 'PLUGPAG_INITIALIZATION_ERROR') {
      // falha mapeada pelo SDK — checar e.userInfo.result, errorCode, message
    } else if (e.code === 'PLUGPAG_INTERNAL_ERROR') {
      // exceção inesperada — checar e.userInfo.message
    }
  }
}
```

---

## Guard de Plataforma iOS (Comportamento Garantido)

### Nível 1 — Aviso no import (não-crashante)

Ao importar a biblioteca em iOS, o seguinte aviso é emitido no console:
```
[react-native-pagseguro-plugpag] WARNING: iOS is not supported. PagSeguro PlugPag SDK is Android-only.
```
O app continua funcionando normalmente — nenhum crash, nenhuma exceção.

### Nível 2 — Erro na chamada (catchável)

Ao chamar qualquer função em iOS:
```
[react-native-pagseguro-plugpag] ERROR: <functionName>() is not available on iOS. PagSeguro PlugPag SDK is Android-only.
```
Lançado como `Error` padrão antes de qualquer acesso ao módulo nativo — sempre catchável via try/catch.
