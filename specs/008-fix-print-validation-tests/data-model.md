# Data Model: Fix Print Validation & Complete Test Coverage

**Branch**: `bugfix/008-fix-print-validation-tests`  
**Date**: 2026-04-02

## Entities

### PrintRequest

Objeto de entrada da função `printFromFile()`. Representa os parâmetros de uma operação de impressão.

| Campo | Tipo | Obrigatório | Regras de validação |
|---|---|---|---|
| `filePath` | `string` | Sim | Não pode ser vazia nem conter apenas whitespace |
| `printerQuality` | `PrintQualityValue` (1\|2\|3\|4) | Não | Se fornecido, DEVE estar no intervalo [1, 4] inclusive |
| `steps` | `number` | Não | Se fornecido, DEVE ser >= 0 |

**Mudança neste bugfix**: A regra de validação de `printerQuality` é **nova** — anteriormente o campo era aceito sem verificação de intervalo.

---

### PrintQuality (Const Enum Object)

Valores canônicos para `printerQuality`. Usar esses valores é a forma recomendada; valores fora deste conjunto são rejeitados em runtime.

| Constante | Valor | Descrição |
|---|---|---|
| `PrintQuality.LOW` | `1` | Qualidade baixa (mais rápida) |
| `PrintQuality.MEDIUM` | `2` | Qualidade média |
| `PrintQuality.HIGH` | `3` | Qualidade alta |
| `PrintQuality.MAX` | `4` | Qualidade máxima (mais lenta) |

---

### PrintResult

Objeto de retorno de todas as funções de impressão quando bem-sucedidas.

| Campo | Tipo | Descrição |
|---|---|---|
| `result` | `'ok'` | Literal — sempre `'ok'` em caso de sucesso |
| `steps` | `number` | Número de passos do motor de impressão utilizados |

---

## Validation Rules (pós-bugfix)

```
validatePrintRequest(data: PrintRequest):
  IF data.filePath.trim() === ''
    → throw PLUGPAG_VALIDATION_ERROR (filePath vazio)
  IF data.steps !== undefined AND data.steps < 0
    → throw PLUGPAG_VALIDATION_ERROR (steps negativo)
  IF data.printerQuality !== undefined AND (data.printerQuality < 1 OR data.printerQuality > 4)
    → throw PLUGPAG_VALIDATION_ERROR (printerQuality fora de [1, 4])
  ELSE
    → proceed to native call
```

---

## Error Codes (domínio print)

| Código | Origem | Quando |
|---|---|---|
| `PLUGPAG_VALIDATION_ERROR` | JS (TypeScript) | Parâmetros inválidos: `filePath` vazio, `steps` negativo, `printerQuality` fora de [1, 4] |
| `PLUGPAG_PRINT_ERROR` | Kotlin → JS | SDK retornou `result != RET_OK` (falha de hardware ou SDK) |
| `PLUGPAG_INTERNAL_ERROR` | Kotlin → JS | Exceção não-SDK capturada em runtime no módulo Kotlin |

---

## State Transitions

```
printFromFile(data):
  [VALIDATE] → [NATIVE CALL] → [RESOLVE PrintResult] 
                              → [REJECT PLUGPAG_PRINT_ERROR]
                              → [REJECT PLUGPAG_INTERNAL_ERROR]
  
  Nota: [VALIDATE] pode rejeitar antes de [NATIVE CALL] com PLUGPAG_VALIDATION_ERROR.
        Não há chamada nativa se a validação falhar.
```
