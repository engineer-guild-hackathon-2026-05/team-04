import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const bareUpdatePattern = /^\s*await supabase\.from\('profiles'\)\.update\(\{ name: profile\.userName \}\)\.eq\('id', user\.id\);$/m;

assert.doesNotMatch(
  source,
  bareUpdatePattern,
  '再現: Supabase/PostgREST update は { error } を返すため、await だけでは失敗を検知できません。',
);

assert.match(
  source,
  /const\s+\{\s*error:\s*profileUpdateError\s*\}\s*=\s*await\s+supabase\s*\.from\('profiles'\)\s*\.update\(\{\s*name:\s*profile\.userName\s*\}\)\s*\.eq\('id',\s*user\.id\);/,
  'profiles update の戻り値から profileUpdateError を取り出してください。',
);

assert.match(
  source,
  /if\s*\(profileUpdateError\)\s*throw\s+profileUpdateError;[\s\S]*await\s+replaceRestrictedIngredients\([\s\S]*supabase,[\s\S]*user\.id,[\s\S]*profile\.restrictedIngredients[\s\S]*\);/,
  'profile name 更新に失敗した場合は制限食材の置換へ進まず、catch で同期失敗として扱ってください。',
);

const previousSaveFlow = async ({ updateProfile, replaceRestrictedIngredients }) => {
  await updateProfile();
  await replaceRestrictedIngredients();
  return 'continued';
};

const fixedSaveFlow = async ({ updateProfile, replaceRestrictedIngredients }) => {
  const { error: profileUpdateError } = await updateProfile();
  if (profileUpdateError) throw profileUpdateError;
  await replaceRestrictedIngredients();
  return 'continued';
};

let replaceCalls = 0;
const updateFailure = { message: 'RLS rejected profile update' };

assert.equal(
  await previousSaveFlow({
    updateProfile: async () => ({ error: updateFailure }),
    replaceRestrictedIngredients: async () => {
      replaceCalls += 1;
    },
  }),
  'continued',
  '再現: 旧実装は profile update の error を無視して制限食材置換へ進みます。',
);
assert.equal(replaceCalls, 1, '再現: 旧実装では profile update 失敗後も制限食材置換が呼ばれます。');

replaceCalls = 0;
await assert.rejects(
  fixedSaveFlow({
    updateProfile: async () => ({ error: updateFailure }),
    replaceRestrictedIngredients: async () => {
      replaceCalls += 1;
    },
  }),
  updateFailure,
  '修正: profile update 失敗は throw されます。',
);
assert.equal(replaceCalls, 0, '修正: profile update 失敗時は制限食材置換へ進みません。');

console.log('profile-update-error-handling regression checks passed');
