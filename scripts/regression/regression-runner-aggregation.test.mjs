import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const runnerSource = readFileSync('scripts/run-regression-tests.mjs', 'utf8');

assert.equal(
  packageJson.scripts.test,
  'node scripts/run-regression-tests.mjs',
  'npm test は && 連結ではなく、集約ランナーを起動してください。',
);

assert.doesNotMatch(
  packageJson.scripts.test,
  /&&/,
  'npm test で個別テストを && 連結すると、先頭失敗時に後続テストがスキップされます。',
);

assert.match(
  runnerSource,
  /readdirSync\(regressionDir\)[\s\S]*?endsWith\('\.test\.mjs'\)/,
  '回帰テストランナーは scripts/regression 配下の .test.mjs を自動収集してください。',
);

assert.match(
  runnerSource,
  /const failures = \[\];[\s\S]*?for \(const file of testFiles\)[\s\S]*?failures\.push[\s\S]*?if \(failures\.length > 0\)/,
  '回帰テストランナーは途中で即終了せず、失敗を集約して最後に exit してください。',
);

console.log('regression runner aggregation checks passed');
