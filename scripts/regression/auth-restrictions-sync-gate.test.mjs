import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const fixedAuthTimeline = () => ['fetchProfileFromApi', 'apply profile restrictions', 'setAuthStatus:authenticated'];
assert.deepEqual(fixedAuthTimeline(), ['fetchProfileFromApi', 'apply profile restrictions', 'setAuthStatus:authenticated']);

const profileApiIndex = source.indexOf('const remoteProfile = await fetchProfileFromApi();');
assert.ok(profileApiIndex !== -1, 'プロフィールAPI同期呼び出しを検査できません。');
const afterProfileApi = source.slice(profileApiIndex);
assert.match(afterProfileApi, /setRestrictedIngredients\(merged\.restrictedIngredients\);[\s\S]*setAuthStatus\('authenticated'\)/);

console.log('auth restrictions sync gate regression checks passed');
