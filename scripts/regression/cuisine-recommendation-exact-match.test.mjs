import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/components/ListView.tsx', 'utf8');

const matchTerms = {
  indonesia: ['インドネシア', 'indonesia'],
  india: ['インド', 'india'],
};

const previousCuisineMatch = (preferredCuisine, recipeCuisine) => {
  const cuisineKey = recipeCuisine.toLowerCase();
  const terms = matchTerms[preferredCuisine] ?? [preferredCuisine];
  return terms.some((term) => cuisineKey.includes(term.toLowerCase()));
};

const fixedCuisineMatch = (preferredCuisine, recipeCuisine) => {
  const cuisineKey = recipeCuisine.toLowerCase();
  const terms = matchTerms[preferredCuisine] ?? [preferredCuisine];
  return terms.some((term) => cuisineKey === term.toLowerCase());
};

assert.equal(
  previousCuisineMatch('india', 'インドネシア'),
  true,
  '再現: substring match では India preference が インドネシア recipe にも一致します。',
);
assert.equal(
  fixedCuisineMatch('india', 'インドネシア'),
  false,
  '修正: India preference は インドネシア recipe に一致させないでください。',
);
assert.equal(
  fixedCuisineMatch('indonesia', 'インドネシア'),
  true,
  '修正: Indonesia preference は インドネシア recipe に一致する必要があります。',
);

assert.match(
  source,
  /function\s+isCuisinePreferenceMatch\(/,
  '曖昧な国名 substring を避けるため cuisine match helper を用意してください。',
);
assert.match(
  source,
  /terms\.some\(\(term\)\s*=>\s*cuisineKey\s*===\s*term\.toLowerCase\(\)\)/,
  '好みの国マッチは includes ではなく exact match にしてください。',
);
assert.doesNotMatch(
  source,
  /cuisineKey\.includes\(term\.toLowerCase\(\)\)/,
  'India と Indonesia の誤一致を再発させる substring cuisine match を使わないでください。',
);

console.log('cuisine recommendation exact match regression checks passed');
