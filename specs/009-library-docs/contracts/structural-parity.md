# Contract: Structural Parity — README.md ↔ README-PTBR.md

**Feature**: `feature/009-library-docs`  
**Date**: 2026-04-02  
**Requirement Source**: FR-008, SC-003

## Purpose

This contract defines the invariants that must hold between `README.md` (English) and `README-PTBR.md` (Portuguese Brazil) at all times. Any change to one file that adds, removes, or reorders a section must be reflected in the other file before the PR can be merged.

---

## Invariants

### 1. Section Parity

Every H2 and H3 heading in `README.md` MUST have a corresponding heading in `README-PTBR.md`. Section order MUST be identical.

| Section in README.md | Corresponding Section in README-PTBR.md |
|---|---|
| What is this? | O que é esta biblioteca? |
| Prerequisites | Pré-requisitos |
| Installation | Instalação |
| Installation — Bare React Native | Instalação — Bare React Native |
| Installation — Expo | Instalação — Expo |
| Usage | Uso |
| Activating the PinPad | Ativação do PinPad |
| Debit Payment | Pagamento com Débito |
| Credit Payment | Pagamento com Crédito |
| PIX Payment | Pagamento com PIX |
| Refund | Estorno |
| Custom Printing | Impressão Personalizada |
| Reprinting Receipts | Reimpressão de Comprovantes |
| Payment Progress Hook | Hook de Progresso de Pagamento |
| API Reference | Referência de API |
| Functions | Funções |
| Hooks | Hooks |
| Types & Interfaces | Tipos e Interfaces |
| Constants | Constantes |
| Error Codes | Códigos de Erro |
| Limitations | Limitações e Escopo |
| Contributing | Contribuindo |
| License | Licença |

### 2. Code Example Parity

Every code block present in `README.md` MUST have a corresponding code block in `README-PTBR.md`. Code block content (function names, parameter names, types, values) MUST be identical. Inline comments MUST be in English in both files.

### 3. Table Parity

Every table in `README.md` (installation summary, API reference, type property tables, constant tables, error code tables) MUST have a corresponding table in `README-PTBR.md` with the same number of rows and columns. Column headers are translated; code values (function names, type names, error codes) are not.

### 4. Badge Parity

The header badges MUST be present in both files. Badge image URLs and alt text are identical.

### 5. No Cross-File Dependencies

Each file MUST be independently readable and actionable. `README-PTBR.md` MUST NOT reference `README.md` for any information, and vice versa.

---

## Verification Protocol

Before merging a PR that modifies either README file:

1. Run a section count on both files — counts must match.
2. Run a code block count on both files — counts must match.
3. Verify all links in both files resolve correctly (no broken anchors).
4. Verify no `[INSERT ...]` placeholders remain in either file.

---

## Allowed Differences

| Item | README.md | README-PTBR.md |
|---|---|---|
| H2/H3 section title text | English | Portuguese |
| Prose paragraph content | English | Portuguese |
| Warning callout text | English | Portuguese |
| Inline code comments | English | English (same) |
| Function/type/constant names in code | English | English (same) |
| Technical terms in prose | English | English (preserved) |
