# Quickstart: Documentation Maintenance Guide

**Feature**: `feature/009-library-docs`  
**Date**: 2026-04-02

## Purpose

This guide explains how to keep the library documentation accurate and up to date as the library evolves. It is intended for library maintainers making changes after the initial documentation is written.

---

## When to Update Documentation

| Trigger | Files to Update |
|---------|----------------|
| New function exported from `src/index.ts` | README.md, README-PTBR.md — Usage section (new example) + API Reference Functions table |
| Existing function signature changes | README.md, README-PTBR.md — relevant Usage example + API Reference row |
| New type or interface added to public API | README.md, README-PTBR.md — API Reference Types & Interfaces section |
| New constant or enum value added | README.md, README-PTBR.md — API Reference Constants section |
| New error code introduced | README.md, README-PTBR.md — API Reference Error Codes table |
| New prerequisite required | README.md, README-PTBR.md — Prerequisites section |
| Installation steps change | README.md, README-PTBR.md — Installation section |
| New contribution convention added | CONTRIBUTING.md |

---

## Documentation Update Checklist

When updating either README file, always:

- [ ] Apply the same change to BOTH files (parity contract — see `contracts/structural-parity.md`).
- [ ] Verify code examples match the current exported API by cross-referencing `src/index.ts`.
- [ ] Ensure inline code comments are in English in both files.
- [ ] Keep technical terms (function names, type names, constant names) in English in `README-PTBR.md`.
- [ ] Verify no broken Markdown links or anchors after changes.

---

## Verifying Code Example Accuracy

All code examples in the README files must match the current public API. To verify:

1. Check `src/index.ts` for the list of all exported symbols.
2. Cross-reference each example against the exported function signatures in `src/functions/<domain>/index.ts`.
3. Verify parameter names and types against `src/functions/<domain>/types.ts`.
4. Verify return types against `src/types/` (shared) or `src/functions/<domain>/types.ts` (domain-specific).

---

## Future Work (Out of Scope for This Feature)

The following documentation improvements were evaluated and deferred:

- **Docusaurus documentation site**: A full docs portal with versioned content, search, and guided tutorials. Deferred until the library reaches a wider adoption threshold.
- **Changelog / migration guide**: Will be introduced alongside the first breaking API change or before the first stable (1.0.0) release.
- **npm publication**: A separate effort. Badge URLs will resolve correctly once the package is published at `https://www.npmjs.com/package/react-native-pagseguro-plugpag`.
- **Logo asset**: To be added at `.github/images/react-native-pagseguro-plugpag-logo.png`. The `<img>` tag is already in both README files; adding the asset is sufficient to make it render.
