import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(
  routeSource,
  /const\s+fallbackFields:\s*ProfileFallbackField\[\]/,
  'GET /api/me/profile は read-error をフィールド単位の fallbackFields として表現してください。',
);
assert.match(
  routeSource,
  /preferencesError[\s\S]*fallbackFields\.push\('preferences'\)/,
  'user_preferences の read 失敗は preferences だけを fallback 対象にしてください。',
);
assert.match(
  routeSource,
  /const\s+restrictedIngredients\s*=\s*restrictedError\s*\?\s*\[\]\s*:/,
  'restricted ingredient DB read が成功した場合は、preferencesError に関係なく DB の制限食材を返してください。',
);
assert.match(
  routeSource,
  /if\s*\(preferencesError\)\s*\{?[\s\S]*?throw\s+preferencesError/,
  'PUT /api/me/profile は user_preferences upsert 失敗時に database 成功レスポンスを返さないでください。',
);

const buildGetProfileResponse = ({ profileError, restrictedError, preferencesError, restrictedRows }) => {
  const fallbackFields = [];
  if (profileError) fallbackFields.push('userName');
  if (restrictedError) fallbackFields.push('restrictedIngredients');
  if (preferencesError) fallbackFields.push('preferences');
  const source = fallbackFields.length === 0 ? 'database' : 'partial-fallback';
  const restrictedIngredients = restrictedError ? [] : restrictedRows;
  const preferenceRow = preferencesError ? {} : { preferred_dishes: ['寿司'], preferred_cuisines: ['和食'] };

  return {
    restrictedIngredients,
    preferredDishes: preferenceRow.preferred_dishes ?? [],
    preferredCuisines: preferenceRow.preferred_cuisines ?? [],
    source,
    fallbackFields,
  };
};

assert.deepEqual(
  buildGetProfileResponse({
    profileError: null,
    restrictedError: null,
    preferencesError: new Error('RLS rejected user_preferences read'),
    restrictedRows: ['ing-shrimp'],
  }),
  {
    restrictedIngredients: ['ing-shrimp'],
    preferredDishes: [],
    preferredCuisines: [],
    source: 'partial-fallback',
    fallbackFields: ['preferences'],
  },
  'preferences read だけが失敗しても、成功した restricted ingredient DB read と database source を維持します。',
);

const saveProfile = async ({ upsertPreferences, replaceRestrictedIngredients }) => {
  const { error: preferencesError } = await upsertPreferences();
  if (preferencesError) throw preferencesError;
  await replaceRestrictedIngredients();
  return { source: 'database' };
};

let replaceCalls = 0;
const preferencesFailure = new Error('RLS rejected user_preferences upsert');
await assert.rejects(
  saveProfile({
    upsertPreferences: async () => ({ error: preferencesFailure }),
    replaceRestrictedIngredients: async () => {
      replaceCalls += 1;
    },
  }),
  preferencesFailure,
  'preferences upsert 失敗時は database 成功レスポンスを返さずエラーにしてください。',
);
assert.equal(replaceCalls, 0, 'preferences upsert 失敗後に成功扱いの restricted ingredient 同期へ進まないでください。');

console.log('profile partial failure source regression checks passed');
