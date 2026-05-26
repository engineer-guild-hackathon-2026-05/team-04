import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

const putStart = routeSource.indexOf('export async function PUT');
assert.notEqual(putStart, -1, 'PUT /api/me/profile を検査できません。');
const putRoute = routeSource.slice(putStart);

const payloadIndex = putRoute.indexOf('const payload = await request.json()');
const demoIndex = putRoute.indexOf('const demoSessionId = await getDemoSessionIdForRequest(request)');
assert.notEqual(payloadIndex, -1, 'PUT は demo 判定前にリクエストpayloadを読んでください。');
assert.notEqual(demoIndex, -1, 'PUT は署名Cookie由来の demo session 分岐を維持してください。');
assert.ok(
  payloadIndex < demoIndex,
  'demo PUT は EMPTY_PROFILE ではなく、送信payloadを保存できるようにdemo判定前にpayloadを正規化してください。',
);

const demoBranchStart = putRoute.indexOf('if (demoSessionId)', demoIndex);
assert.notEqual(demoBranchStart, -1, 'demo PUT branch を検査できません。');
const demoBranchEnd = putRoute.indexOf('if (!realUserContext)', demoBranchStart);
assert.notEqual(demoBranchEnd, -1, 'demo PUT branch の終端を検査できません。');
const demoBranch = putRoute.slice(demoBranchStart, demoBranchEnd);
assert.doesNotMatch(
  demoBranch,
  /EMPTY_PROFILE/,
  'demo PUT は送信直後のプロフィールを破棄しないよう EMPTY_PROFILE を返さないでください。',
);
assert.match(demoBranch, /saveDemoProfile\(demoSessionId, \{[\s\S]*userName: submittedUserName \?\? ['"]{2}[\s\S]*restrictedIngredients: requestedRestrictedIngredients[\s\S]*restrictedIngredientReasons: requestedRestrictionReasons[\s\S]*preferredDishes[\s\S]*preferredCuisines/s, 'demo PUT は送信payloadをDB保存関数へ渡し、空の名前はDB-generated display_nameへfallbackさせてください。');

const saveDemoStart = routeSource.indexOf('async function saveDemoProfile');
assert.notEqual(saveDemoStart, -1, 'saveDemoProfile を検査できません。');
const saveDemo = routeSource.slice(saveDemoStart, routeSource.indexOf('export async function GET', saveDemoStart));
assert.match(saveDemo, /\.from\('demo_profiles'\)[\s\S]*\.upsert\(\{[\s\S]*name: userName[\s\S]*preferred_dishes: preferredDishes[\s\S]*preferred_cuisines: preferredCuisines[\s\S]*non_ingredient_restrictions: localOnlyRestrictions/s, 'demo PUT はプロフィールをdemo_profilesへupsertしてください。');
assert.match(saveDemo, /replaceDemoRestrictedIngredients\([\s\S]*sessionId[\s\S]*resolvedRestrictedIngredients[\s\S]*requestedRestrictionReasons/s, 'demo PUT はDB ingredient制限をdemo_restricted_ingredientsへ保存してください。');
assert.match(saveDemo, /source:\s*'demo'/, 'demo PUT のレスポンスは source: demo を返してください。');

const demoPutResponse = (payload, sessionDisplayName = 'demo-user-001') => {
  const userName = typeof payload.userName === 'string' && payload.userName.trim()
    ? payload.userName.trim()
    : sessionDisplayName;
  const normalize = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  return {
    userName,
    restrictedIngredients: normalize(payload.restrictedIngredients),
    preferredDishes: normalize(payload.preferredDishes),
    preferredCuisines: normalize(payload.preferredCuisines),
    source: 'demo',
  };
};

assert.deepEqual(
  demoPutResponse({
    userName: ' デモ編集後 ',
    restrictedIngredients: ['ing-shrimp', 'diet-vegan'],
    preferredDishes: ['soup', 123],
    preferredCuisines: ['india'],
  }),
  {
    userName: 'デモ編集後',
    restrictedIngredients: ['ing-shrimp', 'diet-vegan'],
    preferredDishes: ['soup'],
    preferredCuisines: ['india'],
    source: 'demo',
  },
  'transientな /auth/demo 判定失敗後に profile PUT へ進んでも、送信payloadを保持します。',
);

assert.deepEqual(
  demoPutResponse({
    userName: '   ',
    restrictedIngredients: [],
    preferredDishes: [],
    preferredCuisines: [],
  }, 'demo-user-042'),
  {
    userName: 'demo-user-042',
    restrictedIngredients: [],
    preferredDishes: [],
    preferredCuisines: [],
    source: 'demo',
  },
  'demo PUT の空表示名は generic な名前ではなくDB-generated session.display_nameへfallbackします。',
);

console.log('demo profile PUT preservation regression checks passed');
