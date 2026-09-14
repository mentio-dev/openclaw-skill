# Mentio skill for OpenClaw

[![ClawHub](https://img.shields.io/badge/ClawHub-mentio-1421b9)](https://clawhub.ai)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-docs.mentio.dev-1421b9)](https://docs.mentio.dev/integrations/openclaw)

The [Mentio](https://mentio.dev) skill for [OpenClaw](https://openclaw.ai) agents, published to [ClawHub](https://clawhub.ai) under the slug `mentio`. With it an agent can track keywords, read scored mentions across Reddit, Hacker News, X, GitHub, Bluesky, LinkedIn, Stack Overflow, DEV, YouTube and news, triage them, set up alerts and pull analytics, through the Mentio REST API.

## Install

```bash
npx clawhub@latest --workdir ~/.openclaw install mentio
```

Then give the agent a Mentio API key (dashboard, Settings, API keys; every account starts with $5.80 of credit). The guide is at [docs.mentio.dev/integrations/openclaw](https://docs.mentio.dev/integrations/openclaw).

## What is in the skill

The published folder is `skill/`:

- `skill/SKILL.md`: what the agent reads first. Setup, how to call the API, the ten rules of the API, which calls answer which request, and what to confirm before doing. Hand-written.
- `skill/rules/authentication.md`, `errors.md`, `cli.md`: hand-written.
- `skill/rules/keywords.md`, `mentions.md`, `people.md`, `alerts.md`, `analytics.md`, `account.md`: generated from the API's OpenAPI document (the prose at the top of each file lives in `scripts/render.ts`; the endpoint tables, parameters, body fields and response shapes are derived), so the reference is always complete.

## Maintaining it

```bash
pnpm --filter @mentions/openclaw-skill generate   # refresh the generated rule files
pnpm --filter @mentions/openclaw-skill test       # frontmatter, links, coverage, freshness
npx clawhub@latest skill publish skill --slug mentio --dry-run
```

CI fails a change that leaves the generated files stale and republishes the skill on every release, in lockstep with the [TypeScript SDK](https://github.com/mentio-dev/sdk), the [Python SDK](https://github.com/mentio-dev/sdk-python) and the [CLI](https://github.com/mentio-dev/cli). This repository is published from the Mentio monorepo.

## License

MIT.
