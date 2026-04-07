# Data Model: Library Documentation

**Phase**: 1 — Design  
**Feature**: `feature/009-library-docs`  
**Date**: 2026-04-02

## Overview

This feature produces four documentation files. The "data model" is the content structure and section inventory for each file. No database entities or TypeScript types are involved.

---

## README.md — Section Inventory (English)

Sections in order. Each section is mandatory unless marked optional.

| # | Section | Content Summary | Mandatory |
|---|---------|-----------------|-----------|
| H1 | Header | Logo (centered), library title, tagline, 4 badges (npm, license, platform, RN version) | ✅ |
| H2 | What is this? | 3 paragraphs: (1) the problem, (2) the solution, (3) SDK context + Maven link | ✅ |
| H2 | Prerequisites | Hardware (terminals), React Native ≥ 0.76 + New Architecture, Android SDK versions, Expo conditions (SDK 52+, dev-client, not Expo Go) | ✅ |
| H2 | Installation | Two sub-sections (H3): Bare React Native, Expo. Each self-contained with steps and summary tables | ✅ |
| H3 | Installation — Bare React Native | 4 steps: install, verify newArchEnabled, add Maven repo, build. Includes warning about not adding SDK dependency manually. Summary table. | ✅ |
| H3 | Installation — Expo | Plugin config (app.json), what the plugin configures automatically, build commands. Summary table. | ✅ |
| H2 | Usage | 8 sub-sections covering all supported operations | ✅ |
| H3 | Activating the PinPad | Sync + async variants, try/catch, explanation of when to use each | ✅ |
| H3 | Debit Payment | Complete snippet | ✅ |
| H3 | Credit Payment | Two snippets: à vista and parcelado | ✅ |
| H3 | PIX Payment | Complete snippet | ✅ |
| H3 | Refund | Two snippets: VOID_PAYMENT and VOID_QRCODE | ✅ |
| H3 | Custom Printing (printFromFile) | Complete snippet with PrintQuality, MIN_PRINTER_STEPS, error code list | ✅ |
| H3 | Reprinting Receipts | 4 functions: reprintCustomerReceipt, reprintEstablishmentReceipt (sync + async variants), when to use each | ✅ |
| H3 | Payment Progress Hook (usePaymentProgress) | Complete React component example with useCallback, subscription, UI display | ✅ |
| H2 | API Reference | Tables only — no examples | ✅ |
| H3 | Functions | Table: 11 rows (function name, params, return type, description) | ✅ |
| H3 | Hooks | Table: 1 row (usePaymentProgress) | ✅ |
| H3 | Types & Interfaces | Property tables for: PlugPagPaymentRequest, PlugPagRefundRequest, PlugPagTransactionResult, PlugPagPaymentProgressEvent, PrintRequest, PrintResult | ✅ |
| H3 | Constants | Tables for: PaymentType, InstallmentType, PlugPagVoidType, PrintQuality, MIN_PRINTER_STEPS | ✅ |
| H3 | Error Codes | Per-domain table: activation, payment, refund, print | ✅ |
| H2 | Limitations | Bullet list: iOS not supported, non-SmartPOS behavior, out-of-scope features | ✅ |
| H2 | Contributing | Short paragraph + links to CONTRIBUTING.md and CODE_OF_CONDUCT.md | ✅ |
| H2 | License | One-liner: MIT — link to LICENSE file | ✅ |

---

## README-PTBR.md — Section Inventory (Portuguese Brazil)

Structurally identical to README.md. Differences only:

| Item | README.md | README-PTBR.md |
|------|-----------|----------------|
| Section titles | English | Portuguese |
| Prose content | English | Portuguese |
| Inline code comments | English | English (same — user decision) |
| Technical terms | English | English (preserved) |
| Tagline | "React Native TurboModule for PagSeguro..." | Portuguese equivalent |
| Warning callouts | English | Portuguese |

---

## CONTRIBUTING.md — Change Inventory

Document the delta (what changes, what is removed, what is added):

| Change Type | Item |
|------------|------|
| **Remove** | All references to iOS, Xcode, `.xcworkspace`, Pods, `pod install`, `example/ios/` |
| **Remove** | Any macOS-specific setup requirements that are iOS-driven |
| **Add** | Android development setup: Android Studio, Java (for Gradle), Android SDK |
| **Add** | Git flow: `main` (production), `develop` (integration), `feature/NNN-name`, `bugfix/NNN-name`, `hotfix/NNN-name` branch naming |
| **Add** | Commit message convention (conventional commits or project-specific format) |
| **Add/Update** | PR checklist aligned with Constituição v1.3.0: tests (100% coverage), `yarn lint` (zero warnings), zero `any`, codegen regeneration (`generateCodegenArtifactsFromSchema`) required when `NativePagseguroPlugpag.ts` changes |
| **Add** | Codegen step instruction with exact command: `cd example/android && ./gradlew generateCodegenArtifactsFromSchema` |
| **Preserve** | General open source contribution etiquette sections |

---

## CODE_OF_CONDUCT.md — Change Inventory

| Change Type | Item |
|------------|------|
| **Replace** | `[INSERT CONTACT METHOD]` placeholder → `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues` |

Single targeted replacement. No structural changes.

---

## Content Constraints Summary

| Constraint | Source | Applies To |
|-----------|--------|------------|
| Code examples match current API surface exactly | SC-004, FR-005 | README.md, README-PTBR.md |
| Structural parity (same sections in both files) | SC-003, FR-008 | README.md ↔ README-PTBR.md |
| Inline code comments in English | Clarification Q2 | README-PTBR.md specifically |
| Technical terms in English | FR-008 | README-PTBR.md |
| No iOS content | FR-007, FR-009, SC-005 | All 4 files |
| GitHub Issues URL as contact | FR-010, Clarification Q1 | CODE_OF_CONDUCT.md |
