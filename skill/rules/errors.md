# Errors

Every error uses one envelope with a stable machine-readable code. Branch on `error.code`, never on the message; messages can change, codes will not.

```json
{
  "error": {
    "code": "validation_error",
    "message": "term: String must contain at least 2 character(s)"
  }
}
```

## Codes and what to do

| Code | Status | When | What to do |
| --- | --- | --- | --- |
| `unauthorized` | 401 | Missing or invalid API key | Setup in SKILL.md: the user creates a key, adds it to `~/.openclaw/.env`, restarts the gateway. Do not retry. |
| `read_only_key` | 403 | A `read` key on anything but a `GET` | Tell the user the key is read-only; a `write` key is needed for this change. |
| `validation_error` | 400 | The body or query failed schema validation | Read the message: it names the field. Fix the request; do not resend the same one. |
| `invalid_cursor` | 400 | The pagination cursor is malformed or expired | Restart the list from the first page with the same filters. |
| `invalid_assignee` | 400 | `assigneeId` is not a member of the workspace | Ask the user for the member's user id, or skip the assignment. |
| `schedule_required` | 400 | A `daily` alert without a `schedule` | Add `schedule: { hour, minute, timezone }`. |
| `unknown_channel` | 400 | A `channelIds` entry is not one of the workspace's channels | `GET /v1/channels` and use an id from there. |
| `not_a_digest` | 400 | `POST /v1/alerts/{id}/run` on an `instant` alert | Only daily alerts can be run now; use `/test` for an instant one. |
| `insufficient_balance` | 402 | Creating or unmuting a keyword needs balance for one more keyword-day | The prepaid balance is too low. Point the user to https://app.mentio.dev/billing; do not retry. |
| `keyword_limit_reached` | 402 | The 500-keyword self-serve ceiling | Beyond 500 keywords is an enterprise conversation: https://mentio.dev/enterprise. |
| `not_found` | 404 | The resource does not exist or belongs to another workspace | Check the id (prefix and source). List the collection to find the right one. |
| `duplicate_keyword` | 409 | The same normalized term is already tracked | Use the existing keyword (`GET /v1/keywords`); unmute it if it is muted. |
| `duplicate_segment` | 409 | A segment with that name exists | Update the existing one or pick another name. |
| `slack_not_connected` | 409 | A Slack channel before the workspace connected Slack | The user connects Slack in the dashboard at https://app.mentio.dev/alerts; then `GET /v1/channels`. |
| `billing_not_configured`, `slack_not_configured`, `telegram_not_configured` | 503 | The deployment lacks those credentials | Self-hosted deployments only. Tell the user which integration is not configured. |
| `internal_error` | 500 | Unexpected server error | Retry once after a few seconds; if it persists, report it with the request you made (without the key). |

## Transport

- A `5xx`, a timeout or a connection error: retry once, then report. Never retry a `4xx` unchanged.
- Rate limiting is not applied to normal use. Keep to one request at a time and page only when asked.
- On any error, tell the user what you tried (method and path, not the key) and the `code`.
