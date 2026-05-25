import type { Recipe, RecipeIngredient } from './mockData';

export type PreparationRestrictionId =
  | 'prep-raw-seafood'
  | 'prep-raw-fish'
  | 'prep-raw-shellfish'
  | 'prep-raw-ing-shrimp'
  | 'prep-raw-ing-crab'
  | 'prep-raw-ing-squid'
  | 'prep-raw-ing-abalone'
  | 'prep-raw-ing-salmon'
  | 'prep-raw-ing-mackerel'
  | 'prep-raw-ing-roe';

type PreparationRestrictionRule = {
  label: string;
  conflictLabel: string;
  compatibleLabel: string;
  isConflict: (ingredient: RecipeIngredient) => boolean;
};

const RAW_PREPARATION_TAG = 'raw';
const FISH_PREPARATION_TAG = 'fish';
const SHELLFISH_PREPARATION_TAG = 'shellfish';
const SEAFOOD_PREPARATION_TAG = 'seafood';

const getPreparationTagSet = (ingredient: RecipeIngredient) => new Set(ingredient.preparation_tags ?? []);
const hasRawTag = (tags: Set<string>) => tags.has(RAW_PREPARATION_TAG);
const hasFishTag = (tags: Set<string>) =>
  tags.has(FISH_PREPARATION_TAG) || tags.has(SEAFOOD_PREPARATION_TAG);
const hasShellfishTag = (tags: Set<string>) =>
  tags.has(SHELLFISH_PREPARATION_TAG) || tags.has(SEAFOOD_PREPARATION_TAG);
const hasRawFishConflict = (ingredient: RecipeIngredient) => {
  const tags = getPreparationTagSet(ingredient);
  return hasRawTag(tags) && hasFishTag(tags);
};
const hasRawShellfishConflict = (ingredient: RecipeIngredient) => {
  const tags = getPreparationTagSet(ingredient);
  return hasRawTag(tags) && hasShellfishTag(tags);
};
const hasRawSeafoodConflict = (ingredient: RecipeIngredient) => {
  const tags = getPreparationTagSet(ingredient);
  return hasRawTag(tags) && (hasFishTag(tags) || hasShellfishTag(tags));
};
const hasRawIngredientConflict = (ingredientCode: string) => (ingredient: RecipeIngredient) =>
  ingredient.id === ingredientCode && hasRawSeafoodConflict(ingredient);

export const PREPARATION_RESTRICTION_RULES: Record<PreparationRestrictionId, PreparationRestrictionRule> = {
  'prep-raw-seafood': {
    label: '生・半生の魚介類すべて',
    conflictLabel: '生・半生の魚介あり',
    compatibleLabel: '生・半生の魚介なし',
    isConflict: hasRawSeafoodConflict,
  },
  'prep-raw-fish': {
    label: '生・半生の魚全般',
    conflictLabel: '生・半生の魚あり',
    compatibleLabel: '生・半生の魚なし',
    isConflict: hasRawFishConflict,
  },
  'prep-raw-shellfish': {
    label: '生・半生の甲殻類・軟体類全般',
    conflictLabel: '生・半生の甲殻類・軟体類あり',
    compatibleLabel: '生・半生の甲殻類・軟体類なし',
    isConflict: hasRawShellfishConflict,
  },
  'prep-raw-ing-shrimp': {
    label: '生・半生のえび',
    conflictLabel: '生・半生のえびあり',
    compatibleLabel: '生・半生のえびなし',
    isConflict: hasRawIngredientConflict('ing-shrimp'),
  },
  'prep-raw-ing-crab': {
    label: '生・半生のかに',
    conflictLabel: '生・半生のかにあり',
    compatibleLabel: '生・半生のかになし',
    isConflict: hasRawIngredientConflict('ing-crab'),
  },
  'prep-raw-ing-squid': {
    label: '生・半生のいか',
    conflictLabel: '生・半生のいかあり',
    compatibleLabel: '生・半生のいかなし',
    isConflict: hasRawIngredientConflict('ing-squid'),
  },
  'prep-raw-ing-abalone': {
    label: '生・半生のあわび',
    conflictLabel: '生・半生のあわびあり',
    compatibleLabel: '生・半生のあわびなし',
    isConflict: hasRawIngredientConflict('ing-abalone'),
  },
  'prep-raw-ing-salmon': {
    label: '生・半生のさけ',
    conflictLabel: '生・半生のさけあり',
    compatibleLabel: '生・半生のさけなし',
    isConflict: hasRawIngredientConflict('ing-salmon'),
  },
  'prep-raw-ing-mackerel': {
    label: '生・半生のさば',
    conflictLabel: '生・半生のさばあり',
    compatibleLabel: '生・半生のさばなし',
    isConflict: hasRawIngredientConflict('ing-mackerel'),
  },
  'prep-raw-ing-roe': {
    label: '生・半生のいくら',
    conflictLabel: '生・半生のいくらあり',
    compatibleLabel: '生・半生のいくらなし',
    isConflict: hasRawIngredientConflict('ing-roe'),
  },
};

export const isPreparationRestrictionId = (id: string): id is PreparationRestrictionId =>
  id in PREPARATION_RESTRICTION_RULES;

export const getSelectedPreparationRestrictionIds = (restrictedIngredients: string[]) =>
  restrictedIngredients.filter(isPreparationRestrictionId);

export const getPreparationConflictingIngredients = (
  recipe: Pick<Recipe, 'ingredients'>,
  restrictionId: PreparationRestrictionId,
): RecipeIngredient[] => {
  const rule = PREPARATION_RESTRICTION_RULES[restrictionId];

  return recipe.ingredients.filter((ingredient) => rule.isConflict(ingredient));
};

export const violatesPreparationRestrictions = (
  recipe: Pick<Recipe, 'ingredients'>,
  restrictedIngredients: string[],
) =>
  getSelectedPreparationRestrictionIds(restrictedIngredients).some(
    (restrictionId) => getPreparationConflictingIngredients(recipe, restrictionId).length > 0,
  );
