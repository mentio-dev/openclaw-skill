# Mentio skill for OpenClaw

Social listening for developer platforms, from natural language. Once installed, OpenClaw tracks keywords, searches and triages classified mentions, sets up Slack, Telegram, email and webhook alerts, reads analytics and finds the people behind the mentions through the [Mentio API](https://docs.mentio.dev).

## Install

```bash
npx clawhub@latest --workdir ~/.openclaw install mentio
echo 'MENTIO_API_KEY=mk_live_...' >> ~/.openclaw/.env
openclaw gateway restart
```

The key comes from [app.mentio.dev/api-keys](https://app.mentio.dev/api-keys). The guide, with automations and troubleshooting, is at [docs.mentio.dev/integrations/openclaw](https://docs.mentio.dev/integrations/openclaw).

## Then ask

- "Start tracking `acme` as our brand and `globex` as a competitor."
- "What did people say about us on Hacker News this week? Which ones should I reply to?"
- "Any complaints or questions about acme in the last 24 hours? Mark the ones I already answered as done."
- "Alert the #brand Slack channel whenever a negative mention lands, and send me a digest every morning at 9 Madrid time."
- "How did mention volume split across platforms over the last 30 days, and how do we compare with globex?"
- "Who are the ten people with the most reach who mentioned us, and who mentions globex but never us?"
- "The classifier keeps flagging cartoon posts. Update our company profile so it knows we sell feature flags."

## What is inside

`SKILL.md` carries the setup, the rules of the API and which calls answer which request. `rules/` has one file per area: authentication, keywords, mentions, people and segments, alerts and channels, analytics, account, errors, and the CLI and SDKs. The reference parts are generated from the API's OpenAPI document, so the skill follows the API.

## Platforms

Bluesky, Hacker News, Reddit, X, GitHub, Stack Overflow, DEV, YouTube, LinkedIn and news.

## Links

- Website: [mentio.dev](https://mentio.dev)
- Docs: [docs.mentio.dev](https://docs.mentio.dev)
- Dashboard: [app.mentio.dev](https://app.mentio.dev)
- Source: [github.com/PauGuirao/mentions](https://github.com/PauGuirao/mentions/tree/main/packages/openclaw-skill)

MIT.
