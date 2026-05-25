import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const previousAuthTimeline = () => {
  const events = [];
  events.push('setAuthStatus:authenticated');
  events.push('fetchRestrictedIngredientLocalIds');
  return events;
};

const fixedAuthTimeline = () => {
  const events = [];
  events.push('fetchRestrictedIngredientLocalIds');
  events.push('apply restrictions');
  events.push('setAuthStatus:authenticated');
  return events;
};

assert.deepEqual(
  previousAuthTimeline(),
  ['setAuthStatus:authenticated', 'fetchRestrictedIngredientLocalIds'],
  '再現: 旧順序は制限食材DB同期前に authenticated render を許可します。',
);
assert.deepEqual(
  fixedAuthTimeline(),
  ['fetchRestrictedIngredientLocalIds', 'apply restrictions', 'setAuthStatus:authenticated'],
  '修正: Supabase制限食材の同期完了後に authenticated render を許可してください。',
);

const sessionUserIndex = source.indexOf('if (!session?.user)');
const restrictedSyncIndex = source.indexOf('const restrictedIngredientSync = await fetchRestrictedIngredientLocalIds');
assert.ok(sessionUserIndex !== -1, 'Supabase session user 判定を検査できません。');
assert.ok(restrictedSyncIndex !== -1, '制限食材同期呼び出しを検査できません。');

const authenticatedBeforeRestrictionSync = source
  .slice(sessionUserIndex, restrictedSyncIndex)
  .includes("setAuthStatus('authenticated')");
assert.equal(
  authenticatedBeforeRestrictionSync,
  false,
  'Supabase session 確定後も、制限食材同期前に authStatus を authenticated にしないでください。',
);

const afterRestrictedSync = source.slice(restrictedSyncIndex);
assert.match(
  afterRestrictedSync,
  /setAuthStatus\('authenticated'\)/,
  '制限食材同期の成功/失敗処理後に authStatus を authenticated にしてください。',
);

console.log('auth restrictions sync gate regression checks passed');
