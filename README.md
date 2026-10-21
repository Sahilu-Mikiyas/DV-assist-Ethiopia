# Ethio DV Assist

Applicant preparation and review assistance for Ethiopian applicants considering the U.S. Diversity Visa program.

## Current boundary

- The intended service is preparation and review only. Staff do not submit official DV entries.
- The pilot target is 5–10 applicants, handled by Mikiyas in Amharic and English. Telegram is the support channel.
- The proposed one-package service fee near 1,500 ETB is still a hypothesis. Pilot payment, if later approved, is manual Telebirr verification. The app has no payment feature.
- DV-cycle fields, dates, fees, and photo rules require current official verification before implementation.
- Use synthetic data only. Phase 3 is a development implementation, not authorization to accept real applicant data or payments.

## Plans and records

- [Product plan](PRODUCT_PLAN.md)
- [Technical plan](TECHNICAL_PLAN.md)
- [Phased roadmap](PHASED_ROADMAP.md)
- [Phase 0 validation record](PHASE_0_VALIDATION.md)
- [OpenAPI contract](packages/api-contract/openapi.yaml)
- [Database migration conventions](db/migrations/README.md)
- [Phase 3 operations guide](docs/operations/phase-3-identity-and-cases.md)
- [Phase 3 resilience runbook](docs/operations/phase-3-resilience.md)
- [Phase 3 access and data notes](docs/security/phase-3-access-and-data.md)
- [Phase 3 architecture decision](docs/decisions/0003-phase-3-identity-cases.md)
- [Phase 4 form schema operations note](docs/operations/phase-4-form-schema.md)
- [Phase 5 family safeguards note](docs/operations/phase-5-family-and-duplicates.md)
- [Phase 6 photo review note](docs/operations/phase-6-photo-review.md)
- [Phase 7 review and acknowledgment note](docs/operations/phase-7-review-and-consent.md)
- [Phase 8 staff dashboard and operations note](docs/operations/phase-8-staff-operations.md)
- [Phase 9 service-fee and failure-handling note](docs/operations/phase-9-service-fees-and-failures.md)
- [Phase 10 secure closeout note](docs/operations/phase-10-secure-closeout.md)
- [Phase 11 pilot readiness note](docs/operations/phase-11-pilot-readiness.md)
- [Phase 12 results helper note](docs/operations/phase-12-results-helper.md)

## Repository layout

```text
apps/app/                 React + TypeScript applicant/staff portal
apps/web/                 Bilingual landing page and demo, built with Vite and Motion
services/api/              Go HTTP API and one-time admin bootstrap command
packages/api-contract/     OpenAPI source
config/dv-cycles/          Reviewed, versioned cycle configuration (later phase)
db/migrations/             PostgreSQL migrations
docs/operations/           Staff and operational runbooks
docs/security/              Data inventory and security notes
deploy/                     Local PostgreSQL Compose file
```

## What Phase 3 implements

- Email one-time-code sign-in, generic anti-enumeration responses, request throttling, logout, expiring sessions, and CSRF protection.
- Applicant cases: create one case per configured cycle, list, detail, and access-audited timeline.
- Staff: MFA-gated queue, assignments, and constrained status transitions with optimistic revision checks.
- Administrators: MFA-gated staff list, account lookup, role grants/revocation, and MFA recovery reset. The final active administrator cannot be revoked.
- PostgreSQL migrations for identity, sessions, roles, case metadata, case events, and audit events.
- A React portal at `/` in `apps/app` for applicant and staff/admin flows.

The service does not store DV answers, family-member details, photos, payment proof, confirmation numbers, or government-site credentials. Staff/admin functions require TOTP MFA. There are no backup codes; account recovery is an administrator-controlled MFA reset and must be recorded operationally.

## Phase 4 schema prototype

The React app includes a bilingual, synthetic-only wizard rendered from the versioned JSON example in `config/dv-cycles/schema-demo.json`. The DV-2027 config intentionally contains zero fields and remains blocked until official instructions are published and reviewed. This prototype stores its fake sample values in the current browser tab only; it is not an intake flow. See the [Phase 4 operations note](docs/operations/phase-4-form-schema.md).

The wizard also demonstrates bounded repeatable fictional records, per-record completeness, duplicate sample-label detection within the current list, and a limited self-attestation. It does not perform identity matching or detect entries outside the case. See the [Phase 5 family safeguards note](docs/operations/phase-5-family-and-duplicates.md).

After the fictional family sample, the wizard shows a Phase 6 photo-review gate. It describes the intended checks but has no file picker or photo upload because the DV-2027 photo specification and secure storage path are not verified. See the [Phase 6 photo review note](docs/operations/phase-6-photo-review.md).

The wizard then presents a Phase 7 review preview with all visible sample answers and fictional family records, per-section Edit controls, an explicitly demo-only acknowledgment, and browser print support for a sample summary. The acknowledgment is held only in component memory; it is not legal consent, server-persisted approval, an official PDF, or proof of government submission. See the [Phase 7 review and acknowledgment note](docs/operations/phase-7-review-and-consent.md).

The synthetic staff dashboard now supports case-name/ID/language search and status filtering. It edits only fictional cases in browser session storage. The authenticated Phase 3 portal is a separate surface with MFA-gated staff queue, server-side status transitions and assignment, and access-audited case timelines; it requires the PostgreSQL integration gate before operational use. Phase 8 capabilities such as applicant-visible correction requests, photo review, internal-note audit history, and operations exception handling remain open. See the [Phase 8 staff dashboard and operations note](docs/operations/phase-8-staff-operations.md).

The staff demo includes a sample-only service-fee ledger for fictional Telebirr references and pending/verified/exception/refund states. It does not accept payments or verify provider transactions. Service-fee policy and a server-side immutable ledger remain launch gates; government fees are separate. See the [Phase 9 service-fee and failure-handling note](docs/operations/phase-9-service-fees-and-failures.md).

The home page shows the Phase 10 confirmation-vault lock and Phase 11 launch-readiness blockers. Phase 12 offers an official self-service status-check link without collecting a confirmation number or checking results on the applicant's behalf. These are boundary/readiness foundations; no submission, confirmation storage, or production launch is enabled. See the [Phase 10](docs/operations/phase-10-secure-closeout.md), [Phase 11](docs/operations/phase-11-pilot-readiness.md), and [Phase 12](docs/operations/phase-12-results-helper.md) operations notes.

## Run the web and API shells

Open two PowerShell terminals from the repository root. The Go server can run without a database for health and synthetic demo routes; account/case endpoints return a clear 503 until PostgreSQL and configuration are available.

Terminal 1 (build and serve the marketing site):

```powershell
Set-Location apps/web
npm ci
npm run dev -- --host 127.0.0.1
```

Terminal 2 (Go API and synthetic demo routes):

```powershell
Set-Location services/api
go run ./cmd/api
```

Terminal 3 (React account/app prototype):

```powershell
Set-Location apps/app
npm install
npm run dev
```

Open the landing page at [http://127.0.0.1:5173/](http://127.0.0.1:5173/) and the React portal at [http://localhost:5174/](http://localhost:5174/) if the default port is occupied. The React portal checks `/api/v1/session`; without a configured database, account features are unavailable. The Go API listens on `127.0.0.1:8081` by default in this environment, serves the built landing page from `apps/web/dist`, and provides the synthetic demo at [http://127.0.0.1:8081/demo.html](http://127.0.0.1:8081/demo.html). Run `npm run build` in `apps/web` before starting the Go server.

## Enable the account/case API locally

Docker Compose is provided in `deploy/compose.local.yaml` for a disposable local PostgreSQL database. Start it from the repository root:

```powershell
docker compose -f deploy/compose.local.yaml up -d
```

Install the pinned migration CLI described in [migration instructions](db/migrations/README.md), then set `DATABASE_URL` to the local database and apply migrations. Set `AUTH_OTP_PEPPER` to at least 32 random characters and `MFA_ENCRYPTION_KEY_B64` to a base64-encoded 32-byte random key. Keep these values in process environment or a local untracked secret file; never commit them. When configuring SMTP, also set `MAIL_OUTBOX_ENCRYPTION_KEY_B64` to a separately managed base64-encoded 32-byte key for queued email payloads. Applicant draft storage uses its own `APPLICANT_DATA_ENCRYPTION_KEY_B64`; without it, draft reads/writes return unavailable. DV-2027 remains blocked until official instructions are reviewed and a cycle schema is deliberately released.

For loopback development only, email codes are returned in the API response. This is disabled on non-loopback addresses and outside development. Set `APP_ENV=development`. The first administrator must first sign in with a verified email, then run the one-time bootstrap command described in the operations guide. Production requires HTTPS, PostgreSQL, SMTP with STARTTLS, and secure cookies; the app is not production-ready merely because it starts.

Detailed setup, role management, MFA, and incident/recovery steps are in [the Phase 3 operations guide](docs/operations/phase-3-identity-and-cases.md).

## Checks

```powershell
./scripts/check-go.ps1
Set-Location apps/app
npm run build
npm run lint
```

These checks format, statically analyze, compile, and build the code. GitHub Actions also applies, rolls back, and reapplies the migration against disposable PostgreSQL 17. These do not prove SMTP, account isolation, MFA, backup restore, or production deployment. Complete those checks before real cases. Docker/psql are not available in the current implementation environment; WSL access is denied, so local database integration could not be run here.

## Official DV information

This service is not affiliated with the U.S. Government. Official cycle dates, fields, fees, and photo requirements can change. Verify the current [State Department DV information](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry.html) before relying on cycle-specific guidance.

## Deployment bundle

A provider-neutral single-host Compose build is available in [`deploy/README.md`](deploy/README.md). It serves the bilingual public landing page and synthetic-only demo on a loopback-only web port; it does not expose applicant accounts or APIs. See the launch gates before enabling any real-data features.
