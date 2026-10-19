# ADR 0003: Phase 3 identity, privileged access, and case workflow

- **Status:** Accepted for the development foundation; production intake remains gated
- **Date:** 2026-10-17
- **Decision owner:** Mikiyas

## Decisions

### Account access and recovery

- Use passwordless email one-time codes because email is already part of the planned applicant workflow and avoids collecting/storing passwords.
- A challenge expires after 10 minutes and is consumed on success. Verification allows at most five attempts. Responses do not distinguish new, existing, or disabled accounts.
- Configure SMTP for non-development environments. A development code is returned only when `APP_ENV=development` and `HTTP_ADDR` is loopback. Development accounts and database must contain synthetic data only.
- Store HMAC digests of one-time codes and SHA-256 digests of high-entropy session tokens. Do not store raw codes or session tokens.
- Sessions expire after 12 hours and are revocable. Use `HttpOnly`, `SameSite=Lax` session cookies, a separate CSRF cookie/header, same-origin checks, and `Secure` cookies outside local development.
- The email channel is both sign-in and account recovery. Changing the account email is not implemented in Phase 3.
- When SMTP is configured, challenge delivery is queued transactionally in an encrypted PostgreSQL outbox and processed with bounded retries. Delivery is at-least-once and may duplicate a message after a process crash.

### Privileged access

- Roles are `applicant`, `staff`, and `administrator`. Public sign-in can create only an applicant grant. Staff/admin grants require an existing administrator or the audited one-time bootstrap operation.
- Staff can read cases only after assignment; administrators can see all cases and assign cases to active staff. Staff/admin APIs require TOTP MFA. TOTP secrets are encrypted using AES-GCM with a separate 32-byte key; enrollment and resets are audited.
- Admins cannot change their own role or reset their own MFA. If the sole administrator loses MFA, a verified operator must use the documented break-glass runbook.

### Case workflow and audit

- Phase 3 stores only owner, cycle key, workflow status, assignment, revision, and timestamps. It does not store DV answers, family records, photos, payments, confirmation numbers, or support messages.
- A user can have one open case per cycle. Case creation starts at `in_preparation`; staff transitions follow the explicit state graph in the API contract. Closed cases are terminal.
- Case reads, timeline reads, status changes, assignments, role changes, MFA actions, and session creation/revocation are audited. Case and audit events are append-only at the database layer.
- Case updates require the current revision; stale writes return `409`.
- Use `golang-migrate` v4.20.1 as an operator-invoked CLI. The application runtime never applies migrations.

## Security and launch limits

- Authentication rate limits are shared through PostgreSQL fixed-window counters. Without a database, the development-only path uses an in-memory limiter. PostgreSQL failures fail closed for sign-in challenge/verification requests.
- `X-Forwarded-For` is ignored unless the direct TCP peer matches a configured `TRUSTED_PROXY_CIDRS` prefix. The edge proxy must append the actual connecting client address, and direct API ingress must be blocked when a proxy is expected.
- SMTP, outbox-key management/rotation, PostgreSQL backups, access review, retention/deletion windows, account deletion, incident response, and production hosting still need operational decisions. The current schema/API is a development foundation, not authorization to open public intake.
- Do not use the loopback development-code mode outside an isolated local environment. Production requires HTTPS origin configuration, SMTP delivery, `AUTH_OTP_PEPPER`, and a separately managed `MFA_ENCRYPTION_KEY_B64`.

## Consequences

- The applicant and staff experience can be developed against real server-side ownership and role rules without collecting DV form answers.
- The first administrator is established out of band after verifying account-email control. Further staff/admin grants use the authenticated, MFA-protected admin route.
- Email delivery, account email changes, staged proxy/rate-limit load rehearsal, and deletion tooling require follow-up work before production intake.
