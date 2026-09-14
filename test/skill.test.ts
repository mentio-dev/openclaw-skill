/**
 * Keeps the published skill honest: the frontmatter OpenClaw and ClawHub
 * read, the links between SKILL.md and the rule files, every endpoint of the
 * API documented somewhere, every platform named in SKILL.md, and the
 * generated files equal to what the generator would write now.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GENERATED_FILES, platformsOf, render, type SkillDocument } from '../scripts/render';

const skillDir = fileURLToPath(new URL('../skill/', import.meta.url));
const read = (name: string): string => readFileSync(`${skillDir}${name}`, 'utf8');
const doc = JSON.parse(readFileSync(fileURLToPath(new URL('../../sdk/openapi.json', import.meta.url)), 'utf8')) as SkillDocument;
const skill = read('SKILL.md');

function frontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('SKILL.md has no frontmatter');
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return fields;
}

describe('SKILL.md', () => {
  const fields = frontmatter(skill);

  it('declares the name, a description and the OpenClaw metadata', () => {
    expect(fields['name']).toBe('mentio');
    expect(fields['description']?.length ?? 0).toBeGreaterThan(80);
    expect(fields['homepage']).toBe('https://docs.mentio.dev/integrations/openclaw');
    const metadata = JSON.parse(fields['metadata'] ?? '{}') as { openclaw?: { primaryEnv?: string; emoji?: string; homepage?: string } };
    expect(metadata.openclaw?.primaryEnv).toBe('MENTIO_API_KEY');
    expect(metadata.openclaw?.emoji).toBeTruthy();
    expect(metadata.openclaw?.homepage).toBe(fields['homepage']);
  });

  it('links every rule file, and every rule file is linked', () => {
    const linked = [...skill.matchAll(/\]\((rules\/[a-z-]+\.md)\)/g)].map((m) => m[1]!);
    const onDisk = readdirSync(`${skillDir}rules`).filter((f) => f.endsWith('.md')).map((f) => `rules/${f}`);
    for (const link of linked) expect(existsSync(`${skillDir}${link}`), `${link} is linked but missing`).toBe(true);
    for (const file of onDisk) expect(linked, `${file} exists but SKILL.md does not link it`).toContain(file);
  });

  it('names every platform the API knows, and no other', () => {
    const platforms = platformsOf(doc);
    expect(platforms.length).toBeGreaterThan(5);
    const rule = skill.match(/Platforms are (.+?)\. The field/)?.[1] ?? '';
    const named = [...rule.matchAll(/`([a-z]+)`/g)].map((m) => m[1]!);
    expect(named).toEqual(platforms);
  });

  it('never carries a live key or an em dash', () => {
    expect(skill).not.toMatch(/mk_live_[a-z0-9]{8,}/);
    for (const file of readdirSync(`${skillDir}rules`)) expect(read(`rules/${file}`), file).not.toContain('—');
    expect(skill).not.toContain('—');
  });
});

describe('generated rule files', () => {
  const rendered = render(doc);

  it('are exactly what the generator writes now (run pnpm generate otherwise)', () => {
    expect([...rendered.keys()].sort()).toEqual([...GENERATED_FILES].sort());
    for (const [name, content] of rendered) expect(read(`rules/${name}`), `rules/${name} is stale`).toBe(content);
  });

  it('document every operation of the API exactly once', () => {
    const all = GENERATED_FILES.map((f) => read(`rules/${f}`)).join('\n');
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!op.operationId) continue;
        const heading = `### ${method.toUpperCase()} ${path}`;
        const count = all.split(`${heading}\n`).length - 1;
        expect(count, `${heading} (${op.operationId})`).toBe(1);
      }
    }
  });

  it('show the CLI command for every endpoint and list the shapes they return', () => {
    const mentions = read('rules/mentions.md');
    expect(mentions).toContain('`mentio mentions:search`');
    expect(mentions).toContain('### Mention');
    expect(read('rules/alerts.md')).toContain('### Channel');
    expect(read('rules/keywords.md')).toContain('one of `brand`, `competitor`, `topic`');
  });
});
