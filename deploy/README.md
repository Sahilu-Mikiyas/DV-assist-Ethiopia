# Public landing page deployment

This small Compose bundle serves the bilingual `apps/web` landing page and its synthetic-only `/demo.html` preview. It does not run the React account portal, Go API, PostgreSQL, applicant sign-in, case storage, photo upload, payment, or confirmation storage. That keeps the current public site informational while the real-data launch gates remain open.

## Put the public page online

1. Choose a host with Docker Engine and Docker Compose. Point your domain to it and configure HTTPS using a managed reverse proxy or tunnel.
2. Copy `deploy/production.env.example` to `deploy/.env.production` on the host. This site needs no application secrets.
3. From the repository root, run:

   ```powershell
   docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml up --build -d
   ```

4. Configure the HTTPS proxy to forward to `127.0.0.1:8080`; do not expose the container port directly. Verify the homepage, Amharic toggle, Telegram link, `/demo.html`, and the host's HTTPS certificate.
5. Monitor the container and host. The page itself stores no form submissions. The demo warns visitors to use fictional values and keeps demo state in their browser only.

## Keep intake disabled

Do not deploy the React account portal or Go API publicly until applicable cycle rules are verified, privacy/consent/retention/refund policies are approved, and the Phase 3, photo-storage, and operational rehearsals pass. The API Dockerfile is a build artifact for later gated deployment; it is intentionally absent from this public Compose stack. See [pilot readiness](../docs/operations/phase-11-pilot-readiness.md).
