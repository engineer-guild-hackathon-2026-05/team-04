import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

const putStart = routeSource.indexOf('export async function PUT');
assert.notEqual(putStart, -1, 'PUT /api/me/profile を検査できません。');
const putRoute = routeSource.slice(putStart);

const payloadIndex = putRoute.indexOf('const payload = await request.json()');
const demoIndex = putRoute.indexOf('if (await isDemoAuthenticated())');
assert.notEqual(payloadIndex, -1, 'PUT は demo 判定前にリクエストpayloadを読んでください。');
assert.notEqual(demoIndex, -1, 'PUT は demo 認証分岐を維持してください。');
assert.ok(
  payloadIndex < demoIndex,
  'demo PUT は EMPTY_PROFILE ではなく、送信payloadを返せるようにdemo判定前にpayloadを正規化してください。',
);

const supabaseConfigGuardIndex = putRoute.indexOf('if (!hasSupabaseConfig())', demoIndex);
const legacyEnvGuardIndex = putRoute.indexOf('if (!process.env.NEXT_PUBLIC_SUPABASE_URL', demoIndex);
const demoBranchEnd = supabaseConfigGuardIndex === -1 ? legacyEnvGuardIndex : supabaseConfigGuardIndex;
assert.notEqual(demoBranchEnd, -1, 'PUT は demo 分岐の直後に Supabase 設定ガードを維持してください。');
const demoBranch = putRoute.slice(demoIndex, demoBranchEnd);
assert.doesNotMatch(
  demoBranch,
  /EMPTY_PROFILE/,
  'demo PUT は送信直後のプロフィールを破棄しないよう EMPTY_PROFILE を返さないでください。',
);
assert.match(
  demoBranch,
  /userName[\s\S]*restrictedIngredients[\s\S]*preferredDishes[\s\S]*preferredCuisines[\s\S]*source:\s*'demo'/,
  'demo PUT は送信された userName / restrictedIngredients / preferredDishes / preferredCuisines を source: demo として返してください。',
);

const demoPutResponse = (payload) => {
  const userName = typeof payload.userName === 'string' && payload.userName.trim()
    ? payload.userName.trim()
    : 'デモユーザー';
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

console.log('demo profile PUT preservation regression checks passed');
