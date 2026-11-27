# NEAS APEX Docker Runtime

This image packages the existing Next.js APEX application. It is a build artifact only; creating or running the image does not deploy it to production, migrate a database, or enable public publishing.

## Build and run locally

```bash
docker build --pull -t neas-apex:local .
docker run --rm -p 3000:3000 --env-file .env.docker neas-apex:local
```

Create `.env.docker` locally from the environment variable names already documented by the application. Never commit real credentials. The container runs as the unprivileged `node` user and listens on port 3000.

## Connected services

Keep supporting products as isolated services rather than copying their source into APEX:

- **Activepieces**: workflow execution and scheduled orchestration. Use its maintained Docker Compose deployment and send authenticated webhooks to NEAS endpoints. Its repository is MIT for core files, with Enterprise Edition paths separately licensed.
- **Twenty CRM**: contacts, accounts, opportunities and sales pipeline. Integrate through its API/webhooks. The project is primarily AGPLv3; enterprise-marked files are commercially licensed. Review the exact files and obligations before modifying or redistributing.
- **Viral Scout**: run as a separate research worker. Submit only normalized, source-linked reports to GIIE. Its current fork contains an MIT license; platform access may still require API credentials and must respect platform terms.
- **AI Trends Tracker**: optional research worker only. Its current fork has no root LICENSE file, so do not package, redistribute or expose it as a NEAS service until the upstream licensing and any bundled skill dependencies are verified. Some data providers require paid credentials.
- **Lighthouse and the SEO crawler**: scheduled, short-lived audit jobs; store reports as artifacts and ingest only structured findings. They are not long-running application servers.

## Security and data flow

1. Workers collect public signals and preserve the original source URL, publisher, collection time and evidence excerpt.
2. APEX applies source allowlists, deduplication, freshness checks and evidence policy before creating a commercial summary.
3. Only verified summaries may use the existing signed CMS bridge.
4. The website intake remains Pending Review. A human reviewer and authorized publisher remain required for public release.

Use TLS at the reverse proxy, private service networking, separate least-privilege credentials, request timeouts, rate limits and secret rotation. Do not expose Postgres, Redis or internal worker ports publicly.

## Operational boundary

This PR adds a container build definition and documentation only. It does not start containers, create cloud resources, migrate databases, merge code, deploy production, or publish content.
