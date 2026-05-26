import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const recipeAiSource = readFileSync('src/lib/recipeAi.ts', 'utf8');
const transpiledRecipeAi = ts.transpileModule(recipeAiSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const supportedPreparationRestrictionIds = new Set([
  'prep-raw-seafood',
  'prep-raw-fish',
  'prep-raw-shellfish',
  'prep-raw-ing-shrimp',
  'prep-raw-ing-crab',
  'prep-raw-ing-squid',
  'prep-raw-ing-abalone',
  'prep-raw-ing-salmon',
  'prep-raw-ing-mackerel',
  'prep-raw-ing-roe',
]);

const recipeAiModule = { exports: {} };
Function('exports', 'module', 'require', transpiledRecipeAi)(
  recipeAiModule.exports,
  recipeAiModule,
  (specifier) => {
    if (specifier === './mockData') return { INGREDIENT_MASTER: [] };
    if (specifier === './preparationRestrictions') {
      return {
        isPreparationRestrictionId: (id) => supportedPreparationRestrictionIds.has(id),
      };
    }
    throw new Error(`Unexpected runtime import while evaluating recipe AI restrictions: ${specifier}`);
  },
);

const { includesRestrictedIngredientText, parseRestrictionInput } = recipeAiModule.exports;


const milkRestriction = [{
  id: 'ing-milk',
  name_ja: '乳',
  name_en: 'milk',
  dietary_tags: ['dairy', 'animal-product'],
}];

assert.equal(
  includesRestrictedIngredientText(['豆乳'], milkRestriction),
  false,
  '短い日本語 alias「乳」は豆乳のような安全な語の部分文字列として一致してはいけません。',
);
assert.equal(
  includesRestrictedIngredientText(['乳化剤'], milkRestriction),
  false,
  '短い日本語 alias「乳」は乳化剤のような非乳製品語の部分文字列として一致してはいけません。',
);
assert.equal(
  includesRestrictedIngredientText(['牛乳'], milkRestriction),
  true,
  '牛乳のような明確な乳製品 alias は引き続き一致してください。',
);

const parsed = parseRestrictionInput([
  'ing-shrimp',
  'prep-raw-seafood',
  'diet-vegan',
  'prep-raw-seafood',
]);

assert.ok(!('error' in parsed), 'prep-* の調理状態制限は unsupported id として拒否しないでください。');
assert.deepEqual(parsed.ingredientCodes, ['ing-shrimp'], 'prep-* は DB ingredient code として扱わないでください。');
assert.deepEqual(parsed.dietaryConstraints, ['diet-vegan'], 'prep-* を許可しても diet-* の抽出は維持してください。');
assert.deepEqual(parsed.preparationRestrictions, ['prep-raw-seafood'], 'prep-* の調理状態制限は重複排除して保持してください。');

assert.deepEqual(
  parseRestrictionInput(['prep-raw-dragonfruit', 'diet-halal']),
  {
    error: 'Unsupported restricted ingredient ids.',
    unknownValues: ['prep-raw-dragonfruit', 'diet-halal'],
  },
  '未対応の prep-* / diet-* ID は引き続き拒否してください。',
);

console.log('AI recipe restriction input regression checks passed');
