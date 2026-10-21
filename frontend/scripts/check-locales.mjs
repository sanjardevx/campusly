// Every locale must have exactly the keys of English, with the same {{placeholders}}.
// A missing Korean key would otherwise show "auth.signIn" on the screen. Runs in CI.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'public', 'locales');
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]],
  );
const placeholders = (text) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort().join(',');
const read = (lng, ns) =>
  new Map(flatten(JSON.parse(readFileSync(join(root, lng, ns), 'utf8'))));

const problems = [];
for (const ns of readdirSync(join(root, 'en'))) {
  const base = read('en', ns);
  for (const lng of readdirSync(root).filter((l) => l !== 'en')) {
    const other = read(lng, ns);
    for (const [key, text] of base) {
      if (!other.has(key)) problems.push(`${lng}/${ns}: missing "${key}"`);
      else if (placeholders(other.get(key)) !== placeholders(text))
        problems.push(`${lng}/${ns}: "${key}" placeholders differ from en`);
      else if (!other.get(key).trim()) problems.push(`${lng}/${ns}: "${key}" is empty`);
    }
    for (const key of other.keys())
      if (!base.has(key)) problems.push(`${lng}/${ns}: "${key}" is not in en`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Locales OK: every language has the English keys');
