---
name: mentio
description: "Mentio social listening for developer platforms: track brand, competitor and topic keywords across Bluesky, Hacker News, Reddit, X, GitHub, Stack Overflow, DEV, YouTube, LinkedIn and news; search and triage AI-classified mentions; set up Slack, Telegram, email and webhook alerts; read analytics and the people behind the mentions. Use when the user asks who is talking about their product, wants brand or competitor monitoring, or names Mentio."
homepage: https://docs.mentio.dev/integrations/openclaw
metadata: {"openclaw": {"emoji": "📡", "homepage": "https://docs.mentio.dev/integrations/openclaw", "primaryEnv": "MENTIO_API_KEY"}}
---

# Mentio

Mentio watches developer platforms for the words a company cares about (its product, its competitors, its space), scores every post that contains them for relevance, sentiment and intent, and exposes the result as a REST API. This skill is that API: read the rule file for an area before the first call to it, then call it with curl or the `mentio` CLI.

- Base URL: `https://api.mentio.dev/v1`
- Auth: `Authorization: Bearer $MENTIO_API_KEY` on every request
- Docs: https://docs.mentio.dev (every page is also served as Markdown at `https://docs.mentio.dev/<page>.mdx`)

## Setup

The key lives in the `MENTIO_API_KEY` environment variable. When it is unset, or a request answers `401`, stop and tell the user how to fix it:

1. Create a key at https://app.mentio.dev/api-keys. A `write` key runs the whole skill; a `read` key covers searching, analytics and people but no changes.
2. `echo 'MENTIO_API_KEY=mk_live_...' >> ~/.openclaw/.env`
3. `openclaw gateway restart`

Never print the key back, write it into a file the user did not ask for, or send it anywhere but `api.mentio.dev`. If you are unsure the key works, `GET /v1/keywords` is a cheap check: `401` means the key is wrong, an empty list means nothing is tracked yet.

## How to call the API

When the `mentio` CLI is on the PATH (`command -v mentio`), prefer it: it reads `MENTIO_API_KEY`, prints JSON, and names every endpoint `noun:verb` (rules/cli.md). Otherwise use curl. Reads put the filters in the query string; writes send JSON.

```bash
# Read
curl -sS "https://api.mentio.dev/v1/mentions?relevant=true&sentiment=negative&limit=20" \
  -H "Authorization: Bearer $MENTIO_API_KEY"

# Write
curl -sS -X POST "https://api.mentio.dev/v1/keywords" \
  -H "Authorization: Bearer $MENTIO_API_KEY" -H "Content-Type: application/json" \
  -d '{"term": "acme", "kind": "brand"}'
```

Pipe through `jq` when it is available to pick fields (`| jq '.data[] | {url: .post.url, sentiment: .classification.sentiment}'`).

## The API in ten rules

1. Ids are prefixed strings: `kw_` keywords, `mm_` mentions, `aut_` people, `seg_` segments, `feed_` alerts, `dest_` channels, `key_` API keys. An id from another workspace is a `404`, never a `403`.
2. Lists come back as `{ data, nextCursor }` (pass `nextCursor` back as `cursor` with the same filters and sort; `null` on the last page) or, for people, `{ data, total }` with `limit` and `offset`. Configuration lists (keywords, alerts, channels, segments, API keys) are complete in `data`. Single resources come back bare.
3. One write per resource: `PATCH` with only the fields to change, `null` clears a field. `POST` on a collection creates and answers `201` with the resource; `DELETE` answers `204`; actions are `POST` verbs on the resource (`/people/{id}/merge`, `/alerts/{id}/test`).
4. Timestamps are ISO 8601 in UTC. Fields that take an instant (`since`, `until`, `snoozedUntil`) accept ISO 8601 or epoch milliseconds.
5. Platforms are `bluesky`, `hackernews`, `github`, `stackoverflow`, `devto`, `reddit`, `x`, `youtube`, `news`, `linkedin`. The field is always called `platform` (or `platforms` for a list).
6. Classification: `relevance` 0 to 100 (`relevant` is true from 40 up), `sentiment` is `positive`, `neutral` or `negative`, `intents` are any of `buy_intent`, `question`, `complaint`, `praise`, `comparison`, `language` is an ISO 639-1 code or `null`. It is `null` until the classifier has run. The user can overrule it: `PATCH /v1/mentions/{id}` with `relevant` or `sentiment` (rules/mentions.md), and `classification.feedback` shows the verdict.
7. A mention's `status` is the user's triage: `open` (untouched), `ignored` (hidden from the feed and every channel), `done` (handled). Ignored and done mentions are never delivered; only relevant mentions are delivered at all.
8. Errors are `{ "error": { "code", "message" } }`. Branch on `code` (rules/errors.md). `403 read_only_key` means the key cannot write; `402` means the prepaid balance cannot cover the change.
9. Query parameters are camelCase, booleans are `true` or `false`, and a list parameter is comma-separated or repeated (`platforms=reddit,hackernews`). An omitted parameter imposes no constraint.
10. Money: a keyword costs $5 per month, debited daily from a prepaid balance, and every matched mention $0.008, relevant or not. Alerts, digests, reads and analytics are free. Say the cost once when creating the first keyword of a conversation; do not repeat it for every keyword.

## What the user asks, what you call

| The user says | Do this | Notes |
| --- | --- | --- |
| "Track acme", "watch our competitor globex", "follow the topic feature flags" | `GET /v1/keywords` to check it is not tracked yet, then `POST /v1/keywords` with `term`, `kind` (`brand`, `competitor`, `topic`) and optional `platforms` | rules/keywords.md. Matching starts on the next poll of each platform: minutes to an hour, up to 12 hours on YouTube. Tell the user when to expect the first mentions. |
| "What are people saying about us?", "anything negative this week?", "mentions on Hacker News", "buying signals" | `GET /v1/mentions` with filters: `relevant=true` unless they ask for noise, `since`, `platform`, `sentiment`, `intent`, `q`, `keywordId`, `limit` 20 to 50; `sort=priority` for "what should I look at" | rules/mentions.md. Summarize each as platform, author (followers), sentiment and intents, one line of text, URL. Page only if asked for more. |
| "Show me that one", "open mention mm_..." | `GET /v1/mentions/{id}` | |
| "Mark it done", "ignore it", "assign to Ana", "snooze until Monday", "note that we replied" | `PATCH /v1/mentions/{id}` with `status`, `assigneeId`, `snoozedUntil`, `note`; `null` clears | Assignees are workspace member user ids: `GET /v1/members` resolves a name to one. |
| "That one is noise", "the classifier missed this", "it is not negative" | `PATCH /v1/mentions/{id}` with `relevant: false`, `relevant: true` or `sentiment` | rules/mentions.md. The verdict moves the mention in or out of the relevant feed, the digests and the counts; nothing is billed or unbilled. |
| "Cursor is our editor, not the mouse", "only match the acronym", "ignore job posts everywhere", "skip r/jobs and dependabot" | Per keyword: `PATCH /v1/keywords/{id}` with `context` and `matching` (`requiredTerms`, `excludedTerms`, `excludedAuthors`, `caseSensitive`). Workspace-wide: `PATCH /v1/filters` | rules/keywords.md. Rules decide what is stored, so a rejected post is never billed; `context` only changes the score. |
| "Alert me on Slack / Telegram / by email when ..." | `GET /v1/channels` to find or create the channel, then `POST /v1/alerts` with `mode: "instant"`, a `filter` and `channelIds` | rules/alerts.md. Slack and Telegram channels are connected in the dashboard (https://app.mentio.dev/alerts), not created here; email channels are `POST /v1/channels` with `kind: "email"`. |
| "A daily digest at 9", "summary every morning", "a weekly recap on Mondays" | `POST /v1/alerts` with `mode: "daily"` (or `"weekly"` with `schedule.weekday`, 0 Sunday to 6 Saturday), `schedule: { hour, minute, timezone }` and `channelIds` | Ask for the timezone if unknown; `skipEmpty: true` skips quiet periods. `POST /v1/alerts/{id}/run` sends the rule's own period now. |
| "Send mentions to my server / n8n / Zapier / this URL" | `POST /v1/channels` with `kind: "webhook"`, `url` and optional `headers`; show the user `config.secret` from the response once; then an alert with an `event` name to that channel | rules/alerts.md has the payload and the signature. The secret is never shown again. |
| "How are we doing?", "trend over 30 days", "which platform", "us versus competitors", "when do people post" | `GET /v1/analytics/summary` (with `compare=true`), `series`, `breakdown?by=...`, `share-of-voice` | rules/analytics.md. Pass the user's `timezone` when the days matter. |
| "Who talks about us most?", "influencers", "new voices", "people who mention competitors but not us" | `GET /v1/people` with `sort` (`reach`, `new`, `mentions`, `recent`) and filters; `GET /v1/segments` for saved filters | rules/people.md. |
| "Tag this person", "mute them", "note that they are a customer" | `PATCH /v1/people/{id}` with `tags`, `notes`, `muted` | Mute hides their posts from the feed and every channel; billing never changes. |
| "Did anyone reach out to them?", "who owns this contact?", "people nobody contacted yet" | `GET /v1/people/{id}` (`outreach`: owner, stage, last contacted) and `GET /v1/people/{id}/activities`; lists: `GET /v1/people?stages=not_contacted` or `ownerIds=none` | rules/people.md. Say who reached out and when before suggesting another contact. |
| "I emailed them", "log that Ana DMed @someone", "they replied", "make Ana the owner" | `POST /v1/people/{id}/activities` with `channel` and a short `note` (plus `memberId` when it was someone else); `PATCH /v1/people/{id}` with `stage` or `ownerId` | The first activity claims an unowned person and moves them to `contacted`; it never takes a person from their owner. Owners and `memberId` are workspace member user ids. |
| "Too much noise", "it misses the real ones", "wrong relevance" | `GET /v1/company`, then `PATCH /v1/company` with a sharper `description`, `useCases`, `competitors` and `guidelines` in the user's words | rules/account.md. The company profile is the classifier's context and the biggest lever on relevance; say so. Then the keyword's `context` and `matching`. |
| "How much is left?", "why did tracking stop?", "what does this cost" | `GET /v1/usage` | rules/account.md. Balance, burn, days left, keywords running and paused, matches today. |
| "Who is on the team?", "invite Ana", "remove Bob" | `GET /v1/members`, `POST /v1/members/invitations`, `DELETE /v1/members/{id}` | rules/account.md. Changes need a signed-in owner or admin (an API key answers `403`: send the user to https://app.mentio.dev/team). Confirm before removing anyone; the last owner cannot go. |
| "Which workspace is this?", "can this key write?" | `GET /v1/whoami` | Run it once at the start when in doubt. |
| "Export", "give me a CSV" | `GET /v1/mentions/export.csv` or `GET /v1/people/export.csv` with the same filters as the list | Write it to a file the user names, or `mentions.csv`. |

## Care

- Confirm with the user before `DELETE /v1/keywords/{id}` (removes its matches and disables an alert rule that named only it), `DELETE /v1/members/{id}`, any other `DELETE`, `POST /v1/channels/{id}/rotate-secret` (the old secret stops verifying at once) and merging people.
- Do not create API keys unless asked, and hand a new key to the user once without storing it.
- Do not page through the whole feed unprompted: 20 to 50 mentions make a summary. Link the post URL instead of pasting long text.
- When a `402` comes back, the workspace balance is empty or too low: point the user to https://app.mentio.dev/billing rather than retrying.
- When something is not covered here, read `https://docs.mentio.dev/llms.txt` for the list of doc pages and fetch the one you need as `.mdx`.

## Rule files

Read the one for the area before the first call to it:

- [rules/authentication.md](rules/authentication.md): key format, scopes, where keys come from, SDK and CLI use of the same key
- [rules/keywords.md](rules/keywords.md): track, pause, widen and remove keywords; matching rules, the per-keyword context and the workspace filters; what a keyword costs
- [rules/mentions.md](rules/mentions.md): every search filter, the mention shape, triage and the user's verdicts on the classifier, CSV export
- [rules/people.md](rules/people.md): the people behind the mentions, tags, notes, mute, merge, saved segments
- [rules/alerts.md](rules/alerts.md): rules and channels, daily and weekly digests, webhooks and their signature, testing and the delivery log
- [rules/analytics.md](rules/analytics.md): the four reports and the window grammar
- [rules/account.md](rules/account.md): whoami, the company profile the classifier reads, API keys and their expiry, usage and balance, the team, health
- [rules/errors.md](rules/errors.md): every error code and what to do about it
- [rules/cli.md](rules/cli.md): the `mentio` CLI, the TypeScript and Python SDKs, the OpenAPI document
