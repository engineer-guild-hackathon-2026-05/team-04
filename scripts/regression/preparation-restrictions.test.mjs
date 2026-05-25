import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const preparationRules = readFileSync('src/lib/preparationRestrictions.ts', 'utf8');
const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const listView = readFileSync('src/app/components/ListView.tsx', 'utf8');
const recipeModal = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const recipesRoute = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const recipeMapping = readFileSync('src/lib/recipeMapping.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260525150000_add_recipe_ingredient_preparation_tags.sql', 'utf8');
const transpiledPreparationRules = ts.transpileModule(preparationRules, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const preparationModule = { exports: {} };
Function('exports', 'module', 'require', transpiledPreparationRules)(
  preparationModule.exports,
  preparationModule,
  (specifier) => {
    throw new Error(`Unexpected runtime import while evaluating preparation restrictions: ${specifier}`);
  },
);
const { violatesPreparationRestrictions } = preparationModule.exports;

for (const restrictionId of ['prep-raw-seafood', 'prep-raw-fish', 'prep-raw-shellfish']) {
  assert.match(profileView, new RegExp(restrictionId), `${restrictionId} をプロフィール選択肢に表示してください。`);
  assert.match(preparationRules, new RegExp(restrictionId), `${restrictionId} の判定ルールを定義してください。`);
}

assert.match(
  profileView,
  /調理状態で避けたいもの/,
  'プロフィール画面に調理状態ベースの制限セクションを表示してください。',
);
assert.match(
  profileView,
  /id\.startsWith\('prep-'\).*return 'dislike'/s,
  'prep-* はDB材料アレルゲンではなくローカル条件制限として保存してください。',
);
assert.match(
  listView,
  /violatesPreparationRestrictions\(recipe, restrictedIngredients\)/,
  'レシピ一覧は生・半生などの調理条件制限で除外してください。',
);
assert.match(
  recipeModal,
  /getPreparationConflictingIngredients\(recipe, restrictionId\)/,
  'レシピ詳細は調理条件に抵触する材料を表示してください。',
);
assert.match(
  recipesRoute,
  /preparation_tags/,
  '/api/recipes は recipe_ingredients.preparation_tags を取得してください。',
);
assert.match(
  recipeMapping,
  /preparation_tags: row\.preparation_tags \?\? \[\]/,
  'DBの preparation_tags をフロントの RecipeIngredient にマッピングしてください。',
);
assert.match(
  migration,
  /add column if not exists preparation_tags text\[\]/,
  'recipe_ingredients に preparation_tags カラムを追加してください。',
);
assert.match(
  migration,
  /array\['raw', 'fish', 'seafood'\]/,
  '刺身・セビーチェ等の生魚料理を raw/fish/seafood としてバックフィルしてください。',
);
assert.match(
  migration,
  /array\['raw', 'shellfish', 'seafood'\]/,
  '生えび等の将来データを raw/shellfish/seafood として扱えるようにしてください。',
);
const rawFishRecipe = {
  ingredients: [
    { id: 'ing-salmon', name_ja: '刺身用さけ', quantity: '1切れ', is_optional: false, preparation_tags: ['raw', 'fish', 'seafood'] },
  ],
};
const rawShellfishRecipe = {
  ingredients: [
    { id: 'ing-shrimp', name_ja: '生えび', quantity: '2尾', is_optional: false, preparation_tags: ['raw', 'shellfish', 'seafood'] },
  ],
};
const rawGenericSeafoodRecipe = {
  ingredients: [
    { id: 'none-raw-seafood', name_ja: '生魚介', quantity: '適量', is_optional: false, preparation_tags: ['raw', 'seafood'] },
  ],
};
assert.equal(
  violatesPreparationRestrictions(rawShellfishRecipe, ['prep-raw-fish']),
  false,
  'prep-raw-fish は raw/shellfish/seafood の材料を除外しないでください。',
);
assert.equal(
  violatesPreparationRestrictions(rawFishRecipe, ['prep-raw-shellfish']),
  false,
  'prep-raw-shellfish は raw/fish/seafood の材料を除外しないでください。',
);
assert.equal(
  violatesPreparationRestrictions(rawFishRecipe, ['prep-raw-seafood']),
  true,
  'prep-raw-seafood は raw/fish/seafood の材料を除外してください。',
);
assert.equal(
  violatesPreparationRestrictions(rawShellfishRecipe, ['prep-raw-seafood']),
  true,
  'prep-raw-seafood は raw/shellfish/seafood の材料を除外してください。',
);
assert.equal(
  violatesPreparationRestrictions(rawGenericSeafoodRecipe, ['prep-raw-fish']),
  false,
  'fish 専用タグがない raw/seafood だけの材料は prep-raw-fish で除外しないでください。',
);
assert.equal(
  violatesPreparationRestrictions(rawGenericSeafoodRecipe, ['prep-raw-shellfish']),
  false,
  'shellfish 専用タグがない raw/seafood だけの材料は prep-raw-shellfish で除外しないでください。',
);
assert.equal(
  violatesPreparationRestrictions(rawGenericSeafoodRecipe, ['prep-raw-seafood']),
  true,
  'raw/seafood だけの集約タグ材料は prep-raw-seafood で除外してください。',
);
assert.match(
  preparationRules,
  /const hasFishTag = \(tags: Set<string>\) =>\s*tags\.has\(FISH_PREPARATION_TAG\);/,
  'prep-raw-fish は seafood 共通タグではなく fish 専用タグだけで判定してください。',
);
assert.match(
  preparationRules,
  /const hasShellfishTag = \(tags: Set<string>\) =>\s*tags\.has\(SHELLFISH_PREPARATION_TAG\);/,
  'prep-raw-shellfish は seafood 共通タグではなく shellfish 専用タグだけで判定してください。',
);
assert.match(
  preparationRules,
  /hasRawTag\(tags\) && \(\s*tags\.has\(FISH_PREPARATION_TAG\) \|\|\s*tags\.has\(SHELLFISH_PREPARATION_TAG\) \|\|\s*tags\.has\(SEAFOOD_PREPARATION_TAG\)\s*\)/,
  'prep-raw-seafood だけが fish / shellfish / seafood のいずれかを広く判定してください。',
);

console.log('preparation restriction regression checks passed');
