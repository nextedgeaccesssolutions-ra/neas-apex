# Agent proof — `accounts-payable` (#002 of 090)

**Status: proven** — one internal draft completed end-to-end by the shared worker.

| Field                    | Value                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| Agent                    | `accounts-payable` (FIN, `draft_only`, enabled)                        |
| Task                     | `72964447-fb5f-4e0b-8203-570a54ebeb01`                                 |
| Idempotency key          | `pilot-20261124-002b-accounts-payable`                                 |
| Operation                | `draft_internal` — internal analysis only, `requires_approval = false` |
| Attempts                 | 1 of 3                                                                 |
| Completed                | 2026-11-24 07:10 UTC                                                   |
| Model reported by worker | `gemini-3.5-flash-lite`                                                |
| Output                   | 3,159 characters, non-empty `output.text`                              |
| Completion event         | `aiw_task_events`: `task_completed` / actor `system`                   |
| Audit row                | present for the task (`aiw_audit_events`, 1 row)                       |
| Runtime status           | worker set `idle`, `last_execution_at` 07:10 — no manual status write  |

## What this proves

A second, different profile was claimed and completed by the same shared worker with
the same audited path. The rollout gate holds: nothing is marked operational without
a completed task, non-empty output, and a `task_completed` event.

## What this does not prove

- No external, financial, customer-facing, safety, engineering-signoff, or production
  action was executed or authorized. A `draft_internal` task is analysis only.
- The profile stays `draft_only`; `execute_approved` work still needs human approval.
- The draft content has not been reviewed by a human.

## Preceding failures (kept for the record)

1. Task `0124f59a-4faf-4a1c-8adb-f83103e398ca` (`pilot-20261124-002-accounts-payable`)
   failed 3/3 with `503 UNAVAILABLE — "This model is currently experiencing high demand"`
   from `gemini-3.5-flash-lite`.
2. Because only retired/invalid model IDs triggered a fallback, the queue spent all
   three attempts on one saturated model. Fixed in PR #82 (`af814d4`): `429`/`5xx` now
   advance to the next candidate model.
3. The retry (`002b`) completed on attempt 1.

## Next

Agent #003 is not queued. Every further agent needs its own completed task and
`task_completed` event before a proof file exists.
