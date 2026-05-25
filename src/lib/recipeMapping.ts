import {
  type Recipe,
  type RecipeCultureSection,
  type RecipeCultureSectionKey,
  type RecipeIngredient,
  type RecipeStep,
} from './mockData';
import { toIngredientCodeFromDbRow } from './ingredientCodes';

type RecipeIngredientJoinRow = {
  quantity?: string | null;
  is_optional?: boolean | null;
  display_name_ja?: string | null;
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
    category?: string | null;
    is_allergen?: boolean | null;
    dietary_tags?: string[] | null;
  } | {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
    category?: string | null;
    is_allergen?: boolean | null;
    dietary_tags?: string[] | null;
  }[] | null;
};

type RecipeCultureSectionJoinRow = {
  section_key?: string | null;
  label?: string | null;
  title?: string | null;
  body?: string | null;
  sort_order?: number | null;
};

type RecipeDbRow = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  cuisine?: string | null;
  flag?: string | null;
  image_url?: string | null;
  cook_time_min?: number | null;
  servings?: number | null;
  is_vegan?: boolean | null;
  is_gluten_free?: boolean | null;
  tags?: string[] | null;
  steps?: unknown;
  recipe_ingredients?: RecipeIngredientJoinRow[] | null;
  recipe_culture_sections?: RecipeCultureSectionJoinRow[] | null;
};

const CULTURE_SECTION_KEYS = new Set<RecipeCultureSectionKey>(['origin', 'food_culture']);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function normalizeRecipeSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((step, index): RecipeStep | null => {
      if (typeof step === 'string') return { order: index + 1, text: step };
      if (!step || typeof step !== 'object') return null;

      const candidate = step as { order?: unknown; text?: unknown };
      if (typeof candidate.text !== 'string') return null;

      return {
        order: typeof candidate.order === 'number' ? candidate.order : index + 1,
        text: candidate.text,
      };
    })
    .filter((step): step is RecipeStep => Boolean(step));
}

export function normalizeRecipeCultureSections(
  rows: RecipeCultureSectionJoinRow[] | null | undefined,
): RecipeCultureSection[] {
  return (rows ?? [])
    .map((row): RecipeCultureSection | null => {
      const key = row.section_key;
      if (!key || !CULTURE_SECTION_KEYS.has(key as RecipeCultureSectionKey)) return null;
      if (!isNonEmptyString(row.label) || !isNonEmptyString(row.title) || !isNonEmptyString(row.body)) return null;
      if (!(typeof row.sort_order === 'number') || !Number.isFinite(row.sort_order)) return null;

      return {
        key: key as RecipeCultureSectionKey,
        label: row.label.trim(),
        title: row.title.trim(),
        body: row.body.trim(),
        sort_order: row.sort_order,
      };
    })
    .filter((section): section is RecipeCultureSection => Boolean(section))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function normalizeRecipeIngredients(rows: RecipeIngredientJoinRow[] | null | undefined): RecipeIngredient[] {
  return (rows ?? [])
    .map((row): RecipeIngredient | null => {
      const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
      if (!ingredient?.name_ja) return null;

      return {
        id: toIngredientCodeFromDbRow(ingredient) ?? `none-${ingredient.name_ja}`,
        name_ja: row.display_name_ja?.trim() || ingredient.name_ja,
        quantity: row.quantity ?? '',
        is_optional: row.is_optional ?? false,
        category: ingredient.category ?? undefined,
        is_allergen: ingredient.is_allergen ?? false,
        dietary_tags: ingredient.dietary_tags ?? [],
      };
    })
    .filter((ingredient): ingredient is RecipeIngredient => Boolean(ingredient));
}

export function mapRecipeRowToRecipe(row: RecipeDbRow): Recipe | null {
  if (!row.id || !row.title) return null;

  const ingredients = normalizeRecipeIngredients(row.recipe_ingredients);
  const steps = normalizeRecipeSteps(row.steps);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    cuisine: row.cuisine ?? '世界',
    flag: row.flag ?? '🌍',
    image_url: row.image_url ?? '',
    cook_time_min: row.cook_time_min ?? 0,
    servings: row.servings ?? 1,
    is_vegan: row.is_vegan ?? false,
    is_gluten_free: row.is_gluten_free ?? false,
    tags: row.tags ?? [],
    ingredients,
    steps,
    culture_sections: normalizeRecipeCultureSections(row.recipe_culture_sections),
  };
}
