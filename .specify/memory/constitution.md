<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0 (MINOR — lint validation rule added to development workflow)
Modified sections:
  - Development Workflow & Quality Gates › PR Checklist: added mandatory `yarn lint` step
  - Development Workflow & Quality Gates › Absolute Prohibitions: added lint failure prohibition
Added sections: N/A
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md     ✅ Constitution Check is dynamic; no update required
  - .specify/templates/spec-template.md     ✅ No constitution-specific references; compatible as-is
  - .specify/templates/tasks-template.md    ✅ Updated — lint task added to Polish phase
  - .specify/templates/constitution-template.md  ✅ This file supersedes the placeholder template
  - CLAUDE.md                               ✅ Updated — lint validation section added
Deferred TODOs:
  - TODO(RESULT_CODES): Mapear lista completa de result codes da SDK PagBank.
    Ref: https://developer.pagbank.com.br/docs/codigos-de-erro-e-retorno-smartpos
  - TODO(EVENT_SUBSCRIPTION): Modelo de subscription para PlugPagEventListener ainda não
    formalizado. Não bloqueia fases 1–6 de implementação.
-->

# react-native-pagseguro-plugpag Constitution

## Core Principles

### I. New Architecture — TurboModules Only (NON-NEGOTIABLE)

This library MUST be implemented exclusively using the React Native New Architecture
(TurboModules + JSI). The legacy Bridge is not supported and MUST NOT be used.

- The TurboModule Spec (`NativePagseguroPlugpag.ts`) is the **sole source of truth**
  for the JS↔Native contract and MUST be kept in sync with the Kotlin implementation.
- All JS↔Native communication MUST go through JSI (no JSON serialization over the Bridge).
- React Native ≥ 0.76 is the minimum supported version; no bridge-compatibility shims are permitted.
- The `.podspec` file MUST be removed — iOS is explicitly out of scope.

**Rationale**: The previous library version relied on the deprecated Bridge. This rewrite exists
specifically to adopt the New Architecture; any regression to Bridge patterns defeats the purpose.

### II. TypeScript Strict — Zero `any` Policy (NON-NEGOTIABLE)

All TypeScript code MUST compile under `strict: true` with `noImplicitAny`, `noUnusedLocals`,
`noUnusedParameters`, `noImplicitReturns`, and `allowUnreachableCode: false` enabled.

- `any` is **prohibited**. Every exception MUST be documented with `// EXCEPTION: <reason>`.
- `@ts-ignore` / `@ts-expect-error` are **prohibited** without a documented justification.
- `as unknown as X` is **prohibited** without explicit justification.
- All function parameters and return types MUST be explicitly typed.
- Enums MUST be defined as `const` objects (not native TypeScript `enum`) to avoid runtime
  overhead and to remain tree-shakeable.
- Interfaces MUST be used for all data models; generic `object` types are prohibited.
- Union types MUST be used for state/result variations.

**Rationale**: Codegen (React Native TurboModule spec generation) depends on correct types.
`any` breaks the type contract between JS and native, causing silent runtime failures.

### III. Test-First / TDD (NON-NEGOTIABLE)

No feature MUST be accepted without tests. The development cycle is strictly
**Red → Green → Refactor**.

- Tests MUST be written and confirmed failing **before** any implementation begins.
- 100% of functions exported from `src/index.ts` MUST have unit test coverage.
- Every new native method MUST have a Kotlin integration test (JUnit 5 + Mockk) validating
  serialization/deserialization between JS and the SDK.
- The native module (`NativePagseguroPlugpag`) MUST always be mocked in unit tests.
- CI MUST run the full unit test suite on every PR; a PR that breaks an existing test is blocked.
- Snapshot tests MUST be used for critical return structures (e.g., `TransactionResult`).

**Rationale**: The SDK (PlugPagServiceWrapper) may release updates that silently change behavior.
A comprehensive test suite is the primary regression safety net.

### IV. Clean Code + SOLID

Every unit of code (function, module, class) MUST have a single, clearly named responsibility.

- Functions MUST be named descriptively; abbreviations that obscure meaning are prohibited.
- Comments are ONLY permitted for non-obvious decisions or workarounds with explicit justification.
  Self-documenting code is the default.
- SOLID principles apply as follows:
  - **S**: Each TypeScript module owns one domain (`payment`, `print`, `nfc`, `activation`).
  - **O**: Types MUST be extended via union types; existing contracts MUST NOT be modified
    in breaking ways.
  - **I**: TurboModule spec is separate from domain types; hooks are separate from modules.
  - **D**: The native module MUST always be accessed via the Spec interface, never directly.
- `PlugPag` (SDK) MUST only be instantiated and called inside `PagseguroPlugpagModule.kt`.
  No business logic beyond serialization and SDK calls is permitted in the Kotlin module.

**Rationale**: The library boundary between JS and native is inherently fragile. Clean separation
of concerns minimizes the blast radius of SDK or architecture changes.

### V. Device Compatibility & Fail-Fast

The library MUST detect at initialization whether it is running on a PagBank SmartPOS terminal.
Behavior MUST differ explicitly by environment:

- **POS device (any environment)**: SDK runs normally.
- **Non-POS device + `__DEV__ = true`**: A clear warning MUST be emitted and all methods
  MUST return predefined mock responses (success simulation). The mock MUST cover the full
  API surface (all methods in `NativePagseguroPlugpag.ts`).
- **Non-POS device + production**: Any call to any library method MUST throw an explicit error.
  Silent fallback or partial degradation is prohibited.

Warning message (exact):
```
[react-native-pagseguro-plugpag] AVISO: Este dispositivo não é um terminal POS PagBank/PagSeguro.
A lib está rodando em modo mock. Todas as respostas são simuladas para fins de desenvolvimento.
```

Error message (exact):
```
[react-native-pagseguro-plugpag] ERRO: Dispositivo incompatível. Esta lib requer um terminal POS PagBank/PagSeguro.
```

**Rationale**: Developers must be able to build and test their apps on regular Android devices.
But production deployments MUST never silently degrade — fast, explicit failure protects
operators from discovering payment failures at the point of sale.

### VI. Android-Only Scope

This library is **exclusively** an Android library targeting PagBank SmartPOS terminals
(A920, A930, P2, S920). iOS support is not planned and MUST NOT be introduced.

- The PlugPagServiceWrapper SDK is Android-only. No cross-platform abstraction layer
  is permitted.
- All native code MUST be written in Kotlin 2.x.
- The `.podspec` file MUST NOT exist in the repository.
- The `ios/` directory MUST NOT exist in the repository.
- Pre-authorization (`doPreAutoCreate`, `doEffectuatePreAuto`), sub-acquirer
  (`initializeSubAcquirer`), and APN configuration are **out of scope** for v1.
- Threading for SDK calls MUST use the SDK's own async methods directly.
  `Dispatchers.IO` / coroutines wrappers are prohibited unless the SDK requires them.

#### iOS Runtime Behavior (Two-Level Guard)

When the library is imported or used on iOS, the following behavior MUST be enforced
in `src/index.tsx`:

**Level 1 — Import warning** (module top-level, non-crashing):
```typescript
if (Platform.OS !== 'android') {
  console.warn(
    '[react-native-pagseguro-plugpag] WARNING: iOS is not supported. ' +
    'PagSeguro PlugPag SDK is Android-only.'
  );
}
```

**Level 2 — Method guard** (inside every exported function):
```typescript
if (Platform.OS !== 'android') {
  throw new Error(
    '[react-native-pagseguro-plugpag] ERROR: <methodName>() is not supported on iOS. ' +
    'PagSeguro PlugPag SDK is Android-only.'
  );
}
```

Rules:
- The import warning MUST NOT throw — the app MUST open normally on iOS.
- Every exported method MUST include the Level 2 guard before any native call.
- `TurboModuleRegistry.getEnforcing` MUST NOT be used without a preceding platform guard;
  its uncatchable native crash is prohibited as the sole iOS failure signal.
- The exact message prefixes `[react-native-pagseguro-plugpag] WARNING:` and
  `[react-native-pagseguro-plugpag] ERROR:` MUST be preserved for grep-ability.

**Rationale**: The target devices are Android-embedded SmartPOS terminals. The two-level
guard (warn → throw) ensures iOS consumers receive an actionable, catchable error rather
than a cryptic native crash. The import-level warning surfaces the issue at Metro startup,
before any method is called, improving debuggability without breaking app initialization.

## API Contract

The API surface MUST map the PlugPagServiceWrapper SDK to the JS layer following these rules:

- All synchronous SDK methods MUST be exposed as `Promise<T>` on the JS side (threading safety).
- Async SDK callbacks (listeners) MUST be modeled via `NativeEventEmitter` + React hooks.
- The TurboModule Spec MUST use only Codegen-compatible primitive types (`string`, `number`,
  `boolean`, `Object`, `Array`, `Promise`). Complex types use `Object` in the spec and are
  typed via safe type assertion in the public TypeScript layer.
- The public API (`src/index.ts`) MUST expose fully-typed wrappers; internal spec types
  are never exported directly.

### Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Data interface | PascalCase + descriptive suffix | `PaymentData`, `TransactionResult` |
| Const enum object | PascalCase | `PaymentType`, `InstallmentType` |
| Exported functions | camelCase | `doPayment`, `initializeAndActivatePinpad` |
| Hooks | `use` + PascalCase | `useTransactionPaymentEvent` |
| Type files | kebab-case | `payment.ts`, `nfc.ts` |
| TurboModule spec file | `Native<ModuleName>.ts` | `NativePagseguroPlugpag.ts` |
| Kotlin classes | PascalCase | `PagseguroPlugpagModule` |
| Kotlin constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

### SDK Version

The library targets `br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0` via the
`https://github.com/pagseguro/PlugPagServiceWrapper/raw/master` Maven repository.

## Development Workflow & Quality Gates

### Before Implementing Any Feature

1. Verify the method exists in the API Surface mapping (prd-constituition.md §4 or spec.md).
2. Write the unit test first — it MUST fail before proceeding (Principle III).
3. Confirm the return type is defined in `src/types/`; add it if missing.
4. If a new native method is needed: update `NativePagseguroPlugpag.ts` spec first.

### PR Checklist (All items MUST pass)

- [ ] Unit tests for all new code — 100% coverage of additions.
- [ ] `yarn lint` passes with zero errors or warnings — MUST be run after every implementation
  phase and confirmed clean before opening a PR.
- [ ] No `any` — ESLint blocks, but MUST be manually verified beyond lint output.
- [ ] Types added/updated in `src/types/` and re-exported from `src/types/index.ts`.
- [ ] Method exposed in `src/index.ts` if part of the public API.
- [ ] TurboModule spec (`NativePagseguroPlugpag.ts`) updated if a new native method was added.
- [ ] Kotlin implementation updated in `PagseguroPlugpagModule.kt`.
- [ ] Kotlin integration test for any new native method.

### Absolute Prohibitions

- Committing code without tests.
- Opening or merging a PR when `yarn lint` reports any errors or warnings.
- Using `any` without documented exception.
- Exposing SDK internals directly — all types MUST be mapped to library-owned types.
- Calling `PlugPag` outside `PagseguroPlugpagModule.kt`.
- Adding business logic to the Kotlin module beyond serialization and SDK calls.
- Re-introducing Bridge-based communication patterns.

## Governance

This constitution supersedes all other project-level coding standards and practices.
Amendments require:

1. A documented rationale for the change.
2. Version bump per the versioning policy below.
3. Update of all dependent templates and spec files.
4. Entry added to the decision log (prd-constituition.md §13 or equivalent).

**Versioning Policy**:
- **MAJOR**: Backward-incompatible governance changes — principle removal or redefinition.
- **MINOR**: New principle or section added, or materially expanded guidance.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

**Compliance**: All PRs and spec reviews MUST verify compliance with Principles I–VI before merge.
The `/speckit.plan` Constitution Check gate MUST reference this document.

**Version**: 1.2.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-21
