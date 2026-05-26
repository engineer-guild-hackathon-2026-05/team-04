import { INGREDIENT_MASTER, type Recipe, type RecipeIngredient, type RecipeStep } from './mockData';
import { isPreparationRestrictionId, type PreparationRestrictionId } from './preparationRestrictions';

export type RestrictionFact = {
  id: string;
  name_ja: string;
  name_en: string;
  dietary_tags: string[];
};

export type AiGeneratedIngredient = {
  name_ja: string;
  name_en: string;
  quantity: string;
  is_optional: boolean;
};

export type AiGeneratedRecipe = {
  title: string;
  description: string;
  cuisine: string;
  flag: string;
  image_url: string;
  cook_time_min: number;
  servings: number;
  is_vegan: boolean;
  is_gluten_free: boolean;
  tags: string[];
  cultural_background: string;
  ingredients: AiGeneratedIngredient[];
  steps: { order: number; text: string }[];
};

export type ParsedRestrictionInput = {
  ingredientCodes: string[];
  dietaryConstraints: string[];
  preparationRestrictions: PreparationRestrictionId[];
};

const SUPPORTED_DIET_CONSTRAINTS = new Set([
  'diet-vegan',
  'diet-lacto-vegetarian',
  'diet-ovo-vegetarian',
  'diet-pescatarian',
]);

const MEAT_PATTERNS = [
  /牛肉|豚肉|鶏肉|羊肉|肉|ハム|ベーコン|ソーセージ|鴨|ラム/,
  /beef|pork|chicken|meat|ham|bacon|sausage|duck|lamb|mutton/i,
];

const SEAFOOD_PATTERNS = [
  /魚|さけ|鮭|さば|鯖|まぐろ|ツナ|えび|海老|かに|蟹|いか|イカ|たこ|タコ|あわび|いくら|貝|牡蠣|ホタテ/,
  /fish|salmon|mackerel|tuna|shrimp|prawn|crab|squid|octopus|abalone|roe|shellfish|oyster|scallop/i,
];

const EGG_PATTERNS = [
  /卵|玉子|たまご|エッグ/,
  /egg/i,
];

const DAIRY_PATTERNS = [
  /乳|牛乳|バター|チーズ|ヨーグルト|クリーム|ミルク/,
  /milk|butter|cheese|yogurt|cream|dairy/i,
];

const OTHER_ANIMAL_PRODUCT_PATTERNS = [
  /ゼラチン|はちみつ|蜂蜜|ラード|ブイヨン|コンソメ/,
  /gelatin|honey|lard|bouillon|consomme|stock/i,
];

const RESTRICTION_ALIASES: Record<string, string[]> = {
  'ing-shrimp': ['えび', '海老', 'エビ', 'shrimp', 'prawn'],
  'ing-crab': ['かに', '蟹', 'カニ', 'crab'],
  'ing-egg': ['卵', '玉子', 'たまご', 'エッグ', 'egg'],
  'ing-milk': ['乳', '牛乳', 'ミルク', 'チーズ', 'バター', 'ヨーグルト', 'milk', 'dairy', 'cheese', 'butter', 'yogurt'],
  'ing-wheat': ['小麦', '小麦粉', 'wheat', 'flour'],
  'ing-pork': ['豚肉', 'ポーク', 'pork'],
  'ing-beef': ['牛肉', 'ビーフ', 'beef'],
  'ing-chicken': ['鶏肉', 'チキン', 'chicken'],
  'ing-gelatin': ['ゼラチン', 'gelatin'],
};

const ANIMAL_INGREDIENT_PATTERNS = {
  meat: ['牛肉', '豚肉', '鶏肉', '羊肉', '肉', 'ハム', 'ベーコン', 'ソーセージ', '鴨', 'ラム', 'beef', 'pork', 'chicken', 'meat', 'ham', 'bacon', 'sausage', 'duck', 'lamb', 'mutton'],
  seafood: ['魚', 'さけ', '鮭', 'さば', '鯖', 'まぐろ', 'ツナ', 'えび', '海老', 'かに', '蟹', 'いか', 'イカ', 'たこ', 'タコ', 'あわび', 'いくら', '貝', '牡蠣', 'ホタテ', 'ナンプラー', 'fish', 'fish sauce', 'salmon', 'mackerel', 'tuna', 'shrimp', 'prawn', 'crab', 'squid', 'octopus', 'abalone', 'roe', 'shellfish', 'oyster', 'scallop'],
  egg: ['卵', '玉子', 'たまご', 'エッグ', 'egg'],
  dairy: ['乳', '乳製品', '牛乳', 'バター', 'チーズ', 'ヨーグルト', 'クリーム', 'ミルク', 'milk', 'butter', 'cheese', 'yogurt', 'cream', 'dairy'],
  otherAnimalProduct: ['ゼラチン', 'はちみつ', '蜂蜜', 'ラード', 'ブイヨン', 'コンソメ', 'gelatin', 'honey', 'lard', 'bouillon', 'consomme', 'stock'],
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value: string) {
  return value.trim().normalize('NFKC').toLowerCase();
}

function normalizeIngredientKey(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, ' ');
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function isSingleJapaneseCharacter(value: string) {
  return /^\p{Script=Han}$|^\p{Script=Hiragana}$|^\p{Script=Katakana}$/u.test(value);
}

function textMatchesToken(haystack: string, needle: string) {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return false;

  if (/[a-z0-9]/i.test(normalizedNeedle)) {
    return new RegExp(String.raw`(^|[^\p{L}\p{N}])${escapeRegExp(normalizedNeedle)}(?=$|[^\p{L}\p{N}])`, 'iu')
      .test(haystack);
  }

  if (isSingleJapaneseCharacter(normalizedNeedle)) {
    return new RegExp(String.raw`(^|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])${escapeRegExp(normalizedNeedle)}(?=$|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])`, 'u')
      .test(haystack);
  }

  return haystack.includes(normalizedNeedle);
}

function restrictionNeedles(restriction: RestrictionFact) {
  return uniqueStrings([
    restriction.id,
    restriction.name_ja,
    restriction.name_en,
    ...(RESTRICTION_ALIASES[restriction.id] ?? []),
  ]);
}

export function includesRestrictedIngredientText(
  values: Array<string | null | undefined>,
  restrictions: RestrictionFact[],
) {
  if (restrictions.length === 0) return false;
  const haystack = normalizeSearchText(uniqueStrings(values).join('\n'));
  return restrictions.some((restriction) =>
    restrictionNeedles(restriction).some((needle) => textMatchesToken(haystack, needle)),
  );
}

type IngredientDietLike = {
  id?: string | null;
  name_ja?: string | null;
  name_en?: string | null;
  category?: string | null;
  dietary_tags?: string[] | null;
};

function ingredientText(ingredient: IngredientDietLike) {
  return normalizeSearchText(uniqueStrings([
    ingredient.id,
    ingredient.name_ja,
    ingredient.name_en,
    ingredient.category,
  ]).join('\n'));
}

function ingredientMatchesAnyTerm(ingredient: IngredientDietLike, terms: string[]) {
  const haystack = ingredientText(ingredient);
  return terms.some((term) => textMatchesToken(haystack, term));
}

export function isDietaryConflictIngredient(
  ingredient: IngredientDietLike,
  dietaryConstraints: string[],
) {
  if (dietaryConstraints.length === 0) return false;

  const tags = new Set(ingredient.dietary_tags ?? []);
  const isMeat = tags.has('meat') || tags.has('pork') || ingredientMatchesAnyTerm(ingredient, ANIMAL_INGREDIENT_PATTERNS.meat);
  const isSeafood = tags.has('fish') || tags.has('shellfish') || ingredientMatchesAnyTerm(ingredient, ANIMAL_INGREDIENT_PATTERNS.seafood);
  const isEgg = tags.has('egg') || ingredientMatchesAnyTerm(ingredient, ANIMAL_INGREDIENT_PATTERNS.egg);
  const isDairy = tags.has('dairy') || ingredientMatchesAnyTerm(ingredient, ANIMAL_INGREDIENT_PATTERNS.dairy);
  const isOtherAnimalProduct =
    (tags.has('animal-product') && !isMeat && !isSeafood && !isEgg && !isDairy) ||
    ingredientMatchesAnyTerm(ingredient, ANIMAL_INGREDIENT_PATTERNS.otherAnimalProduct);

  if (dietaryConstraints.includes('diet-vegan')) {
    return isMeat || isSeafood || isEgg || isDairy || isOtherAnimalProduct;
  }
  if (dietaryConstraints.includes('diet-lacto-vegetarian')) {
    return isMeat || isSeafood || isEgg || isOtherAnimalProduct;
  }
  if (dietaryConstraints.includes('diet-ovo-vegetarian')) {
    return isMeat || isSeafood || isDairy || isOtherAnimalProduct;
  }
  if (dietaryConstraints.includes('diet-pescatarian')) {
    return isMeat || isOtherAnimalProduct;
  }
  return false;
}

function boundedString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function boundedStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const values = value.map((item) => boundedString(item, maxLength));
  if (values.some((item) => !item)) return null;
  return values as string[];
}

function boundedBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  const steps = value.map((item, index) => {
    if (typeof item === 'string') {
      const text = boundedString(item, 500);
      return text ? { order: index + 1, text } : null;
    }
    const object = asObject(item);
    const text = boundedString(object?.text, 500);
    if (!text) return null;
    return {
      order: boundedInteger(object?.order, 1, 10, index + 1),
      text,
    };
  });
  if (steps.some((step) => !step)) return null;
  return steps as { order: number; text: string }[];
}

function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return null;
  const seen = new Set<string>();
  const ingredients: AiGeneratedIngredient[] = [];

  for (const item of value) {
    const object = asObject(item);
    const nameJa = boundedString(object?.name_ja, 80);
    const nameEn = boundedString(object?.name_en, 80) ?? nameJa;
    const quantity = boundedString(object?.quantity, 80);
    if (!nameJa || !nameEn || !quantity) return null;

    const key = normalizeIngredientKey(nameEn);
    if (seen.has(key)) continue;
    seen.add(key);
    ingredients.push({
      name_ja: nameJa,
      name_en: nameEn,
      quantity,
      is_optional: boundedBoolean(object?.is_optional),
    });
  }

  return ingredients.length > 0 ? ingredients : null;
}

export function parseRestrictionInput(value: unknown): ParsedRestrictionInput | { error: string; unknownValues: string[] } {
  if (value == null) return { ingredientCodes: [], dietaryConstraints: [], preparationRestrictions: [] };
  if (!Array.isArray(value)) return { error: 'restrictedIngredients must be an array.', unknownValues: [] };

  const ingredientCodes = new Set<string>();
  const dietaryConstraints = new Set<string>();
  const preparationRestrictions = new Set<PreparationRestrictionId>();
  const unknownValues: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      unknownValues.push(String(item));
      continue;
    }
    if (/^ing-[a-z0-9-]+$/.test(item)) {
      ingredientCodes.add(item);
    } else if (SUPPORTED_DIET_CONSTRAINTS.has(item)) {
      dietaryConstraints.add(item);
    } else if (isPreparationRestrictionId(item)) {
      preparationRestrictions.add(item);
    } else {
      unknownValues.push(item);
    }
  }

  if (unknownValues.length > 0) {
    return { error: 'Unsupported restricted ingredient ids.', unknownValues };
  }

  return {
    ingredientCodes: Array.from(ingredientCodes),
    dietaryConstraints: Array.from(dietaryConstraints),
    preparationRestrictions: Array.from(preparationRestrictions),
  };
}

export function restrictionFactsFromMaster(codes: string[]): RestrictionFact[] {
  const codeSet = new Set(codes);
  return INGREDIENT_MASTER
    .filter((ingredient) => codeSet.has(ingredient.id))
    .map((ingredient) => ({
      id: ingredient.id,
      name_ja: ingredient.name_ja,
      name_en: ingredient.name_en,
      dietary_tags: ingredient.dietary_tags,
    }));
}

export function validateKnownRestrictionCodes(codes: string[]) {
  const knownCodes = new Set(INGREDIENT_MASTER.map((ingredient) => ingredient.id));
  return codes.filter((code) => !knownCodes.has(code));
}

function includesUnsafeRestriction(recipe: AiGeneratedRecipe, restrictions: RestrictionFact[]) {
  return includesRestrictedIngredientText(
    recipe.ingredients.flatMap((ingredient) => [ingredient.name_ja, ingredient.name_en]),
    restrictions,
  );
}

function ingredientHaystack(recipe: AiGeneratedRecipe) {
  return recipe.ingredients
    .flatMap((ingredient) => [ingredient.name_ja, ingredient.name_en])
    .join('\n');
}

function includesAnyPattern(haystack: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(haystack));
}

function violatesDiet(recipe: AiGeneratedRecipe, dietaryConstraints: string[]) {
  if (dietaryConstraints.length === 0) return false;

  const haystack = ingredientHaystack(recipe);
  const hasMeat = includesAnyPattern(haystack, MEAT_PATTERNS);
  const hasSeafood = includesAnyPattern(haystack, SEAFOOD_PATTERNS);
  const hasEgg = includesAnyPattern(haystack, EGG_PATTERNS);
  const hasDairy = includesAnyPattern(haystack, DAIRY_PATTERNS);
  const hasOtherAnimal = includesAnyPattern(haystack, OTHER_ANIMAL_PRODUCT_PATTERNS);

  if (dietaryConstraints.includes('diet-vegan')) {
    return !recipe.is_vegan || hasMeat || hasSeafood || hasEgg || hasDairy || hasOtherAnimal;
  }
  if (dietaryConstraints.includes('diet-lacto-vegetarian') && (hasMeat || hasSeafood || hasEgg || hasOtherAnimal)) {
    return true;
  }
  if (dietaryConstraints.includes('diet-ovo-vegetarian') && (hasMeat || hasSeafood || hasDairy || hasOtherAnimal)) {
    return true;
  }
  if (dietaryConstraints.includes('diet-pescatarian') && (hasMeat || hasOtherAnimal)) {
    return true;
  }
  return false;
}

function canonicalIngredientForAiIngredient(ingredient: AiGeneratedIngredient) {
  const normalizedNameEn = normalizeIngredientKey(ingredient.name_en);
  const normalizedNameJa = normalizeIngredientKey(ingredient.name_ja);

  return INGREDIENT_MASTER.find((masterIngredient) => {
    const restrictionLike = {
      id: masterIngredient.id,
      name_ja: masterIngredient.name_ja,
      name_en: masterIngredient.name_en,
      dietary_tags: masterIngredient.dietary_tags,
    };
    return normalizeIngredientKey(masterIngredient.name_en) === normalizedNameEn ||
      normalizeIngredientKey(masterIngredient.name_ja) === normalizedNameJa ||
      restrictionNeedles(restrictionLike).some((needle) =>
        normalizeIngredientKey(needle) === normalizedNameEn ||
        normalizeIngredientKey(needle) === normalizedNameJa,
      );
  });
}

function canonicalIngredientIdForAiIngredient(ingredient: AiGeneratedIngredient) {
  const canonicalIngredient = canonicalIngredientForAiIngredient(ingredient);
  if (canonicalIngredient) return canonicalIngredient.id;

  const fallbackSlug = normalizeIngredientKey(ingredient.name_en)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `none-${fallbackSlug || ingredient.name_ja}`;
}

function normalizeAiRecipeCandidate(
  item: unknown,
  options: { restrictions: RestrictionFact[]; dietaryConstraints: string[] },
): AiGeneratedRecipe | null {
  const recipe = asObject(item);
  const ingredients = normalizeIngredients(recipe?.ingredients);
  const steps = normalizeSteps(recipe?.steps);
  const tags = boundedStringArray(recipe?.tags ?? [], 8, 40);
  const title = boundedString(recipe?.title, 120);
  const description = boundedString(recipe?.description, 500);
  const cuisine = boundedString(recipe?.cuisine, 80);
  const culturalBackground = boundedString(recipe?.cultural_background, 500);

  if (!recipe || !title || !description || !cuisine || !ingredients || !steps || !tags || !culturalBackground) {
    return null;
  }

  const normalized: AiGeneratedRecipe = {
    title,
    description,
    cuisine,
    flag: boundedString(recipe.flag, 8) ?? '🌍',
    image_url: typeof recipe.image_url === 'string' ? recipe.image_url.trim().slice(0, 500) : '',
    cook_time_min: boundedInteger(recipe.cook_time_min, 1, 240, 30),
    servings: boundedInteger(recipe.servings, 1, 12, 2),
    is_vegan: boundedBoolean(recipe.is_vegan),
    is_gluten_free: boundedBoolean(recipe.is_gluten_free),
    tags,
    cultural_background: culturalBackground,
    ingredients,
    steps,
  };

  if (includesUnsafeRestriction(normalized, options.restrictions) || violatesDiet(normalized, options.dietaryConstraints)) {
    return null;
  }

  return normalized;
}

export function validateAiRecipeCollection(
  payload: unknown,
  options: { maxRecipes: number; restrictions: RestrictionFact[]; dietaryConstraints: string[] },
): AiGeneratedRecipe[] {
  const object = asObject(payload);
  const recipesValue = object?.recipes;
  if (!Array.isArray(recipesValue) || recipesValue.length < 1) {
    throw new Error('AI response did not include a valid recipes array.');
  }

  const validRecipes = recipesValue
    .slice(0, options.maxRecipes)
    .map((item) => normalizeAiRecipeCandidate(item, options))
    .filter((recipe): recipe is AiGeneratedRecipe => Boolean(recipe));

  if (validRecipes.length === 0) {
    throw new Error('AI response did not include any safe usable recipes.');
  }

  return validRecipes;
}

export function aiRecipeToRecipe(aiRecipe: AiGeneratedRecipe, id: string, parentRecipeId?: string | null): Recipe {
  return {
    id,
    title: aiRecipe.title,
    description: aiRecipe.description,
    cuisine: aiRecipe.cuisine,
    flag: aiRecipe.flag,
    image_url: aiRecipe.image_url,
    cook_time_min: aiRecipe.cook_time_min,
    servings: aiRecipe.servings,
    is_vegan: aiRecipe.is_vegan,
    is_gluten_free: aiRecipe.is_gluten_free,
    tags: aiRecipe.tags,
    cultural_background: aiRecipe.cultural_background,
    parent_recipe_id: parentRecipeId ?? null,
    ingredients: aiRecipe.ingredients.map((ingredient): RecipeIngredient => {
      const canonicalIngredient = canonicalIngredientForAiIngredient(ingredient);
      return {
        id: canonicalIngredient?.id ?? canonicalIngredientIdForAiIngredient(ingredient),
        name_ja: ingredient.name_ja,
        quantity: ingredient.quantity,
        is_optional: ingredient.is_optional,
        category: canonicalIngredient?.category,
        dietary_tags: canonicalIngredient?.dietary_tags ?? [],
      };
    }),
    steps: aiRecipe.steps.map((step): RecipeStep => ({ order: step.order, text: step.text })),
    culture_sections: [],
  };
}
