# Ethio DV Assist — Phased Product and Implementation Roadmap

**Status:** Working delivery roadmap  
**Owner:** Mikiyas  
**Updated:** October 16, 2026
**Companion documents:** [PRODUCT_PLAN.md](PRODUCT_PLAN.md) · [TECHNICAL_PLAN.md](TECHNICAL_PLAN.md)

This roadmap combines the product and technical plans into phases. Every phase covers the user experience, software, staff operations, and launch readiness that belong together. It is a sequence of gates, not a promise of dates. DV-cycle rules, fees, and official submission behavior must be checked against current official sources before they are implemented or advertised.

## How to use this roadmap

- Complete the **exit gate** for a phase before relying on its capability with real applicant data or money.
- A phase can be split into smaller implementation tasks/issues. Keep the phase's acceptance criteria intact.
- Use synthetic data during development. Do not move production applicant data into development or preview environments.
- Keep unverified government-side actions disabled. A working screen or provider adapter does not mean that the real process is authorized, available, or operational.
- Add dates and owners only after scope, capacity, service decisions, and external dependencies are known.

## Overall delivery sequence

| Phase | Name | Main outcome |
| --- | --- | --- |
| 0 | Product, official-rule, and service validation | A reviewed definition of what the service can safely promise and operate |
| 1 | Technical foundation | A reproducible development base and agreed core architecture; initial scaffold underway |
| 2 | Public website and demand validation | Bilingual preview landing page with a working Telegram contact path; no applicant intake or payment collection |
| 3 | Identity, roles, and case foundation | Secure applicant/staff access and an auditable case shell |
| 4 | Versioned DV form and preparation wizard | Applicants can enter, validate, save, and resume cycle-configured information |
| 5 | Family completeness and duplicate safeguards | Household sections and duplicate-entry awareness are handled clearly |
| 6 | Photo upload and photo review | Private uploads, technical prechecks, advisory warnings, and staff review |
| 7 | Review, approval, and consent | Applicants can inspect and approve a versioned summary of their information |
| 8 | Staff dashboard and case operations | Staff can triage cases, request corrections, assign work, and audit actions |
| 9 | Service fees, payment tracking, and failure handling | Manual service-payment reconciliation, receipts, exceptions, and refunds |
| 10 | Secure closeout and confirmation delivery | Confirmation information is handled only through a verified workflow |
| 11 | Controlled pilot and launch readiness | Real users can be supported with trained staff and operational safeguards |
| 12 | Post-pilot improvements and platform expansion | Results helper, partner tools, analytics, languages, and future modules |

## Phase 0 — Product, official-rule, and service validation

### Goal

Set the boundaries of the initial service before code or marketing implies a capability the team cannot yet deliver.

### Product and operational work

- Define the initial audience and pilot size; interview intended applicants and at least the staff who will perform assistance.
- Choose whether the pilot is preparation/review only or includes staff-assisted official submission. Describe exactly what the applicant does and what staff do.
- Define the first offer: self-service, assisted, or a simple pilot package. Validate proposed ETB prices against costs, staff time, support expectations, and any separate government fee.
- Write what each price includes, what it excludes, how payment is verified, when a receipt is issued, and what happens if service is interrupted or cannot be completed.
- Define cancellation, refund, payment-mismatch, applicant-no-response, deadline-missed, and service-failure procedures.
- Identify support channels and realistic response times. Decide whether Telegram, SMS, phone, or email are used, and what information may be sent through each.
- Define pilot languages and translation-review ownership. Amharic is the initial language target; English is also supported. Oromo and Tigrinya are later additions unless the pilot has reviewed translations and support capacity.

### Official-source validation

- Review the latest official instructions for the applicable DV cycle before publishing fields, dates, fee amounts, eligibility prompts, family-member rules, or photo criteria.
- Record source URL, retrieval date, applicable cycle, reviewer, and which product rules depend on that source.
- Specifically verify whether passport fields are required, the current registration fee and how it is paid, photo technical criteria, family-member requirements, entry window, and rules for people who assist applicants.
- Treat prior-cycle instructions and the sample landing page as historical context, not current requirements.
- Define who monitors official updates and how a newly published rule will be reviewed, versioned, and communicated to applicants.

### Privacy, security, and service boundary work

- Create a data inventory: every field, file, payment artifact, confirmation value, and notification destination; why it is needed; who may see it; where it is stored; and when it is deleted.
- Decide whether any identity document or payment screenshot is genuinely necessary. Default to not collecting passport/ID scans and not collecting payment evidence when a reference can be reconciled another way.
- Decide whether confirmation information must be stored, how the applicant receives it, and the retention period. Do not store government portal credentials or status-check answers.
- Draft privacy, terms, non-affiliation, refund, and data-deletion language for review before collection begins.
- Complete an initial threat model covering staff misuse, account takeover, misdirected messages, public file links, device sharing, payment fraud, and accidental disclosure.
- Determine provider/hosting, data-region, and operational constraints before making storage-location claims.

### Deliverables

- Service blueprint showing applicant and staff steps, including failure paths.
- DV-cycle source register and unresolved-rule list.
- Approved package/pricing draft and payment/refund SOP.
- Data inventory, retention draft, consent requirements, privacy notice outline, and threat model.
- Short pilot research findings and success measures.

### Exit gate

The owner can explain exactly what the pilot does, what it does not do, how applicant control is preserved, what data is collected and deleted, how money is reconciled, and which official rules are verified versus still pending.

## Phase 1 — Technical foundation

**Current implementation status:** Core stack decision, Go API shell, OpenAPI contract, migration conventions and initial identity/case schema, Go formatting/vet/build script and CI workflow, README, and static public preview exist. The React app and Go API run locally. PostgreSQL migration application and backup/restore procedures still need validation; the full Phase 1 reproducibility gate is not complete.

### Goal

Make the repository reviewable and establish a locally runnable API shell and public preview, while documenting architecture choices and unresolved production dependencies.

### Product/architecture decisions

- Confirm or replace the proposed React + TypeScript + Vite, Go API, and PostgreSQL stack.
- Confirm monorepo and single deployable API for the initial product; avoid microservices until there is a measured reason.
- Select authentication approach, hosting/provider constraints, private object storage, and environment strategy based on user research, team skills, cost, regional availability, and privacy obligations.
- Record major choices as architecture decision records (ADRs), including alternatives and consequences.

### Engineering work

- Establish repository directories for web app, API, API contract, cycle config, migrations, deployment, and operational documentation.
- Add local development setup with synthetic seed data only and clear start/stop instructions.
- Establish code formatting, static checks, dependency pinning/lockfiles, secret scanning, and basic CI.
- Define configuration versus secrets; provide safe example environment files without credentials.
- Add API contract conventions (OpenAPI, `/api/v1`, error envelope, request ID, pagination, idempotency where needed).
- Add database migration conventions, UTC timestamps, UUIDs, constraints, and transaction practices.
- Add logging conventions that exclude personal answer bodies, payment references, uploaded content, secrets, and confirmation values.
- Establish preview and production environment principles; no production data in local/preview.

### Deliverables

- Monorepo skeleton, developer README, API contract skeleton, migration setup, CI workflow, ADRs, and synthetic fixture set.
- Basic application/API health checks with no sensitive output.
- Initial deployment and rollback outline.

### Exit gate

A new developer can follow the documented setup, run web/API/database locally using synthetic data, and make a change that passes repository checks. No real applicant data or secrets are required.

## Phase 2 — Public website and demand validation

**Current implementation status:** A bilingual static preview and Telegram contact path are implemented, plus a local bilingual interactive prototype with fictional applicant/family drafts and a staff queue. The prototype is not real case intake: no applicant API, account, database, photo upload, or payment flow exists. Amharic copy needs human review, and layout has not yet had cross-device accessibility review; treat this as a development demo, not a launch-ready service.

### Goal

Create a trustworthy public explanation and a real way for interested applicants to contact the service. The current preview uses Telegram rather than collecting waitlist details; it is not an enrollment or payment page.

### Applicant-facing work

- Implement the landing page using the sample's visual direction while refining its claims.
- Include service description, audience, how assistance works, what is and is not included, indicative/final pricing distinction, contact/support path, FAQ, official-source links, privacy summary, and non-affiliation notice. Publish reviewed terms and refund policy before accepting cases or payments.
- Distinguish a service waitlist or preparation period from official DV registration being open.
- Say photo checks are advisory; do not say the tool guarantees acceptance or that a photo “passes.”
- Say selection is random and the service cannot improve selection odds.
- Only mention passport details, family rules, official fees, dates, or submission steps when verified for the current cycle.
- Build Amharic/English content structure and have explanatory content reviewed, not just labels.
- Make the landing page mobile-friendly, accessible, reduced-motion aware, and usable at weak connection speeds.

### Contact/waitlist handling

- Provide a real contact destination; do not present the contact path as a waitlist or application submission.
- If a waitlist is added later, collect only contact information required to respond and explain its purpose, retention, and opt-out/deletion path at collection.
- If a form is added later, validate inputs, rate-limit spam, protect against injection, and avoid exposing submitted addresses in logs.
- If no backend is ready, do not present the button as if an application was received; route to an explicit contact channel instead.

### Deliverables

- Public bilingual preview page and functional Telegram contact path.
- Clear preview-only notice: no application form, applicant documents, enrollment, or payments are being accepted on the page.
- Privacy/terms/refund pages reviewed before any case or payment intake is opened.
- Basic conversion and inquiry measures without collecting unnecessary personal analytics.

### Exit gate

An applicant can understand the service boundary, indicative price, preview status, privacy basics, and non-affiliation, and can reach the operator through Telegram. Opening case intake requires the separate policy, security, and operational gates in later phases.

## Phase 3 — Identity, roles, and case foundation

**Current implementation status (October 17, 2026):** The Go API and React portal now include passwordless email-code sign-in, database-backed sessions and CSRF protection, applicant case creation/list/detail/timeline, staff queue/assignment/status transitions, administrator role management and MFA reset, TOTP enrollment for privileged users, audit records, and the initial PostgreSQL migration. Local Go/web checks pass. The migration has not been run against PostgreSQL in this environment, and the end-to-end database-backed exit gate remains unverified. Do not enter real applicant data or accept payments yet.

### Goal

Create secure, ownership-scoped applicant and staff workflows before entering sensitive form data.

### Applicant work

- Choose an account access method that can be recovered by the intended users. Explain login and recovery steps in plain language.
- Create applicant dashboard shell, case creation, case list, and case status timeline.
- Allow an applicant to see only their own cases and request account/case assistance.

### Staff/admin work

- Establish applicant, assistance staff, and administrator roles.
- Define staff assignment and triage rules, including any legitimate need for an unassigned queue.
- Require stronger protection for staff/admin accounts; consider MFA for privileged roles.
- Establish offboarding and access review process.

### Technical work

- Implement authentication/session handling, logout/revocation, safe recovery, rate limits, and anti-enumeration behavior.
- Implement server-side object-level authorization on every case route. UI route guards alone are insufficient.
- Create initial users, role grants, cases, case events, and audit-event migrations.
- Add append-only event records for case creation, access-sensitive operations, status changes, staff assignment, and role changes.
- Add request IDs and scrubbed structured logs.
- Define case revision/optimistic concurrency behavior for multiple tabs.

### Deliverables

- Applicant sign-in/recovery and dashboard shell.
- Staff sign-in and role-protected staff shell.
- Case creation/list/detail with synthetic data and audit history.
- Authorization matrix documented for all roles and resources.

### Exit gate

Cross-account access is denied by the API, staff access follows documented roles/assignment policy, privileged operations are logged, and logout/recovery paths work without leaking whether another person has an account.

### Implementation note

Implemented routes and the access matrix are recorded in [the Phase 3 operations guide](docs/operations/phase-3-identity-and-cases.md) and [security notes](docs/security/phase-3-access-and-data.md). The account/case layer stores email identity and workflow metadata only; DV answers, family data, photos, payment evidence, and confirmation values are out of scope. Full Phase 3 exit requires applying the migration to a disposable PostgreSQL database and verifying isolation, MFA, audit, and recovery scenarios before any real intake.

## Phase 4 — Versioned DV form and preparation wizard

**Current implementation status (October 17, 2026):** A constrained JSON config shape, validator script, and bilingual synthetic-only schema wizard are present. DV-2027 remains blocked with zero fields because official instructions are not yet available. The wizard persists only to browser session storage. Phase 3 PostgreSQL and authorization validation remains an unmet prerequisite for real case data.

### Goal

Let applicants enter and resume information using a reviewed, cycle-specific configuration.

### Configuration authoring and release

- Define and validate a constrained JSON schema for cycle metadata, sections, fields, localization keys, conditional rules, required behavior, and validation.
- Store reviewed source URLs, verification dates, reviewer, version, effective date, and status with each cycle bundle.
- Keep configuration source files reviewed in Git; publish immutable versions to runtime storage.
- Pin the version to each case. New rules create a new version; never silently reinterpret existing answers.
- Add CI and server-side validation for config structure; prohibit executable code or arbitrary expressions inside configuration.
- Do not add cycle-specific fields until verified. Passport details and photo constraints remain unresolved until official instructions are checked.

### Applicant wizard

- Build a multi-step form renderer for text, date, select, yes/no, address, and repeatable group controls.
- Support required/optional, conditional visibility, server/client validation, and localized help.
- Explain each field in plain language and show cycle-specific source guidance where appropriate.
- Add progress indicator, save/resume, last-saved indicator, unsaved/error handling, and refresh recovery.
- Use stable identifiers for people/sections, not array indexes.
- Use ETags/revisions to prevent overwriting newer answers from another tab.
- Keep sensitive form answers out of localStorage by default; do not promise offline mode until separately designed.

### Data/API work

- Add cycle/schema version, case answers, case people, and revision metadata.
- Implement server validation against the pinned schema version.
- Use stable enumerated/canonical values; keep translations separate from stored answers.
- Add migration strategy for future schema changes and case re-review requirements.

### Deliverables

- Draftable/resumable wizard, schema version publishing path, validation, localization structure, and schema-version visibility for staff.
- No official website automation.

### Exit gate

An applicant can save and resume a complete configured draft; required and conditional validation works; staff can see the cycle/schema version; published changes do not silently alter an in-progress case.

## Phase 5 — Family completeness and duplicate safeguards

**Current implementation status (October 17, 2026):** The schema engine now supports bounded repeatable groups and a synthetic sample demonstrates per-record completeness, in-list duplicate labels, and a limited self-attestation. It collects no identity details and makes no cycle-specific household claims. Official DV-2027 rules remain unpublished; Phase 3 persistence/authorization checks are still a prerequisite for real intake.

### Goal

Make household details understandable and reduce avoidable omissions without creating unsafe identity matching.

### Product work

- Add principal applicant plus spouse and child sections according to current official instructions.
- Use prompts and explanations for applicable spouse/child categories, including cases the instructions require even when a family member will not travel.
- Keep each person's fields and photo slot connected to a stable person record.
- Add a clear self-attestation question: whether someone has already entered for the applicant this cycle, with help explaining the duplicate-entry risk.
- Warn applicants not to create or authorize multiple entries and make clear that the service cannot reliably discover every other entry.

### Technical work

- Implement repeatable person groups and dynamic completeness checks using the versioned schema.
- Prevent duplicate person records in a single case where possible; show clear correction UI.
- Record the attestation and schema/rule version without claiming it proves there was no other entry.
- Do not create a hashed name/date-of-birth identity matching service in this phase. Low-entropy personal data can be guessed; any matching requires a separate threat/privacy review and false-match process.

### Exit gate

Required household sections can be added/edited/reviewed; an applicant can understand which family members are required by the current configuration; duplicate warnings are honest about their limits and do not claim global detection.

## Phase 6 — Photo upload and photo review

**Current implementation status (October 17, 2026):** The wizard includes a bilingual rules-gate preview describing future technical and human review layers. It does not select, inspect, store, or upload files. Current-cycle criteria are not verified, and Phase 3 storage authorization and retention controls are still open.

### Goal

Help applicants submit usable photos while protecting files and avoiding false guarantees.

### Precondition

Current-cycle photo requirements have been verified and stored with source/version. Last-cycle values must not be hard-coded as current requirements.

### Applicant work

- Show capture tips and why requirements matter in Amharic/English.
- Provide a per-person upload slot for every person required by current instructions.
- Check actual file format, dimensions, aspect ratio, and size against versioned requirements before upload.
- Optionally run on-device face/blur/brightness/background heuristics as advisory warnings, subject to false-positive and device support review.
- Explain automated checks cannot guarantee government acceptance; offer correction/replacement and staff review state.
- Show upload progress, retry, remove/replace, and clear staff feedback.

### Backend/operations work

- Create upload intent only after authorizing applicant, case, and person slot.
- Use random private object keys, short-lived signed URLs, strict content/size rules, checksum/metadata verification, and malware scanning/quarantine.
- Store file metadata and scan/review state, not public links.
- Encrypt storage/backups, log access, and enforce retention/deletion.
- Avoid external AI/photo services without review and explicit consent; do not generate face embeddings or biometric identifiers.
- Define staff review rubric and reasons for resubmission.

### Exit gate

Invalid technical files receive understandable feedback; uploads are private and malware-checked; staff review is distinct from automated advice; access and deletion follow documented policy.

## Phase 7 — Review, approval, and consent

**Current implementation status (October 17, 2026):** Synthetic client-side review preview implemented: complete configured sample summary, section edit links, demo-only acknowledgment held in component memory, and browser print support. Production applicant approval, consent records, server persistence, and downloadable PDF remain unimplemented and gated on verified cycle rules and the Phase 3 database/security exit gate. See [Phase 7 operations note](docs/operations/phase-7-review-and-consent.md).

### Goal

Give applicants a complete, understandable review before any assisted action proceeds.

### Applicant work

- Show every answer and each family member in a complete review screen.
- Provide links to edit specific sections and clearly warn that changes invalidate approval.
- Present explicit consent text describing staff assistance, use of information, applicant presence/control expectations, and service boundaries.
- Record consent text version, timestamp, case revision, and applicant actor.
- Generate a downloadable preparation summary labeled as applicant-provided/service-generated, not as proof of official submission.

### Technical work

- Approval API checks required fields/photos, schema version, and current answer revision server-side.
- Record immutable approval event and invalidate it on any material answer change.
- Protect generated PDFs and expose only through authenticated access/short-lived download intent.
- Exclude answer contents and consent payloads from general application logs.

### Exit gate

No staff-assisted next step can proceed without a valid approval for the current revision; applicants can see exactly what they approved; approval history is auditable and invalidated when answers change.

## Phase 8 — Staff dashboard and case operations

**Current implementation status (October 17, 2026):** Synthetic demo queue search/status filters added. The authenticated Phase 3 portal already has MFA-gated staff queue, constrained status transitions, administrator assignment, and audited timelines, but its database/security integration gate remains open. Applicant-visible correction requests, answer/photo review integration, note audit history, and exception queues remain future work. See [Phase 8 operations note](docs/operations/phase-8-staff-operations.md).

### Goal

Give staff the tools and operating procedures to process cases consistently and safely.

### Staff features

- Queue filters for status, age, assignment, incomplete work, and payment exceptions.
- Case detail with current status, schema/cycle, answer review, photo review, applicant approval, payment state, and timeline.
- Assign/reassign case with actor/time history.
- Request correction using applicant-visible category and message; notify applicant without revealing sensitive data in notification preview.
- Internal notes clearly separated from applicant-visible comments; edits/deletions auditable.
- Photo review outcomes and reasons.
- Search limited to operationally necessary identifiers, with anti-enumeration and access logging.
- Basic workload/operations counts, not broad behavioral analytics.

### Workflow model

Represent case status, photo review, applicant approval, and payments as distinct but related states. Suggested case states include `draft`, `needs_applicant_information`, `ready_for_staff_review`, `changes_requested`, `applicant_approval_required`, `approved_for_assistance`, `assistance_in_progress`, `confirmation_recorded`, `closed`, `cancelled`, and explicit exception/refund outcomes.

Transitions must be server-side commands with preconditions, actor permissions, reason, applicant-facing text, and atomic event/history update. Payment verified must never imply government entry submitted. `confirmation_recorded` is allowed only when the verified operational process truly produced and returned that information.

### Operations work

- Write staff procedures for reviewing answers/photos, requesting corrections, support escalation, access to sensitive data, handoffs, and offboarding.
- Train staff before production access.
- Define permitted staff access by assignment and exceptional case escalation.

### Exit gate

Staff can process the defined pilot workflow; applicants can understand status and requested changes; all access/status changes are attributable; no general staff screen exposes unmasked confirmation or unnecessary documents.

## Phase 9 — Service fees, payment tracking, and failure handling

**Current implementation status (October 17, 2026):** Synthetic staff demo shows separate service-fee status, fictional Telebirr reference, and exception/refund states. No real payment, provider verification, receipt, or persistent financial ledger exists. See [Phase 9 operations note](docs/operations/phase-9-service-fees-and-failures.md).

### Goal

Track the business's own service fee transparently and reconcile it without confusing it with government fees.

### Pilot payment workflow

- Show the service amount, recipient, available method, reference instructions, refund terms, and whether any government charge is separate.
- Let applicant submit a reference; request evidence only if operations require it and retention is defined.
- Staff verify against the provider/business record, record verifier/time/outcome, and issue a receipt reference.
- Build reconciliation view for pending, verified, mismatched, refunded, and unresolved payments.
- Keep corrections as adjustment/reversal events; do not erase financial history.
- Define idempotency and duplicate-reference handling.
- Never request PINs, passwords, OTPs, card credentials, or banking credentials. A screenshot alone is not authoritative settlement.

### Separate official-fee handling

- Keep an independent official-fee record model and UI label.
- Keep government payment adapter disabled/stubbed until current official process, provider permission, ownership, reconciliation, refund/failed-payment behavior, and staff responsibilities are verified.
- If applicant pays government directly, record only the minimum status necessary; do not imply the service collected it.

### Failure handling

- Implement payment pending, mismatch/exception, service canceled, refund pending, refunded, and unable-to-complete states.
- Provide applicant-visible next action and support route for each.
- Define what happens if service fee is paid but assistance cannot proceed, if duplicate references are submitted, or applicant disappears mid-case.
- Reconcile cases and transactions independently; neither state should overwrite the other.

### Exit gate

Staff can reconcile every pilot service payment to a case and receipt; applicants can distinguish service fees from government fees; exceptions and refund cases have a documented owner and outcome.

## Phase 10 — Secure closeout and confirmation delivery (gated)

**Current implementation status (October 17, 2026):** A locked UI notice explains that the demo does not submit entries or accept/store confirmation numbers. Secure vault and delivery are not implemented. See [Phase 10 operations note](docs/operations/phase-10-secure-closeout.md).

### Goal

Deliver official confirmation details only after an approved, verified operational process actually produces them.

### Mandatory precondition

The precise allowed submission-assistance workflow, applicant participation, government payment mechanism, and confirmation handoff are verified and approved operationally. If not, this phase remains disabled; the rest of the preparation product can still be piloted.

### Product/operations work

- Define who performs each official-site action and how the applicant sees/approves it.
- Confirm that the applicant receives their own confirmation promptly and understands how to keep it.
- Define correction/failed submission, retry, no-response, and incident handling.
- Decide whether the service needs to retain the number after delivery; default to minimizing retention.

### Technical work

- If retention is justified, encrypt confirmation data with a separate key-management approach, mask by default, audit reveals/exports, and restrict to authorized staff.
- Generate a service record only if it truthfully reflects the outcome. Distinguish official artifacts from service-generated summaries.
- Provide authenticated retrieval or short-lived, revocable, opaque-token access. Do not put the confirmation number in a public URL, ordinary QR, SMS preview, or unprotected Telegram link.
- If Telegram/print/QR is used, document the channel's forwarding/device risks and secure token expiration/revocation.
- Implement retention timer and verified deletion across active storage, derived documents, and backups according to the published policy.
- Never store portal passwords or status-check security answers.

### Exit gate

The applicant receives and can retrieve the correct confirmation record; the service has evidence for any “submitted” status; access and delivery are audited; retention/deletion is operational; no unverified automation is involved.

## Phase 11 — Controlled pilot and launch readiness

**Current implementation status (October 17, 2026):** A read-only home-page launch gate lists outstanding official-rule, database/security, privacy/policy, upload, support, and operational checks. Every gate remains blocked; this is not launch approval. See [Phase 11 operations note](docs/operations/phase-11-pilot-readiness.md).

### Goal

Run a small, supported real-user pilot and prove both the digital flow and human operations.

### Product/quality work

- Test complete journeys: account recovery, draft/resume, family sections, correction loops, file errors/retries, approval invalidation, payment mismatch/refund, support, cancellation, and deletion.
- Test phone viewport, Amharic/English text, assistive technology basics, keyboard use, low bandwidth, and connection loss.
- Verify translated help and status messages with fluent reviewers.
- Confirm waitlist/contact entries are processed and deletion/opt-out works.

### Operations/security work

- Train staff and rehearse assignment, correction, photo review, payment reconciliation, complaint/refund, incident response, and offboarding.
- Review production access and least privilege.
- Verify backups and rehearse restore; verify storage lifecycle/deletion; check alerting and provider outage response.
- Review logs/error reporting for PII and secret leakage.
- Reconfirm official rules and public wording immediately before launch; freeze the cycle config with reviewer/version metadata.
- Establish support coverage, escalation owner, incident contacts, and pilot limits.

### Pilot measures

- Wizard completion and successful resume rates.
- Time from start to applicant approval.
- Correction requests by type, including missing family information/photo problems.
- Mobile upload failure rate and recovery.
- Payment verification duration, mismatches, refunds, and unresolved cases.
- Applicant understanding of fees, consent, service boundary, and confirmation ownership.
- Support response time, unresolved cases, deletion requests, and privacy/security events.

Do not treat lottery selection or visa outcomes as a product success metric; those are outside the service's control.

### Exit gate

Pilot issues are understood and prioritized; no critical privacy, security, payment, or operational gap remains; staff can support the agreed volume; applicants understand the promise and limits; launch claims match functionality actually delivered.

## Phase 12 — Post-pilot improvements and platform expansion

**Current implementation status (October 17, 2026):** A bilingual self-service results helper links to the official Entrant Status Check and collects no confirmation number or result. Partner tools, analytics, additional languages, and other application modules remain post-pilot work. See [Phase 12 operations note](docs/operations/phase-12-results-helper.md).

Only prioritize these after pilot evidence shows the core service works.

### Results helper

- Add a reminder and plain-language explanation of result-check steps.
- Open the official results site for the applicant to check themselves.
- Keep credentials and security answers out of the product.
- Do not imply selection or visa approval.

### Languages and support

- Add Oromo/Tigrinya after reviewed translations, QA, and support capacity are available.
- Add support chat or callback scheduling if pilot demand justifies it; keep important case decisions recorded in the system.
- Add SMS/Telegram reminders with minimal content, opt-out rules, delivery logs, and privacy review.

### Business/admin capabilities

- Referral codes and partner/agent accounts only after staff permissions, attribution, applicant consent, fraud controls, and partner training are designed.
- Revenue/volume analytics using aggregated, minimized data; define access and retention.
- Optional Telebirr/CBE API integration only after provider access, transaction verification, refunds, idempotency, webhook security, and reconciliation are available and verified.

### Other application modules

- Scholarships, education, visa/travel, and other international applications should be separate workflow modules on reusable infrastructure.
- Each module needs its own requirements sources, consent, schema versions, document policies, operations, risk review, and acceptance criteria.
- Do not reuse DV applicant data for unrelated applications without a new purpose, clear notice, and appropriate consent.

### Exit gate

Expansion is approved only when the DV pilot has stable operations and each new capability has a named owner, verified need, security/privacy review, and support plan.

## Cross-phase technical completion standards

Every phase that changes software should include, as applicable:

- A reviewed API/data contract and backward-compatibility note.
- Authorization checks and error states, not only the successful path.
- Migration/rollback notes for database or schema changes.
- Applicant-visible copy for statuses, failures, and next actions.
- Amharic/English message coverage for user-facing changes.
- Audit requirements for sensitive actions.
- Retention/deletion effects and data inventory updates.
- Operational documentation for staff actions and support escalations.
- Manual verification evidence appropriate to risk; do not claim verification that was not performed.

## Immediate next step

Run the Phase 3 migration on a disposable PostgreSQL database and complete the cross-account, role/assignment, MFA, audit, logout, and concurrency checks. Then begin Phase 4's versioned DV form schema and preparation wizard after verifying the applicable cycle's official requirements. Keep real applicant intake, payment collection, official submission, and confirmation storage disabled until their separate gates are met.
