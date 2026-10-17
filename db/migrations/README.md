# Database migration conventions

Phase 3 adds only account identity (normalized email and MFA/session material) and case workflow metadata. It deliberately does not add DV answers, family details, photos, payment evidence, confirmation numbers, or support messages. Before real intake, the data inventory, account/case retention and deletion periods, incident process, hosting, and backups must be approved.

## Migration runner

Use the pinned `golang-migrate` v4 CLI. Install it with:

```powershell
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1
```

Set `DATABASE_URL` to a PostgreSQL URL with a migration-owner account, then from the repository root run:

```powershell
migrate -source 'file://db/migrations' -database $env:DATABASE_URL up
```

To inspect the current migration version, run `migrate -source 'file://db/migrations' -database $env:DATABASE_URL version`. `down` is an operator-only action: review the migration first and take a verified backup. Application runtime uses a separate least-privilege database role and never applies migrations automatically.

The GitHub Actions `migration-smoke` job runs against a disposable PostgreSQL 17 service container. It applies the migration, rolls it back once, reapplies it, and prints the final version. Its credentials are ephemeral CI fixture values, not production credentials. A passing migration job verifies SQL/runner compatibility for that database image; it does not verify API authorization, account isolation, MFA, SMTP, backups, or production readiness.

## Proposed file format

Use ordered SQL files with matching up/down operations:

```text
YYYYMMDDHHMMSS_short_description.up.sql
YYYYMMDDHHMMSS_short_description.down.sql
```

Keep migration files compatible with PostgreSQL and avoid runner-specific directives. Migrations should be small, reviewed, and applied in a transaction where PostgreSQL permits it. A rollback file must not be treated as a substitute for a tested backup and restore plan.

## Review checklist

- State the reason for each schema change and the affected API contract.
- Add explicit constraints, indexes, and foreign-key deletion behavior.
- Use UTC timestamps and opaque UUID identifiers for persisted entities.
- Never store credentials, Telebirr PINs/OTPs, or official-site passwords.
- Minimize sensitive values in indexes, logs, backups, fixtures, and error messages.
- Explain retention and deletion behavior for every personal-data column or file reference.
- Use synthetic fixtures only; never copy production applicant records into development.

The initial Phase 3 identity and case metadata model is in `20261017010000_phase3_identity_cases.up.sql`; it is not approval to collect real DV form answers or files.
