import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.join(process.cwd(), 'lib', 'i18n', 'locales');
const SOURCE_LOCALE = 'en-US.json';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (!isPlainObject(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isPlainObject(current[parts[i]])) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function collectLeafKeys(value, keyPath = '', keys = new Set()) {
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      collectLeafKeys(child, nextPath, keys);
    }
    return keys;
  }
  keys.add(keyPath);
  return keys;
}

function main() {
  const sourceRaw = fs.readFileSync(path.join(LOCALES_DIR, SOURCE_LOCALE), 'utf8');
  const source = JSON.parse(sourceRaw);
  const sourceKeys = collectLeafKeys(source);

  const localeFiles = fs.readdirSync(LOCALES_DIR).filter(name => name.endsWith('.json'));

  let totalFixed = 0;

  for (const localeFile of localeFiles) {
    if (localeFile === SOURCE_LOCALE) continue;

    const filePath = path.join(LOCALES_DIR, localeFile);
    const localeRaw = fs.readFileSync(filePath, 'utf8');
    const locale = JSON.parse(localeRaw);
    const localeKeys = collectLeafKeys(locale);

    const missing = [...sourceKeys].filter(key => !localeKeys.has(key));

    if (missing.length === 0) continue;

    let added = 0;
    for (const key of missing) {
      const value = getNestedValue(source, key);
      setNestedValue(locale, key, value);
      added++;
    }

    fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
    console.log(`${localeFile}: added ${added} missing keys (English placeholders)`);
    totalFixed += added;
  }

  console.log(`\nTotal: ${totalFixed} keys added across ${localeFiles.length - 1} locale files`);
}

main();
