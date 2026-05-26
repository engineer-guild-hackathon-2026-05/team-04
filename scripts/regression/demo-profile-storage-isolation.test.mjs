import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');
const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const keysSource = readFileSync('src/lib/demoSessionKeys.ts', 'utf8');

assert.match(keysSource, /DEMO_SESSION_STORAGE_KEY\s*=\s*'globalbites_demo_session_id'/, 'demo localStorageにはsession idだけを保存してください。');
assert.match(keysSource, /LEGACY_DEMO_PROFILE_STORAGE_KEY\s*=\s*'globalbites_demo_profile'/, '旧demo profile keyは明示的に清掃できるようにしてください。');
assert.match(loginSource, /JSON\.stringify\(\{ sessionId: existingSessionId \|\| undefined \}\)/, 'one-click login は既存session idをDB session復元ヒントとしてだけ送ってください。');

const demoBranchStart = source.indexOf("if (demoSession.status === 'authenticated') {");
assert.notEqual(demoBranchStart, -1, 'demo authenticated branch を検査できません。');
const demoBranch = source.slice(demoBranchStart, source.indexOf("if (demoSession.status === 'failed')", demoBranchStart));
assert.match(
  demoBranch,
  /const\s+remoteProfile\s*=\s*await fetchProfileFromApi\(\)/,
  'demo session は localStorage profile ではなくDB-backed profile APIを読み取ってください。',
);
assert.doesNotMatch(
  demoBranch,
  /mergeProfile\(parsed,/,
  'demo session の mergeProfile は通常プロフィールlocalStorageを混ぜないでください。',
);
assert.match(
  demoBranch,
  /mergeProfile\(null, remoteProfile\)/,
  'demo session の mergeProfile はDB profileだけをsourceにしてください。',
);

const mergeProfileBlockStart = source.indexOf('function mergeProfile');
assert.notEqual(mergeProfileBlockStart, -1, 'mergeProfile を検査できません。');
const mergeProfileBlock = source.slice(mergeProfileBlockStart, source.indexOf('export default function Home', mergeProfileBlockStart));
assert.match(
  mergeProfileBlock,
  /const\s+preserveLocalIngredientCodes\s*=\s*false/,
  'DB-backed demoでは localStorage の ing-* 制限を保存済みDB profileへ上書きしないでください。',
);
assert.match(
  mergeProfileBlock,
  /\.filter\([\s\S]*!id\.startsWith\('ing-'\)/,
  '通常DB mergeではlocal-only制限だけを追加し、DB由来の ing-* を優先してください。',
);
assert.match(
  mergeProfileBlock,
  /const\s+shouldUseLocalPreferences\s*=\s*fallbackFields\.has\('preferences'\)/,
  'demo sourceでも好み設定はDB profile APIの値を正としてください。',
);

const remoteProfileStart = source.indexOf('const remoteProfile = await fetchProfileFromApi()', source.indexOf("if (demoSession.status === 'failed')"));
assert.notEqual(remoteProfileStart, -1, 'profile API fallback branch を検査できません。');
const remoteProfileBlock = source.slice(remoteProfileStart, source.indexOf('setAuthStatus(\'authenticated\')', remoteProfileStart));
assert.match(
  remoteProfileBlock,
  /const\s+merged\s*=\s*mergeProfile\(parsed, remoteProfile\)/,
  '非demo fallback は通常localStorageとDB profileをmergeしてください。',
);
assert.match(
  remoteProfileBlock,
  /writeStoredProfile\(merged\)/,
  '通常API profileだけを通常localStorageへ保存してください。',
);

const handleSaveStart = source.indexOf('const handleSaveProfile = async');
assert.notEqual(handleSaveStart, -1, 'handleSaveProfile を検査できません。');
const handleSave = source.slice(handleSaveStart, source.indexOf('if (authStatus ===', handleSaveStart));
assert.doesNotMatch(
  handleSave,
  /if\s*\(demoSession\.status\s*===\s*'authenticated'\)\s*\{[\s\S]*writeDemoProfile/,
  'demo保存は旧demo profile localStorageに書かずDB profile APIへ保存してください。',
);
assert.match(
  handleSave,
  /const\s+savedProfile\s*=\s*await saveProfileToApi\(profile\)/,
  'demo保存も通常保存も同じ profile API を通してください。',
);
assert.match(
  handleSave,
  /if\s*\(savedProfile\.source !== 'demo'\) \{[\s\S]*writeStoredProfile\(merged\)[\s\S]*\}/,
  '保存APIがsource: demoを返した場合は通常localStorageへ保存しないでください。',
);
assert.match(
  handleSave,
  /catch\s*\(dbErr\) \{[\s\S]*if\s*\(demoSession\.status !== 'failed'\) \{[\s\S]*saveToLocalStorage\(profile\)/,
  'demo確認がfailedかつAPI失敗のときはdemo/通常を判定できないため、通常localStorage汚染を避けてください。',
);

assert.match(source, /localStorage\.removeItem\(DEMO_SESSION_STORAGE_KEY\)/, 'signout は復元ヒントのdemo session idを消してください。');
assert.match(source, /localStorage\.removeItem\(LEGACY_DEMO_PROFILE_STORAGE_KEY\)/, 'signout は旧demo profile localStorageも消してください。');
assert.doesNotMatch(source, /function\s+writeDemoProfile\(/, 'DB-backed demoでは旧demo profile writerを再導入しないでください。');

const emulateMergeProfile = ({ localProfile, remoteProfile }) => {
  const preserveLocalIngredientCodes = false;
  const fallbackFields = new Set(remoteProfile?.fallbackFields ?? []);
  const shouldUseLocalPreferences = fallbackFields.has('preferences');
  return {
    userName: remoteProfile?.userName || localProfile?.userName || 'デモユーザー',
    restrictedIngredients: Array.from(new Set([
      ...(remoteProfile?.restrictedIngredients ?? []),
      ...(localProfile?.restrictedIngredients ?? []).filter(
        (id) => preserveLocalIngredientCodes || !id.startsWith('ing-'),
      ),
    ])),
    preferredDishes: shouldUseLocalPreferences
      ? localProfile?.preferredDishes ?? []
      : remoteProfile?.preferredDishes ?? localProfile?.preferredDishes ?? [],
    preferredCuisines: shouldUseLocalPreferences
      ? localProfile?.preferredCuisines ?? []
      : remoteProfile?.preferredCuisines ?? localProfile?.preferredCuisines ?? [],
  };
};

assert.deepEqual(
  emulateMergeProfile({
    localProfile: {
      userName: '保存済みローカル表示名',
      restrictedIngredients: ['ing-shrimp', 'diet-vegan'],
      preferredDishes: ['soup'],
      preferredCuisines: ['india'],
    },
    remoteProfile: {
      userName: 'demo-user-001',
      restrictedIngredients: ['ing-egg'],
      preferredDishes: ['taco'],
      preferredCuisines: ['mexico'],
      source: 'demo',
    },
  }),
  {
    userName: 'demo-user-001',
    restrictedIngredients: ['ing-egg', 'diet-vegan'],
    preferredDishes: ['taco'],
    preferredCuisines: ['mexico'],
  },
  'DB-backed demoではDB profileを正として使い、通常localStorageの ing-* や好み設定で上書きしません。',
);

assert.deepEqual(
  emulateMergeProfile({
    localProfile: { restrictedIngredients: ['ing-shrimp', 'diet-vegan'] },
    remoteProfile: { userName: 'DBユーザー', restrictedIngredients: ['ing-egg'], source: 'database' },
  }),
  {
    userName: 'DBユーザー',
    restrictedIngredients: ['ing-egg', 'diet-vegan'],
    preferredDishes: [],
    preferredCuisines: [],
  },
  '通常DB profile mergeではDB由来の ing-* を優先し、local-only制限だけを追加します。',
);

console.log('demo profile storage isolation regression checks passed');
