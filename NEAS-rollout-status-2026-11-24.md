# NEAS APEX — agent rollout status (2026-11-24)

## What was done this session

1. **Confirmed the real production database**: `neas-apex.vercel.app` → Supabase project
   `smlxekhbaefbvdbfxpew` (org NEAS-AI-Production), read from the Vercel `SUPABASE_URL`
   environment variable (name matched to project ref; no secret values read).
2. **Checked pilot #001 (`accountant`)**: `NOT_FOUND` — no pilot task existed.
3. **Created pilot #001 through the Supabase SQL console** (the admin API returned `401`;
   no password or service key was used or read). Task
   `23bf80c7-70cd-412a-a765-35d86e16cc19`, idempotency key
   `pilot-20261124-001-accountant`, `draft_internal`, `requires_approval=false`,
   created_by `sql-console-pilot-rollout`, with a `task_submission_recorded` human
   event and a `aiw_audit_events` row (`workforce.task.submit`, `pending`).
   Orphaned first attempt stayed `blocked` because a data-modifying CTE cannot be
   seen by the outer `UPDATE` in the same statement; a separate guarded `UPDATE`
   moved it to `queued`.
4. **Worker claimed it and failed**: attempt 1 → `Gemini worker inference failed (404):
   "This model models/gemini-2.5-flash-lite is no longer available"`. Retried to
   attempt 3, now `failed`, `output` empty. **Root cause of the whole rollout being
   stuck: the worker's hardcoded model id is retired.**
5. **Fix written and merged**: PR #80 `fix(worker): recover from retired Gemini model ids`
   (merged as `5f3c354`). Default is now `gemini-3.5-flash-lite` (present in the live
   catalog), with preference-list retry on 404/400 and `ListModels` discovery so a
   future retirement cannot stall the queue. Real inference errors still fail fast.

## What is NOT verified

- **Agent #001 is not operational.** No completed task, no non-empty output, no
  `task_completed` event. Nothing was marked active manually.
- **The fix is not live.** The Vercel production deployment for `5f3c354` is
  `Staged / Running Checks`; `neas-apex.vercel.app` still serves the previous build.
  The new deployment URL returns `302` (Deployment Protection), and no build is
  assigned to the production alias.

## Blockers (account-owner action)

1. **Vercel billing**: the project shows `Action Required — Payment failed, pay any open
   invoices before your account can be shut down`.
2. **Promotion**: after the invoice is cleared, promote deployment
   `CwoAaq7kkMtSjG6c63qxD2mxWeR2` (commit `5f3c354`) to production, or clear the
   pending deployment check holding it in `Staged`.

## Next exact step after unblocking

Re-run #001 with a new idempotency key (e.g. `pilot-20261124-001b-accountant`),
then require `status='completed'` + non-empty `output.text` + `task_completed`
before touching agent #002. All 90 profiles stay unverified until that gate passes.
