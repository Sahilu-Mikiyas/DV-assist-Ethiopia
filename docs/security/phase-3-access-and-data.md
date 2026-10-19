# Phase 3 access and data notes

## Data present in Phase 3

| Data | Purpose | Access | Current storage |
| --- | --- | --- | --- |
| Email address and verification timestamp | Passwordless sign-in and account recovery path | Account owner; admin lookup is by explicit request | PostgreSQL users table |
| OTP digest, expiry, attempt count | Verify email sign-in | API only | PostgreSQL; HMAC digest uses `AUTH_OTP_PEPPER` |
| Session and CSRF token digests | Authenticate requests and enforce CSRF | API only | PostgreSQL; browser receives opaque cookies |
| TOTP secret ciphertext and MFA state | Require MFA for privileged roles | API decrypts with dedicated key; owner uses authenticator | PostgreSQL encrypted with AES-GCM and `MFA_ENCRYPTION_KEY_B64` |
| Role grants | Authorize applicant, staff, and administrator workflows | API; admins can manage other users | PostgreSQL |
| Case cycle key, status, owner, staff assignment, revision | Track preparation workflow shell | Owner, assigned staff, or administrator per matrix | PostgreSQL |
| Case events and audit events | Explain sensitive access and changes | Case participants; audit is server-side | PostgreSQL append-only triggers |

The app does not yet store DV-form answers, family-member details, photos, payment evidence, confirmation numbers, government account credentials, support messages, or official application submission data. Retention durations and automated deletion are not implemented; approve policy before real account/case use.

## Access matrix

| Action/resource | Anonymous | Applicant | Staff (MFA) | Administrator (MFA) |
| --- | --- | --- | --- | --- |
| Request/verify sign-in code | Own email flow | Yes | Yes | Yes |
| View own session / logout | No | Yes | Yes | Yes |
| Create/list own cases | No | Yes | Only if also applicant | Yes, for own cases |
| Read case details/timeline | No | Own cases only | Assigned cases only | All cases |
| View staff case queue | No | No | Assigned cases only | All cases |
| Change case status | No | No | Assigned cases only | All cases |
| Assign a case | No | No | No | Active MFA-enabled staff only |
| List staff users / lookup account | No | No | No | Yes; lookup uses POST body |
| Grant/revoke staff or admin role | No | No | No | Yes; not self; final admin protected |
| Reset another user's MFA | No | No | No | Yes; sessions revoked |

All ownership and role rules are enforced in the API. Hiding a UI control is not an access control. Unknown and unowned case identifiers return the same not-found shape. The API emits request IDs and logs operation plus a generic failure class; it avoids logging raw database/SMTP errors that might contain personal values.

## Controls and limitations

- The CI PostgreSQL integration job exercises applicant ownership, staff assignment scoping and MFA gating, case-read audit outcomes, concurrent status revisions, and logout revocation. Those checks require the disposable PostgreSQL service; a local `go test ./...` without `DATABASE_URL` reports the integration tests as skipped.

- Passwordless challenge codes: 10-minute expiry, bounded attempts, HMAC digest, generic response, and process-local IP/email rate limit.
- Sessions: opaque random token stored only as a digest, `HttpOnly` cookie, expiry, CSRF cookie/header pair, origin check, and logout revocation.
- Staff/admin access requires TOTP MFA. TOTP secrets are encrypted at rest with a separate 32-byte key. Current recovery is admin reset; there are no backup codes.
- Sensitive state changes and case views create append-only case/audit records. PostgreSQL's table owner can bypass triggers; production should use separate migration and runtime roles, and runtime must not own tables.
- The API's in-memory limiter is per process and resets at restart. It is not sufficient for a multi-instance public deployment.
- Email delivery uses SMTP with STARTTLS; production startup requires database, HTTPS public origin, and valid SMTP configuration. Delivery retry/outbox and monitoring are not implemented.
- `GET /healthz` is a process health check, not a dependency readiness check.
- Phase 3 does not meet a real-data launch gate until PostgreSQL integration, restore, access-isolation, MFA, privacy, retention, and operational checks are completed.
