import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const landingSource = readFileSync('src/app/components/LandingView.tsx', 'utf8');
const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const globalsSource = readFileSync('src/app/globals.css', 'utf8');

assert.match(
  landingSource,
  /import \{ MOCK_RECIPES, type Recipe \} from '@\/lib\/mockData';/,
  'LP は DB/状態のレシピが未取得でも MOCK_RECIPES を使ってアプリプレビューを表示してください。',
);
assert.match(
  landingSource,
  /type LandingViewProps = \{\s*previewRecipes\?: Recipe\[];\s*\};/,
  'LandingView は空 interface ではなく、previewRecipes の契約を明示してください。',
);
assert.doesNotMatch(
  landingSource,
  /interface\s+LandingViewProps\s*\{\s*\}/,
  'c105ad3 の空 LandingViewProps interface を再導入しないでください。',
);
assert.doesNotMatch(
  landingSource,
  /function\s+LandingView\(\{\s*\}\s*:\s*LandingViewProps\)/,
  'c105ad3 の空 props destructuring を再導入しないでください。',
);
assert.match(
  landingSource,
  /export default function LandingView\(\{ previewRecipes = MOCK_RECIPES \}: LandingViewProps\)/,
  'LandingView は previewRecipes を受け取り、未指定時は MOCK_RECIPES へ fallback してください。',
);
assert.match(
  landingSource,
  /const visiblePreviewRecipes = previewRecipes\.slice\(0, 3\);/,
  'LP プレビューは最大3件に制限して表示してください。',
);
assert.match(
  landingSource,
  /<section className="landing-preview-section" aria-label="アプリプレビュー">[\s\S]*visiblePreviewRecipes\.map\(\(recipe\) =>[\s\S]*landing-preview-card/s,
  'LP からレシピカード型のアプリプレビューを削除しないでください。',
);
assert.match(
  landingSource,
  /<Image[\s\S]*src="\/logo-cropped\.png"[\s\S]*alt="Edible"/,
  'ランディングのロゴは Edible の cropped logo asset を使ってください。',
);
assert.doesNotMatch(
  landingSource,
  /GlobalBites/,
  'ランディングのユーザー向け文言に旧サービス名 GlobalBites を戻さないでください。',
);

const userVisibleRoots = ['src/app', 'public', 'docs', 'README.md', '.env.local.example'];
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);

function collectFiles(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];
  return readdirSync(path).flatMap((name) => collectFiles(join(path, name)));
}

const legacyBrandHits = userVisibleRoots
  .flatMap(collectFiles)
  .filter((file) => !binaryExtensions.has(file.slice(file.lastIndexOf('.')).toLowerCase()))
  .filter((file) => readFileSync(file, 'utf8').includes('GlobalBites'));

assert.deepEqual(
  legacyBrandHits,
  [],
  'ユーザー向けソースに旧サービス名 GlobalBites を戻さないでください。',
);

assert.match(
  pageSource,
  /<LandingView previewRecipes=\{recipes\.length > 0 \? recipes\.slice\(0, 3\) : undefined\} \/>/,
  'Home は取得済み recipes を LandingView の previewRecipes として渡し、未取得時だけ fallback してください。',
);
assert.match(
  globalsSource,
  /\.landing-preview-grid\s*\{[\s\S]*grid-template-columns: repeat\(3, 1fr\);[\s\S]*\}/,
  'LP recipe preview の 3カラム grid スタイルを維持してください。',
);
const previewCardBlockStart = globalsSource.indexOf('.landing-preview-card {');
assert.notEqual(previewCardBlockStart, -1, 'LP preview card のCSS blockを検査できません。');
const previewCardBlock = globalsSource.slice(previewCardBlockStart, globalsSource.indexOf('}', previewCardBlockStart));
assert.doesNotMatch(
  previewCardBlock,
  /cursor: pointer;/,
  'クリック不可の LP preview card に pointer cursor を付けないでください。',
);

console.log('landing Edible preview contract regression checks passed');
