# Phase 3 — Database, email, and deployment readiness

**Status:** Operator runbook for development and pre-launch rehearsal. Completing the written procedures does not mean a production backup, restore, mail relay, or deployment has been verified. Use synthetic data until the privacy and launch gates are approved.

## Database roles

Use separate database identities for schema changes, the running API, and backups. The migration owner applies reviewed migrations. The API role must not own the database, schema, tables, or append-only event tables. The backup role needs read access only.

After creating the database and applying migrations, connect as a database administrator and apply [`db/operations/phase3_runtime_roles.sql`](../../db/operations/phase3_runtime_roles.sql). In PowerShell, pass the database name as a psql variable and check the exit code:

```powershell
psql $env:ADMIN_DATABASE_URL -v database_name=$env:PGDATABASE -v ON_ERROR_STOP=1 -f db/operations/phase3_runtime_roles.sql
if ($LASTEXITCODE -ne 0) { throw 'Database role setup failed.' }
```

Set both role passwords interactively with psql's `\password dvassist_runtime` and `\password dvassist_backup` commands. Store each secret in the deployment secret manager, never in source control or a checked-in environment file.

Configure the API's `DATABASE_URL` with `dvassist_runtime`. Keep the migration-owner URL restricted to an operator-controlled migration job. Do not give the API role `CREATEDB`, `CREATEROLE`, superuser, schema-create, table-owner, or append-only update/delete privileges.

After every schema migration, review the runtime query surface and update the explicit grants in the SQL file. The backup login needs `SELECT` on any newly introduced table before that table is included in a dump. Confirm neither login is a member of a migration/owner role. Verify role separation by querying `pg_roles` and `information_schema.table_privileges` as an administrator; confirm the runtime login cannot create tables or update/delete `case_events` and `audit_events`.

## Backup and restore rehearsal

Agree on backup frequency, retention, recovery point objective, recovery time objective, encryption, and access owners before production. This repository intentionally does not invent those policy values. Backups contain account email and authentication/session metadata, so handle them as sensitive data even though Phase 3 does not store DV answers or photos.

Run backups from a controlled operator host with PostgreSQL client tools and a `DATABASE_URL` using the read-only backup role. Set `BACKUP_DIRECTORY` to a pre-created private, encrypted destination; do not use a shared or developer temp folder. The example writes a custom-format dump and fails if `pg_dump` fails:

```powershell
$backupFile = Join-Path $env:BACKUP_DIRECTORY ("ethio-dv-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
pg_dump --format=custom --no-owner --file $backupFile $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
pg_restore --list $backupFile | Select-Object -First 20
if ($LASTEXITCODE -ne 0) { throw 'Backup archive could not be read.' }
Get-FileHash $backupFile -Algorithm SHA256
```

Do not treat a readable archive as a successful restore. Rehearse into a fresh, isolated recovery database in the approved protected environment. Do not restore production account data into a developer laptop, local demo, or shared preview. Keep the application disconnected while restoring and verifying:

```powershell
pg_restore --exit-on-error --no-owner --dbname $env:RESTORE_DATABASE_URL $backupFile
if ($LASTEXITCODE -ne 0) { throw 'Database restore failed.' }
psql $env:RESTORE_DATABASE_URL -v ON_ERROR_STOP=1 -c 'SELECT version, dirty FROM schema_migrations;'
```

The operator records backup time, archive checksum, restore start/end, migration version, row-count/sanity results that do not expose personal values, and any incident or deviation in the approved operations record. Delete rehearsal archives and recovery databases according to the approved retention process. Restore tests should prove access to the restored data and application connectivity without revealing account contents in logs or screenshots.

## Email-code delivery and failure rehearsal

Production requires an HTTPS `PUBLIC_ORIGIN`, SMTP host and sender, and an SMTP relay that supports STARTTLS. Use a test mailbox controlled by the operator and a staging relay configuration. Never use real applicant addresses for readiness drills.

When SMTP is configured, set `MAIL_OUTBOX_ENCRYPTION_KEY_B64` to a separately managed base64 value that decodes to exactly 32 bytes. The API encrypts the queued recipient and sign-in code with AES-GCM before storing them in PostgreSQL. Keep the key in the deployment secret manager, restrict access to the API service, and include a tested key-rotation/recovery procedure before storing production traffic.

Verify one delivered code, the 10-minute expiration, one successful verification, a second-use rejection, and the generic response for unknown/disabled accounts. Then test invalid relay DNS, connection refusal, a relay without STARTTLS, rejected credentials, and recipient rejection. Responses must remain anti-enumerating, logs must contain no address or code, and a failed delivery must not leave that challenge usable. Requesting a fresh code is the recovery path.

The API stores an encrypted outbox row in the same transaction as each sign-in challenge. API instances claim rows using short PostgreSQL leases, so multiple replicas can deliver from one queue. SMTP failures retry with bounded backoff up to five attempts; a permanently failed or expired message loses its encrypted payload and its challenge is revoked. Successful delivery also clears the encrypted payload. Delivery is at-least-once: a process crash after the relay accepts a message but before PostgreSQL records success may send a duplicate message containing the same still-valid code. A successful HTTP response means the request was accepted for processing, not that the recipient received the message. Monitor relay delivery/rejection reports through the provider's protected console.

## Email outbox monitoring

Use these read-only PostgreSQL queries through an operator-only connection. They report counts and age only; never query or export `payload_ciphertext`, email addresses, or challenge codes for routine monitoring.

```sql
-- Current queue shape. A normal idle queue has no pending or processing rows.
SELECT status,
       count(*) AS messages,
       min(created_at) AS oldest_created_at,
       max(attempts) AS highest_attempt_count
FROM auth_email_outbox
GROUP BY status
ORDER BY status;

-- Actionable backlog and stale worker leases; contains no recipient or code.
SELECT count(*) FILTER (
           WHERE status = 'pending' AND available_at <= now()
       ) AS ready_pending,
       round(extract(epoch FROM (now() - min(created_at) FILTER (
           WHERE status = 'pending' AND available_at <= now()
       ))))::bigint AS oldest_ready_pending_seconds,
       count(*) FILTER (
           WHERE status = 'processing' AND locked_until <= now()
       ) AS expired_processing_leases,
       count(*) FILTER (
           WHERE status = 'failed' AND updated_at >= now() - interval '15 minutes'
       ) AS failures_last_15m
FROM auth_email_outbox;
```

For the pilot, alert immediately on any newly failed outbox row or SMTP-provider rejection. Page the operator if a ready pending message remains older than two minutes or a processing lease is expired on two consecutive checks. Treat these as starting thresholds: adjust them after a staging baseline, and do not promise email delivery times until the relay and hosting are rehearsed. Also monitor database availability/latency and the SMTP provider's delivery and rejection dashboard. Correlate using the outbox UUID and generic error code only; application logs must never include recipient, one-time code, or ciphertext.

The worker polls every two seconds, leases one message at a time for 30 seconds, and retries up to five attempts with bounded backoff. A pending row may therefore be waiting for its scheduled retry; alert on age of a *ready* pending row, not all pending rows. A failed row is terminal and its challenge is revoked. Ask the account owner to request a fresh code after correcting the relay problem.

A verified administrator can also read the aggregate API view at `GET /api/v1/admin/ops/email-outbox`. It is MFA-gated and audit logged; it contains counts and age only, never recipient addresses, codes, outbox IDs, or ciphertext. Use the operator SQL below when checking exact queue rows is necessary, and keep that access read-only.

## Outbox encryption key rotation and recovery

The current outbox format uses one active 32-byte AES-GCM key and does not store a key version. Do not replace the key while any encrypted pending or processing payload remains. Losing the active key makes those queued messages undecryptable; there is no automatic recovery or dual-key rotation support.

For a planned rotation:

1. Schedule a brief sign-in challenge maintenance window and block new `POST /api/v1/auth/challenges` requests at the trusted ingress. Keep verification available for already delivered codes.
2. Let every API worker finish its current SMTP attempt. Check the queue query above until no rows are pending or processing; investigate failed rows separately.
3. Stop all API instances and verify they are stopped, so no worker can claim a row during the change.
4. Generate a new independent 32-byte key in the deployment secret manager. Update `MAIL_OUTBOX_ENCRYPTION_KEY_B64` for every API instance as one deployment change; never put the value in a shell transcript, ticket, log, or repository.
5. Start the API instances, verify health and synthetic email delivery, then reopen the challenge route. Record the rotation time and operator in the approved change log, not the key.

If a queue cannot be drained, postpone planned rotation. For suspected key loss or compromise, treat queued messages as unrecoverable, block new challenges, preserve sanitized evidence, and follow the incident process to cancel affected outbox rows and revoke their still-active challenges before restoring service. Do not delete or rewrite queue rows until incident ownership approves the action. Rotate a compromised key even if that means users must request fresh codes. Restore of the database alone is not sufficient unless the matching key backup is available and authorized.

## Staging email-delivery rehearsal

Run this with a controlled synthetic mailbox and a staging SMTP relay, never an applicant address:

1. Confirm the staging API uses HTTPS, the staging database, a separately stored 32-byte outbox key, and the intended SMTP sender. Verify no production database or secret is connected.
2. Request a sign-in code and verify a message arrives. Confirm the response is generic, the code is absent from API responses and logs, and the database stores ciphertext rather than a readable email/code payload.
3. Verify the code once, reject its second use, and confirm expiration behavior with a disposable short-lived challenge. Request a second code and confirm the previous pending message/challenge is cancelled or unusable.
4. Temporarily make the staging relay unavailable. Confirm the request still returns the generic accepted response, the job remains encrypted and pending for retry, and the challenge is revoked after terminal failure. Restore the relay and verify a later retry delivers.
5. Restart one API instance while a synthetic message is pending, then verify the remaining instance processes it. Record that delivery is at-least-once and duplicates are possible around a crash after relay acceptance.
6. Inspect sanitized logs and the aggregate SQL above. Confirm there is no recipient, code, token, or ciphertext. Verify the failure alert reaches the named operator and can be acknowledged.
7. Rehearse the planned key-rotation procedure with an empty queue and a non-production key. Prove the API resumes delivery with the new key; document timestamps, environment, operator, outcomes, and follow-up items.

The operator records evidence in the protected operations log. A written checklist or CI's local fake-SMTP tests do not count as a live staging mailbox or provider rehearsal. Keep real applicant intake disabled until this and the other Phase 3 launch gates pass.

## Rate-limit and proxy configuration

When PostgreSQL is configured, sign-in request and verification limits use the shared `auth_rate_limits` table, so replicas coordinate counters and API restarts do not reset active windows. Development mode without a database keeps the in-memory limiter. The rules remain 8 challenge requests per client IP per 15 minutes, 4 per normalized email per hour, 20 verification attempts per client IP per 15 minutes, and 10 per normalized email per 15 minutes. Database errors fail closed with a temporary-unavailable response; monitor database latency because auth requests now depend on the shared counter write.

By default, the API ignores `X-Forwarded-For` and uses the TCP peer address. Set `TRUSTED_PROXY_CIDRS` to a comma-separated list of the exact proxy CIDR ranges that may connect directly to the API. For requests from those peers only, the API walks the forwarded chain from right to left and selects the first address outside the trusted ranges. The ingress must append the actual peer address to `X-Forwarded-For` and prevent clients from bypassing that ingress. Never include broad public networks such as `0.0.0.0/0` or `::/0`.

Before scaling out, deploy the migration, update the API runtime role grants, configure the exact proxy CIDRs, and verify the same synthetic client is rate-limited across two API instances and after a restart. This database-backed limiter coordinates the current PostgreSQL deployment; capacity and database-failure behavior still need a staging load rehearsal. It does not replace edge-level abuse protection.

## CI rehearsal boundary

The `phase3-operations-smoke` GitHub Actions job applies migrations to a disposable PostgreSQL 17 database, provisions the runtime and backup roles, checks their privileges, runs the API integration suite as the non-owner runtime login, and dumps/restores synthetic rows into a fresh database. This verifies the repository role script and basic PostgreSQL restore mechanics. The disposable CI dump is not an encrypted off-site backup and does not establish production retention, RPO/RTO, access ownership, SMTP delivery, or incident response.

## Automated proxy and replica checks

The PostgreSQL-backed API integration suite creates independent server instances over one database and verifies that a synthetic rate-limit counter is shared across them, including a fresh instance standing in for a restart. Unit coverage checks that the forwarded chain is used only for a trusted direct peer, and that an untrusted peer or malformed chain falls back to the socket peer.

The `scripts/phase3-process-rehearsal.sh` CI step builds and launches two actual API processes against the disposable PostgreSQL database. It alternates synthetic challenge requests between them, restarts one process, and checks counter persistence. It also exercises trusted and untrusted forwarded-header behavior using loopback-only synthetic proxy CIDRs and documentation-only IP addresses. The script runs in development mode so codes are never delivered to a real mailbox. It does not validate production secrets, an external ingress, real network isolation, or deployed proxy CIDRs. Complete the operator staging rehearsal above before scaling replicas.

## Readiness evidence and limits

Record dates, environment, operator, sanitized results, and follow-up items for each rehearsal. The Phase 3 gate remains open until backup restore, role isolation, SMTP failure behavior, rate limits in the actual deployment topology, privacy/retention policy, and incident ownership have been demonstrated and approved. These instructions do not authorize real applicant intake, payment collection, official submission, or confirmation-number storage.

