import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/mockData.ts', 'utf8');

const previousSesameKeyword = { id: 'ing-sesame', name_ja: 'ごま', name_en: 'ごま' };
const fixedSesameKeyword = { id: 'ing-sesame', name_ja: 'ごま', name_en: 'sesame' };

assert.equal(
  previousSesameKeyword.name_en.toLowerCase().includes('sesame'),
  false,
  '再現: name_en が日本語だと sesame 検索に一致しません。',
);
assert.equal(
  fixedSesameKeyword.name_en.toLowerCase().includes('sesame'),
  true,
  '修正: sesame allergen は英語検索 keyword として sesame を持つ必要があります。',
);

assert.match(
  source,
  /id:\s*"ing-sesame",\s*name_ja:\s*"ごま",\s*name_en:\s*"sesame"/,
  'ing-sesame の name_en は migration seed と同じ sesame にしてください。',
);

console.log('sesame English keyword regression checks passed');
