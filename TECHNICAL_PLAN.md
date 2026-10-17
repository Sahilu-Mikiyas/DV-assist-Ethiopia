# Ethio DV Assist — Technical Implementation Plan

**Status:** Core stack selected; hosting and identity details remain open  
**Owner:** Mikiyas  
**Date:** October 15, 2026  
**Related plan:** [PRODUCT_PLAN.md](PRODUCT_PLAN.md)

This document describes how to implement the first product increment. It is deliberately conservative around official submission, government fees, and DV-2027 requirements: those stay disabled or configurable until verified against current official instructions and the service process.

## 1. Technical goals

- Ship a maintainable mobile-first applicant experience and a staff workspace from one repository.
- Make cycle-specific forms and guidance versioned data, not a collection of cycle-specific screens.
- Keep identity data, photos, payment records, and confirmation details access-controlled and out of routine logs.
- Make every sensitive staff action and every case-state transition attributable.
- Allow the pilot to use manual service-payment verification and human review without pretending those steps are automated.
- Keep the first deployment small enough for a small team to understand and operate.

## 2. Proposed architecture

### 2.1 Initial stack

Use a React + TypeScript web application, a Go HTTP API, and PostgreSQL. The owner selected this core stack during Phase 0. Keep the web client and API in one repository. A private object-storage provider compatible with short-lived signed uploads/downloads, identity/recovery provider, exact framework/library versions, and hosting provider still need selection. Pin versions in lockfiles and container images once selected.

| Layer | Initial choice | Responsibility |
| --- | --- | --- |
| Applicant and staff web app | React + TypeScript; Vite proposed | Public pages, applicant portal, staff portal, localized forms |
| API | Go HTTP service | Authentication integration, authorization, case workflow, validation, signed file access, audit events |
| Primary database | PostgreSQL | Accounts/roles, case metadata, versioned form answers, payments, consent, status and audit records |
| Private file store | S3-compatible object storage | Photos and explicitly approved evidence; private by default |
| Background work | Database-backed jobs initially, or a small worker if needed | Malware scan coordination, notifications, deletion/retention jobs, PDF generation |
| Deployment | Containerized app/API plus managed database and object storage | Repeatable preview and production deployments; provider TBD |

Avoid a microservice split for the pilot. Keep modules separated in code, while deploying one API and one web app. Do not introduce a cache, message broker, search cluster, or AI service without a measured need.

### 2.2 Logical view

```text
Browser (applicant / staff)
        │ HTTPS
        ├── Web app (static assets; public + authenticated routes)
        │       └── API client (typed request/response contracts)
        │
        └── Go API
              ├── Authentication and authorization
              ├── Form configuration and case answers
              ├── Case workflow and staff assignment
              ├── Consent, payment, support, audit
              ├── Upload authorization and file metadata
              └── Notifications / background jobs
                    ├── PostgreSQL
                    ├── Private object storage
                    └── Optional SMS/email provider (later, behind adapter)
```

The browser must never receive database credentials, storage master credentials, or provider secrets. Signed upload/download links should be narrowly scoped and short-lived. All API routes that return case data must authorize access on the server for every request.

## 3. Repository structure

Proposed monorepo after bootstrap:

```text
.
├── apps/
│   └── web/                    # React app: public, applicant, staff
├── services/
│   └── api/                    # Go HTTP API and worker entrypoints
├── packages/
│   └── api-contract/           # OpenAPI source and generated TS client/types
├── config/
│   └── dv-cycles/              # Reviewed, immutable cycle configuration bundles
├── db/
│   ├── migrations/             # Ordered PostgreSQL migrations
│   └── seeds/                  # Development-only non-sensitive demo data
├── deploy/
│   ├── containers/
│   └── environments/           # Non-secret deployment configuration/examples
├── docs/
│   ├── decisions/              # Architecture decision records
│   ├── operations/             # Runbooks, incident/deletion/payment procedures
│   └── security/               # Threat model and data inventory
├── PRODUCT_PLAN.md
├── TECHNICAL_PLAN.md
├── README.md
└── .github/workflows/          # CI and deployment workflows
```

Keep secrets, real applicant records, production exports, and uploaded files out of Git. Cycle config in Git contains only field definitions, help text, public source references, and constraints—not applicant data. Production configuration should be promoted through review rather than edited directly in the database.

## 4. Web application design

### 4.1 Route areas

- `/` and public routes: landing, service/pricing, privacy, terms, refund, FAQ, contact.
- `/auth/*`: sign-in, account recovery, verification flow.
- `/app/*`: applicant dashboard, case wizard, review, payments, support, documents.
- `/staff/*`: staff queue, case detail, assignment, review, payment reconciliation.
- `/admin/*`: staff roles and cycle configuration management; restrict to administrators.

Enforce route guards for navigation convenience, but treat them as presentation only. API authorization is authoritative.

### 4.2 Frontend modules

- `auth`: session state and identity-provider integration.
- `cases`: case list/detail, status display, resume flow.
- `form-runtime`: schema-driven rendering, client validation, conditional/repeatable groups, localization.
- `photos`: local file validation/compression, upload progress, upload retry, review state.
- `review-consent`: read-only answer summary and explicit approval.
- `payments`: separate service-fee and official-fee views; pilot shows service payment only unless the official workflow is approved.
- `staff`: queue, assignment, review requests, payment verification, internal notes.
- `i18n`: Amharic and English message catalogs with translated explanatory content.
- `design-system`: buttons, fields, alerts, status badges, dialogs, focus handling.

Use server responses as the source of truth for saved state, status, published schema, and payment status. Client state is a working draft and must survive refreshes only after explicit/automatic save succeeds. Show save time and unsaved/error state clearly.

### 4.3 Accessibility and weak-network behavior

- Build semantic forms with labels, error summaries, focus movement to errors, keyboard access, and screen-reader status updates.
- Respect reduced-motion settings and avoid interaction that depends on animation or hover.
- Keep a step's unsaved values in memory/local draft only as a convenience; do not claim a save until the API confirms it.
- Debounce autosave, use revision/ETag conflict protection, and retry transient failures with bounded backoff.
- Compress images locally where possible, show byte size before upload, support retry/resume if feasible, and clearly distinguish upload success from staff approval.
- Never persist sensitive form answers in browser localStorage by default. Any offline draft feature requires a separate threat review and explicit product decision.

## 5. API design

Use a versioned JSON API under `/api/v1`. Publish an OpenAPI contract and generate/validate the TypeScript client from it. Use consistent error envelopes, request IDs, pagination, and idempotency for operations that may be retried.

### 5.1 Initial endpoint groups

| Group | Example operations | Access |
| --- | --- | --- |
| Session | `GET /session`, `POST /logout` | Authenticated |
| Cycle config | `GET /cycles/{cycle}/form` | Public metadata; no private data |
| Applicant cases | `POST /cases`, `GET /cases`, `GET /cases/{id}` | Case owner |
| Form answers | `PUT /cases/{id}/answers/{section}`, `POST /cases/{id}/validate` | Case owner; assigned staff read/update only by policy |
| Photos/files | `POST /cases/{id}/files/upload-intent`, `POST /cases/{id}/files/{fileId}/complete`, `DELETE /cases/{id}/files/{fileId}` | Owner or authorized staff |
| Review/consent | `POST /cases/{id}/approval`, `DELETE /cases/{id}/approval` | Applicant owner |
| Applicant actions | `GET /cases/{id}/timeline`, `POST /cases/{id}/support-requests` | Case owner |
| Staff queue | `GET /staff/cases`, `POST /staff/cases/{id}/assign`, `POST /staff/cases/{id}/review-actions` | Staff role and assignment policy |
| Payments | `POST /cases/{id}/service-payment-references`, `POST /staff/payments/{id}/verify`, `POST /staff/payments/{id}/refund-status` | Applicant submit; staff verify |
| Status | `POST /staff/cases/{id}/transitions` | Staff permission plus transition rules |
| Documents | `POST /cases/{id}/documents/{documentId}/download-intent` | Owner or narrow staff permission |
| Admin | `/admin/staff`, `/admin/cycle-configs` | Administrator only |

These are resource sketches, not a final API contract. Avoid endpoints that accept arbitrary status strings or unrestricted case JSON. Validate all writes on the server against the case's pinned schema version and current state.

### 5.2 API behavior requirements

- Resolve user identity from a verified session/token; never trust a `user_id` supplied in request JSON for ownership.
- Check case ownership, staff role, assignment, and purpose on every read and write.
- Use `ETag`/revision numbers on answer writes to prevent one browser tab silently overwriting another.
- Use idempotency keys for case creation, payment reference submission, approval, and other retry-prone actions.
- Return generic errors to the applicant where detailed server errors could expose data; log a request ID for support correlation.
- Do not put personal data, confirmation values, or payment references in URLs or request IDs.
- Apply per-account and per-IP rate limits to authentication, file intents, and support submission.

## 6. Database design

Use UUID identifiers, UTC timestamps, explicit foreign keys, check constraints, and migrations. Store monetary values as integer minor units with currency code (for ETB use a documented representation); do not use floating point. Store dates as dates, not timestamps, where the form asks for a calendar date.

### 6.1 Core tables (conceptual)

- `users`: internal UUID, identity-provider subject or verified login identifier, account state, created/updated timestamps. Keep authentication secrets with a trusted identity provider where practical.
- `role_grants`: user, role, scope, granted/revoked metadata.
- `cases`: owner user, cycle key, pinned schema version, current status, assigned staff, revision, created/updated/closed timestamps.
- `case_answers`: case, section key, schema version, encrypted or otherwise protected structured answer payload, revision, updated actor/time. Split particularly sensitive data from routine metadata if the threat review calls for it.
- `case_people`: case, person key, relationship, minimal person metadata needed by the configured form; stable keys allow spouse/child sections without relying on array position.
- `case_files`: case/person association, private object key, purpose, media type, byte size, checksum, malware scan result, review state, retention date, created/deleted metadata.
- `consents`: case, consent text version, approval state, applicant actor, case revision, timestamp, invalidation reason/time.
- `case_events`: append-only status and workflow history with actor, prior/new status, reason code, safe metadata, timestamp.
- `staff_notes`: case, author, content, visibility, created/edited metadata. Notes are sensitive and require access controls/auditing.
- `service_payments`: case, amount, currency, method, user-entered reference, proof file reference only if required, state, verifier, verification time, receipt reference, refund state.
- `official_fee_records`: separate optional entity; disabled until the official collection workflow is verified and approved.
- `support_requests`: case, topic, message, state, assigned responder, timestamps; sanitize and prevent file attachments by default.
- `audit_events`: actor, action, target type/id, timestamp, request ID, outcome, minimal metadata. Never store raw answer/file/payment payloads here.
- `outbox_jobs`: durable notification/deletion/PDF job metadata, idempotency key, attempts, next-run time, status. Do not put sensitive payload in queue metadata.
- `schema_versions`: cycle, version identifier, content hash, published state, sources, reviewers, effective dates, and publication timestamp.

Use soft-delete only where a documented business/legal retention need exists. Otherwise delete data and file objects through an auditable deletion workflow. Define how backup expiry relates to deletion commitments before launch.

### 6.2 Data separation and encryption

Use managed encryption at rest for database, file storage, and backups. Require TLS in transit. Establish a key-management approach before storing confirmation numbers or especially sensitive fields; consider application-level envelope encryption for those values. Keep encryption keys outside the database and separate from ordinary application configuration. Restrict decryption to the narrow service operation that needs it, and audit access.

Do not invent a hashed duplicate-detection identity index in the first release. Names and birth facts have low entropy and can be guessed. Begin with applicant self-attestation and a clear duplicate warning. Any later matching design needs a privacy/security review, collision/false-match policy, and user explanation.

## 7. Config-driven form runtime

### 7.1 Source of truth and version lifecycle

Keep cycle configurations as reviewed JSON files in `config/dv-cycles/` and load/publish immutable versions to the database. Git review provides a diff and approval history; the database provides runtime lookup. Do not edit published cycle config in production directly.

Each configuration bundle should include:

- cycle ID, semantic schema version, state (`draft`, `reviewed`, `published`, `retired`), effective window;
- authoritative source URLs, retrieval/verification date, reviewer, and notes for each rule group;
- section/field definitions, conditions, required rules, allowed values, localization keys, and validation constraints;
- display order and help content in supported languages;
- photo constraints with source and scope (principal/spouse/child), if verified;
- no operational submission or fee behavior unless separately approved.

When a case starts, pin the published schema version. If guidance changes, create a new version. Existing cases must either remain pinned with a visible re-review requirement or be migrated through an explicit, auditable process; never silently reinterpret saved answers.

### 7.2 Example schema shape

```json
{
  "cycle": "DV-2027",
  "version": "2027.1",
  "status": "draft",
  "sources": [
    {
      "topic": "entry-fields",
      "url": "https://official-source.example/",
      "verifiedOn": "2026-10-15",
      "reviewedBy": "product-owner"
    }
  ],
  "sections": [
    {
      "key": "principal",
      "titleKey": "form.principal.title",
      "fields": [
        {
          "key": "givenNames",
          "type": "text",
          "required": true,
          "labelKey": "form.name.given",
          "helpKey": "help.name.copyFromDocument",
          "constraints": { "maxLength": 120 }
        }
      ]
    }
  ]
}
```

The example is illustrative only; it is not a claim about current official fields. Do not embed executable code or arbitrary expressions in the schema. Support a small, validated set of condition operators (equals, in, exists, boolean composition) and validation types. Validate the whole config against a JSON Schema in CI and at publication time.

### 7.3 Field and answer rules

- Keep stable field keys independent of translated labels.
- Use canonical internal dates and enumerated values; display localized labels separately.
- Make required/conditional behavior explicit and explain why a section appears.
- Use repeatable groups for people; each person gets a stable UUID-like key, not an array index.
- Preserve unknown fields from older schema versions only through explicit migration support; don't drop them during read-modify-write.
- Avoid storing derived eligibility conclusions as facts. If a warning is calculated, retain its rule/version and describe it as guidance.

## 8. Case workflow and invariants

Represent status transitions as server-side commands, not arbitrary field updates. Each transition has a defined actor, preconditions, resulting event, applicant-facing label, and whether it invalidates approval.

### 8.1 Proposed status set

`draft`, `needs_applicant_information`, `ready_for_staff_review`, `changes_requested`, `applicant_approval_required`, `approved_for_assistance`, `service_payment_pending`, `service_payment_verified`, `assistance_in_progress`, `confirmation_recorded`, `closed`, `cancelled`, `payment_exception`, `refund_pending`, `refunded`, `unable_to_complete`.

Treat payment state as a separate dimension rather than relying only on case status. Likewise photo review and applicant approval are distinct states. Avoid status explosion by modeling independent workflows separately.

### 8.2 Core invariants

- Applicant edits after approval invalidate that approval and create a new review revision.
- Staff cannot mark a case complete if required applicant approval or required staff review is missing.
- Payment verification never implies official entry submission.
- `confirmation_recorded` means a confirmation value was actually obtained through the approved process and returned to the applicant; it is not a synonym for an internal staff checkbox.
- Only an authorized staff role can verify service payment or change assignment.
- Cancel/refund/failure states retain enough event history for reconciliation without retaining unnecessary sensitive payloads.
- Every transition writes its event and updates current state atomically in one database transaction.

## 9. Photo upload and evaluation pipeline

1. Browser checks extension, actual decoded format, dimensions, square ratio, and maximum bytes from the pinned cycle config.
2. Browser optionally resizes/compresses only after the user sees what will be uploaded; preserve original if required by the approved process.
3. API authorizes the user/case/person slot, creates a random object key, and returns a short-lived upload intent.
4. Browser uploads directly to private storage using that intent.
5. Browser calls completion endpoint; API verifies object metadata/checksum, records file, and queues malware scanning.
6. Worker marks scan outcome; infected/unscannable files are quarantined and unavailable to staff.
7. Advisory photo checks run locally where technically feasible and show warnings. The server stores only needed results and version, not face embeddings or derived biometric identifiers.
8. Staff review is a separate state with a reason and applicant-visible next step.

For the pilot, photo objects must have a deletion deadline no later than 30 days after final staff photo review or case closure, whichever is later. Persist the deadline in file metadata and run an auditable deletion job; remove associated derivatives and invalidate outstanding signed URLs. Answer and payment-record retention periods remain subject to policy review and must be configured separately.

Never send applicant photos to an external image-analysis service without a documented provider/privacy review and explicit consent. Do not store face templates, embeddings, or use face matching for identity verification.

## 10. Payment design

### Pilot: manual Telebirr service-fee verification

- Applicant sees the service amount, verified recipient identity, Telebirr reference instructions, refund terms, and warning to never share credentials/PINs/one-time codes.
- Applicant enters a reference and optional evidence only if operations demonstrate it is needed.
- Staff verifies against the provider/business record, records who checked it and when, and issues a receipt reference.
- Reconciliation view compares pending references, verified receipts, exceptions, and refunds.
- Record immutable payment events; corrections create a reversal/adjustment event rather than erasing history.

Do not collect Telebirr/CBE passwords, PINs, one-time codes, card numbers, or online banking credentials. Do not treat client screenshots as authoritative settlement evidence. Official-fee collection stays unavailable until permitted methods and responsibilities are verified; keep its records distinct from service revenue.

## 11. Confirmation and document delivery

Before implementation, decide whether confirmation values must be retained after delivery. If retention is needed:

- Encrypt values with envelope encryption and separate keys from the database.
- Mask in staff lists and detail pages; provide a just-in-time reveal action with reason and audit event.
- Limit access to assigned authorized staff; log view, print, and download.
- Generate the applicant PDF from server-side data using a template version; mark it as a service copy unless it is truly an official confirmation document.
- Require authenticated access for retrieval and short expiration for any download link.
- Use a secure retrieval flow for Telegram/QR (opaque random token, expiration, one-time/revocable access, no PII in URL); explain forwarding risk. Do not place the confirmation number directly in QR contents or notification previews.
- Run the documented deletion process at the retention deadline.

Never store government portal passwords, status-check answers, or reusable login credentials.

## 12. Authentication and authorization

- Prefer a reputable identity provider supporting secure sessions and recovery. Final provider depends on regional availability, cost, and user research.
- Use secure, HttpOnly, SameSite cookies for browser sessions when architecture permits; protect state-changing routes against CSRF. If using bearer tokens, keep them out of localStorage and document refresh/revocation behavior.
- Require stronger authentication for staff/admin than for applicants; consider MFA for privileged roles.
- Use server-side role checks and object-level authorization on every case/file/payment/document route.
- Scope staff to assigned cases except roles explicitly allowed to triage; record every exceptional access.
- Rate-limit login/recovery and avoid revealing whether a phone/email is registered.
- Set session expiry, logout/revocation, and staff offboarding procedures.

## 13. Localization

- Keep interface strings and field help in message catalogs keyed by stable identifiers.
- Store applicant answers as canonical values; never store translated labels as the data value.
- Allow right-to-left support only if an added language requires it; don't assume all Ethiopic-script languages use identical formatting or fonts.
- Keep cycle-specific legal/official wording linked to the source and reviewed by a fluent human.
- Provide a translation fallback marker in the authoring workflow; don't silently show empty labels.
- Pilot Amharic and English; add Oromo/Tigrinya only with reviewed translations and support capacity.

## 14. Notifications and background jobs

Notifications should contain minimal information: “Your case has an update; sign in to view it,” not family details, payment references, photos, or confirmation numbers. Store template ID/version, destination type, delivery result, and minimal metadata. Keep provider integration behind an interface so it can be disabled or changed.

Use a durable job table/outbox for email/SMS delivery, malware scan requests, PDF generation, and deletion. Jobs must be idempotent, retry with bounds, expose dead-letter/error state to operators, and never duplicate payments or case transitions. A notification failure must not silently lose a case update; the dashboard remains the source of truth.

## 15. Environments and deployment

### Environments

- **Local:** Docker Compose or documented native tools for PostgreSQL and API; fake providers and synthetic data only.
- **Preview:** isolated ephemeral or shared non-production environment; no production secrets/data; restricted test accounts.
- **Production:** managed database, private object store, HTTPS, backups, monitoring, and restricted staff access.

Promote immutable builds through environments. Keep environment-specific configuration separate from code and secrets. Never copy production data into local/preview environments; if debugging needs a case, use a synthetic fixture designed not to resemble a real person.

### Operational baseline

- Automated database backups and a documented restore procedure; test restore on a schedule.
- Object-storage versioning/lifecycle policies aligned with retention and deletion commitments.
- Health/readiness endpoints that expose no sensitive data.
- Structured logs with request ID, route template, outcome, latency, and actor ID where appropriate; redact request bodies and sensitive headers.
- Error monitoring with scrubbing configured before enabling production reports.
- Alerts for API outage, database/storage failure, job backlog, malware scan failures, and repeated authorization errors.
- Document deploy rollback, credential rotation, staff offboarding, data export, and incident response.

Choose hosting/data-region constraints after researching actual provider availability, pricing, connectivity, and applicable obligations. Do not promise a storage location before the provider is selected.

## 16. Security engineering and privacy review

Before real applicant data:

- Complete a data-flow diagram and threat model covering account takeover, staff misuse, insecure file links, leaked exports, payment fraud, device sharing, and misdirected notifications.
- Inventory each field/file, purpose, users allowed, storage location, retention, deletion behavior, and external recipient.
- Confirm provider data-processing terms and whether data crosses borders.
- Use dependency pinning, automated vulnerability updates, secret scanning, and code review for authorization/storage/payment changes.
- Verify input validation, output encoding, SQL parameterization, CSRF policy, rate limits, file scanning, and backup access.
- Establish security contact and incident response steps before pilot.

No production personal data should be used before these controls and the applicable operational/legal review are complete.

## 17. Verification strategy

Verification is part of the implementation plan; this document does not run or add tests. Each feature should later include checks appropriate to its risk:

- **Unit checks:** schema validation, conditional fields, localization fallback, status transitions, payment calculations, retention deadlines.
- **API/integration checks:** object-level authorization, transaction behavior, idempotency, schema pinning, upload authorization, audit creation.
- **Browser flows:** applicant start/resume/review, family sections, photo upload/retry, staff correction request, manual payment verification, cancellation/refund.
- **Security checks:** cross-account case access, unauthorized staff access, expired signed URLs, secret leakage, PII in logs, rate-limit behavior.
- **Accessibility/usability review:** keyboard-only flow, screen reader labels/errors, phone viewport, Amharic text layout, weak-network recovery.
- **Operational rehearsal:** backup restore, staff offboarding, deletion request, payment reconciliation, provider outage, and incident response.

Do not consider a feature done based only on a successful happy-path demo. Acceptance includes authorization, failure states, and clear applicant-facing status.

## 18. Implementation milestones and dependencies

| Milestone | Output | Depends on |
| --- | --- | --- |
| T0 — Architecture decisions | ADR for stack, hosting constraints, identity approach, file storage, configuration ownership | Product discovery and team skills |
| T1 — Repo foundation | Monorepo, local run docs, CI, API contract skeleton, database migration setup | T0 |
| T2 — Public shell | Landing and legal/service information pages, working contact/waitlist path | Approved content and privacy text |
| T3 — Identity/case core | Authentication, roles, case CRUD, status/audit model, object authorization | T1 and security model |
| T4 — Form runtime | Cycle config validation/publishing, schema-pinned wizard, save/resume | Verified field requirements |
| T5 — File/photo workflow | Private upload path, scan, advisory checks, staff photo review | Storage/key strategy and verified photo spec |
| T6 — Review/payment/staff | Consent, case queue, correction workflow, manual service ledger | Policies and staff SOP |
| T7 — Secure closeout | Confirmation handling, applicant document, retention/deletion | Approved submission operation and data retention decision |
| T8 — Pilot readiness | UAT, training, backups/restore, incident and payment drills | All applicable milestones |

Build T1 through T4 into a usable preparation pilot before T5/T6 if operations can validate the experience without collecting real photos or payment records. T7 is specifically gated by a verified confirmation workflow.

## 19. Technical decisions requiring owner confirmation

1. Identity provider versus locally managed accounts; what login/recovery channels are realistic for Ethiopian users?
2. Hosting provider, acceptable data region, budget, and expected peak traffic?
3. Private object storage provider and malware scanning option?
4. Which channels are allowed for notifications and confirmation delivery? (Phase 0 selects Telegram for direct support, not sensitive document delivery.)
5. Is local draft/offline behavior needed, or is server-confirmed save/resume sufficient for v1?
6. Who can review configuration changes and approve a cycle bundle before publication?

Until these are answered, code should favor replaceable adapters and avoid irreversible vendor-specific coupling.
