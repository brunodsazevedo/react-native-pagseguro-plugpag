# Quickstart: Fix Print Validation & Complete Test Coverage

**Branch**: `bugfix/008-fix-print-validation-tests`  
**Date**: 2026-04-02

## O que muda

Este bugfix corrige dois gaps da Feature 006:

1. **Validação de `printerQuality`** — valores fora de [1, 4] agora são rejeitados antes de chegar ao SDK.
2. **Cobertura de testes** — `doAsyncReprintCustomerReceipt()` e `doAsyncReprintEstablishmentReceipt()` ganham testes de sucesso e falha.

---

## Comportamento da validação (pós-fix)

### Chamadas rejeitadas

```typescript
// printerQuality: 99 → PLUGPAG_VALIDATION_ERROR
await printFromFile({ filePath: '/img.png', printerQuality: 99 as PrintQualityValue });
// Error: [react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — printerQuality must be between 1 and 4.

// printerQuality: 0 → PLUGPAG_VALIDATION_ERROR
await printFromFile({ filePath: '/img.png', printerQuality: 0 as PrintQualityValue });

// printerQuality: -1 → PLUGPAG_VALIDATION_ERROR
await printFromFile({ filePath: '/img.png', printerQuality: -1 as PrintQualityValue });
```

### Chamadas aceitas (sem mudança de comportamento)

```typescript
// printerQuality omitido (campo opcional) → sem erro de validação
await printFromFile({ filePath: '/img.png' });

// printerQuality: 1 (mínimo válido) → sem erro
await printFromFile({ filePath: '/img.png', printerQuality: PrintQuality.LOW }); // 1

// printerQuality: 4 (máximo válido) → sem erro
await printFromFile({ filePath: '/img.png', printerQuality: PrintQuality.MAX }); // 4
```

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| [src/functions/print/index.ts](../../../src/functions/print/index.ts) | Adiciona cláusula `printerQuality` em `validatePrintRequest()` |
| [src/__tests__/functions/print.test.ts](../../../src/__tests__/functions/print.test.ts) | Adiciona 7 novos `it()` |

---

## Verificação após implementação

```bash
yarn test --testPathPattern=print.test.ts   # 22 testes devem passar
yarn lint                                    # zero erros ou avisos
yarn typecheck                               # zero erros de tipo
```

---

## Nenhuma alteração na API pública

A assinatura de `printFromFile(data: PrintRequest)` e o tipo `PrintRequest` permanecem idênticos. Esta correção é **não-breaking** — consumidores que já passam valores válidos de `printerQuality` (ou omitem o campo) não precisam alterar nada.
