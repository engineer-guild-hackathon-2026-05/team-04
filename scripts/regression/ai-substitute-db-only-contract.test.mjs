import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const substituteRoute = readFileSync('src/app/api/recipes/[id]/substitute/route.ts', 'utf8');
const openRouter = readFileSync('src/lib/server/openRouter.ts', 'utf8');
const recipeModal = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');

assert.match(
  substituteRoute,
  /from\('ingredients'\)[\s\S]*select\('ingredient_code, name_ja, name_en, category, dietary_tags'\)/,
  '代替候補は固定の ingredients DB テーブルから読み込んでください。',
);
assert.match(
  substituteRoute,
  /includesRestrictedIngredientText\(\[ingredient\.id, ingredient\.name_ja, ingredient\.name_en\], input\.restrictions\)/,
  '代替候補はユーザーのアレルギー・NG食材コード/名称でコードレベルに除外してください。',
);
assert.match(
  substituteRoute,
  /isDietaryConflictIngredient\(ingredient, input\.dietaryConstraints\)/,
  '代替候補はヴィーガン等の食制限でコードレベルに除外してください。',
);
assert.match(
  substituteRoute,
  /violatesPreparationCandidateConstraints\(ingredient, input\.preparationRestrictions\)/,
  '代替候補は生・半生NG等の調理状態制限でコードレベルに除外してください。',
);
assert.match(
  substituteRoute,
  /function\s+assertSafeSubstituteIngredient[\s\S]*includesRestrictedIngredientText[\s\S]*isDietaryConflictIngredient[\s\S]*violatesPreparationCandidateConstraints/,
  'AI応答後も表示直前に候補DB内かつ制限違反なしであることを再検証してください。',
);
assert.match(
  substituteRoute,
  /const\s+ingredientsById\s*=\s*new Map\(candidateIngredients\.map\([\s\S]*?substituteIngredientId[\s\S]*?OpenRouterResponseError/s,
  'AIが候補外/DB外の substituteIngredientId を返した場合は表示せず破棄してください。',
);
assert.match(
  substituteRoute,
  /assertSafeSubstituteIngredient\(substituteIngredient, restrictionContext\)[\s\S]*reason:\s*selection\.reason[\s\S]*usageNote:\s*selection\.usageNote/s,
  'AIのreason/usageNoteは許可しつつ、DB候補IDと制限違反なしを検証した後だけ表示レスポンスに含めてください。',
);

assert.match(
  openRouter,
  /type\s+IngredientSubstitutionSelection\s*=\s*\{[\s\S]*reason:\s*string;[\s\S]*usageNote\?:\s*string;/,
  'AIの代替提案ではDB候補IDに加えて、表示可能なreason/usageNoteを型として保持してください。',
);
assert.match(
  openRouter,
  /JSON形式:\s*\{"substitutions":\[\{"original_ingredient_name":"元材料名","substitute_ingredient_id":"候補id","reason":"短い理由","usage_note":"分量や使い方の短いメモ"\}\]\}/,
  'OpenRouterの代替食材JSON契約は候補DB idと短いreason/usage_noteを返させてください。',
);
assert.match(
  openRouter,
  /allowedIngredientIds\.has\(substituteIngredientId\)[\s\S]*!reason/s,
  'OpenRouter応答は候補DB id セットに含まれ、reasonがある場合だけ有効にしてください。',
);
assert.match(
  openRouter,
  /MAX_INGREDIENT_SUBSTITUTION_RETRY_ATTEMPTS\s*=\s*3/,
  'AIがDB外候補を返した場合に再生成を要求できるよう、代替食材選択には最大試行回数を明示してください。',
);
assert.match(
  openRouter,
  /for\s*\(\s*let\s+attempt\s*=\s*1;\s*attempt\s*<=\s*MAX_INGREDIENT_SUBSTITUTION_RETRY_ATTEMPTS;\s*attempt\s*\+=\s*1\s*\)/,
  'DB外候補などのOpenRouterResponseErrorでは、DB候補IDだけを返すまでbounded retryしてください。',
);
assert.match(
  openRouter,
  /候補IDだけから選び直してください。/,
  '再試行プロンプトではDB候補IDだけから選び直すよう明示してください。',
);

assert.match(
  recipeModal,
  /item\.reason\}\{item\.usageNote \? ` \/ \$\{item\.usageNote\}` : ''\}/,
  'モーダルは検証済みレスポンスのreason/usageNoteを表示する前提を維持してください。',
);

console.log('AI substitute DB-only contract regression checks passed');
