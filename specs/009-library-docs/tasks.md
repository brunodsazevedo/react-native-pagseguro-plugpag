# Tasks: Library Documentation

**Input**: Design documents from `/specs/009-library-docs/`  
**Feature Branch**: `feature/009-library-docs`  
**Generated**: 2026-04-02

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. No tests are generated — this is a documentation-only feature; manual acceptance gates are defined per the spec's Success Criteria (SC-001 through SC-006).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every description

---

## Phase 1: Setup — Verify API Surface

**Purpose**: Establish a complete, accurate API surface inventory before writing any documentation. All content in later phases depends on this baseline.

- [X] T001 Read `src/index.ts`, `src/functions/activation/index.ts`, `src/functions/activation/types.ts`, `src/functions/payment/index.ts`, `src/functions/payment/types.ts`, `src/functions/refund/index.ts`, `src/functions/refund/types.ts`, `src/functions/print/index.ts`, `src/functions/print/types.ts`, `src/hooks/usePaymentProgress.ts`, `src/types/sharedTypes.ts`, and `src/NativePagseguroPlugpag.ts` — build a complete inventory of all exported functions (names, parameters, return types), interfaces (all properties with types), constants (names and values), and hooks used in later documentation phases

---

## Phase 2: Foundational — Capture Existing File State

**Purpose**: Read the current state of files that will be modified to understand what must be preserved and what must change.

**⚠️ CRITICAL**: Complete before US4 tasks begin.

- [X] T002 Read `CONTRIBUTING.md` to capture its current structure and identify all iOS, Xcode, `.xcworkspace`, Pods, `pod install`, and `example/ios/` references to be removed in T014
- [X] T003 [P] Read `CODE_OF_CONDUCT.md` to locate the exact `[INSERT CONTACT METHOD]` placeholder text to be replaced in T015

**Checkpoint**: API inventory and existing file baselines are ready — user story phases can begin.

---

## Phase 3: User Story 1 — Developer Evaluates and Installs the Library (Priority: P1) 🎯 MVP

**Goal**: A developer can read the README and successfully install the library in either Bare React Native or Expo workflow without consulting any external resource.

**Independent Test**: Open a fresh React Native project, follow only the README from top to bottom, run the build — the library must be importable and the example app must compile.

### Implementation for User Story 1

- [X] T004 [US1] Create `README.md` with the Header section: centered `<img>` pointing to `.github/images/react-native-pagseguro-plugpag-logo.png`, H1 title `react-native-pagseguro-plugpag`, a tagline describing the library, and the 4 badges (npm version, License MIT, Platform Android, React Native 0.76+) using the shield.io URLs from `specs/009-library-docs/research.md` Decision 6
- [X] T005 [US1] Add "What is this?" section to `README.md` — 3 paragraphs: (1) the problem (accepting payments on PagBank SmartPOS terminals from React Native), (2) the solution (TurboModule wrapping PlugPagServiceWrapper — list terminals A920, A930, P2, S920), (3) SDK context (PlugPagServiceWrapper 1.33.0, Maven URL `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master`)
- [X] T006 [US1] Add Prerequisites section to `README.md` covering: hardware (PagBank SmartPOS terminal required), React Native ≥ 0.76 with New Architecture enabled, Android min SDK 24 / compile SDK 36 / target SDK 36, Expo: SDK 52+, Expo Go explicitly not supported, dev-client or production build required
- [X] T007 [US1] Add Installation section to `README.md` with H3 "Installation — Bare React Native" (step 1: install via `npm install react-native-pagseguro-plugpag` or `yarn add react-native-pagseguro-plugpag`; step 2: verify `newArchEnabled=true` in `android/gradle.properties`; step 3: add Maven repository to `android/build.gradle` with the `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master` URL; step 4: build; a warning callout stating the SDK dependency must NOT be added manually; a summary checklist table) and H3 "Installation — Expo" (plugin config block for `app.json`, list of what the plugin auto-configures, build commands `eas build` or `npx expo run:android`; note that Expo Go is not supported; summary table)
- [X] T008 [US1] Add Limitations, Contributing, and License sections to `README.md` — Limitations as a bullet list (iOS not supported, non-SmartPOS devices not supported, financial reports and statement queries out of scope, autonomous NFC without PlugPag out of scope); Contributing as a short paragraph linking to `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`; License as a one-liner ("MIT — see LICENSE")
- [X] T009 [P] [US1] Create `README-PTBR.md` with the complete set of User Story 1 sections (Header identical to `README.md`, "O que é esta biblioteca?", "Pré-requisitos", "Instalação" with H3 "Instalação — Bare React Native" and H3 "Instalação — Expo", "Limitações e Escopo", "Contribuindo", "Licença") — section titles in Portuguese per the mapping in `specs/009-library-docs/contracts/structural-parity.md`; prose in Portuguese; all code blocks (package.json snippets, gradle blocks, app.json config) identical to `README.md`; inline code comments in English

**Checkpoint**: Both README files have Header through License. User Story 1 acceptance scenarios (SC-001, SC-006) can be manually validated.

---

## Phase 4: User Story 2 — Developer Implements Payment Operations (Priority: P2)

**Goal**: A developer can copy any usage example directly into their project and have it work without cross-referencing the API reference section.

**Independent Test**: Copy each code snippet individually into a TypeScript file, verify it compiles against the current `src/index.ts` exports, and verify all referenced constants and types exist.

### Implementation for User Story 2

- [X] T010 [US2] Add Usage section to `README.md` with all 8 sub-sections in this exact order: (1) "Activating the PinPad" — complete sync example (`initializeAndActivatePinPad`) with try/catch and complete async example (`doAsyncInitializeAndActivatePinPad`) with explanation of when to use each; (2) "Debit Payment" — complete `doPayment` snippet with `PaymentType.DEBITO`, `amount` in cents, `installmentType: InstallmentType.A_VISTA`; (3) "Credit Payment" — two snippets: à vista (`InstallmentType.A_VISTA`, `installments: 1`) and parcelado (`InstallmentType.PARC_VENDEDOR` or `PARC_COMPRADOR`, `installments` > 1); (4) "PIX Payment" — complete `doPayment` snippet with `PaymentType.PIX`; (5) "Refund" — two snippets: card refund using `doRefund` with `PlugPagVoidType.VOID_PAYMENT` (referencing `transactionCode` and `transactionId` from the original `PlugPagTransactionResult`), PIX refund using `doRefund` with `PlugPagVoidType.VOID_QRCODE`; (6) "Custom Printing — printFromFile" — complete `printFromFile` snippet showing `filePath`, `PrintQuality.HIGH`, `MIN_PRINTER_STEPS`, try/catch with `PLUGPAG_VALIDATION_ERROR` in error handling comment; (7) "Reprinting Receipts" — 4 snippets: `reprintCustomerReceipt` (sync), `reprintEstablishmentReceipt` (sync), `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt`, with a note on when to prefer sync vs async; (8) "Payment Progress Hook — usePaymentProgress" — complete React functional component using `useCallback`, `usePaymentProgress` subscription, `PlugPagPaymentProgressEvent` type annotation, event display in JSX, and `cleanup()` call on unmount via `useEffect` return
- [X] T011 [P] [US2] Add "Uso" section to `README-PTBR.md` mirroring T010 with all 8 sub-sections in the same order — titles in Portuguese per `specs/009-library-docs/contracts/structural-parity.md` (e.g. "Ativação do PinPad", "Pagamento com Débito", "Pagamento com Crédito", "Pagamento com PIX", "Estorno", "Impressão Personalizada", "Reimpressão de Comprovantes", "Hook de Progresso de Pagamento"); prose in Portuguese; all code blocks byte-for-byte identical to `README.md`; inline comments in English

**Checkpoint**: Both README files have complete Usage sections. User Story 2 acceptance scenarios can be manually validated by copying snippets.

---

## Phase 5: User Story 3 — Developer Looks Up API Details (Priority: P3)

**Goal**: A developer can look up any function, type, constant, or error code in the API reference without reading the Usage section.

**Independent Test**: Pick any exported symbol from `src/index.ts` — it must appear in the API reference with all properties, parameter types, and return types documented.

### Implementation for User Story 3

- [X] T012 [US3] Add "API Reference" section to `README.md` with 5 sub-sections: (1) "Functions" — markdown table with columns `Function | Parameters | Returns | Description`, one row per exported function (11 total — verify against T001 inventory: `initializeAndActivatePinPad`, `doAsyncInitializeAndActivatePinPad`, `doPayment`, `doAsyncPayment`, `doRefund`, `printFromFile`, `reprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintCustomerReceipt`, `doAsyncReprintEstablishmentReceipt`, and any others confirmed in T001); (2) "Hooks" — table for `usePaymentProgress` with parameters, return type `{ event: PlugPagPaymentProgressEvent | null; cleanup: () => void }` (or actual from T001), description; (3) "Types & Interfaces" — one property table per interface with columns `Property | Type | Required | Description` for: `PlugPagPaymentRequest`, `PlugPagRefundRequest`, `PlugPagTransactionResult`, `PlugPagPaymentProgressEvent`, `PrintRequest`, `PrintResult` (use actual properties from T001 inventory); (4) "Constants" — one table per constant group: `PaymentType` (DEBITO, CREDITO, PIX with values), `InstallmentType` (A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR with values), `PlugPagVoidType` (VOID_PAYMENT, VOID_QRCODE with values), `PrintQuality` (LOW, MEDIUM, HIGH, BEST with numeric values 1–4), `MIN_PRINTER_STEPS` (numeric constant value and description); (5) "Error Codes" — 4 per-domain tables (activation, payment, refund, print) each with columns `Error Code | When Thrown | Meaning`, using the format from `specs/009-library-docs/research.md` Decision 5 — include `PLUGPAG_VALIDATION_ERROR` in the print domain table
- [X] T013 [P] [US3] Add "Referência de API" section to `README-PTBR.md` mirroring T012 with all 5 sub-sections — section titles in Portuguese ("Funções", "Hooks", "Tipos e Interfaces", "Constantes", "Códigos de Erro"); table column headers in Portuguese where applicable; all code values (function names, type names, constant names, error codes) preserved in English; table structure (row count, column count) identical to `README.md`

**Checkpoint**: Both README files are complete. User Story 3 acceptance scenarios can be manually validated. SC-002 (100% API coverage) and SC-003 (structural parity) can be checked.

---

## Phase 6: User Story 4 — Contributor Understands How to Contribute (Priority: P4)

**Goal**: A new contributor can read CONTRIBUTING.md and set up an Android development environment, follow git conventions, and submit a correct PR without encountering any iOS references.

**Independent Test**: Read CONTRIBUTING.md end-to-end — zero occurrences of "iOS", "Xcode", "CocoaPods", "pod install", or ".xcworkspace".

### Implementation for User Story 4

- [X] T014 [US4] Update `CONTRIBUTING.md` — (a) remove all iOS/Xcode/CocoaPods/pod/`.xcworkspace`/`example/ios/` references and macOS-only prerequisites identified in T002; (b) add "Android Development Setup" section covering: Android Studio installation, Java/JDK for Gradle, Android SDK with API level 24 minimum and 36 target; (c) add "Git Flow" section with branch naming convention: `main` (production), `develop` (integration branch), `feature/NNN-name`, `bugfix/NNN-name`, `hotfix/NNN-name`; (d) add "Commit Message Convention" section (conventional commits format with types: feat, fix, docs, refactor, test, chore); (e) add or replace PR checklist section aligned with Constituição v1.3.0: ☐ unit tests for all new code (100% coverage), ☐ `yarn lint` passes with zero warnings, ☐ zero `any` without documented exception, ☐ codegen regenerated (`cd example/android && ./gradlew generateCodegenArtifactsFromSchema`) when `NativePagseguroPlugpag.ts` changes, ☐ `src/index.ts` updated if new public API; preserve general open source etiquette sections (how to open issues, pull request etiquette)
- [X] T015 [P] [US4] Update `CODE_OF_CONDUCT.md` — locate the exact `[INSERT CONTACT METHOD]` placeholder identified in T003 and replace it with `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues`; make no other structural changes

**Checkpoint**: CONTRIBUTING.md and CODE_OF_CONDUCT.md are updated. SC-005 (zero iOS references) and US4 acceptance scenarios can be manually validated.

---

## Phase 7: Polish & Verification

**Purpose**: Cross-file consistency checks and final acceptance validation.

- [X] T016 Verify structural parity between `README.md` and `README-PTBR.md` per `specs/009-library-docs/contracts/structural-parity.md` — count H2 and H3 headings in both files (must be equal), count fenced code blocks (must be equal), count tables (must be equal); confirm no `[INSERT ...]` placeholders remain in any of the 4 files; confirm section title mapping matches the table in the parity contract exactly
- [X] T017 [P] Verify all code examples in `README.md` and `README-PTBR.md` match the current public API surface — for every function call in a code block, confirm the function exists in the T001 inventory, parameter names match the interface properties, and required fields are not missing; fix any discrepancies found
- [X] T018 [P] Verify `CONTRIBUTING.md` contains zero occurrences of the strings "iOS", "Xcode", "CocoaPods", "pod install", ".xcworkspace", and "example/ios" (SC-005); report any found occurrences for removal

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependencies — can run in parallel with Phase 1
- **US1 (Phase 3)**: Depends on T001 (API surface) for accurate prerequisites — begin after Phase 1
- **US2 (Phase 4)**: Depends on T001 (API surface) for accurate code examples — begin after Phase 1
- **US3 (Phase 5)**: Depends on T001 (API surface inventory) — begin after Phase 1
- **US4 (Phase 6)**: Depends on T002 and T003 (existing file baselines) — begin after Phase 2
- **Polish (Phase 7)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 only — no dependency on other user stories
- **US2 (P2)**: Depends on Phase 1 only — can proceed in parallel with US1 (different sections/files)
- **US3 (P3)**: Depends on Phase 1 only — can proceed in parallel with US1 and US2 (different sections/files)
- **US4 (P4)**: Depends on Phase 2 only — fully independent of US1/US2/US3

### Within Each User Story

- README.md task before README-PTBR.md task (content is derived from EN version)
- Exception: tasks marked [P] affecting different files can run in parallel

### Parallel Opportunities

- T002 and T003 (Phase 2) — different files, run in parallel
- T009 (README-PTBR.md US1) can run in parallel with T004–T008 (README.md US1) — different files
- T011 (README-PTBR.md US2) can run in parallel with T010 (README.md US2) — different files
- T013 (README-PTBR.md US3) can run in parallel with T012 (README.md US3) — different files
- T015 (CODE_OF_CONDUCT.md) can run in parallel with T014 (CONTRIBUTING.md) — different files
- T017 and T018 can run in parallel with T016 (Phase 7) — different validation checks

---

## Parallel Example: User Story 1

```
# Once T001 completes, launch in parallel:
Task T004: Create README.md Header section
Task T009: Create README-PTBR.md US1 sections

# T009 can start as soon as T004–T008 are written — different files, no blocking
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Read API surface (T001)
2. Complete Phase 2: Read existing files (T002, T003 in parallel)
3. Complete Phase 3: Write US1 sections in both README files (T004–T009)
4. **STOP and VALIDATE**: Can a developer install the library by reading only the README?
5. Proceed to US2 when validated

### Incremental Delivery

1. Setup + Foundational → baseline established
2. US1 (T004–T009) → Header + Prerequisites + Installation in both files — **MVP!**
3. US2 (T010–T011) → Usage examples in both files
4. US3 (T012–T013) → API Reference in both files
5. US4 (T014–T015) → Contributor files updated
6. Polish (T016–T018) → Parity and accuracy verified

### Parallel Team Strategy

With multiple contributors:

1. Phase 1 and Phase 2 together (fast, read-only)
2. Then in parallel:
   - Contributor A: US1 (T004–T009)
   - Contributor B: US2 (T010–T011)
   - Contributor C: US3 (T012–T013)
   - Contributor D: US4 (T014–T015) — fully independent
3. Polish: T016–T018 after all stories complete

---

## Notes

- [P] tasks = operate on different files, no unresolved dependencies
- [Story] label maps each task to its user story for traceability
- All code examples must use only symbols confirmed in the T001 inventory — no guessing
- Inline code comments MUST be in English in both `README.md` and `README-PTBR.md`
- Technical terms (function names, type names, constant names) are preserved in English in `README-PTBR.md`
- `README-PTBR.md` must be independently readable — no cross-references to `README.md`
- Verify structural parity (T016) before closing the PR
