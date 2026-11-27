# NEAS APEX — Docker self-hosting (review build)

This Compose stack is an isolated, self-hosted option for review and controlled local deployment. It does not migrate or connect to the production database by default, apply Supabase migrations, enable the hourly collector, or publish CMS content.

## Included services

- `apex`: NEAS APEX Next.js application, built from this repository.
- `activepieces`: workflow UI/API and worker, with dedicated PostgreSQL and Redis volumes.
- `twenty`: CRM UI/API and worker, with dedicated PostgreSQL and Redis volumes.

All published ports bind to `127.0.0.1` by default. Do not expose them publicly until TLS, authentication, backups, firewall policy, and secret rotation have been reviewed.

## Prerequisites

- Docker Engine and Docker Compose v2.
- 2+ CPU cores and 4 GB+ RAM for Activepieces; allocate additional memory for Twenty and APEX.
- Node 22 is used for the APEX image build.

## Configure

1. Copy `.env.docker.example` to `.env`.
2. Replace every `CHANGE_ME` value with unique random secrets. For example, use `openssl rand -hex 16` for 32-hex-character keys and `openssl rand -hex 32` for longer secrets.
3. Keep the optional Supabase and Brave values empty unless a separate, explicitly approved non-production environment is available.
4. Never reuse production database passwords or service-role credentials in this local stack.

## Validate and start

```sh
docker compose config --quiet
docker compose build apex
docker compose up -d
docker compose ps
```

Local URLs:
- APEX: http://localhost:3001
- Activepieces: http://localhost:8080
- Twenty: http://localhost:3000

## Operational controls

- The GIIE collector is explicitly disabled in Compose (`GIIE_COMMERCIAL_COLLECTION_ENABLED=false`). Do not change it until the non-production Supabase migration, provider credentials, and evidence-verification tests have been approved.
- The CMS bridge must continue to submit only eligible, cited summaries into Pending Review. No direct publishing role or public publishing credential is included in this stack.
- Activepieces and Twenty use separate local database volumes. These are not the production NEAS database.
- Back up volumes before upgrades. Pin and review image tags before changing them.
- Set public webhook URLs only after a TLS reverse proxy and authentication policy are configured.

## Licensing review

- Activepieces Community Edition: MIT-licensed core; enterprise directories/features have separate terms. This stack uses the upstream Community image.
- Twenty: AGPL-3.0 project; keep it as an independently deployed service and review AGPL obligations before modifying or redistributing it.
- NEAS APEX: existing repository license remains unchanged.
- Review transitive dependencies and upstream release notes before each image upgrade.

## Not included yet

Viral Scout is MIT-licensed but its provider/API access and execution mode need a separate configuration review. AI Trends Tracker currently has no license file in the NEAS fork; do not redistribute, modify, or deploy it until its license is confirmed. Lighthouse should run as an isolated, on-demand audit job after a browser-compatible image and target allowlist are selected.
