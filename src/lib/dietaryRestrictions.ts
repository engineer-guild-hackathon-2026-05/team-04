import type { Recipe, RecipeIngredient } from './mockData';

export type DietaryRestrictionId =
  | 'diet-vegan'
  | 'diet-lacto-vegetarian'
  | 'diet-ovo-vegetarian'
  | 'diet-pescatarian';

type DietaryRestrictionRule = {
  label: string;
  conflictLabel: string;
  compatibleLabel: string;
  isConflict: (tags: Set<string>) => boolean;
};

const ANIMAL_PRODUCT_DIETARY_TAG = 'animal-product';
const MEAT_DIETARY_TAGS = new Set(['meat', 'pork']);
const SEAFOOD_DIETARY_TAGS = new Set(['fish', 'shellfish']);
const DAIRY_DIETARY_TAG = 'dairy';
const EGG_DIETARY_TAG = 'egg';

const hasAnyTag = (tags: Set<string>, targets: Set<string>) =>
  Array.from(targets).some((tag) => tags.has(tag));

const isOnlyAllowedAnimalProduct = (tags: Set<string>, allowedTags: Set<string>) => {
  if (!tags.has(ANIMAL_PRODUCT_DIETARY_TAG)) return false;
  if (hasAnyTag(tags, MEAT_DIETARY_TAGS) || hasAnyTag(tags, SEAFOOD_DIETARY_TAGS)) return false;
  return Array.from(allowedTags).some((tag) => tags.has(tag));
};

export const DIETARY_RESTRICTION_RULES: Record<DietaryRestrictionId, DietaryRestrictionRule> = {
  'diet-vegan': {
    label: '完全ヴィーガン',
    conflictLabel: '完全ヴィーガン不可',
    compatibleLabel: '完全ヴィーガン対応',
    isConflict: (tags) => tags.has(ANIMAL_PRODUCT_DIETARY_TAG),
  },
  'diet-lacto-vegetarian': {
    label: 'ラクト・ベジタリアン',
    conflictLabel: 'ラクト不可',
    compatibleLabel: 'ラクト対応',
    isConflict: (tags) =>
      tags.has(EGG_DIETARY_TAG) ||
      hasAnyTag(tags, MEAT_DIETARY_TAGS) ||
      hasAnyTag(tags, SEAFOOD_DIETARY_TAGS) ||
      (tags.has(ANIMAL_PRODUCT_DIETARY_TAG) && !isOnlyAllowedAnimalProduct(tags, new Set([DAIRY_DIETARY_TAG]))),
  },
  'diet-ovo-vegetarian': {
    label: 'オボ・ベジタリアン',
    conflictLabel: 'オボ不可',
    compatibleLabel: 'オボ対応',
    isConflict: (tags) =>
      tags.has(DAIRY_DIETARY_TAG) ||
      hasAnyTag(tags, MEAT_DIETARY_TAGS) ||
      hasAnyTag(tags, SEAFOOD_DIETARY_TAGS) ||
      (tags.has(ANIMAL_PRODUCT_DIETARY_TAG) && !isOnlyAllowedAnimalProduct(tags, new Set([EGG_DIETARY_TAG]))),
  },
  'diet-pescatarian': {
    label: 'ペスカタリアン',
    conflictLabel: 'ペスカタリアン不可',
    compatibleLabel: 'ペスカタリアン対応',
    isConflict: (tags) =>
      hasAnyTag(tags, MEAT_DIETARY_TAGS) ||
      (tags.has(ANIMAL_PRODUCT_DIETARY_TAG) &&
        !hasAnyTag(tags, new Set(['fish', 'shellfish', EGG_DIETARY_TAG, DAIRY_DIETARY_TAG]))),
  },
};

export const isDietaryRestrictionId = (id: string): id is DietaryRestrictionId =>
  id in DIETARY_RESTRICTION_RULES;

export const getSelectedDietaryRestrictionIds = (restrictedIngredients: string[]) =>
  restrictedIngredients.filter(isDietaryRestrictionId);

export const getDietaryConflictingIngredients = (
  recipe: Pick<Recipe, 'ingredients'>,
  restrictionId: DietaryRestrictionId,
): RecipeIngredient[] => {
  const rule = DIETARY_RESTRICTION_RULES[restrictionId];

  return recipe.ingredients.filter((ingredient) =>
    rule.isConflict(new Set(ingredient.dietary_tags ?? [])),
  );
};

export const violatesDietaryRestrictions = (
  recipe: Pick<Recipe, 'ingredients'>,
  restrictedIngredients: string[],
) =>
  getSelectedDietaryRestrictionIds(restrictedIngredients).some(
    (restrictionId) => getDietaryConflictingIngredients(recipe, restrictionId).length > 0,
  );
