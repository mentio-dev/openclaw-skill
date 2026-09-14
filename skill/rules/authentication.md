# Authentication

Every request to `https://api.mentio.dev/v1` carries a Bearer API key scoped to one workspace. Only `GET /v1/health` and the OpenAPI document at `GET /v1/openapi.json` are public.

```bash
curl -sS "https://api.mentio.dev/v1/keywords" -H "Authorization: Bearer $MENTIO_API_KEY"
```

## The key

- Keys look like `mk_live_...`. They are shown once at creation and never again; the API stores only a SHA-256 hash.
- A key belongs to one workspace. Everything it reads or writes is inside that workspace; an id from another workspace is a `404`.
- Scope is `read` or `write` (`write` by default). A `read` key can only make `GET` requests; anything else is `403 read_only_key`. Searching, analytics, people and exports work with a `read` key; tracking keywords, triage, alerts, channels, segments, the company profile and key management need `write`.
- Keys are created in the dashboard at https://app.mentio.dev/api-keys or with `POST /v1/api-keys` (rules/account.md). Revoking takes effect at once on the API and within minutes on cached verifications.

## Where the key comes from in OpenClaw

The skill reads `MENTIO_API_KEY` from the environment. OpenClaw loads it from the process environment, from `~/.openclaw/.env`, or from `skills.entries.mentio.apiKey` in `~/.openclaw/openclaw.json` (this skill declares `MENTIO_API_KEY` as its primary env var). Inside a sandboxed agent run the host env is not injected; the sandbox needs the variable set separately.

If the variable is missing, or a call answers `401 unauthorized`, do not guess or retry: tell the user to create a key, add it with `echo 'MENTIO_API_KEY=mk_live_...' >> ~/.openclaw/.env`, and run `openclaw gateway restart`. Never echo the key back and never send it to any host other than `api.mentio.dev`.

## The same key elsewhere

The `mentio` CLI, the TypeScript SDK and the Python SDK all take the same key (rules/cli.md):

```bash
MENTIO_API_KEY=mk_live_... mentio keywords:list
```

```ts
import { createMentio } from '@mentio-dev/sdk';
const mentio = createMentio({ apiKey: process.env.MENTIO_API_KEY! });
const { data } = await mentio.searchMentions({ query: { relevant: true, limit: 20 } });
```

```python
from mentio import Mentio
client = Mentio(api_key=os.environ["MENTIO_API_KEY"])
page = client.mentions.search(relevant=True, limit=20)
```

## Failed authentication

```json
{ "error": { "code": "unauthorized", "message": "Invalid API key" } }
```

`401` is the key (missing, revoked, mistyped, or the wrong environment). `403 read_only_key` is a `read` key trying to write: ask the user for a `write` key rather than working around it.
