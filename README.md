# @mentions/openclaw-skill

The Mentio skill for [OpenClaw](https://openclaw.ai), published to [ClawHub](https://clawhub.ai) under the slug `mentio`. The published folder is `skill/`:

- `skill/SKILL.md`: what the agent reads first. Setup, how to call the API, the ten rules of the API, which calls answer which request, and what to confirm before doing. Hand-written.
- `skill/rules/authentication.md`, `errors.md`, `cli.md`: hand-written.
- `skill/rules/keywords.md`, `mentions.md`, `people.md`, `alerts.md`, `analytics.md`, `account.md`: GENERATED from `packages/sdk/openapi.json` by `scripts/generate.ts` (the prose at the top of each file lives in `scripts/render.ts`; the endpoint tables, parameters, body fields and response shapes are derived). Run `pnpm --filter @mentions/openclaw-skill generate` after any API change; CI fails a PR that leaves them stale and republishes the skill on a merge to main, in lockstep with the SDK and the CLI.

```bash
pnpm --filter @mentions/openclaw-skill generate   # refresh the generated rule files
pnpm --filter @mentions/openclaw-skill test       # frontmatter, links, coverage, freshness
npx clawhub@latest skill publish packages/openclaw-skill/skill --slug mentio --dry-run
```

Users install it with `npx clawhub@latest --workdir ~/.openclaw install mentio`; the guide is at [docs.mentio.dev/integrations/openclaw](https://docs.mentio.dev/integrations/openclaw).
