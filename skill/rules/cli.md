# The CLI, the SDKs and the OpenAPI document

Everything in this skill is also available as a command line, as typed SDKs and as an OpenAPI document; all are generated from the same source as the REST API, so a field means the same thing everywhere.

## The `mentio` CLI

Prefer it over curl when it is installed (`command -v mentio`); it reads `MENTIO_API_KEY`, prints JSON (compact when piped) and names every endpoint `noun:verb` exactly as the endpoint tables in the other rule files show. Node 22 or newer.

```bash
npm install -g @mentio-dev/cli        # or run without installing: npx -y @mentio-dev/cli <command>
mentio auth:check                     # which workspace the key belongs to
mentio keywords:list --table
mentio keywords:create --term "acme" --kind brand --platforms reddit,hackernews
mentio mentions:search --relevant true --sentiment negative --limit 20
mentio mentions:update mm_7f3a... --status done --note "Replied in thread"
mentio people:list --sort reach --limit 10
mentio analytics:summary --range 7d --compare true --timezone Europe/Madrid
mentio channels:create --kind webhook --url https://example.com/hooks/mentio
mentio alerts:create --name "Buying signals" --mode instant --event mention.buy_intent --filter '{"intents":["buy_intent"]}' --channelIds dest_...
mentio mentions:export --since 2026-09-01 --out mentions.csv
```

Ids are positional; every other input is a flag named as in the API. Every flag takes a value, booleans included (`--muted false`); lists are comma-separated; nested objects are JSON; the literal `null` clears a nullable field (`--note null`). A whole body can go in `--json '{...}'`. Errors go to stderr as the error envelope with exit code 1.

`mentio mentions:watch --relevant true --interval 30` follows the feed and prints one JSON line per new mention, oldest first, which turns a shell pipeline into an alert channel. `mentio mcp:config` prints the configuration of Mentio's MCP server for Claude Code, Cursor or VS Code.

Every command is listed at https://docs.mentio.dev/cli.

## SDKs

TypeScript, `@mentio-dev/sdk` (Node 22+, Bun, Deno, browsers; no runtime dependencies):

```ts
import { createMentio } from '@mentio-dev/sdk';

const mentio = createMentio({ apiKey: process.env.MENTIO_API_KEY! });
const { data, error } = await mentio.searchMentions({ query: { platform: 'reddit', relevant: true, limit: 25 } });
if (error) throw new Error(error.error.message);
for (const mention of data.data) console.log(mention.post.platform, mention.classification?.relevance, mention.post.url);
```

Python, `mentio` on PyPI (3.11+, sync and async):

```python
from mentio import Mentio

client = Mentio(api_key="mk_live_...")
page = client.mentions.search(platform="reddit", relevant=True, limit=25)
for mention in page.data:
    print(mention.post.platform, mention.classification.relevance if mention.classification else None, mention.post.url)
```

Guides: https://docs.mentio.dev/sdks.

## OpenAPI

The complete document, every field described, is at `https://api.mentio.dev/v1/openapi.json`. The reference generated from it is at https://docs.mentio.dev/api, and each page is served as Markdown by appending `.mdx` to its path (for example `https://docs.mentio.dev/api/mentions/search-mentions.mdx`). Mentio also runs an MCP server at `https://mcp.mentio.dev/mcp` for MCP-aware clients (https://docs.mentio.dev/mcp).
