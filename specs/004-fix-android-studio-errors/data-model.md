# Data Model: Correção de Erros Android Studio

**Feature**: `bugfix/004-fix-android-studio-errors`
**Date**: 2026-03-25

---

## Novos modelos de dados

**Nenhum.** Este bugfix não introduz novos tipos, interfaces ou modelos de dados.

---

## Modelos existentes afetados

### PlugPagTransactionResult (SDK — read-only para a biblioteca)

Classe do SDK `wrapper-1.33.0` cujos tipos reais foram confirmados por inspeção de bytecode:

| Campo | Tipo no bytecode | Tipo Kotlin | Afetado pelo fix |
|-------|-----------------|-------------|-----------------|
| `result` | `java.lang.Integer` | `Int?` | **Sim** — FIX-003 adiciona `?: -1` |
| `errorCode` | `java.lang.String` | `String?` | Não — já tratado com `?: ""` |
| `message` | `java.lang.String` | `String?` | Não — já tratado com `?.takeIf...` |
| Demais campos | `java.lang.String` | `String?` | Não — serializados via `putStringOrNull` |

### PlugPagInitializationResult (SDK — read-only para a biblioteca)

| Campo | Tipo no bytecode | Tipo Kotlin | Afetado pelo fix |
|-------|-----------------|-------------|-----------------|
| `result` | `int` (primitivo) | `Int` | **Não** — sem problema, confirmado |
| `errorCode` | `java.lang.String` | `String?` | Não |
| `errorMessage` | `java.lang.String` | `String?` | Não |

---

## Valor sentinela

| Constante | Valor | Uso | Origem |
|-----------|-------|-----|--------|
| `INTERNAL_ERROR_RESULT` | `-1` | Resultado nulo em `buildSdkPaymentErrorUserInfo` e erro interno em `buildInternalErrorUserInfo` | Convenção existente (linha 53 de `PagseguroPlugpagModule.kt`) |

**Nota**: `-1` não é uma constante nomeada no código atual (valor inline). Este bugfix mantém
o padrão existente sem introduzir nova abstração para um valor já estabelecido.
