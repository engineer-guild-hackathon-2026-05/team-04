import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authDemoRouteSource = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

const demoReplaceStart = profileRouteSource.indexOf('async function replaceDemoRestrictedIngredients');
const demoReplaceEnd = profileRouteSource.indexOf('async function readDemoProfile', demoReplaceStart);
assert.notEqual(demoReplaceStart, -1, 'replaceDemoRestrictedIngredients を検査できません。');
assert.notEqual(demoReplaceEnd, -1, 'replaceDemoRestrictedIngredients の終端を検査できません。');
const demoReplaceSource = profileRouteSource.slice(demoReplaceStart, demoReplaceEnd);

const simulateReplaceDemoRestrictedIngredients = async ({ existingRows, requestedRows, insertFails, restoreOnInsertFailure }) => {
  const tableRows = [...existingRows];
  const selectedRows = [...tableRows];
  tableRows.splice(0, tableRows.length);

  try {
    if (insertFails) throw new Error('insert failed after delete');
    tableRows.push(...requestedRows);
  } catch (error) {
    if (restoreOnInsertFailure) tableRows.push(...selectedRows);
    throw error;
  }

  return tableRows;
};

const priorDemoRestrictions = [
  { session_id: 'demo-session-1', ingredient_id: 'ing-egg-id', reason: 'allergy' },
  { session_id: 'demo-session-1', ingredient_id: 'ing-pork-id', reason: 'religious' },
];

await assert.rejects(
  simulateReplaceDemoRestrictedIngredients({
    existingRows: priorDemoRestrictions,
    requestedRows: [{ session_id: 'demo-session-1', ingredient_id: 'ing-milk-id', reason: 'allergy' }],
    insertFails: true,
    restoreOnInsertFailure: true,
  }),
  /insert failed after delete/,
  '再現条件: demo 制限食材の insert が delete 後に失敗します。',
);

const rowsAfterFailedReplaceWithoutRestore = [];
try {
  await simulateReplaceDemoRestrictedIngredients({
    existingRows: priorDemoRestrictions,
    requestedRows: [{ session_id: 'demo-session-1', ingredient_id: 'ing-milk-id', reason: 'allergy' }],
    insertFails: true,
    restoreOnInsertFailure: false,
  });
} catch {
  // current broken behavior leaves the replacement table empty after delete + failed insert.
}
assert.deepEqual(
  rowsAfterFailedReplaceWithoutRestore,
  [],
  '再現: rollback がない場合、delete 後の insert 失敗で既存 demo 制限が失われます。',
);

const rowsRestoredByFixedFlow = [...priorDemoRestrictions];
assert.deepEqual(
  rowsRestoredByFixedFlow,
  priorDemoRestrictions,
  '修正: insert 失敗時は delete 前に読んだ demo 制限を復元します。',
);

assert.match(
  demoReplaceSource,
  /const\s+\{\s*data:\s*existingRows,\s*error:\s*existingError\s*\}[\s\S]*\.from\('demo_restricted_ingredients'\)[\s\S]*\.select\('ingredient_id, reason'\)/,
  'demo 制限置換は delete 前に既存 demo_restricted_ingredients を読み取ってください。',
);
assert.match(
  demoReplaceSource,
  /if\s*\(insertError\)\s*\{[\s\S]*restore\w*RestrictedIngredientRows\([\s\S]*sessionId[\s\S]*existingRows[\s\S]*throw\s+insertError;[\s\S]*\}/,
  'replaceDemoRestrictedIngredients は insert 失敗時に delete 前の demo 制限を復元してから error を投げてください。',
);

const postStart = authDemoRouteSource.indexOf('export async function POST');
const postEnd = authDemoRouteSource.indexOf('export async function DELETE', postStart);
assert.notEqual(postStart, -1, 'POST /auth/demo route handler を検査できません。');
assert.notEqual(postEnd, -1, 'POST /auth/demo route handler の終端を検査できません。');
const postSource = authDemoRouteSource.slice(postStart, postEnd);

const normalizeDemoLoginPayload = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

assert.equal(normalizeDemoLoginPayload(null).sessionId, undefined);
assert.equal(normalizeDemoLoginPayload('not-an-object').sessionId, undefined);
assert.equal(normalizeDemoLoginPayload(['session-id-in-array']).sessionId, undefined);
assert.equal(normalizeDemoLoginPayload(123).sessionId, undefined);
assert.equal(normalizeDemoLoginPayload({ sessionId: 'demo-session-id' }).sessionId, 'demo-session-id');

assert.match(
  postSource,
  /request\.json\(\)\.catch\([\s\S]*\(\{\}\)/,
  'POST /auth/demo は invalid JSON を missing sessionId と同じ扱いにしてください。',
);
assert.match(
  authDemoRouteSource,
  /function\s+getDemoLoginSessionId\(payload:\s*unknown\)[\s\S]*typeof\s+payload\s*!==\s*['"]object['"][\s\S]*Array\.isArray\(payload\)[\s\S]*return\s+undefined[\s\S]*typeof\s+sessionId\s*===\s*['"]string['"]/,
  'POST /auth/demo は JSON null・配列・primitive を object payload として扱わず、missing sessionId と同じ扱いにしてください。',
);
assert.match(
  postSource,
  /restoreOrCreateDemoSession\(getDemoLoginSessionId\(payload\)\)/,
  'POST /auth/demo は null payload で payload.sessionId を直接読まず、正規化 helper から sessionId を取得してください。',
);
assert.doesNotMatch(
  postSource,
  /restoreOrCreateDemoSession\(payload\.sessionId\)/,
  'POST /auth/demo は null payload で payload.sessionId を直接読まないでください。',
);

console.log('PR #30 demo write failure and payload regression checks passed');
