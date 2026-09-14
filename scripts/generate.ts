/**
 * Writes skill/rules/<area>.md from the SDK's openapi.json through render()
 * (pure, tested against the committed output). Committed, so the published
 * skill is exactly what the repo holds; `pnpm generate` refreshes it after
 * the SDK regenerates, and CI does the same on every merge to main before
 * publishing the skill to ClawHub.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render, type SkillDocument } from './render';

const specPath = fileURLToPath(new URL('../../sdk/openapi.json', import.meta.url));
const rulesDir = fileURLToPath(new URL('../skill/rules/', import.meta.url));

const doc = JSON.parse(readFileSync(specPath, 'utf8')) as SkillDocument;
const files = render(doc);
mkdirSync(rulesDir, { recursive: true });
for (const [name, content] of files) {
  writeFileSync(`${rulesDir}${name}`, content);
}
console.log(`Wrote ${files.size} rule files to ${rulesDir}`);
