import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const pageSource = readFileSync('src/app/page.tsx', 'utf8');

assert.match(modalSource, /recipes\s*:\s*Recipe\[\]/, 'RecipeModal は related_recipe_id 解決用に full Recipe[] を props で受け取ってください。');
assert.match(modalSource, /onSelectRecipe\s*:\s*\(\s*recipe\s*:\s*Recipe\s*\)\s*=>\s*void/, 'RecipeModal は同一 modal 内で選択を切り替える onSelectRecipe を受け取ってください。');
assert.match(modalSource, /violatesDietaryRestrictions/, '関連カードは既存の食事制限判定を再利用してください。');
assert.match(modalSource, /recipeById|recipes\.find\([\s\S]*?related_recipe_id/, 'related_recipe_id は loaded Recipe[] から解決してください。');
assert.match(modalSource, /relatedRecipe\.id\s*!==\s*recipe\.id|recipe\.id\s*!==\s*relatedRecipe\.id/, '関連カードでは現在表示中のレシピ自身を除外してください。');
assert.match(modalSource, /restrictedIngredients\.includes\(ingredient\.id\)/, '関連カードでは直接の制限食材一致も除外してください。');
assert.match(modalSource, /filter\([\s\S]*?violatesDietaryRestrictions\([\s\S]*?restrictedIngredients[\s\S]*?\)/, '関連カードでは dietary restriction 違反も除外してください。');
assert.match(modalSource, /slice\s*\(\s*0\s*,\s*3\s*\)/, '関連カードは 1〜3 件に制限してください。');
assert.doesNotMatch(modalSource, /preferred|recommend|fallbackRelated|sameCuisineRecipes/i, '関連カードは自動推薦や forced fill fallback を実装しないでください。');
assert.match(modalSource, /modal-related-recipes/, '関連カード section の className を追加してください。');
assert.match(modalSource, /modal-related-recipe-card/, '関連レシピカードの className を追加してください。');
assert.match(modalSource, /modal-related-reason/, 'reason_label 表示用 className を追加してください。');
assert.match(modalSource, /reason_label/, 'optional reason_label を表示してください。');
assert.match(modalSource, /event\.key\s*===\s*['"]Enter['"][\s\S]*event\.key\s*===\s*['"] ['"]/, '関連カードは Enter / Space キーボード操作に対応してください。');
assert.match(modalSource, /setActiveTab\(\s*['"]basic['"]\s*\)[\s\S]*\[recipe\?\.id\]/, '関連カード選択後は既存の recipe?.id effect で basic タブに戻してください。');
assert.match(pageSource, /<RecipeModal[\s\S]*?recipes=\{recipes\}[\s\S]*?onSelectRecipe=\{setSelectedRecipe\}/, 'page.tsx は RecipeModal に recipes と onSelectRecipe を渡してください。');

console.log('recipe modal related cards regression checks passed');
