import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');

assert.match(
  source,
  /useState\s*(?:<|\()/,
  'RecipeModal は active tab state を useState で管理してください。',
);
assert.match(
  source,
  /['"]basic['"][\s\S]*['"]origin['"][\s\S]*['"]food_culture['"]|['"]origin['"][\s\S]*['"]food_culture['"][\s\S]*['"]basic['"]/,
  'RecipeModal の tab key は basic/origin/food_culture を扱ってください。',
);
for (const label of ['レシピ', '由来', '食文化']) {
  assert.match(source, new RegExp(label), `RecipeModal に ${label} タブラベルを表示してください。`);
}
assert.match(
  source,
  /role=\{?['"]tablist['"]\}?|aria-label=\{?['"][^'"]*タブ[^'"]*['"]\}?/,
  '文化セクション切替は tablist か明確な aria-label を持つコンテナにしてください。',
);
assert.match(
  source,
  /aria-selected=\{[\s\S]*?\}/,
  'tab button には aria-selected を付与してください。',
);
assert.match(
  source,
  /className=\{`modal-bookmark-tab\s+\$\{selected\s*\?\s*['"]active['"]\s*:\s*['"]['"]\}`\}/,
  '選択中の bookmark tab は active class を受け取り、hover と同じ伸びた見た目を維持してください。',
);
assert.match(
  source,
  /aria-controls=\{[\s\S]*?\}|aria-controls=['"][^'"]+['"]/,
  'tab button には aria-controls を付与してください。',
);

assert.match(
  source,
  /onKeyDown=\{[\s\S]*?handleTabKeyDown[\s\S]*?\}|const\s+handleTabKeyDown\s*=/,
  'roving tabIndex を使う tab UI は矢印/Home/End キーで focus と active tab を移動できる handler を持ってください。',
);
for (const key of ['basic', 'origin', 'food_culture']) {
  assert.match(
    source,
    new RegExp(`recipe-modal-tabpanel-${key}`),
    `${key} tab の aria-controls が常に存在する tabpanel id を参照してください。`,
  );
}
assert.match(
  source,
  /hidden=\{[\s\S]*?activeTab\s*!==[\s\S]*?\}/,
  '非active tabpanel は DOM に残したまま hidden で切り替えてください。',
);
assert.match(
  source,
  /className=\"modal-tab-panel-placeholder\"/,
  '非active tabpanel は空の .modal-content として配置せず、placeholder としてレイアウトから除外してください。',
);
assert.doesNotMatch(
  source,
  /key=\{`inactive-panel-[\s\S]*?className=\{`modal-content/,
  '非active tabpanel に .modal-content を付けると hidden が flex 表示に負けて余白を作るため禁止します。',
);
assert.match(
  source,
  /id=\{[\s\S]*?tabpanel[\s\S]*?\}|role=\{?['"]tabpanel['"]\}?/,
  'tab content には tabpanel/id を付与して aria-controls の参照先を用意してください。',
);
assert.match(
  source,
  /onClick=\{\(\)\s*=>\s*handleTabClick\(tab\.key\)\}|setActiveTab\(tab\)/,
  'tab click は選択した tab key を active tab に切り替えてください。',
);
assert.match(
  source,
  /['"]origin['"][\s\S]*['"]food_culture['"]|['"]food_culture['"][\s\S]*['"]origin['"]/,
  '由来/食文化タブの key は click handler に渡せる状態で保持してください。',
);
assert.match(
  source,
  /recipe\.culture_sections[\s\S]*\.find\([\s\S]*section[\s\S]*(?:\.key|section_key)[\s\S]*origin|(?:\.key|section_key)[\s\S]*origin[\s\S]*recipe\.culture_sections/,
  '由来/食文化 tab は recipe.culture_sections から対象 section を検索してください。',
);
assert.match(
  source,
  /この料理の由来記事は現在準備中です。/,
  '由来 tab 欠落時は指定の日本語 準備中 fallback を表示してください。',
);
assert.match(
  source,
  /この料理と食文化の読み物は現在準備中です。/,
  '食文化 tab 欠落時は指定の日本語 準備中 fallback を表示してください。',
);

const tabContainerMatch = source.match(/<[^>]+className=\{?['"][^'"]*modal-bookmark-tabs[^'"]*['"]\}?[\s\S]*?<\/[^>]+>/);
if (tabContainerMatch) {
  assert.doesNotMatch(
    tabContainerMatch[0],
    /onClose\s*\(/,
    'tab click は modal close handler を呼ばず、content だけを切り替えてください。',
  );
}

for (const existingClass of [
  'modal-danger-alert',
  'modal-meta-row',
  'modal-restriction-tags',
  'modal-ingredient-list',
  'modal-steps-list',
]) {
  assert.match(
    source,
    new RegExp(existingClass),
    `レシピ tab では既存の ${existingClass} 表示を維持してください。`,
  );
}

console.log('recipe modal culture tab regression checks passed');
