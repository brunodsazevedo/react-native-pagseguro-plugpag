<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.3.0 (MINOR — folder structure, import rules, native module access
  pattern (getNativeModule), and import organization convention added)
Modified sections:
  - Principle IV: directory structure, import rules between layers, type placement rule
  - Principle VI: guard placement after domain split; src/index.tsx → src/index.ts
  - Development Workflow > Before Implementing step 3: type placement criterion updated
  - Development Workflow > PR Checklist: types item updated
  - API Contract > Naming Conventions: type/hook/domain file rows updated
Added sections:
  - Code Standards > Import Style & Organization (getNativeModule pattern + import order)
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md     ✅ Constitution Check is dynamic; no update required
  - .specify/templates/spec-template.md     ✅ No constitution-specific references; compatible as-is
  - .specify/templates/tasks-template.md    ✅ No path examples affected; compatible as-is
  - CLAUDE.md                               ⚠ pending — sync M8–M13 in follow-up step
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

#### Directory Structure (enforced by Principle IV)

```
src/
├── NativePagseguroPlugpag.ts        ← TurboModule spec (unchanged)
├── functions/
│   ├── activation/
│   │   ├── types.ts                 ← domain types only (no logic, no React)
│   │   └── index.ts                 ← exported functions + private validation + Level 2 guard
│   ├── payment/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── refund/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── print/
│   │   ├── types.ts
│   │   └── index.ts
│   └── index.ts                     ← barrel: re-exports all domains
├── hooks/
│   └── usePaymentProgress.ts        ← React hooks (no barrel)
├── types/                           ← shared types only (used by ≥2 domains)
│   └── (empty until cross-domain types are needed)
└── index.ts                         ← public barrel: iOS Level 1 warn + re-exports
```

#### Import Rules Between Layers

| Source | May import from | Prohibited |
|---|---|---|
| `functions/<domain>/types.ts` | nothing internal | any other domain |
| `functions/<domain>/index.ts` | `./types` directly | other domains, `hooks/`, root barrel |
| `functions/index.ts` | `./<domain>` per domain | `hooks/`, `types/` |
| `hooks/<hook>.ts` | `../functions/<domain>/index` or `../functions/<domain>/types` directly | `../functions/index` (circular via barrel), root barrel `'../index'` |
| `index.ts` | `'./functions'` (barrel), `'./hooks/<hook>'` (direct), `'./types/<file>'` (direct) | — |

Cross-domain imports within `functions/` are prohibited — each domain accesses the native SDK
directly via `NativePagseguroPlugpag`. The only permitted cross-domain dependency is
`hooks/ → functions/<domain>/`.

#### Type Placement Rule

```
Is the type used by more than one domain?
├── YES → src/types/           (shared)
└── NO  → <domain>/types.ts   (domain-specific)
```

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
in `src/index.ts`:

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

**Guard placement after domain split**:
- Level 1 (`console.warn`) lives exclusively in `src/index.ts` (module top-level).
- Level 2 (`throw new Error`) MUST be present in every exported function inside
  `functions/<domain>/index.ts`. It MUST NOT be placed only in `src/index.ts`,
  because domain functions are re-exported directly (no wrapper).
- The native module accessor (`getNativeModule()`) MUST only be called after the
  Level 2 guard, never at module top-level. See Import Style section for the full pattern.

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
| Domain type files | `functions/<domain>/types.ts` | `functions/payment/types.ts` |
| Domain index files | `functions/<domain>/index.ts` | `functions/payment/index.ts` |
| Hook files | `hooks/<hookName>.ts` | `hooks/usePaymentProgress.ts` |
| TurboModule spec file | `Native<ModuleName>.ts` | `NativePagseguroPlugpag.ts` |
| Kotlin classes | PascalCase | `PagseguroPlugpagModule` |
| Kotlin constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

### SDK Version

The library targets `br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0` via the
`https://github.com/pagseguro/PlugPagServiceWrapper/raw/master` Maven repository.

## Code Standards

### Import Style & Organization

#### Native Module Accessor Pattern (`getNativeModule`)

`NativePagseguroPlugpag.ts` line 18 executes `TurboModuleRegistry.getEnforcing(...)` **at
module evaluation time**. An ES value import at the top of any domain file would trigger
that `getEnforcing` before any platform guard, causing an uncatchable native crash on iOS.

The native module accessor MUST therefore remain lazy. The `getNativeModule()` pattern
achieves this while eliminating repeated `require()` inline per function:

```typescript
// functions/payment/index.ts

// Group 1 — external libraries
import { Platform } from 'react-native';

// Group 4 — type-only imports (import type — zero runtime effect with verbatimModuleSyntax)
import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagPaymentRequest, PlugPagTransactionResult } from './types';

// Private lazy accessor — NativePagseguroPlugpag.ts calls getEnforcing() on evaluation;
// this require() MUST only execute after the Level 2 platform guard.
// NEVER call getNativeModule() before the Level 2 platform guard.
// EXCEPTION: require() is necessary here because NativePagseguroPlugpag.ts calls
// TurboModuleRegistry.getEnforcing() at module evaluation. An ES import would crash iOS.
function getNativeModule(): Spec {
  return (require('../../NativePagseguroPlugpag') as { default: Spec }).default;
}

export async function doPayment(
  data: PlugPagPaymentRequest
): Promise<PlugPagTransactionResult> {
  if (Platform.OS !== 'android') {
    throw new Error('[react-native-pagseguro-plugpag] ERROR: doPayment() ...');
  }
  return getNativeModule().doPayment(data) as Promise<PlugPagTransactionResult>;
}
```

Rules:
- `getNativeModule()` MUST exist exactly once per domain file — never inline in each function.
- `import type { Spec }` at the top is safe: with `verbatimModuleSyntax: true`, it emits
  no runtime instruction.
- The sole exception to ES imports across the project is this accessor. Everything else
  MUST use ES `import` syntax.

#### Mandatory Import Order

Every TypeScript file MUST follow this group order, with **one blank line** between groups.
Empty groups MUST be omitted (no unnecessary blank lines).

```typescript
// Group 1 — external libraries (react, react-native, npm packages)
import { Platform, NativeEventEmitter } from 'react-native';

// Group 2 — internal project files (value imports)
import { subscribeToPaymentProgress } from '../functions/payment/index';

// Group 3 — internal hooks (when the file imports them)
import { usePaymentProgress } from '../hooks/usePaymentProgress';

// Group 4 — type-only imports (import type)
import type { Spec } from '../../NativePagseguroPlugpag';
import type { PlugPagPaymentRequest, PlugPagTransactionResult } from './types';
```

Derived rules:
- `import type` MUST always be the last group — never mixed with value imports.
- Within each group, sort alphabetically by module path.
- This convention applies to all files in `functions/`, `hooks/`, `types/`, and `src/index.ts`.

## Development Workflow & Quality Gates

### Before Implementing Any Feature

1. Verify the method exists in the API Surface mapping (prd-constituition.md §4 or spec.md).
2. Write the unit test first — it MUST fail before proceeding (Principle III).
3. Confirm the return type is in the correct location:
   - Domain-specific type → `src/functions/<domain>/types.ts`
   - Type shared between ≥2 domains → `src/types/`
   Add it if missing.
4. If a new native method is needed: update `NativePagseguroPlugpag.ts` spec first.

### PR Checklist (All items MUST pass)

- [ ] Unit tests for all new code — 100% coverage of additions.
- [ ] `yarn lint` passes with zero errors or warnings — MUST be run after every implementation
  phase and confirmed clean before opening a PR.
- [ ] No `any` — ESLint blocks, but MUST be manually verified beyond lint output.
- [ ] Types placed correctly: domain-specific in `src/functions/<domain>/types.ts`;
      cross-domain shared types in `src/types/`.
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

**Version**: 1.3.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-29
