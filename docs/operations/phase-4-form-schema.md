# Phase 4: versioned form schema

## Current state

The React prototype renders a small bilingual wizard from `config/dv-cycles/schema-demo.json`. It demonstrates localized sections, required-choice validation, conditional visibility, and browser-tab-only draft persistence. The demo data represents service preferences, not applicant or DV answers.

The data-only config shape is described by `config/dv-cycles/schema-v1.json`. It has no scripting or arbitrary expressions. `scripts/validate-cycle-config.mjs` checks the sample configs and keeps DV-2027 blocked while its verified field list is empty.

## DV-2027 publication gate

The official instructions page currently lists DV-2026. The Department's DV-2027 notice says registration dates will be announced later. Therefore `config/dv-cycles/dv-2027.json` is `blocked_pending_official_instructions`, has no sections, and must not be used to collect DV answers. When official instructions are published, two reviewers should record the exact sources and verification date, compare every proposed field and rule to those sources, and release a new immutable config version. Do not edit answers in place or treat the sample schema as official form content.

## Current limits

- The schema wizard is local prototype behavior and stores only in the browser tab's session storage.
- There is no API persistence, applicant identity link, case pinning, photo collection, or official entry submission.
- Conditional and required validation are client-side demonstration behavior; server validation is still required before any real intake.
- Phase 3's PostgreSQL migration and account/case authorization gate is still unverified.
- Do not enter real applicant information or accept payments in this build.

## Checks

From the repository root, run `node scripts/validate-cycle-config.mjs`. From `apps/app`, run `npm run build` and `npm run lint`.
