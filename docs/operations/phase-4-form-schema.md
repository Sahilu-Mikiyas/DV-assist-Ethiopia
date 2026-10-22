## Current state

The React prototype renders a small bilingual wizard from `config/dv-cycles/schema-demo.json`. It demonstrates localized sections, required-choice validation, conditional visibility, and browser-tab-only draft persistence. The demo data represents service preferences, not applicant or DV answers.

The data-only config shape is described by `config/dv-cycles/schema-v1.json`. It has no scripting or arbitrary expressions. `scripts/validate-cycle-config.mjs` checks the sample configs and keeps DV-2027 blocked while its verified field list is empty.

## DV-2027 publication gate

The official instructions page currently lists DV-2026. The Department's DV-2027 notice says registration dates will be announced later. Therefore `config/dv-cycles/dv-2027.json` is `blocked_pending_official_instructions`, has no sections, and must not be used to collect DV answers. When official instructions are published, two reviewers should record the exact sources and verification date, compare every proposed field and rule to those sources, and release a new immutable config version. Do not edit answers in place or treat the sample schema as official form content.

## Validator coverage

The cycle-config check validates bilingual section and field labels, supported field types, bounded text fields, select options, repeatable-group bounds and uniqueness, conditional field references, and HTTPS source links on `travel.state.gov`. DV-2027 remains blocked with zero fields until applicable official instructions are published and reviewed. This improves configuration integrity; it does not enable applicant-data intake.

## Current limits

- The schema wizard is local prototype behavior and stores only in the browser tab's session storage.
- The account portal now fetches a released cycle schema and saves owner-only drafts through the encrypted API. The standalone synthetic wizard remains a local demo and is not a DV form.
- The API validates known field IDs and value types for saved draft values, and rejects conditional answers when their source condition is not satisfied. Draft saves remain partial. An owner-only review endpoint checks required top-level and repeatable-group answers against the pinned reviewed schema and returns missing field identifiers without returning answer values. This is a completeness aid only; it does not enforce official eligibility rules, photo rules, legal consent, or submission readiness.
- Phase 3's PostgreSQL migration and account/case authorization gate is still unverified.
- Do not enter real applicant information or accept payments in this build.

## Checks

From the repository root, run `node scripts/validate-cycle-config.mjs`. From `apps/app`, run `npm run build` and `npm run lint`.

## Encrypted draft API foundation

The API has owner-only draft read/write routes backed by `cycle_form_schemas` and `case_drafts`. The account portal loads the current released schema, opens the case's pinned draft, and saves using revision checks. Case creation and draft reads/writes fail closed if the cycle has no current reviewed schema. Draft JSON is encrypted with AES-GCM before it reaches PostgreSQL. The encryption key is separate from the MFA and email-outbox keys (`APPLICANT_DATA_ENCRYPTION_KEY_B64`) and must decode to exactly 32 bytes. If it is absent, draft routes return unavailable. Audit events record access/save metadata only; answer contents are never included.

The database seeds DV-2027 as blocked with no fields. A schema must be reviewed against the official instructions, checked with `scripts/validate-cycle-config.mjs`, and approved by two distinct reviewers before a migration owner can publish it as current. Runtime database credentials can read schemas but cannot change them. Each draft is tied to a schema version; new edits validate field IDs and types against the current schema, and existing drafts remain decryptable against their pinned version. If a cycle version changes, the UI blocks editing of drafts pinned to the previous version until an explicit migration is implemented; answers are not silently discarded or rewritten.

Do not mark DV-2027 verified or enter real applicant data. Applicant data retention/deletion policy, consent, access operations, production hosting, backup retention, and incident readiness remain launch gates.
