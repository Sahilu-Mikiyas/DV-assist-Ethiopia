# Ethio DV Assist — Phase 0 Validation Record

**Status:** In progress — pilot scope, operator, cohort, languages, support channel, payment method, stack, and data-minimization direction decided  
**Review date:** October 16, 2026  
**Owner:** Mikiyas  
**Scope:** Product, official-source, operational, privacy, and pilot decisions before implementation

This record separates current evidence from product decisions. Official instructions can change; refresh the source review immediately before publishing cycle-specific claims or accepting a live DV case.

## 1. Current official-source findings

| Topic | Finding from official source review | Product consequence | Status |
| --- | --- | --- | --- |
| DV-2027 registration dates | The State Department’s DV-2027 entry-period notice is dated November 5, 2025 and says it will announce the registration start date later. The State Department submit-entry page says entries can only be submitted during the specified period and the entry site is not active for submission before the specified date/time. I found no newer official DV-2027 opening-date announcement in this review. | Do not say DV-2027 registration is open or publish a start date. A waitlist/preparation service can be described separately from official registration. Recheck official sources before launch. | Verified in this review; refresh before launch |
| Official registration fee | The State Department fee schedule lists a $1 Diversity Visa registration fee, paid at registration by the principal applicant. | Keep any government fee separate from Ethio DV Assist's service charge. Do not promise a payment method until the current entry instructions confirm it. | Fee listed; payment mechanics unresolved |
| Official entry channel | The Department says all entries must be submitted electronically on the Electronic Diversity Visa website during the specified registration period. | Do not imply that Ethio DV Assist is the government site or that an internal draft is an official entry. The exact assistance process needs separate validation. | Verified general process; assisted workflow unresolved |
| Current visa-issuance guidance | A State Department notice last updated August 31, 2026 says diversity visa issuances are paused effective immediately. This concerns visa issuance after selection; it does not, by itself, establish whether a new DV entry period is open. | This is a material context to monitor and explain accurately if relevant. Avoid claims about eventual visa issuance or outcomes; check for changes before launch. | Notice found; recheck status before launch |
| Current-cycle form fields | I did not find DV-2027 instructions that settle the complete field list in this review. | Do not hard-code last-cycle fields as DV-2027 requirements. Keep cycle-specific fields in draft config until verified. | Open |
| Passport details | The product notes that passport details were added for DV-2026 and asks whether DV-2027 requires them. This review did not confirm the DV-2027 requirement. | Do not collect passport details or scans merely because the prototype asks for them. Verify the exact requirement and data necessity first. | Open |
| Photo criteria | The feature notes list last-cycle technical values and visual guidance; current-cycle criteria were not confirmed here. | Treat dimensions, file size, image constraints, and required family photos as draft values only until checked against current instructions. | Open |
| Household requirements | The product notes describe spouse/child rules from a previous cycle; this review did not confirm the DV-2027 details. | Build configurable repeatable household sections, but publish the rules only after current instructions are reviewed. | Open |
| Duplicate entries | Official past-cycle instructions warn that more than one entry for a person disqualifies all entries for that person; this review did not verify current-cycle wording. | A user self-attestation and clear warning are appropriate product candidates. Do not claim the platform can detect all other entries or build identity matching yet. | Prior-cycle evidence only; refresh |
| Assistance by another person | The product recap states applicants receiving help should be present and retain confirmation information; current-cycle instructions need to be reviewed before defining the service SOP. | Design for applicant visibility, approval, and direct possession of confirmation data; exact staff actions remain an open operational decision. | Open for current-cycle validation |

### Official sources reviewed

- [Changes to Entry Period for DV-2027](https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html) — current notice found in this review, last updated November 5, 2025.
- [Diversity Visa Program — Submit an Entry](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-submit-entry1.html) — general official submission process.
- [Fees for Visa Services](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html) — official fee listing.
- [Diversity Visa Issuance Updated Guidance](https://travel.state.gov/content/travel/en/News/visas-news/diversity-visa-issuance-updated-guidance.html) — notice last updated August 31, 2026.
- [U.S. Visas News](https://travel.state.gov/content/travel/en/News/visas-news.html) — newsroom used to check whether a newer DV-2027 notice appeared.

## 2. Recommended pilot boundary

### Recommended starting offer

Start with **preparation and review assistance**: explain the process, help applicants organize answers, check completeness against verified instructions, give advisory photo feedback, and provide an applicant-controlled review. Offer human help only within a documented SOP.

Keep official website submission, government-fee collection, and any claim of completed submission out of the first pilot until the current rules and permitted process are verified and the team can perform and evidence the workflow consistently. This boundary still allows the team to test the main user need and the staff case process.

### Recommended payment boundary

For the first pilot, if there is a paid service, track **only the Ethio DV Assist service fee** using manual verification. Show it separately from the $1 government registration fee listed by the State Department. Do not collect government payment credentials or store bank/card credentials. Do not collect official fees on behalf of applicants until the payment route and responsibilities are confirmed.

### Draft pilot package near 1,500 ETB

This is a scope proposal to validate, not finalized pricing or a promise of official submission:

**Agreed scope to validate:** guided preparation using the verified current-cycle checklist; one human completeness review of the applicant's answers; advisory photo feedback for the applicant and any required family members; one correction round; a private copy of the applicant's prepared answers; and Telegram support for questions about the preparation service. The ~1,500 ETB price remains a hypothesis until staff time, costs, refund terms, and payment operations are reviewed.

**Would exclude:** government registration fee; official website submission; eligibility/legal advice; guaranteed photo acceptance, entry acceptance, selection, or visa issuance; passport/ID scan collection by default; and storage of government-site credentials or confirmation values.

Before publishing, estimate staff time, specify whether the included review round has a time limit, define payment receipt details, and settle cancellation/refund outcomes for work not started, work partially completed, applicant no-response, and service failure.

### Recommended data boundary

- Use synthetic data during development and early usability work.
- For real pilot cases, collect only fields confirmed as necessary for the chosen preparation service.
- Do not request passport/ID scans by default.
- Do not request payment screenshots unless a documented reconciliation need is established.
- Do not store confirmation information until the assisted-submission process, secure delivery, and retention period are settled.
- Do not store government-site passwords or entrant status check answers.

### Recommended product claims

- Say “DV preparation” or “join the service waitlist” until the official registration window is confirmed open.
- Say photo checks flag possible technical issues; a check does not guarantee acceptance.
- Say the service does not increase selection odds and is not affiliated with the U.S. Government.
- Make the service fee and government fee visibly separate.
- Do not promise secure storage, a confirmation vault, notification delivery, or deletion timeframes until implemented and operationally verified.

## 3. Decisions to make

| Decision | Proposed default for pilot | What changes based on the answer |
| --- | --- | --- |
| Service scope | **Decided:** preparation and review only for the first pilot; no official submission by staff | Product copy, consent, staff SOP, case states, and confirmation handling |
| Applicant role | Applicant enters/reviews and remains present for any future assistance | Wizard, consent language, support workflow |
| Service fee | **Decided for validation:** one assisted preparation/review package near 1,500 ETB; this is a pilot hypothesis, not a final published price. Verify inclusions and costs. Manually verify payments. | Payment record, receipt, refund policy, staffing economics |
| Government fee | **Decided for pilot:** not collected or facilitated by Ethio DV Assist; the preparation/review service fee is tracked separately | Payment architecture and reconciliation obligations |
| Account model | Applicant account for save/resume; choose login method after user research | Authentication provider and recovery flow |
| Contact channel | **Decided:** Telegram is the direct support channel; response-time target intentionally deferred. Do not use chat as canonical storage or delivery for sensitive case records. | Support implementation, privacy notice, and notification handling |
| Languages | **Decided:** Amharic and English for the first supported flow | Translation, copy review, UI and QA |
| Data retention | **Partly decided:** delete photos no later than 30 days after final photo review or case closure, whichever is later. Set answer and payment-record periods after policy review. | Data model, deletion jobs, privacy notice |
| Pilot size | **Decided:** 5–10 applicants, capped and supported manually | Staffing, support coverage, monitoring and rollback |
| Pilot operator | **Decided:** Mikiyas handles pilot cases and support | Role permissions, escalation and capacity limits |
| Brand | **Decided:** use Ethio DV Assist as a standalone brand | Landing page, domain, legal pages, identity |

## 4. Operational questions requiring owner answers

The first three items below are decided. The remaining items need an owner decision before the corresponding feature is enabled.

1. **Submission model — decided:** Preparation and review only; staff do not submit an official entry in the pilot.
2. **Payment — partly decided:** Manual Telebirr verification for the service fee only; no government-fee collection or facilitation. Price, package inclusions, receipt details, mismatch handling, and refunds remain open.
3. **Brand — decided:** Ethio DV Assist is standalone.
4. **Pilot support details — partly decided:** Amharic and English; Telegram is the support channel. Response-time target is deferred. Do not request passwords, payment PINs/OTPs, or unnecessary sensitive documents in chat.
5. **Data — partly decided:** Delete photos no later than 30 days after final photo review or case closure, whichever is later. Set answer/payment record periods after policy review; keep only necessary account/contact data.
6. **Technical setup — partly decided:** React/TypeScript + Go + PostgreSQL is selected. Choose identity/recovery approach, hosting/data-region constraints, private object storage, and deployment approach before production data.

## 5. Research and validation tasks

### Official rules

- Revisit the official DV-2027 instructions as soon as the Department publishes them.
- Record exact source versions for form fields, eligibility questions, family rules, photo requirements, official fee amount/method, entry timing, and third-party assistance instructions.
- Have a second person review the extracted rules before they are encoded in the schema.
- Add change monitoring to the product owner's operating checklist; do not rely on a one-time source review for time-sensitive claims.

### Applicant and staff research

- Interview applicants about the exact point where they get stuck: information comprehension, family details, photo preparation, payment access, trust, connectivity, or fear of scams.
- Ask how applicants currently save confirmation details and what devices/channels they trust.
- Test Amharic/English explanations with fluent readers; translation must preserve meaning rather than mirror labels literally.
- Ask staff to walk through service steps and failure cases before building automation.

### Business validation

- Estimate staff minutes and support costs for each service tier.
- Validate willingness to pay with a transparent mock offer; distinguish service value from the government fee.
- Define refund and exception handling before collecting money.
- Confirm that Telebirr references can be reconciled without collecting PINs, passwords, or one-time codes.

## 6. Phase 0 exit checklist

Phase 0 is ready to close when:

- [x] Service scope and applicant/staff roles are documented for a preparation/review pilot.
- [ ] DV-cycle source register is current, with unresolved items explicitly listed.
- [ ] Registration status/date language is verified immediately before public launch.
- [ ] Field list and photo criteria are sourced for the target cycle before being published or enabled.
- [x] Service fee and official fee are separated in the pilot scope; the product will not collect or facilitate the official fee.
- [ ] Payment/refund/failure SOP is written for every method the pilot will accept.
- [ ] Data inventory and retention/deletion rules cover accounts, answers, photos, payment proof, and confirmation details.
- [ ] Consent/privacy/terms content is reviewed before any personal data or payment is collected.
- [ ] Pilot support channel, languages, staff owner, cohort size, and an attainable response target are agreed. Response target is currently deferred.
- [x] Core stack is selected to start Phase 1; production hosting, identity, and object storage remain deployment decisions.

## 7. Decisions recorded from owner

- Pilot offer: preparation and review only; no staff submission of an official DV entry.
- Pilot payments: manual verification of Ethio DV Assist's service fee. No official government fee collection or facilitation.
- Brand: Ethio DV Assist as a standalone brand.
- Pilot operations: Mikiyas handles cases and support for a capped group of 5–10 applicants.
- Pilot pricing hypothesis: validate one assisted preparation/review package near 1,500 ETB; do not treat this as finalized pricing or advertise it as final until inclusions, costs, and refund terms are agreed.
- Pilot languages: Amharic and English.
- Pilot support: Telegram; response-time target intentionally deferred. Keep case records and sensitive file exchange in the authenticated product, not chat.
- Pilot service-fee method: Telebirr with manual verification. Do not collect PINs, passwords, or one-time codes; final receipt, reference, mismatch, and refund SOP remain to be documented.
- Technical stack: React/TypeScript + Go + PostgreSQL selected. Hosting, data region, identity provider/recovery, and private object storage remain open.
- Data minimization: delete photos no later than 30 days after final photo review or case closure, whichever is later. Retention for case answers/payment records awaits policy review.

### Remaining owner/operations decisions

- Decide later whether to publish a Telegram response-time expectation; do not promise one during the first pilot until support capacity is measured.
- Finalize the ~1,500 ETB price only after estimating staff time and costs for the agreed one-review/one-correction package.
- Define Telebirr receipt, reference mismatch, cancellation, partial-completion, refund, and applicant-no-response procedures.
- Define and operationalize the 30-day photo deletion timer; set answer/payment-record retention periods after reviewing operational needs and applicable requirements.
- Select an applicant sign-in/recovery method and decide hosting/data-region and private-file-storage constraints before real personal data is used.
- Assign a second reviewer for official-cycle requirements when DV-2027 instructions are published.

These decisions should be reflected in the landing page, consent text, applicant status model, payment ledger, staff SOP, and technical plan. In particular, do not label a case “submitted” or create a confirmation vault in this pilot.

## 8. Current Phase 0 recommendation

Proceed with applicant/staff discovery and architecture preparation while keeping the product in preparation/waitlist mode. The official newsroom review did not find a newer DV-2027 registration-date announcement than the November 5, 2025 notice, and the State Department currently lists a separate pause on DV visa issuances. Neither fact should be converted into a prediction about when entry will open or what will happen to future selectees. Refresh both before launch.

The best first technical slice remains a secure preparation draft with synthetic data. Manual Telebirr service-fee collection should wait until the receipt, mismatch, refund, and privacy SOP is written. Official-fee handling, official submission, and confirmation storage remain out of the pilot.
