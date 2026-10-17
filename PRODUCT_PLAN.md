# Ethio DV Assist — Product and Delivery Plan

**Owner:** Mikiyas  
**Status:** Working plan; no application code exists yet. Phase 0 has selected the pilot boundary and core stack.  
**Updated:** October 15, 2026

This document turns the current feature breakdown and landing page sample into a staged product plan. It is intended to evolve as the service model, official DV-2027 instructions, and technical choices are verified.

## 1. Product goal

Help Ethiopian applicants understand and prepare a Diversity Visa entry, review their own information, receive practical assistance when needed, and retain control of their entry and confirmation details.

The first pilot is preparation and review only: staff do not submit official entries. The pilot will support 5–10 applicants, handled by Mikiyas in Amharic and English, with Telegram as the direct support channel; no response-time promise is set yet. The service-fee hypothesis is one assisted preparation/review package near 1,500 ETB, paid through Telebirr and manually verified. Its proposed scope is guided preparation, one human completeness review, advisory photo feedback, one correction round, an applicant copy of prepared answers, and Telegram support; final price and refund terms remain open. Photos should be deleted no later than 30 days after final review or case closure, whichever is later; retention of answers and payment records remains under policy review. Ethio DV Assist will be a standalone brand. The selected core stack is React/TypeScript + Go + PostgreSQL; hosting, identity, and object storage remain open. The service must never imply government affiliation, guarantee eligibility, promise selection, or claim that assistance improves selection odds.

## 2. Product principles

1. **Applicant control:** Applicants can inspect and approve every answer. They keep access to their confirmation information and can request help without surrendering control of their entry.
2. **Official-source accuracy:** DV-specific fields, instructions, dates, eligibility wording, photo criteria, and fees are versioned and reviewed against the current official instructions before use.
3. **Minimize sensitive data:** Collect only fields and files needed for the selected service. Keep identity data, photos, payment proof, and confirmation information out of logs, analytics, and notification text.
4. **Clear separation of money:** Track the service fee separately from any government fee. State who receives each payment, its status, refund handling, and what happens if the service cannot be completed.
5. **Human-readable assistance:** Help text must explain what a question means, not just translate a label. Amharic is the initial language target; English follows. Oromo and Tigrinya can follow after the pilot.
6. **Honest automation:** Automated checks flag likely issues and explain uncertainty. They do not certify eligibility, photo acceptance, or successful government submission.
7. **Mobile and low-bandwidth first:** Support common phones, resumable progress, compressed uploads, clear loading/error states, and graceful recovery after connection loss.

## 3. Intended users and roles

- **Applicant:** Creates or resumes a case, enters information, uploads photos, reviews answers, gives consent, sees service-payment status, and retrieves their own service records.
- **Assistance staff:** Reviews assigned cases, requests corrections, records service-payment verification, updates workflow status, and documents support actions.
- **Administrator:** Manages staff access, current form configuration, published help content, service pricing, and operational reporting.

Staff access should be role-based and limited to assigned duties. Administrative actions and access to sensitive records should be auditable. A later partner/agent role is out of scope for the initial pilot.

## 4. MVP scope

### Applicant-facing experience

- Public landing page with service explanation, explicit non-government-affiliation notice, service boundaries, current pricing, privacy summary, and a real contact/waitlist path.
- Account creation and secure sign-in, with a simple recovery path appropriate to the chosen identity method.
- Case creation and a multi-step preparation wizard with save/resume, progress, field-level help, and validation.
- Household sections for principal applicant, spouse, and children, rendered from versioned form configuration.
- Photo upload for each person required by the verified official instructions; technical preflight checks and staff-review status.
- Full review screen showing all entered information, explicit applicant approval, and a timestamped consent record.
- Service-fee reference entry and manual Telebirr verification for the pilot. Explain that any official fee is separate and is not collected or facilitated by Ethio DV Assist.
- Applicant dashboard with case status, outstanding actions, support request/contact path, and secure retrieval of service documents.
- Downloadable applicant summary that clearly says it is a copy of the applicant's provided information, not an official government form or proof of entry. Do not show an official-submission status or confirmation vault in this pilot.

### Staff-facing experience

- Case queue with status, age, assigned staff member, and action-needed indicators.
- Case view limited by role; review answers and photos, request corrections, add internal notes, and record decisions.
- Service payment ledger with amount, method, reference, verifier, timestamp, receipt state, and refund state.
- Status transition history and audit trail for sensitive views and edits.
- Basic operational counts: cases by status, unresolved requests, payment reconciliation, and completion totals.

### Not in initial release

- Automated interaction with the official E-DV website or robotic/browser submission.
- Official-fee payment processing or storing card/bank credentials.
- Eligibility guarantees, legal advice, or prediction of selection.
- Results checking on behalf of applicants or storage of their government-site passwords/security answers.
- Partner/agent accounts, referral program, broad analytics, other immigration modules, and non-DV application workflows.
- Collection of passport scans or ID documents unless a documented operational need and consent process are approved.

## 5. Workstreams and delivery sequence

### Phase 0 — Discovery and operational decisions

**Purpose:** Resolve the service model and high-impact unknowns before building data flows.

Tasks:

- Review the latest official DV-2027 entry instructions and record the source URL, retrieval date, effective cycle, and reviewer for each rule used by the product.
- Confirm whether passport details, the registration fee, a specific payment method, and each family-member photo are required in the current cycle. Do not infer from the previous cycle or prototype.
- Decide the exact assisted-submission model, what staff are authorized to do, and how the applicant remains present and in control.
- Define package inclusions, service pricing, government-fee handling, refund scenarios, failure handling, and who issues receipts.
- Define languages for pilot, support hours/channel, case completion target, and what the team will do when a deadline or payment failure occurs.
- Agree on a data inventory and deletion schedule for accounts, form answers, photos, payment proof, audit events, and confirmation information.
- Interview a small number of intended users and staff to validate the biggest pain points and whether they can use the proposed mobile workflow.

**Exit criteria:** Written service boundaries; reviewed cycle-specific requirements; initial privacy/data-retention schedule; documented service and refund policy; and a pilot workflow staff can follow consistently.

### Phase 1 — Repository foundation and product shell

**Purpose:** Establish a maintainable application foundation before collecting sensitive information.

Tasks:

- Select and document the stack, deployment target, environments, and local development workflow. Candidate direction from the initial recap is React + TypeScript for the web client, Go for the API, and PostgreSQL for structured data; confirm before implementation.
- Establish repository structure, configuration management, secret handling, formatting/lint conventions, and CI checks.
- Build the responsive public shell, navigation, landing page, FAQ, service/pricing content, and contact/waitlist form.
- Add accessible form semantics, keyboard navigation, readable contrast, reduced-motion support, and Amharic/English content structure.
- Make all marketing statements consistent with verified service capabilities; avoid implying official affiliation or guaranteed photo/entry acceptance.

**Exit criteria:** App runs in local development and a preview environment; contact submissions are actually delivered or stored with appropriate consent; public content is reviewable on phone and desktop.

### Phase 2 — Identity, roles, and secure case lifecycle

**Purpose:** Create the minimum safe foundation for applicant and staff workflows.

Tasks:

- Implement applicant authentication and staff authentication, role-based access, secure sessions, and account recovery.
- Define a case lifecycle, ownership, assignment, and authorization rules.
- Add database migrations and initial entities for users, cases, status history, consents, and staff assignments.
- Add audit events for authentication-sensitive operations, record views, edits, downloads, status changes, and administrative changes.
- Set retention/deletion behavior and ensure logs exclude applicant answers, uploaded file contents, payment credentials, and confirmation numbers.
- Add rate limiting and abuse protections to account and upload endpoints.

**Exit criteria:** Applicants can only access their cases; staff access is restricted by role; sensitive operations leave auditable events; deletion/retention behavior is documented and operable.

### Phase 3 — Versioned form schema and applicant wizard

**Purpose:** Build the core preparation flow so cycle-specific fields can change without rewriting screens.

Tasks:

- Define a versioned schema format for fields, groups, conditional visibility, validation, localized help, and cycle applicability.
- Keep published schema versions immutable for cases already started; record the schema version on every case.
- Build reusable wizard rendering and validation for text, date, select, yes/no, address, and repeatable family-member groups.
- Add save/resume and draft state with clear save feedback, timeout recovery, and duplicate-submit protection.
- Add family-member completeness prompts based on verified current instructions. Do not encode last-cycle rules as current without review.
- Add duplicate-entry self-attestation and a warning flow. Any future matching should be privacy-reviewed; do not create a hashed identity lookup without an approved threat model and clear limits.
- Provide an answer review screen and a change path back to each section.

**Exit criteria:** A user can complete, leave, and resume a configured case; validation and conditional sections work; staff can identify the schema version; no final approval can occur with required fields missing.

### Phase 4 — Photo handling and review

**Purpose:** Help users catch common technical photo issues while making the limits of automated analysis clear.

Tasks:

- Store cycle-specific photo criteria as reviewed configuration with source and effective date.
- Implement client-side checks for file type, dimensions, square aspect ratio, and file size based on verified criteria.
- Evaluate on-device face/quality checks as optional warnings; define behavior for unsupported devices and false positives before enabling them.
- Compress photos on-device where possible without silently changing the underlying image in ways that could invalidate it.
- Upload to private object storage through short-lived, scoped authorization; enforce size/type limits, malware scanning, encryption, and access logging.
- Support distinct photo slots for each required family member and clear replace/delete controls.
- Provide staff review states such as pending, needs-resubmission, and reviewed, with a reason visible to the applicant.

**Exit criteria:** Invalid technical files are rejected with understandable guidance; automated results are labeled as advisory; only authorized staff can view photos; deletion follows the retention schedule.

### Phase 5 — Review, consent, service payment, and case operations

**Purpose:** Connect preparation to a transparent, accountable assistance service.

Tasks:

- Present a complete review copy and record applicant approval, consent text version, timestamp, and relevant case/schema version.
- Make correction after approval explicit: changes invalidate approval and require a new review/approval.
- Implement service-fee records separately from any official-fee records. Use separate status fields and labels in every applicant and staff view.
- For the pilot, support manual service-fee verification: method, reference, amount, submission timestamp, verifier, verification outcome, receipt, and refund state.
- Do not treat a screenshot alone as proof of payment; define reconciliation and safe handling/deletion of payment evidence.
- Implement operational statuses with allowed transitions, transition reasons, actor, timestamp, and applicant-facing descriptions.
- Add support requests and staff responses tied to a case without using informal channels as the sole record of critical decisions.

**Suggested initial status flow:** `Draft → Needs applicant information → Ready for staff review → Changes requested → Applicant approval required → Approved for assistance → Service payment pending → Service payment verified → Assistance in progress → Confirmation recorded (only if validly completed) → Closed`.

The flow should permit cancellation, refund pending/refunded, payment exception, and unable-to-complete outcomes. Do not label a case as officially submitted until the operational process can substantiate that event.

**Exit criteria:** Applicant approval and service payment are independently recorded; staff can reconcile payments and explain failures; every status change is attributable and has a clear user-facing meaning.

### Phase 6 — Confirmation delivery and secure closeout

**Purpose:** Return official confirmation information to the applicant safely when the approved service workflow has produced it.

Tasks:

- Decide whether confirmation data needs to be stored at all; prefer the minimum necessary retention.
- If stored, encrypt it with a separate key-management plan, restrict staff access, mask it in ordinary screens/logs, and record every view/export.
- Generate a private applicant document and provide a secure, authenticated retrieval path.
- Treat print, Telegram, SMS, email, deep links, and QR as delivery channels with different exposure risks. Never place sensitive confirmation data in a public URL or an unprotected QR code.
- Define applicant handoff, confirmation verification, re-delivery, account recovery, and deletion procedures.
- Close cases with a completion summary, receipt status, support contact, and data-retention date.

**Exit criteria:** Applicant retrieves their record; staff cannot casually expose it; delivery events are auditable; the case can be closed and retained/deleted according to policy.

### Phase 7 — Pilot, operational readiness, and launch

**Purpose:** Validate usability and service operations with a small, controlled group before broad marketing.

Tasks:

- Run end-to-end scenarios for incomplete applications, spouse/child sections, photo replacement, failed uploads, duplicate self-attestation, service payment mismatch, cancellation/refund, staff reassignment, and data deletion.
- Conduct usability sessions in Amharic and English on representative mobile devices and low-bandwidth connections.
- Train staff on review criteria, escalation, privacy, payment reconciliation, communication, and incident response.
- Confirm backups, recovery, access reviews, monitoring, security response contacts, and support availability.
- Launch only the capabilities and claims that are operationally ready; keep unverified official submission/payment functionality disabled.

**Exit criteria:** Pilot issues have owners and severity; staff can run the workflow; applicants understand price, service boundaries, consent, and next steps; no critical privacy/security or payment-reconciliation gaps remain.

## 6. Data model areas to plan for

The exact schema follows stack selection and data review. Likely areas include:

- **Account and role:** applicant/staff/admin identity, authentication metadata, status, role grants.
- **Case:** owner, cycle, current status, assigned staff, schema version, created/updated/closed timestamps.
- **Applicant answers:** structured values tied to a case and schema version; access-controlled and excluded from general logs.
- **Family members:** relationship and cycle-required data; separate person-level photo references where required.
- **Consent and review:** consent text version, approval timestamp, case revision, actor, and invalidation history.
- **File metadata:** private object key, type, size, checksum, scan status, owner/case, retention/deletion timestamps; avoid public URLs.
- **Service payment:** method, amount/currency, reference, proof metadata if required, verification, receipt, refund, and audit history.
- **Official fee:** separate optional record, disabled until a verified workflow exists; never merge with service payment.
- **Status/audit events:** actor, action, timestamp, prior/new state, reason, and minimal metadata.
- **Notifications/support:** delivery status and message template version; avoid storing unnecessary sensitive message content.

## 7. Security and privacy requirements

- HTTPS in transit; encrypted database, backups, and file storage; managed secrets and key rotation.
- Least-privilege staff roles, strong staff authentication, session expiry, and access review.
- Private storage with short-lived signed links and server-side authorization checks.
- Malware scanning and file type validation; never trust client-provided MIME types or filenames.
- No applicant data in analytics, URLs, exception traces, application logs, or third-party AI/photo APIs without an explicit review and consent.
- Separate audit logging from mutable case data; protect logs from staff alteration and restrict their retention.
- Document deletion workflows that include file objects, database copies, exports, and backups according to a stated schedule.
- A plain-language privacy notice explaining purpose, access, storage, retention, sharing, contact, and deletion request process.
- An incident response plan for lost devices, unauthorized access, misdirected documents, and payment disputes.

## 8. Key product decisions to close

1. Is the pilot strictly preparation/review, or does staff-assisted official submission occur? What exact step does the applicant perform?
2. Which account/recovery method is realistic and safe for the intended users?
3. Is the first paid offer self-service, assisted, or one simple package? What costs and support capacity justify the price?
4. Which service payment methods are actually available and reconcilable? Which evidence is needed, and how long is it retained?
5. Is an official fee collected by the applicant directly, facilitated by staff, or not handled by this service? Keep unresolved until verified.
6. What data is essential to the service, especially identity documents and confirmation values, and when is each deleted?
7. What is the pilot language and staff support channel? What response-time expectation can be honored?
8. What technical stack and hosting location satisfy cost, reliability, privacy, and team skills?

## 9. Success measures for the pilot

Measure service quality rather than selection outcomes:

- Share of applicants who finish the preparation wizard.
- Share who resume successfully after leaving mid-flow.
- Median time from case start to applicant-approved review.
- Correction requests by category, especially missing household information and photo issues.
- Upload failure rate on mobile/low-bandwidth connections.
- Payment verification time and unresolved payment/refund cases.
- Applicant understanding of fees, service limits, consent, and confirmation ownership.
- Support response time and unresolved case count.
- Privacy/security incidents and deletion requests completed on time.

Do not use selection or visa outcomes as a measure of service effectiveness; selection is outside the service's control.

## 10. Landing page alignment checklist

Before publication, ensure:

- “Preparation” or “waitlist” is clearly distinguished from official registration being open.
- “Photo checker” is described as advisory and never as guaranteed acceptance.
- Passport, family, education, and fee statements reflect the verified current cycle.
- Prices state exactly what is included and whether government charges are separate.
- The contact/waitlist form submits to a real destination and explains how contact data will be used.
- Privacy claims such as encryption, restricted access, and deletion are implemented and testable before being advertised.
- Any confirmation vault or delivery channel exists before it is promised.
- Government non-affiliation and no-guarantee statements remain visible.

## 11. First implementation sequence

Once the discovery decisions are recorded, the first coding milestones should be:

1. Confirm stack, environments, and repository conventions.
2. Create the app shell and public landing/contact experience.
3. Define authentication, roles, case lifecycle, and audit events.
4. Implement schema versioning and the first verified wizard flow.
5. Add secure photo handling and staff review.
6. Add applicant review/consent and manual service-payment tracking.
7. Add staff queue and applicant status dashboard.
8. Add secure closeout/confirmation workflow only after the service process is verified.
9. Pilot, fix operational gaps, and expand carefully.

The first working milestone should be a small applicant journey from account creation through a saved preparation draft and staff-visible case—not the full DV submission service. This gives us a concrete base while the official cycle-specific workflow is confirmed.
