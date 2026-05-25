import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(
  routeSource,
  /const\s+\{\s*error:\s*profileError\s*\}\s*=\s*await\s+supabase[\s\S]*\.from\('profiles'\)[\s\S]*\.upsert\(/,
  'profiles upsert の戻り値から profileError を取り出してください。',
);
assert.match(
  routeSource,
  /if\s*\(profileError\)\s*throw\s+profileError;[\s\S]*const\s+\{\s*error:\s*preferencesError\s*\}/,
  'profile name 更新に失敗した場合は後続の好み/制限食材保存へ進まないでください。',
);
assert.match(routeSource, /await\s+replaceRestrictedIngredients\(supabase,\s*user\.id,\s*requestedRestrictedIngredients\);/);

const fixedSaveFlow = async ({ updateProfile, replaceRestrictedIngredients }) => {
  const { error: profileError } = await updateProfile();
  if (profileError) throw profileError;
  await replaceRestrictedIngredients();
  return 'continued';
};

let replaceCalls = 0;
const updateFailure = { message: 'RLS rejected profile update' };
await assert.rejects(
  fixedSaveFlow({
    updateProfile: async () => ({ error: updateFailure }),
    replaceRestrictedIngredients: async () => {
      replaceCalls += 1;
    },
  }),
  updateFailure,
);
assert.equal(replaceCalls, 0);

console.log('profile-update-error-handling regression checks passed');
