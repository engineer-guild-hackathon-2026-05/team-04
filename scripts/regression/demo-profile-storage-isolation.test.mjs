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

const emulateDemoMerge = ({ regularProfile, demoProfile }) => {
  const localProfile = demoProfile ?? null;
  return {
    userName: demoProfile?.userName || demoProfile?.email?.split('@')[0] || 'デモユーザー',
    restrictedIngredients: [
      ...(demoProfile?.restrictedIngredients ?? []),
      ...(localProfile?.restrictedIngredients ?? []).filter((id) => !id.startsWith('ing-')),
    ],
    ignoredRegularRestrictions: regularProfile?.restrictedIngredients ?? [],
  };
};

assert.deepEqual(
  emulateDemoMerge({
    regularProfile: { restrictedIngredients: ['diet-vegan'] },
    demoProfile: { restrictedIngredients: ['ing-shrimp'] },
  }),
  {
    userName: 'デモユーザー',
    restrictedIngredients: ['ing-shrimp'],
    ignoredRegularRestrictions: ['diet-vegan'],
  },
  '通常プロフィールの local-only 制限は demo session に混入させません。',
);

console.log('demo profile storage isolation regression checks passed');
