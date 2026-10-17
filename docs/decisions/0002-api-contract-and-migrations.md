# ADR 0002: API contract and migration conventions

- **Status:** Accepted; updated by ADR 0003 for the Phase 3 schema
- **Date:** 2026-10-16
- **Decision owner:** Mikiyas

## Context

The Go HTTP shell has one health endpoint. Future applicant and staff APIs will handle sensitive personal data, and the data model is not yet approved. The repository needs an explicit contract format and migration review approach without prematurely defining case fields or selecting a database migration vendor.

## Decision

- Keep the HTTP API contract in OpenAPI at `packages/api-contract/openapi.yaml`.
- Version resource APIs under `/api/v1` when business endpoints are introduced. The operational `/healthz` endpoint remains outside that prefix.
- Use PostgreSQL-compatible, ordered SQL migration pairs under `db/migrations/`.
- Use the pinned `golang-migrate` v4 CLI for ordered SQL migration pairs. Apply migrations manually with a migration-owner database role; never run schema changes automatically on API startup.
- Add only the Phase 3 account/session/MFA and case-workflow metadata model in migration `20261017010000_phase3_identity_cases`. Defer DV answers, family details, photos, payments, and confirmation data until their access and retention policies are reviewed.

## Consequences

- Contract changes can be reviewed independently of the Go implementation.
- The current contract documents only the implemented health endpoint; it does not imply applicant intake exists.
- Schema additions must be tied to the data inventory and deletion plan.
- Migration-runner setup is documented in `db/migrations/README.md`.

## Alternatives considered

- Defining the full applicant/case schema now was rejected because field requirements, retention, access control, hosting, and identity remain open.
- Choosing a migration tool now was deferred because no operational or deployment constraints have been selected.
