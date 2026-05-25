import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const pageSource = readFileSync('src/app/page.tsx', 'utf8');

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
assert.match(routeSource, /await\s+resolveRestrictedIngredients\(supabase,\s*requestedRestrictedIngredients\);/);
assert.match(
  routeSource,
  /await\s+replaceRestrictedIngredients\(\s*supabase,\s*user\.id,\s*resolvedRestrictedIngredients,\s*requestedRestrictionReasons,\s*\);/,
);

assert.match(
  routeSource,
  /if\s*\(preferencesError\)\s*throw\s+preferencesError;[\s\S]*await\s+replaceRestrictedIngredients/,
  'preferences 更新に失敗した場合は database 成功レスポンス扱いにせず、制限食材同期へ進まないでください。',
);

assert.match(
  pageSource,
  /class\s+ProfileSaveValidationError\s+extends\s+Error[\s\S]*unknownCodes/,
  'profile保存の4xx validation errorは通常の一時的なDB失敗と区別してください。',
);
assert.match(
  pageSource,
  /response\.status\s*>=\s*400\s*&&\s*response\.status\s*<\s*500[\s\S]*Array\.isArray\(body\?\.unknownCodes\)[\s\S]*throw\s+new\s+ProfileSaveValidationError\(body\.unknownCodes\)/,
  'unknownCodes付き4xxはProfileSaveValidationErrorとして扱ってください。',
);
assert.match(
  pageSource,
  /dbErr\s+instanceof\s+ProfileSaveValidationError[\s\S]*setCurrentView\('profile'\)[\s\S]*return;/,
  'unknownCodes付き4xxでは通常localStorage fallbackへ進まず、プロフィール編集状態へ戻してください。',
);


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
