# Feature Specification: Library Documentation

**Feature Branch**: `feature/009-library-docs`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Criar documentação completa da biblioteca react-native-pagseguro-plugpag em dois idiomas (EN + PT-BR), cobrindo instalação, exemplos de uso e referência de API"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Evaluates and Installs the Library (Priority: P1)

A React Native developer discovers the library on GitHub or npm and needs to quickly determine if it meets their requirements. They read the README to understand what the library does, which terminals it supports, and what prerequisites are needed — then follow the installation instructions for their specific project setup (Bare React Native or Expo) without needing external help.

**Why this priority**: This is the primary entry point for every new adopter. Without clear context and installation instructions, the library cannot be adopted regardless of its technical quality. All other documentation value depends on the developer successfully completing this step.

**Independent Test**: Can be fully tested by reading only the README and attempting to install and configure the library from scratch in a fresh React Native project — success means the library is functional without consulting any external resource.

**Acceptance Scenarios**:

1. **Given** a developer with React Native experience finds the README, **When** they read the "What is this?" section, **Then** they understand the library's purpose, the PagBank SmartPOS terminals it targets, and that it is Android-only.
2. **Given** a developer using Bare React Native workflow, **When** they follow the installation section, **Then** they can install and configure the library (including Maven repository registration) without any step being missing or ambiguous.
3. **Given** a developer using Expo, **When** they follow the Expo installation section, **Then** they understand that Expo Go is not supported, and can configure the Expo plugin and generate a native build successfully.
4. **Given** a developer reading the prerequisites, **When** they check their project configuration, **Then** they can determine whether their React Native version, Android SDK versions, and hardware meet the requirements.

---

### User Story 2 - Developer Implements Payment Operations (Priority: P2)

A developer who has successfully installed the library needs to implement one or more payment operations in their app — terminal activation, accepting payments (debit, credit, PIX), processing refunds, and printing receipts. They look for complete, working code examples that cover all supported scenarios.

**Why this priority**: The usage examples are the primary reason developers adopt the library. Incomplete or incorrect examples directly block implementation and create unnecessary support requests.

**Independent Test**: Can be fully tested by copying a usage example directly into a project and verifying it behaves as described — without requiring cross-referencing with the API reference section.

**Acceptance Scenarios**:

1. **Given** a developer needs to activate a PagBank terminal, **When** they read the activation example, **Then** they find complete, working code covering both sync and async variants, with proper error handling.
2. **Given** a developer needs to accept a debit, credit (à vista and parcelado), or PIX payment, **When** they read the payment examples, **Then** they find a separate, complete snippet for each payment type with all required parameters shown.
3. **Given** a developer needs to refund a transaction, **When** they read the refund example, **Then** they find a complete snippet showing how to use `transactionCode` and `transactionId` from the original payment result, for both card and PIX refunds.
4. **Given** a developer needs to show real-time payment progress to the terminal operator, **When** they read the hook example, **Then** they find a complete component showing subscription, event handling, and automatic cleanup on unmount.
5. **Given** a developer needs to print a custom receipt or reprint the last transaction receipt, **When** they read the printing examples, **Then** they find complete snippets for custom file printing, reprinting the customer receipt, and reprinting the establishment receipt (sync and async variants), with error handling for hardware failures.

---

### User Story 3 - Developer Looks Up API Details (Priority: P3)

A developer already using the library needs to quickly look up a specific function signature, required parameters, return types, available constants, or possible error codes — without reading through the full usage examples section.

**Why this priority**: A comprehensive API reference reduces errors in production integrations and reduces support burden. It is essential for ongoing development after initial adoption.

**Independent Test**: Can be fully tested by looking up a specific function or type in the API reference section and verifying all required information (parameters, types, return values) is available without needing to search elsewhere.

**Acceptance Scenarios**:

1. **Given** a developer needs the exact signature of any exported function, **When** they consult the API reference table, **Then** they find the function name, parameter types, return type, and a brief description in a single row.
2. **Given** a developer needs all properties of a specific interface (e.g., `PlugPagPaymentRequest`), **When** they look it up in the types section, **Then** they find each property, its type, whether it is required, and its description.
3. **Given** a developer needs the value of a constant (e.g., `PrintQuality.HIGH`), **When** they check the constants section, **Then** they find the constant name, its value, and a description.
4. **Given** a developer encounters an error code in their app, **When** they search the documentation, **Then** they understand which operation throws it and what it means.

---

### User Story 4 - Contributor Understands How to Contribute (Priority: P4)

A developer who wants to contribute to the library reads the CONTRIBUTING.md to understand the project's git flow, commit conventions, PR requirements, and Android-specific setup — without encountering outdated iOS references.

**Why this priority**: Accurate contribution guidelines reduce incorrect PRs and onboarding friction. Lower priority than end-user documentation, but important for the project's long-term health.

**Independent Test**: Can be fully tested by reading CONTRIBUTING.md and verifying that all setup instructions are Android-specific and that the PR checklist is aligned with the project's constitution.

**Acceptance Scenarios**:

1. **Given** a new contributor reads CONTRIBUTING.md, **When** they look for development setup instructions, **Then** they find only Android-relevant steps (no iOS, Xcode, or CocoaPods references).
2. **Given** a contributor wants to submit a PR, **When** they read the PR checklist, **Then** they find requirements aligned with the project constitution (tests, lint, codegen regeneration, etc.).
3. **Given** a contributor encounters CODE_OF_CONDUCT.md, **When** they look for a contact method to report a conduct issue, **Then** they find a valid, non-placeholder contact.

---

### Edge Cases

- What happens when a developer tries to use the library with Expo Go? Documentation must explicitly warn that Expo Go is not supported and explain that a dev-client or production build is required.
- What if a developer's project uses React Native older than 0.76? Prerequisites must clearly state the minimum version and the New Architecture requirement.
- What if a developer adds the SDK dependency manually in addition to the library? Documentation must explicitly warn that this causes build conflicts and is not needed.
- What if `printFromFile` is called with an invalid `printerQuality` or a negative `steps` value? Documentation must describe the input validation behavior and the resulting error code (`PLUGPAG_VALIDATION_ERROR`).
- What if a developer uses only the Portuguese README? Both README files must be complete and self-contained — the PT-BR version cannot depend on the EN version for any information.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation MUST clearly describe the library's purpose, the problem it solves, and the specific PagBank SmartPOS terminals it supports (A920, A930, P2, S920).
- **FR-002**: Documentation MUST list all prerequisites: hardware (PagBank SmartPOS terminal), React Native minimum version (0.76+ with New Architecture enabled), Android SDK versions (min 24, compile/target 36), and Expo conditions (SDK 52+, dev-client required, Expo Go explicitly not supported).
- **FR-003**: Documentation MUST provide self-contained step-by-step installation instructions for both Bare React Native and Expo workflows — each workflow section must be independently followable without reading the other.
- **FR-004**: Documentation MUST explicitly warn that the SDK dependency (`wrapper:X.X.X`) must NOT be added manually to the app's build configuration — it is already declared internally by the library, and adding it again causes version conflicts.
- **FR-005**: Documentation MUST include complete, self-contained code examples with error handling for all supported operations: terminal activation (sync and async), debit payment, credit payment (à vista and parcelado), PIX payment, refund (card and PIX), custom image printing (`printFromFile`), receipt reprinting (sync and async for both customer and establishment receipts), and payment progress tracking.
- **FR-006**: Documentation MUST include an API reference covering: all 11 exported functions with parameters, return types, and descriptions; the `usePaymentProgress` hook; all 6 interfaces/types (`PlugPagPaymentRequest`, `PlugPagRefundRequest`, `PlugPagTransactionResult`, `PlugPagPaymentProgressEvent`, `PrintRequest`, `PrintResult`) with all properties documented; all constants (`PaymentType`, `InstallmentType`, `PlugPagVoidType`, `PrintQuality`, `MIN_PRINTER_STEPS`); and error codes for each operation domain.
- **FR-007**: Documentation MUST explicitly state what is out of scope: iOS platform, non-PagBank SmartPOS devices, financial reports and statement queries, and autonomous NFC without PlugPag.
- **FR-008**: Documentation MUST be available in two structurally identical files — `README.md` (English) and `README-PTBR.md` (Portuguese Brazil). Both files must have the same sections and examples; only the prose language differs. Technical terms (PaymentType, Promise, TurboModule, etc.) and all inline code comments remain in English in both versions.
- **FR-009**: `CONTRIBUTING.md` MUST be updated to: remove all iOS, Xcode, and CocoaPods references; add Android development setup instructions; document the git flow and branch naming convention; document the commit message convention; and align the PR checklist with the project constitution requirements, including the mandatory codegen regeneration step.
- **FR-010**: `CODE_OF_CONDUCT.md` MUST have its boilerplate contact placeholder replaced with the project's public GitHub Issues URL (e.g., `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues`).

### Key Entities

- **README.md**: Primary documentation entry point in English — the file displayed by default on GitHub and npm. Contains all sections: header with badges, library description, prerequisites, installation (Bare + Expo), usage examples, hooks, API reference, limitations, contributing, and license.
- **README-PTBR.md**: Portuguese Brazil version of README.md. Structurally identical — every section and example present in README.md must be present here, translated, with technical terms preserved in English.
- **CONTRIBUTING.md**: Contributor guide updated to reflect the Android-only project scope and the project constitution's PR requirements and development workflow.
- **CODE_OF_CONDUCT.md**: Community conduct document with a valid contact method replacing the boilerplate placeholder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with React Native experience can successfully install, configure, and run their first payment operation by following only the README — without consulting any resource outside the documentation.
- **SC-002**: 100% of functions, hooks, interfaces/types, and constants exported by the library's public API are present in the API reference section.
- **SC-003**: `README.md` and `README-PTBR.md` are structurally identical — no section present in one is absent from the other, and no example in one is missing from the other.
- **SC-004**: All code examples in both README files accurately reflect the library's current public API — no calls to non-existent functions, no incorrect parameter names, no missing required fields.
- **SC-005**: `CONTRIBUTING.md` contains zero references to iOS, Xcode, or CocoaPods.
- **SC-006**: A developer following the installation section for their specific workflow (Bare RN or Expo) completes the setup without needing to read the other workflow's section.

## Assumptions

- The library's public API surface (functions, types, constants) is stable at the time of documentation writing — no new exports are expected to be added or removed during this feature.
- A logo asset will be created or provided separately. The header section can use a placeholder path if the asset is not yet ready at writing time.
- `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` are being updated (not created from scratch) — their boilerplate structure is already in place.
- Both README files will be maintained in parallel — there is no automated translation or sync mechanism.
- Badge URLs (shields.io) and npm package availability will be validated manually after writing.

## Clarifications

### Session 2026-04-02

- Q: Qual deve ser o método de contato no `CODE_OF_CONDUCT.md` (FR-010)? → A: URL pública do GitHub Issues do repositório.
- Q: Qual idioma deve ser usado nos comentários inline dos exemplos de código? → A: Inglês em ambos os arquivos (`README.md` e `README-PTBR.md`).

## Dependencies

- All features currently marked complete must be stable before documentation is finalized: 001 (SDK Setup & Expo Plugin), 002 (PinPad Activation), 003 (Payment Methods), 005 (Refund), 006 (Custom Printing), 007 (TS Domain Split), bugfix/008 (Print Validation Tests).
- The project constitution (`.specify/memory/constitution.md`) is the reference for PR checklist items in `CONTRIBUTING.md`.
