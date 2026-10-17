# Phase 7 — Review and demo acknowledgment

**Implementation status (October 17, 2026):** A synthetic-only client-side review preview is connected to the schema wizard. It summarizes configured answers and fictional repeatable records, permits section edits, includes an explicit sample acknowledgment, and can invoke the browser print dialog for a sample summary. This is a UX foundation only; it is not the production approval/consent workflow described in the roadmap.

## Available in the demo

- All configured sections are rendered in one review view, respecting `visibleWhen` conditions.
- Select labels and booleans are shown in the selected language; repeatable records are labeled fictional.
- Each section has an Edit action that returns to that wizard step and clears the in-memory acknowledgment.
- A checkbox explicitly describes that the acknowledgment applies to fictional demo data and creates no applicant approval, legal consent, government entry, or submission.
- The acknowledgment button remains disabled until that checkbox is selected. Clicking it records an ISO timestamp in component state only; it is lost when the wizard closes or the page reloads.
- The print action invokes the browser print dialog for the visible sample summary. It does not create or store a PDF automatically.

## Not implemented / production gate

- No DV-2027 schema or real applicant answers are accepted by this preview.
- There is no authenticated approval endpoint, immutable consent event, actor identity, consent-text version, case revision, or server-side validation.
- Approval does not authorize staff action and is not persisted or auditable.
- There is no downloadable official or production preparation PDF.
- The Phase 3 PostgreSQL integration/authorization gate remains open. Do not use this preview for real applicant data, consent, payment, or service delivery.

## Production completion requirements

Before using Phase 7 with applicants, first verify and publish the applicable cycle schema and pass the Phase 3 integration gate. Then define the reviewed consent language and version, bind approval to an authenticated applicant, exact case revision, schema version, and timestamp, enforce server-side completeness and authorization, invalidate approval after material edits, and add authenticated access to a clearly labeled preparation summary. Keep government submission and confirmation claims outside this phase unless separately verified and authorized.
