# Phase 5: family completeness and duplicate safeguards

## What this prototype adds

- Versioned schema support for repeatable groups with explicit minimum/maximum record counts.
- Stable, generated local record IDs, per-record fields, removal controls, and required-field completeness checks.
- A local duplicate check against a controlled fictional label field inside the current sample list.
- A self-attestation example that explains it cannot detect entries outside this case.
- English and Amharic presentation, with values saved only in the current browser tab.

The sample uses labels A, B, and C instead of names, birth dates, family relationships, or other identity details. It exists to demonstrate mechanics, not household eligibility rules.

## Limits and safety boundaries

- DV-2027 remains blocked and has zero published fields while official instructions are unavailable.
- The sample's duplicate check only detects repeated demonstration labels within one browser-tab draft. It is not identity matching and cannot find other cases or outside submissions.
- No names, dates of birth, country data, hashes, face data, or external identity searches are used for duplicate detection.
- No current-cycle spouse/child inclusion rules are encoded. Those require exact official source review before a real family section can be released.
- The flow remains a front-end prototype. Phase 3 database/API security and case authorization checks remain incomplete; do not enter real applicant data.

## Before real family intake

Verify current-cycle spouse/child categories, age cutoffs, inclusion rules, travel-status treatment, photo requirements, and any entry attestation against official instructions. Record source URLs and the reviewer/date in a new immutable cycle config. Add server-side validation, version pinning, audit events, recovery behavior, and privacy/retention review. Any cross-case duplicate matching would need a separate privacy and threat review, false-match procedure, and explicit approval before implementation.
