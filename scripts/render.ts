/**
 * OpenAPI document -> the generated rule files of the OpenClaw skill, one
 * Markdown file per API area. Pure: the generate script writes what this
 * returns and the tests compare it with the committed files.
 *
 * The prose at the top of each area (what it is for, worked curl examples)
 * lives in AREAS below. Everything under it is derived from the document:
 * the endpoint table with the matching `mentio` command, every path, query
 * and body field with its type, enum, nullability and description, what each
 * call returns, and the shapes those responses are made of. An area that no
 * longer covers every endpoint fails the render, so a new resource cannot
 * ship undocumented to the agent.
 */
import { commandName } from '../../cli/src/naming';
import type { OpenApiDocument, OpenApiOperation, OpenApiSchema } from '../../cli/src/operations-from-spec';

export type SkillDocument = OpenApiDocument & { components?: { schemas?: Record<string, OpenApiSchema> } };

interface Area {
  slug: string;
  title: string;
  /** Path nouns (the segment after /v1/) this file documents, in the order their endpoints are listed. */
  nouns: string[];
  intro: string;
  examples: string;
}

const API = 'https://api.mentio.dev';
const AUTH = '-H "Authorization: Bearer $MENTIO_API_KEY"';
const JSON_HEADERS = `${AUTH} -H "Content-Type: application/json"`;

const AREAS: Area[] = [
  {
    slug: 'keywords',
    title: 'Keywords',
    nouns: ['keywords'],
    intro: `A keyword is a word or phrase Mentio watches, matched case-insensitively as a phrase on every platform or on the ones in \`platforms\`. \`kind\` says what it is to the workspace: \`brand\` (their own names), \`competitor\` (the others), \`topic\` (the space); share of voice and segments read it. Matching, classification and delivery start on the next poll of each platform (real time on Bluesky, minutes to an hour elsewhere, up to 12 hours on YouTube).

Before creating one, list the keywords: the same normalized term twice is a \`409 duplicate_keyword\`. A keyword costs $5 per month, debited daily from the prepaid balance, and every mention it matches $0.008; a \`402\` means the balance cannot cover it (see rules/errors.md). Muting stops polling and matching but keeps the mentions; deleting removes the keyword and its matches (posts also matched by another keyword stay). Confirm with the user before deleting.

\`stats\` counts every match ever (\`mentions\`, the billed number), the relevant ones, and the last 7 days. \`polling\` reports, per polled platform, the last poll and how many polls in a row found nothing, which is how you tell "nothing is being said" from "not polled yet".`,
    examples: `# Every keyword with its stats and poll health
curl -sS "${API}/v1/keywords" ${AUTH}

# Track a brand term on two platforms only
curl -sS -X POST "${API}/v1/keywords" ${JSON_HEADERS} \\
  -d '{"term": "acme", "kind": "brand", "platforms": ["reddit", "hackernews"]}'

# Track a competitor everywhere
curl -sS -X POST "${API}/v1/keywords" ${JSON_HEADERS} \\
  -d '{"term": "globex", "kind": "competitor"}'

# Pause one, then widen it back to every platform
curl -sS -X PATCH "${API}/v1/keywords/kw_60d9..." ${JSON_HEADERS} -d '{"muted": true}'
curl -sS -X PATCH "${API}/v1/keywords/kw_60d9..." ${JSON_HEADERS} -d '{"platforms": null}'`,
  },
  {
    slug: 'mentions',
    title: 'Mentions',
    nouns: ['mentions'],
    intro: `A mention is one post matched to one keyword; a post that matches two keywords is two mentions with two ids. Each one nests \`post\` (platform, url, text, publishedAt), \`author\` (name, handle, url, followers, your tags; \`null\` for an anonymous post), \`classification\` (\`null\` until the classifier has run: relevance 0 to 100, sentiment, intents, a one-line note) and \`triage\` (assignee, snooze, note). \`relevant\` is true from relevance 40 up; \`priority\` is an attention score from relevance, author reach, the strongest intent and age, so \`sort=priority\` answers "what should I look at".

Intents are \`buy_intent\`, \`question\`, \`complaint\`, \`praise\` and \`comparison\`. Status is the user's triage: \`open\` (untouched), \`ignored\` (hidden from the feed and every channel), \`done\` (handled); ignored and done mentions are never delivered. Snoozed mentions leave the feed until \`snoozedUntil\`. Muted people are hidden unless \`includeMuted=true\`.

Searching: default to \`relevant=true\` unless the user asks about noise, use \`since\` for "this week", \`platform\` for "on Hacker News", \`sentiment\`/\`intent\` for "complaints" or "buying signals", \`q\` for a substring, and 20 to 50 as \`limit\`. Results are newest first and paged with \`nextCursor\`: pass it back as \`cursor\` with the same filters and sort, and only page when the user wants more. Summarize a mention as platform, author (followers), sentiment and intents, one line of text, and the URL.

Triage is one write: \`PATCH /v1/mentions/{id}\` with only the fields to change; \`null\` clears a field. The CSV export takes the same filters as the list and is capped at 10,000 rows.`,
    examples: `# Relevant negative mentions from the last 7 days, most urgent first
curl -sS "${API}/v1/mentions?relevant=true&sentiment=negative&since=$(date -u -v-7d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%dT00:00:00Z)&sort=priority&limit=20" ${AUTH}

# Buying signals on Reddit and Hacker News (one platform per call)
curl -sS "${API}/v1/mentions?intent=buy_intent&platform=reddit&limit=25" ${AUTH}

# Everything one keyword matched, noise included, for a quality check
curl -sS "${API}/v1/mentions?keywordId=kw_60d9...&limit=50" ${AUTH}

# Close one out with a note; snooze another until Monday
curl -sS -X PATCH "${API}/v1/mentions/mm_7f3a..." ${JSON_HEADERS} \\
  -d '{"status": "done", "note": "Replied in thread"}'
curl -sS -X PATCH "${API}/v1/mentions/mm_7f3a..." ${JSON_HEADERS} \\
  -d '{"snoozedUntil": "2026-09-14T09:00:00Z"}'

# Export this month's relevant mentions to a file
curl -sS "${API}/v1/mentions/export.csv?relevant=true&since=2026-09-01T00:00:00Z" ${AUTH} -o mentions.csv`,
  },
  {
    slug: 'people',
    title: 'People and segments',
    nouns: ['people', 'segments'],
    intro: `People are the authors behind the mentions: one row per person with every account of theirs (\`accounts\`), reach (\`reach.followers\`), the public profile when the platform has one (\`profile\`: bio, company, location, website, email, linked accounts), per-workspace \`stats\` (mentions, negatives, intents seen, first and last seen), the workspace's own \`annotations\` (tags, notes, muted) and its \`outreach\` (the teammate who owns the contact, the stage from \`not_contacted\` to \`customer\` or \`not_a_fit\`, and when someone last reached out). Ids are \`aut_...\`; an account merged into someone resolves to that person.

Outreach is logged, not guessed: \`POST /v1/people/{id}/activities\` records that someone reached out (a \`channel\` and a short \`note\`), and \`GET\` on the same path reads the log. The first activity claims an unowned person for whoever reached out and moves them to \`contacted\`; it never takes a person from an owner or moves a stage back (set those with \`PATCH /v1/people/{id}\`). Before suggesting a contact, read the owner and the log so two teammates never write to the same person.

Sorting answers most questions: \`reach\` for influencers, \`new\` for new voices, \`mentions\` for the loudest, \`recent\` for the latest. Filters stack: \`minFollowers\`, \`intents\`, \`keywordKinds\` (people who mentioned a competitor), \`neverKeywordKinds\` (and never the brand), \`newSinceDays\`, \`tags\`, \`linkHosts\` (people who have shared a link to that host). The list is offset-paginated (\`{ data, total }\`, \`limit\` and \`offset\`).

A segment is a saved people filter with a name, evaluated live on every read (\`GET /v1/segments\` returns each with its current size and a few presets to save as a starting point); pass \`segmentId\` to \`GET /v1/people\` to list its members. Annotations are per workspace: tags and notes for the user's own organization, \`muted\` hides the person's posts from the feed and every channel without touching ingest or billing. A merge declares two accounts one human; a split undoes it. Confirm before merging or deleting a segment.`,
    examples: `# The ten people with the most reach who mentioned us, then new voices this month
curl -sS "${API}/v1/people?sort=reach&limit=10" ${AUTH}
curl -sS "${API}/v1/people?sort=new&newSinceDays=30&limit=20" ${AUTH}

# Switch prospects: mentioned a competitor, never the brand, with an audience
curl -sS "${API}/v1/people?keywordKinds=competitor&neverKeywordKinds=brand&minFollowers=1000&sort=reach" ${AUTH}

# Tag and annotate one; mute another
curl -sS -X PATCH "${API}/v1/people/aut_1c2d..." ${JSON_HEADERS} \\
  -d '{"tags": ["customer", "vip"], "notes": "Talked at KubeCon"}'
curl -sS -X PATCH "${API}/v1/people/aut_9e8f..." ${JSON_HEADERS} -d '{"muted": true}'

# Save the prospects filter as a segment and list its members
curl -sS -X POST "${API}/v1/segments" ${JSON_HEADERS} \\
  -d '{"name": "Switch prospects", "filter": {"keywordKinds": ["competitor"], "neverKeywordKinds": ["brand"], "minFollowers": 1000}}'
curl -sS "${API}/v1/people?segmentId=seg_...&sort=reach" ${AUTH}`,
  },
  {
    slug: 'alerts',
    title: 'Alerts and channels',
    nouns: ['alerts', 'channels'],
    intro: `An alert is a rule times one or more channels. The rule says what to watch (a \`filter\` over keywords, platforms, minimum relevance, sentiments, intents, author reach and tags, the hosts a post links to in \`linkHosts\`, excluded authors) and when: \`instant\` fires per mention as it is classified, \`daily\` sends one digest at \`schedule\` (hour, minute, IANA timezone) with the day's counts, the split by platform, the top mentions, anything negative and buying signals; \`skipEmpty\` skips days with nothing new. A channel is where a message lands and can serve any number of rules. Alerts and digests are never billed.

Channels by kind: \`slack\` and \`telegram\` are connected in the dashboard (Slack through an OAuth install, Telegram by pressing Start on the bot), so list them and use their ids; when there is none, tell the user to connect it at https://app.mentio.dev/alerts. \`email\` takes a list of addresses (members of the workspace are confirmed on sight, anyone else gets a confirmation link and receives nothing until they click it; instant email is capped at 20 per hour per channel). \`webhook\` takes a URL and optional headers of the user's own; the response carries \`config.secret\` ONCE, which signs every delivery (\`X-Mentions-Signature\`, hex HMAC-SHA256 of the raw body), so show it to the user right away.

Webhook payloads are \`{ id, event, createdAt, alert: {id, name}, data }\`; \`event\` is the rule's own name (\`mention.negative\`, \`mention.buy_intent\`, anything lowercase and dotted) so one endpoint can serve many rules, defaulting to \`mention.matched\` for instant rules and \`digest\` for daily ones. \`data\` is the mention or the digest exactly as the API shapes it. A 2xx within 10 seconds is success; timeouts, 408, 429 and 5xx are retried up to 5 times about 30 seconds apart with the same \`id\`, so consumers deduplicate on it.

Testing: \`POST /v1/channels/{id}/test\` sends \`event: "test"\` to one channel, \`POST /v1/alerts/{id}/test\` through every channel of a rule, \`POST /v1/alerts/{id}/run\` sends a daily rule's last 24 hours now without moving its schedule, and \`GET /v1/channels/{id}/deliveries\` shows what went out and how it went. Confirm before deleting a rule or a channel and before rotating a secret (the old one stops verifying at once).`,
    examples: `# What channels exist, then a rule for negative mentions to the Slack one
curl -sS "${API}/v1/channels" ${AUTH}
curl -sS -X POST "${API}/v1/alerts" ${JSON_HEADERS} \\
  -d '{"name": "Negative mentions", "mode": "instant", "filter": {"sentiments": ["negative"]}, "channelIds": ["dest_..."]}'

# A daily digest at 09:00 Madrid time by email, skipping empty days
curl -sS -X POST "${API}/v1/channels" ${JSON_HEADERS} -d '{"kind": "email", "emails": ["team@example.com"]}'
curl -sS -X POST "${API}/v1/alerts" ${JSON_HEADERS} \\
  -d '{"name": "Morning digest", "mode": "daily", "schedule": {"hour": 9, "minute": 0, "timezone": "Europe/Madrid", "skipEmpty": true}, "filter": {}, "channelIds": ["dest_..."]}'

# A webhook to the user's own service (keep config.secret from the response), with buying signals as the event
curl -sS -X POST "${API}/v1/channels" ${JSON_HEADERS} \\
  -d '{"kind": "webhook", "url": "https://example.com/hooks/mentio", "label": "Production", "headers": {"Authorization": "Bearer their-own-token"}}'
curl -sS -X POST "${API}/v1/alerts" ${JSON_HEADERS} \\
  -d '{"name": "Buying signals", "mode": "instant", "event": "mention.buy_intent", "filter": {"intents": ["buy_intent"], "minRelevance": 60}, "channelIds": ["dest_..."]}'

# Prove it works, then see the log
curl -sS -X POST "${API}/v1/alerts/feed_.../test" ${AUTH}
curl -sS "${API}/v1/channels/dest_.../deliveries?limit=20" ${AUTH}`,
  },
  {
    slug: 'analytics',
    title: 'Analytics',
    nouns: ['analytics'],
    intro: `Four named reports over one window grammar. The window is \`range\` (\`7d\`, \`30d\`, \`90d\`, \`365d\`, ending today; default 30d) or \`from\` and \`to\` (YYYY-MM-DD, inclusive), cut into days in \`timezone\` (IANA, default UTC); \`keywordIds\` and \`platforms\` narrow it; \`compare=true\` adds the period of the same length right before as \`previous\`, which is how to say "up 40% on last month". Every report carries the \`window\` it covered.

Which report answers what: \`summary\` for the headline numbers (matched, relevant, posts, people, sentiment split, buying intent, questions, reach, triage state); \`series\` for "over time" (per day or week, one total or split \`by=platform\` or \`by=keyword\`); \`breakdown\` for "which platform / keyword / sentiment / intent / status / hour of the week / person" (one table grouped \`by\` that dimension); \`share-of-voice\` for "us against the competitors" (every brand and competitor keyword with its share of their combined matches; topics are counted but stay out of the split). \`matched\` counts every match, relevant or not (the number usage counts); \`relevant\` is what was delivered.`,
    examples: `# This week against last week, in the user's zone
curl -sS "${API}/v1/analytics/summary?range=7d&compare=true&timezone=Europe/Madrid" ${AUTH}

# Mentions per day for 30 days, one line per platform
curl -sS "${API}/v1/analytics/series?range=30d&by=platform&bucket=day" ${AUTH}

# Which intents show up, and when in the week people post
curl -sS "${API}/v1/analytics/breakdown?by=intent&range=30d" ${AUTH}
curl -sS "${API}/v1/analytics/breakdown?by=hour&range=90d&timezone=America/New_York" ${AUTH}

# Share of voice over a quarter, Reddit and Hacker News only
curl -sS "${API}/v1/analytics/share-of-voice?range=90d&platforms=reddit,hackernews&compare=true" ${AUTH}`,
  },
  {
    slug: 'account',
    title: 'Company profile, API keys and health',
    nouns: ['company', 'api-keys', 'health'],
    intro: `The company profile is what the classifier knows about the user: \`name\`, \`description\`, \`useCases\`, their own \`accounts\` (so their own posts are recognized) and the \`context\` composed from them, which is what the model actually reads. It is the biggest lever on relevance: when the user complains about noise or missed mentions, read the profile, then improve the description and use cases in their words (what the company does, for whom, what it is not). Setting \`context\` directly overrides the composition until the next profile edit. New mentions are scored with the new context at once; old ones are not rescored.

API keys belong to one workspace and are \`read\` (GET only; a write answers \`403 read_only_key\`) or \`write\`. The key is returned once at creation and only its hash is stored; list shows prefixes. Creating or revoking keys needs a write key. Do not create keys unless asked, and hand a new key to the user once without storing it anywhere. \`GET /v1/health\` needs no key and says whether the API is up.`,
    examples: `# Read the profile the classifier uses, then sharpen it
curl -sS "${API}/v1/company" ${AUTH}
curl -sS -X PATCH "${API}/v1/company" ${JSON_HEADERS} \\
  -d '{"name": "Acme", "description": "Acme is a hosted feature-flag service for backend teams. Not the fictional Acme from cartoons.", "useCases": ["Ship behind flags", "Kill switches in production", "Gradual rollouts"], "accounts": {"x": "acmedev", "linkedin": "acme-dev"}}'

# Keys: list, mint a read-only one for a script, revoke it later
curl -sS "${API}/v1/api-keys" ${AUTH}
curl -sS -X POST "${API}/v1/api-keys" ${JSON_HEADERS} -d '{"name": "nightly report", "scope": "read"}'
curl -sS -X DELETE "${API}/v1/api-keys/key_..." ${AUTH}

# Is the API up? (no key needed)
curl -sS "${API}/v1/health"`,
  },
];

const METHOD_RANK: Record<string, number> = { get: 0, post: 1, patch: 2, put: 3, delete: 4 };
const MAX_DEPTH = 3;

interface Op {
  method: string;
  path: string;
  op: OpenApiOperation;
}

export function render(doc: SkillDocument): Map<string, string> {
  const schemas = doc.components?.schemas ?? {};

  const refName = (schema: OpenApiSchema | undefined): string | undefined => schema?.$ref?.split('/').pop();
  const deref = (schema: OpenApiSchema | undefined): OpenApiSchema | undefined => {
    const name = refName(schema);
    return name ? schemas[name] : schema;
  };
  const variantsOf = (schema: OpenApiSchema | undefined): OpenApiSchema[] | undefined => schema?.oneOf ?? schema?.anyOf ?? schema?.allOf;

  const typeOf = (schema: OpenApiSchema | undefined): string => {
    const name = refName(schema);
    if (name) return name;
    const s = schema;
    if (!s) return 'unknown';
    const raw = Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type;
    if (raw === 'array') return `array of ${typeOf(s.items)}`;
    if (raw) return raw;
    if (s.properties) return 'object';
    const variants = variantsOf(s);
    if (variants) return `one of ${variants.map((v) => typeOf(v)).join(' | ')}`;
    return 'unknown';
  };

  const enumOf = (schema: OpenApiSchema | undefined): string[] | undefined => {
    const s = deref(schema);
    const values = s?.enum ?? (s?.type === 'array' ? deref(s.items)?.enum : undefined);
    const strings = values?.filter((v): v is string => typeof v === 'string');
    return strings && strings.length > 0 ? strings : undefined;
  };

  const isNullable = (schema: OpenApiSchema | undefined): boolean => {
    const s = deref(schema);
    if (!s) return false;
    return s.nullable === true || (Array.isArray(s.type) && s.type.includes('null'));
  };

  const code = (text: string): string => `\`${text}\``;

  /** One bullet per field, nested for inline objects up to MAX_DEPTH; a $ref is named, not expanded (it has its own Shapes entry). */
  const fieldLines = (name: string, schema: OpenApiSchema | undefined, required: boolean, depth: number): string[] => {
    const s = deref(schema);
    const flags = [typeOf(schema)];
    if (required) flags.push('required');
    if (isNullable(schema)) flags.push('nullable');
    const values = enumOf(schema);
    const parts: string[] = [];
    if (values) parts.push(`one of ${values.map(code).join(', ')}`);
    if (s?.description) parts.push(s.description.trim());
    const lines = [`${'  '.repeat(depth)}- ${code(name)} (${flags.join(', ')})${parts.length > 0 ? `: ${parts.join('. ')}` : ''}`];
    if (refName(schema) || depth >= MAX_DEPTH || !s) return lines;
    const inline = s.properties ? s : s.type === 'array' && !refName(s.items) ? deref(s.items) : undefined;
    if (inline?.properties) {
      const req = new Set(inline.required ?? []);
      for (const [child, childSchema] of Object.entries(inline.properties)) {
        lines.push(...fieldLines(child, childSchema, req.has(child), depth + 1));
      }
    }
    return lines;
  };

  const objectLines = (schema: OpenApiSchema | undefined, depth: number): string[] => {
    const s = deref(schema);
    if (!s) return [];
    const variants = variantsOf(s);
    if (variants) {
      const lines: string[] = [];
      variants.forEach((variant, index) => {
        const v = deref(variant);
        const kind = enumOf(v?.properties?.['kind']);
        lines.push(`${'  '.repeat(depth)}- Variant ${index + 1}${kind ? ` (${code('kind')} = ${kind.map(code).join(', ')})` : ''}:`);
        lines.push(...objectLines(variant, depth + 1));
      });
      return lines;
    }
    const req = new Set(s.required ?? []);
    return Object.entries(s.properties ?? {}).flatMap(([name, prop]) => fieldLines(name, prop, req.has(name), depth));
  };

  /** Component names a response is built from, so the area lists their shapes once. */
  const collectRefs = (schema: OpenApiSchema | undefined, into: Set<string>, depth = 0): void => {
    if (!schema || depth > 6) return;
    const name = refName(schema);
    if (name) {
      if (into.has(name)) return;
      into.add(name);
      collectRefs(schemas[name], into, depth + 1);
      return;
    }
    for (const prop of Object.values(schema.properties ?? {})) collectRefs(prop, into, depth + 1);
    collectRefs(schema.items, into, depth + 1);
    for (const variant of variantsOf(schema) ?? []) collectRefs(variant, into, depth + 1);
  };

  /** An inline object with exactly the property set of a named component is that component (the list endpoints inline their item shape). */
  const componentByShape = new Map<string, string>();
  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.properties) componentByShape.set(Object.keys(schema.properties).sort().join(','), name);
  }
  const nameOf = (schema: OpenApiSchema | undefined): string | undefined => {
    const direct = refName(schema);
    if (direct) return direct;
    if (!schema?.properties) return undefined;
    return componentByShape.get(Object.keys(schema.properties).sort().join(','));
  };

  const okResponse = (op: OpenApiOperation): { status: string; schema?: OpenApiSchema; contentType?: string } | undefined => {
    const entry = Object.entries(op.responses ?? {}).find(([status]) => status.startsWith('2'));
    if (!entry) return undefined;
    const [status, response] = entry;
    const content = (response as { content?: Record<string, { schema?: OpenApiSchema }> }).content ?? {};
    const contentType = Object.keys(content)[0];
    return { status, contentType, schema: contentType ? content[contentType]?.schema : undefined };
  };

  const returnsLines = (op: OpenApiOperation, refs: Set<string>): string[] => {
    const ok = okResponse(op);
    if (!ok) return ['Returns: nothing documented.'];
    if (!ok.contentType) return [`Returns: ${ok.status}, no body.`];
    if (ok.contentType.includes('csv')) return [`Returns: ${ok.status}, CSV text.`];
    const schema = ok.schema;
    collectRefs(schema, refs);
    const name = nameOf(schema);
    if (name) {
      refs.add(name);
      return [`Returns: ${ok.status}, a ${code(name)} (see Shapes below).`];
    }
    const s = schema;
    const data = s?.properties?.['data'];
    const dataItem = nameOf(data?.items);
    if (data && dataItem) {
      refs.add(dataItem);
      const others = Object.keys(s?.properties ?? {}).filter((k) => k !== 'data');
      const extra = others.length > 0 ? `, ${others.join(', ')}` : '';
      return [`Returns: ${ok.status}, ${code(`{ data: ${dataItem}[]${extra} }`)} (see Shapes below).`];
    }
    return [`Returns: ${ok.status}, an object:`, '', ...objectLines(schema, 0)];
  };

  const opSection = (entry: Op, refs: Set<string>): string[] => {
    const { method, path, op } = entry;
    const lines: string[] = [`### ${method.toUpperCase()} ${path}`, ''];
    const summary = op.summary ? `**${op.summary.replace(/\.$/, '')}.**` : '';
    const description = op.description?.trim() ?? '';
    lines.push([summary, description].filter(Boolean).join(' '), '');
    lines.push(`CLI: ${code(`mentio ${commandName({ operationId: op.operationId ?? '', method, path })}`)}`, '');
    const params = op.parameters ?? [];
    const pathParams = params.filter((p) => p.in === 'path');
    const queryParams = params.filter((p) => p.in === 'query');
    if (pathParams.length > 0) {
      lines.push('Path:', '');
      for (const p of pathParams) lines.push(...fieldLines(p.name, { ...(p.schema ?? {}), description: p.description ?? p.schema?.description }, p.required === true, 0));
      lines.push('');
    }
    if (queryParams.length > 0) {
      lines.push('Query:', '');
      for (const p of queryParams) lines.push(...fieldLines(p.name, { ...(p.schema ?? {}), description: p.description ?? p.schema?.description }, p.required === true, 0));
      lines.push('');
    }
    const body = op.requestBody?.content?.['application/json']?.schema;
    if (body) {
      const b = deref(body);
      lines.push(`Body (JSON)${b?.description ? `: ${b.description.trim()}` : ':'}`, '');
      lines.push(...objectLines(body, 0), '');
    }
    lines.push(...returnsLines(op, refs), '');
    return lines;
  };

  const shapeSection = (name: string): string[] => {
    const s = schemas[name];
    if (!s) return [];
    const lines: string[] = [`### ${name}`, ''];
    if (s.description) lines.push(s.description.trim(), '');
    const variants = variantsOf(s);
    if (variants) {
      const names = variants.map((v) => refName(v) ?? typeOf(v));
      const kind = variants.map((v) => enumOf(deref(v)?.properties?.['kind'])?.[0]).filter((k): k is string => Boolean(k));
      lines.push(`One of ${names.map(code).join(', ')}${kind.length > 0 ? `; ${code('kind')} tells them apart (${kind.map(code).join(', ')})` : ''}.`, '');
      return lines;
    }
    lines.push(...objectLines(s, 0), '');
    return lines;
  };

  const ops: Op[] = [];
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (op.operationId) ops.push({ method, path, op });
    }
  }
  const nounOf = (path: string): string => path.replace(/^\/v1\//, '').split('/')[0] ?? '';
  const covered = new Set(AREAS.flatMap((a) => a.nouns));
  const uncovered = [...new Set(ops.map((o) => nounOf(o.path)))].filter((n) => !covered.has(n));
  if (uncovered.length > 0) {
    throw new Error(`OpenClaw skill: no rule file covers the ${uncovered.join(', ')} endpoints; add them to AREAS in scripts/render.ts`);
  }

  const files = new Map<string, string>();
  for (const area of AREAS) {
    const areaOps = area.nouns.flatMap((noun) =>
      ops
        .filter((o) => nounOf(o.path) === noun)
        .sort((a, b) => a.path.localeCompare(b.path) || (METHOD_RANK[a.method] ?? 9) - (METHOD_RANK[b.method] ?? 9)),
    );
    const refs = new Set<string>();
    const sections = areaOps.flatMap((o) => opSection(o, refs));
    const table = [
      '| Method | Path | CLI | What it does |',
      '| --- | --- | --- | --- |',
      ...areaOps.map((o) => {
        const command = commandName({ operationId: o.op.operationId ?? '', method: o.method, path: o.path });
        return `| ${code(o.method.toUpperCase())} | ${code(o.path)} | ${code(`mentio ${command}`)} | ${(o.op.summary ?? o.op.operationId ?? '').replace(/\|/g, '\\|')} |`;
      }),
    ];
    const shapes = [...refs].flatMap(shapeSection);
    const body = [
      '<!-- Generated by packages/openclaw-skill/scripts/generate.ts from packages/sdk/openapi.json. Do not edit: change the API or the prose in scripts/render.ts and regenerate. -->',
      '',
      `# ${area.title}`,
      '',
      area.intro.trim(),
      '',
      `Base URL ${code(API)}, ${code('Authorization: Bearer $MENTIO_API_KEY')} on every request, JSON in and out. The ${code('mentio')} CLI command for each endpoint is listed for when it is installed (rules/cli.md).`,
      '',
      '## Examples',
      '',
      '```bash',
      area.examples.trim(),
      '```',
      '',
      '## Endpoints',
      '',
      ...table,
      '',
      ...sections,
      ...(shapes.length > 0 ? ['## Shapes', '', ...shapes] : []),
    ];
    files.set(`${area.slug}.md`, `${body.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`);
  }
  return files;
}

/** The platform names the document knows, for the tests that keep SKILL.md honest. */
export function platformsOf(doc: SkillDocument): string[] {
  const keyword = doc.components?.schemas?.['Keyword'];
  const items = keyword?.properties?.['platforms']?.items;
  return items?.enum?.filter((v): v is string => typeof v === 'string') ?? [];
}

export const GENERATED_FILES = AREAS.map((a) => `${a.slug}.md`);
