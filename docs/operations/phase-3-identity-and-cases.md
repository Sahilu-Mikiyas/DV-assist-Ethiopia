# Phase 3 operations: identity and case workflow

**Status:** Development runbook. Follow only with synthetic accounts until the Phase 3 exit gate is verified and the privacy/retention and operating policies are approved.

## Local startup

1. Start a disposable PostgreSQL instance with `docker compose -f deploy/compose.local.yaml up -d`.
2. Install `golang-migrate` v4.20.1 as documented in `db/migrations/README.md`.
3. Set `DATABASE_URL` to the local database. Use separate migration-owner and runtime roles outside disposable development.
4. Generate secrets in PowerShell without printing them in chat or committing them:

   ```powershell
   $bytes = New-Object byte[] 32
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   $env:MFA_ENCRYPTION_KEY_B64 = [Convert]::ToBase64String($bytes)
   $pepperBytes = New-Object byte[] 48
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($pepperBytes)
   $env:AUTH_OTP_PEPPER = [Convert]::ToBase64String($pepperBytes)
   ```

5. Apply migrations, then run `go run ./cmd/api` from `services/api` with `APP_ENV=development`. Development codes are returned only when the API binds to a loopback address.
6. Run the React app separately from `apps/app` using `npm run dev`.

Never reuse a development MFA encryption key in production. Back it up securely: losing it prevents decrypting enrolled TOTP seeds. Do not rotate it without a planned re-enrollment process. The OTP pepper is also a secret; rotation invalidates outstanding challenge digests.

## Initial administrator

1. Start the API and request a sign-in code for the intended administrator email.
2. In loopback development, read the one-time code from the response and verify it in the portal. The address must be controlled by the operator.
3. Stop the API or use a separate terminal with the same database configuration and run from `services/api`:

   ```powershell
   $env:BOOTSTRAP_ADMIN_EMAIL = 'operator@example.test'
   go run ./cmd/bootstrap-admin
   ```

   The command succeeds only when the account is verified and there is no active administrator. It records a bootstrap audit event and cannot be used after the first active admin exists.
4. Sign back in. Open MFA setup, add the TOTP secret to an authenticator app, enter a current code, and activate MFA. Staff/admin routes remain blocked until MFA is active and verified in the current session.
5. Remove bootstrap environment values from the shell when finished.

For production, configure SMTP first; development codes must never be exposed on a public address. Bootstrap access to the production database must be tightly controlled and reviewed.

## Add a staff member

1. The person signs in once with an email account they control.
2. An administrator uses account lookup and grants the `staff` role.
3. The new staff user signs in again or refreshes the session, enrolls in TOTP MFA, and verifies a code.
4. The administrator assigns cases only to active staff accounts with MFA enabled.
5. Remove staff role/session access promptly during offboarding. Record the business reason in the approved operational record; the API audit event records role and target account identifiers.

## Role and workflow rules

- Applicants see and edit workflow status only for their own cases. Current Phase 3 cases contain no DV answers or files.
- Staff see only assigned cases. They can move a case through the allowed status graph and cannot assign cases or grant roles.
- Administrators with MFA can see all cases, assign to active MFA-enabled staff, manage staff/admin roles, and reset another user's MFA.
- An admin cannot change their own role or reset their own MFA through these routes. The final active administrator cannot be revoked.
- Every API case access creates a case event and audit event; role management, assignment, status changes, login/session, logout, and MFA operations are audited where implemented.
- Case status changes use the `If-Match` revision. A stale revision returns a conflict; reload the case before retrying.

## MFA recovery

There are no user-held backup codes in this phase. After verifying the requester through an out-of-band process defined by the operator, a different administrator can reset the user's MFA. The reset revokes that user's sessions. The user must sign in again and enroll a new authenticator. If no administrator is available, use a separately controlled database recovery procedure; do not alter role rows informally. Record the reason and identity verification in the organization’s approved incident/support record.

## Before accepting real cases

- CI runs `go test -race -count=1 ./...` against a disposable PostgreSQL database after applying migrations. The integration tests cover owner-versus-other-applicant reads, assigned-versus-unassigned staff, staff MFA gating, case-read audit outcomes, concurrent revision conflicts, and logout revocation. Local runs skip these database tests when `DATABASE_URL` is not set; a passing local build is not evidence that the integration cases ran.
- Run migration and rollback/restore checks on disposable PostgreSQL, then perform two-account ownership checks, assigned/unassigned staff checks, MFA challenge/replay/rate-limit checks, logout, stale revision, admin bootstrap and last-admin tests.
- Add email outbox/retry monitoring and a production-grade distributed rate limiter before multi-instance production deployment. The current rate limiter is process-local.
- Configure HTTPS termination, secure cookies, database backups and restore, least-privilege runtime DB grants, SMTP STARTTLS credentials, monitoring, alerts, and an incident contact.
- Approve privacy, consent, retention/deletion, terms, refund, support response, and staff-access review policies.
- Do not treat this phase's case shell as DV application intake. No actual DV answers, family records, image uploads, payment proof, confirmation details, or government portal access belong here.
