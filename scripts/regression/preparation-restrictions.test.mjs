import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preparationRules = readFileSync('src/lib/preparationRestrictions.ts', 'utf8');
const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const listView = readFileSync('src/app/components/ListView.tsx', 'utf8');
const recipeModal = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const recipesRoute = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const recipeMapping = readFileSync('src/lib/recipeMapping.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260525150000_add_recipe_ingredient_preparation_tags.sql', 'utf8');

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

console.log('preparation restriction regression checks passed');
