# Research: Library Documentation

**Phase**: 0 — Outline & Research  
**Feature**: `feature/009-library-docs`  
**Date**: 2026-04-02

## Overview

This is a documentation-only feature. The primary research was conducted in the PRD (`PRD-documentation.md`, Section 2), which analyzed four comparable libraries. Findings are consolidated here with decisions and rationale.

---

## Decision 1: README Structure Pattern

**Decision**: Progressive Disclosure — from overview to prerequisites to installation to usage examples to API reference.

**Rationale**: Adopted from Stripe React Native (the library most similar to our use case — payments, native SDK, Android-focused). Ensures developers can self-qualify the library quickly (overview), then dive as deep as needed without being overwhelmed upfront.

**Alternatives considered**:
- Bottom Sheet pattern (badge-heavy header, no inline content) — rejected: leaves developers with no actionable information in the README itself.
- VisionCamera pattern (thin README + external docs site) — rejected: the library is not yet at scale to justify a Docusaurus site. Deferred to future work.
- Reanimated pattern (external docs as source of truth) — rejected: same reason as above.

---

## Decision 2: Bilingual Approach

**Decision**: Two separate, structurally identical files — `README.md` (English) and `README-PTBR.md` (Portuguese Brazil). No automated sync between them; maintained in parallel.

**Rationale**: GitHub and npm only render `README.md` by default, making the English file the primary entry point for the global audience. A separate PT-BR file serves the Brazilian developer market (the primary commercial target) without compromising the international entry point. Inline translation tabs or i18n tooling add toolchain complexity not justified by the library's current scale.

**Alternatives considered**:
- Single bilingual file with tabs — rejected: not natively supported in GitHub Markdown; requires static site.
- Auto-translation via CI — rejected: adds CI complexity and translation quality risk.

---

## Decision 3: Code Example Comment Language

**Decision**: All inline code comments in English in both `README.md` and `README-PTBR.md`.

**Rationale**: User clarification (Session 2026-04-02, Q2). Simplifies maintenance — a single source of truth for comments avoids divergence between files when the API evolves. Comments are terse annotations; the surrounding prose (in PT-BR) provides full context for Portuguese-speaking readers.

**Alternatives considered**:
- Match comment language to file language — rejected by user in clarification session.
- No comments — rejected: some examples (e.g., `amount` in cents) require inline explanation for correctness.

---

## Decision 4: CODE_OF_CONDUCT.md Contact Method

**Decision**: GitHub Issues URL — `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues`.

**Rationale**: User clarification (Session 2026-04-02, Q1). Standard for open source projects; doesn't expose maintainer personal email; issues are already the project's tracking mechanism.

**Alternatives considered**:
- Maintainer email — rejected: exposes personal information publicly.
- Dedicated conduct email — rejected: requires creating and monitoring a new email account.

---

## Decision 5: Error Code Documentation Format

**Decision**: Per-domain subsection within the API Reference, listing error codes as a simple table with three columns: Code, When Thrown, Meaning.

**Rationale**: Developers encountering an error code in their app need three things simultaneously — what it's called, when it occurs, and what it means. A table is the most scannable format for this.

**Format per domain**:

| Error Code | When Thrown | Meaning |
|---|---|---|
| `PLUGPAG_<DOMAIN>_ERROR` | SDK returns `result != RET_OK` | Hardware/network-level rejection from the PagBank SDK |
| `PLUGPAG_INTERNAL_ERROR` | Unexpected exception caught | IPC failure, unreachable service, or unexpected SDK state |
| `PLUGPAG_VALIDATION_ERROR` | Invalid input parameters (print only) | `filePath` empty, `steps` < 0, or `printerQuality` outside 1–4 |

---

## Decision 6: Repository URL and Badges

**Decision**: Use the following badge and URL values:

| Badge | Source URL |
|---|---|
| npm version | `https://img.shields.io/npm/v/react-native-pagseguro-plugpag.svg` |
| License | `https://img.shields.io/badge/License-MIT-yellow.svg` |
| Platform | `https://img.shields.io/badge/Platform-Android-green.svg` |
| React Native | `https://img.shields.io/badge/React%20Native-0.76%2B-blue.svg` |

**GitHub repository URL**: `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag`  
**npm package URL**: `https://www.npmjs.com/package/react-native-pagseguro-plugpag`

**Note**: npm badge URL will return a fallback until the package is published. This is acceptable — badge renders gracefully showing "not found" until publication.

---

## Decision 7: Logo Asset Handling

**Decision**: The header logo path (`.github/images/react-native-pagseguro-plugpag-logo.png`) will be included in the documentation at the designated path. If the asset is not yet available, the `<img>` tag will be present but the image will not render until the file is added to `.github/images/`. The documentation is complete regardless of asset availability.

**Rationale**: The Assumptions section of the spec allows for a placeholder. Including the correct path now means no documentation changes are needed when the logo asset is added.

---

## Resolved NEEDS CLARIFICATION Items

All clarifications were resolved in the `/speckit.clarify` session on 2026-04-02:

| Item | Resolution |
|---|---|
| Contact method for CODE_OF_CONDUCT.md | GitHub Issues URL |
| Code comment language in bilingual READMEs | English in both files |

No outstanding NEEDS CLARIFICATION items remain.
