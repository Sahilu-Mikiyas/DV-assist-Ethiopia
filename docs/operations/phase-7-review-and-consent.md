# Phase 7 — Review and demo acknowledgment

**Implementation status (October 20, 2026):** The synthetic-only schema wizard preview remains available. The authenticated applicant draft editor now has a review mode for a released schema: it summarizes the applicant's saved answers, flags unanswered required fields and repeatable-group minimums, and lets the applicant return to editing. This is an advisory completeness aid only; it does not create approval or consent, and DV-2027 remains blocked.

## Available in the demo

- All configured sections are rendered in one review view, respecting `visibleWhen` conditions.
- Select labels and booleans are shown in the selected language; repeatable records are labeled fictional.
- Each section has an Edit action that returns to that wizard step and clears the in-memory acknowledgment.
- A checkbox explicitly describes that the acknowledgment applies to fictional demo data and creates no applicant approval, legal consent, government entry, or submission.
- The acknowledgment button remains disabled until that checkbox is selected. Clicking it records an ISO timestamp in component state only; it is lost when the wizard closes or the page reloads.
- The print action invokes the browser print dialog for the visible sample summary. It does not create or store a PDF automatically.

## Applicant draft review

- Review is available only after the authenticated editor loads an independently reviewed current cycle schema and the owner's encrypted draft. It reflects current in-editor answers, including changes not yet saved.
- The review summary uses localized labels and option values, reports blank required fields and groups below their configured minimum, and provides a return-to-edit action.
- The check is deliberately described as basic and advisory. It does not assess eligibility, photo compliance, legal accuracy, official readiness, or submission.
- No approval event or consent is recorded. The review is derived in the browser from data already delivered to the authorized applicant and is not a substitute for server-side validation.

## Not implemented / production gate

- No DV-2027 schema or real applicant answers are accepted by this preview.
- There is no authenticated approval endpoint, immutable consent event, actor identity, consent-text version, case revision binding, or server-side required-field validation.
- Approval does not authorize staff action and is not persisted or auditable.
- There is no downloadable official or production preparation PDF.
- The Phase 3 PostgreSQL integration/authorization gate remains open. Do not use this preview for real applicant data, consent, payment, or service delivery.

## Production completion requirements

Before using Phase 7 with applicants, first verify and publish the applicable cycle schema and pass the Phase 3 integration gate. Then define the reviewed consent language and version, bind approval to an authenticated applicant, exact case revision, schema version, and timestamp, enforce server-side completeness and authorization, invalidate approval after material edits, and add authenticated access to a clearly labeled preparation summary. Keep government submission and confirmation claims outside this phase unless separately verified and authorized.
