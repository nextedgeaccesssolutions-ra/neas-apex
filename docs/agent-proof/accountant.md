# Agent proof — `accountant` (#001 of 090)

**Status: proven** — one internal draft completed end-to-end by the shared worker.

| Field | Value |
| --- | --- |
| Agent | `accountant` (Accountant, FIN, `draft_only`, enabled) |
| Task | `0f8fed9e-d4aa-476d-8e49-485ec79ceb89` |
| Idempotency key | `pilot-20261124-001b-accountant` |
| Operation | `draft_internal` — internal analysis only, `requires_approval = false` |
| Attempts | 1 of 3 |
| Completed | 2026-11-24 06:15 UTC |
| Model reported by worker | `gemini-3.5-flash-lite` |
| Output | 3,451 characters, non-empty `output.text` |
| Completion event | `aiw_task_events`: `task_completed` / actor `system` at 06:15 |
| Audit row | `aiw_audit_events`: `workforce.task.complete` / `success` |
| Runtime status | worker set `idle`, `last_execution_at` 06:15 — no manual status write |

## What this proves

The shared worker claimed a queued task for this profile, produced real draft text,
and closed the task through the audited completion RPC. The agent's runtime status
was changed by the worker, not by an operator.

## What this does not prove

- No external, financial, customer-facing, safety, engineering-signoff, or production
  action was executed or authorized.
- `execute_approved` tasks still require explicit human approval; this profile remains
  `draft_only`.
- The draft content has not been reviewed by a human.

## Preceding failure (kept for the record)

Task `23bf80c7-70cd-412a-a765-35d86e16cc19` (`pilot-20261124-001-accountant`) failed
3/3 with `404 — models/gemini-2.5-flash-lite is no longer available`. Fixed in PR #80
(`5f3c354`); deployment `CwoAaq7kkMtSjG6c63qxD2mxWeR2` was promoted to production
before this retry.

## Next

Agent #002 is not queued. It unlocks only after this record is reviewed, and it needs
its own completed task plus `task_completed` event before its own proof file exists.
