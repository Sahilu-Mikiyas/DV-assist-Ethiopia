# Phase 8 — Staff dashboard and case operations

**Implementation status (October 17, 2026):** The synthetic demo queue has search by fictional name, case ID, and language, plus a status filter. The separate authenticated Phase 3 portal already has an MFA-gated staff queue, server-side constrained status changes, administrator assignment, and access-audited case timelines. The Phase 3 database/authorization integration gate remains open, so neither should be used to operate real cases.

## Demo behavior

- Search and status filters operate on the existing fictional seed cases.
- The result count updates with the filters; the case details panel follows the selected case only while it matches the current filter.
- Status and fictional internal-note edits remain browser-session demo state. They do not create an audit history or notify an applicant.
- The demo continues to label payment as not connected. It does not reconcile Telebirr payments or expose payment evidence.

## Existing authenticated foundation

- Staff case reads require staff or administrator role and verified MFA.
- Status changes use server-side allowed transitions, expected revision, and event history.
- Assignment is administrator-only and requires an eligible staff account.
- Case timeline access is audited.
- Staff account and role management is MFA-gated; see the Phase 3 operations/security notes.

These capabilities have not passed the PostgreSQL integration gate in the current environment. They are code foundations, not an operational service guarantee.

## Remaining Phase 8 work

- Define and implement applicant-visible correction requests with categories, message versions, notification privacy, and attributable resolution.
- Connect staff answer review to a verified versioned applicant schema and approval revision; do not expose sensitive answer data to broad staff roles.
- Add photo review only after applicable photo rules and private storage/scan/retention controls are verified.
- If notes are introduced, distinguish applicant-visible messages from private notes, define retention, and audit create/edit/delete.
- Add exception queues and operationally necessary filters only after payment/case states are defined. Keep service fee reconciliation independent from any official government fee.
- Complete database integration, cross-account authorization, assignment isolation, MFA, audit, concurrency, backup/restore, and incident-response checks before real data.

## Operator rules

- Use synthetic data in the demo.
- Do not mark a case as submitted or confirmation-recorded based on a service-fee payment or preparation review.
- Make the applicant's next action explicit whenever requesting changes.
- Record only necessary operational information; do not place sensitive applicant answers, photos, payment secrets, or confirmation values in notes or ordinary logs.
