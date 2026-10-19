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

Verify one delivered code, the 10-minute expiration, one successful verification, a second-use rejection, and the generic response for unknown/disabled accounts. Then test invalid relay DNS, connection refusal, a relay without STARTTLS, rejected credentials, and recipient rejection. Responses must remain anti-enumerating, logs must contain no address or code, and a failed delivery must not leave that challenge usable. Requesting a fresh code is the recovery path.

Delivery is synchronous and has no durable outbox or automatic retry. A successful API response means the request was accepted, not that the recipient received the message. Monitor relay delivery/rejection reports through the provider's protected console. Add an outbox, retry policy, delivery status, and alerting before promising reliable email delivery or running multiple API replicas.

## Rate-limit and replica boundary

The current sign-in challenge limiter is process-local, in-memory, and resets when the API restarts. It allows up to 8 requests per client IP per 15 minutes and 4 per normalized email per hour. It is suitable only for controlled single-process development/rehearsal; it does not coordinate multiple replicas, survive restarts, or replace edge-level abuse protection.

Until a shared limiter and trusted-proxy configuration are implemented and reviewed, deploy at most one API process behind a correctly configured HTTPS edge. Do not trust arbitrary forwarded-IP headers. Before increasing replicas, choose and test a shared limiter (for example, a managed Redis service), ensure edge IP handling is restricted to known proxies, and verify rate limits still hold across restarts and concurrent instances.

## Readiness evidence and limits

Record dates, environment, operator, sanitized results, and follow-up items for each rehearsal. The Phase 3 gate remains open until backup restore, role isolation, SMTP failure behavior, rate limits in the actual deployment topology, privacy/retention policy, and incident ownership have been demonstrated and approved. These instructions do not authorize real applicant intake, payment collection, official submission, or confirmation-number storage.

