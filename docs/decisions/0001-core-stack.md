# ADR 0001: Core application stack

- **Status:** Accepted
- **Date:** 2026-10-16
- **Decision owner:** Mikiyas

## Context

The repository is empty and the product plan calls for a mobile-first applicant experience, staff workflow, versioned cycle forms, sensitive-data handling, and a small pilot. The team selected the initial core technologies during Phase 0.

## Decision

- Web client: React + TypeScript.
- API: Go.
- Relational data: PostgreSQL.
- Repository: one monorepo; one API service for the pilot.

Vite is the proposed web build tool for the applicant/staff app, subject to confirmation during web initialization. The Phase 2 public preview uses dependency-free static HTML/CSS/JavaScript because the package scaffold could not be initialized in this environment. Hosting, data region, identity/recovery provider, private object storage, exact library versions, and deployment configuration remain undecided.

## Consequences

- Keep API request/response contracts explicit and publish them in OpenAPI.
- Keep cycle configuration and database migrations reviewable in the repository.
- Use adapters for identity, object storage, notifications, and payment evidence so provider selection does not spread through business logic.
- Do not store real applicant data until hosting, access control, encryption, backup, retention, and deletion arrangements are decided and reviewed.
- Use synthetic fixtures only in local and preview environments.

## Alternatives considered

The product recap suggested React + TypeScript + Vite, Go, and PostgreSQL. The owner confirmed React/TypeScript, Go, and PostgreSQL. Other stacks were not selected for this initial build.
