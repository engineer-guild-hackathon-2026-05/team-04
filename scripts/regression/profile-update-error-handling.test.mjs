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

const putStart = routeSource.indexOf('export async function PUT');
const replaceIndex = routeSource.indexOf('await replaceRestrictedIngredients', putStart);
const preferencesUpsertIndex = routeSource.indexOf(".from('user_preferences')", putStart);
const preferencesErrorIndex = routeSource.indexOf('if (preferencesError) throw preferencesError;', putStart);
assert.ok(
  putStart !== -1 && replaceIndex !== -1 && preferencesUpsertIndex !== -1 && preferencesErrorIndex !== -1
    && replaceIndex < preferencesUpsertIndex && preferencesUpsertIndex < preferencesErrorIndex,
  'user_preferences は初回設定完了マーカーを兼ねるため、制限食材同期の成功後に保存し、失敗時は database 成功レスポンス扱いにしないでください。',
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
  /dbErr\s+instanceof\s+ProfileSaveValidationError[\s\S]*setCurrentView\('profile'\)[\s\S]*throw new Error/,
  'unknownCodes付き4xxでは通常localStorage fallbackや成功トーストへ進まず、プロフィール編集状態へ戻して失敗を返してください。',
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
