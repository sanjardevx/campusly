// Every locale must have exactly the keys of English, with the same {{placeholders}}.
// A missing Korean key would otherwise show "auth.signIn" on the screen. Runs in CI.
//
// Plural keys are the exception: i18next picks `key_one`, `key_few`, ... by the language's own
// plural rules, so English has daysAgo_one/_other, Russian _one/_few/_many/_other, Korean only
// _other. For those, each language must have exactly the forms its rules (Intl.PluralRules) need.
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

const PLURAL = /_(zero|one|two|few|many|other)$/;
const stemOf = (key) => key.replace(PLURAL, '');
const forms = (lng) => new Intl.PluralRules(lng).resolvedOptions().pluralCategories;

const problems = [];
for (const ns of readdirSync(join(root, 'en'))) {
  const base = read('en', ns);
  const stems = new Set([...base.keys()].filter((k) => PLURAL.test(k)).map(stemOf));

  for (const lng of readdirSync(root).filter((l) => l !== 'en')) {
    const other = read(lng, ns);
    const expected = new Map(); // key → English text it must match placeholders with
    for (const [key, text] of base) {
      if (!PLURAL.test(key)) expected.set(key, text);
    }
    for (const stem of stems) {
      for (const form of forms(lng)) expected.set(`${stem}_${form}`, base.get(`${stem}_other`) ?? '');
    }

    for (const [key, text] of expected) {
      if (!other.has(key)) problems.push(`${lng}/${ns}: missing "${key}"`);
      else if (placeholders(other.get(key)) !== placeholders(text))
        problems.push(`${lng}/${ns}: "${key}" placeholders differ from en`);
      else if (!other.get(key).trim()) problems.push(`${lng}/${ns}: "${key}" is empty`);
    }
    for (const key of other.keys())
      if (!expected.has(key)) problems.push(`${lng}/${ns}: "${key}" is not expected`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Locales OK: every language has the English keys (plural forms per language)');
