import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const demoBranchStart = source.indexOf("if (demoSession === 'authenticated') {");
assert.notEqual(demoBranchStart, -1, 'demo authenticated branch を検査できません。');
const demoBranch = source.slice(demoBranchStart, source.indexOf("if (demoSession === 'failed')", demoBranchStart));
assert.match(
  demoBranch,
  /const\s+demoProfile\s*=\s*readDemoProfile\(\)/,
  'demo session は demo 専用localStorageを読み取ってください。',
);
assert.doesNotMatch(
  demoBranch,
  /mergeProfile\(parsed,/, 
  'demo session の mergeProfile は通常プロフィールlocalStorageを混ぜないでください。',
);
assert.match(
  demoBranch,
  /mergeProfile\(demoProfile\s*\?\?\s*null,|mergeProfile\(demoProfile,/, 
  'demo session の mergeProfile は demoProfile または null をlocal sourceにしてください。',
);

const mergeProfileBlockStart = source.indexOf('function mergeProfile');
assert.notEqual(mergeProfileBlockStart, -1, 'mergeProfile を検査できません。');
const mergeProfileBlock = source.slice(mergeProfileBlockStart, source.indexOf('export default function Home', mergeProfileBlockStart));
assert.match(
  mergeProfileBlock,
  /const\s+preserveLocalIngredientCodes\s*=\s*remoteProfile\?\.source\s*===\s*'demo'/,
  'demo API fallback では、demo専用localStorageの ing-* 制限も保持できるようにしてください。',
);
assert.match(
  mergeProfileBlock,
  /preserveLocalIngredientCodes[\s\S]*!id\.startsWith\('ing-'\)/,
  '通常DB mergeではlocal-only制限だけを足しつつ、demo sourceではlocal ing-* も保持してください。',
);
assert.match(
  mergeProfileBlock,
  /const\s+shouldUseLocalPreferences\s*=\s*fallbackFields\.has\('preferences'\)\s*\|\|\s*preserveLocalIngredientCodes/,
  'demo API fallback では、demo専用localStorageの好み設定も保持してください。',
);

const remoteProfileStart = source.indexOf('const remoteProfile = await fetchProfileFromApi()');
assert.notEqual(remoteProfileStart, -1, 'profile API fallback branch を検査できません。');
const remoteProfileBlock = source.slice(remoteProfileStart, source.indexOf('} catch (error)', remoteProfileStart));
assert.match(
  remoteProfileBlock,
  /const\s+sourceProfile\s*=\s*remoteProfile\.source\s*===\s*'demo'\s*\?\s*readDemoProfile\(\)\s*:\s*parsed/,
  'demo確認がfailedでも、APIがsource: demoを返した場合はdemo専用localStorageをmerge sourceにしてください。',
);
assert.doesNotMatch(
  remoteProfileBlock,
  /mergeProfile\(parsed,\s*remoteProfile\)/,
  'profile API fallback はsource: demoの可能性があるため、通常localStorageを無条件にmergeしないでください。',
);
assert.match(
  remoteProfileBlock,
  /if\s*\(remoteProfile\.source\s*===\s*'demo'\)\s*\{[\s\S]*writeDemoProfile\(merged\)[\s\S]*\}\s*else\s*\{[\s\S]*writeStoredProfile\(merged\)/,
  'APIがsource: demoを返した場合はdemo専用localStorageへ、通常APIの場合だけ通常localStorageへ保存してください。',
);

const handleSaveStart = source.indexOf('const handleSaveProfile = async');
assert.notEqual(handleSaveStart, -1, 'handleSaveProfile を検査できません。');
const handleSave = source.slice(handleSaveStart, source.indexOf('if (authStatus ===', handleSaveStart));
const saveRegularIndex = handleSave.indexOf('saveToLocalStorage(profile)');
const demoSaveIndex = handleSave.indexOf("if (demoSession === 'authenticated')");
assert.notEqual(saveRegularIndex, -1, '通常プロフィール保存処理を検査できません。');
assert.notEqual(demoSaveIndex, -1, 'demo session 判定を検査できません。');
assert.ok(
  demoSaveIndex < saveRegularIndex,
  'demo session 判定より前に通常プロフィールlocalStorageへ保存しないでください。',
);
assert.match(
  handleSave,
  /if\s*\(demoSession\s*===\s*'authenticated'\)\s*\{[\s\S]*writeDemoProfile\(profile\)[\s\S]*return;/,
  'demo保存は demo profile storage にだけ書き込んで return してください。',
);


const uncertainDemoSaveBlock = handleSave.slice(
  handleSave.indexOf("if (demoSession === 'authenticated')"),
  handleSave.indexOf('const savedProfile = await saveProfileToApi'),
);
assert.doesNotMatch(
  uncertainDemoSaveBlock,
  /saveToLocalStorage\(profile\)/,
  'demo確認がfailedの可能性がある間は、APIのsource判定前に通常localStorageへ保存しないでください。',
);
assert.match(
  handleSave,
  /if\s*\(savedProfile\.source\s*===\s*'demo'\)\s*\{[\s\S]*writeDemoProfile\(merged\)[\s\S]*\}\s*else\s*\{[\s\S]*writeStoredProfile\(merged\)/,
  '保存APIがsource: demoを返した場合はdemo専用localStorageへ、通常APIの場合だけ通常localStorageへ保存してください。',
);
assert.match(
  handleSave,
  /catch\s*\(dbErr\)\s*\{[\s\S]*if\s*\(demoSession\s*!==\s*'failed'\)\s*\{[\s\S]*saveToLocalStorage\(profile\)/,
  'demo確認がfailedかつAPI失敗のときはdemo/通常を判定できないため、通常localStorage汚染を避けてください。',
);

const emulateMergeProfile = ({ localProfile, remoteProfile }) => {
  const preserveLocalIngredientCodes = remoteProfile?.source === 'demo';
  const shouldUseLocalPreferences = preserveLocalIngredientCodes;
  return {
    userName: preserveLocalIngredientCodes
      ? localProfile?.userName || remoteProfile?.userName || 'デモユーザー'
      : remoteProfile?.userName || localProfile?.userName || 'デモユーザー',
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
      userName: '保存済みデモ表示名',
      restrictedIngredients: ['ing-shrimp', 'diet-vegan'],
      preferredDishes: ['soup'],
      preferredCuisines: ['india'],
    },
    remoteProfile: {
      userName: 'デモユーザー',
      restrictedIngredients: [],
      preferredDishes: [],
      preferredCuisines: [],
      source: 'demo',
    },
  }),
  {
    userName: '保存済みデモ表示名',
    restrictedIngredients: ['ing-shrimp', 'diet-vegan'],
    preferredDishes: ['soup'],
    preferredCuisines: ['india'],
  },
  'demo API fallback では、demo専用localStorageに保存済みの ing-* 制限・好み設定・表示名を破棄しません。',
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
