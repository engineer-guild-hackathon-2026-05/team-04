import { MOCK_RECIPES, type Recipe, type RecipeIngredient, type RecipeStep } from './mockData';
import { toIngredientCodeFromDbRow } from './ingredientCodes';

type RecipeIngredientJoinRow = {
  quantity?: string | null;
  is_optional?: boolean | null;
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
  } | {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
  }[] | null;
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
};

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

function normalizeRecipeIngredients(rows: RecipeIngredientJoinRow[] | null | undefined): RecipeIngredient[] {
  return (rows ?? [])
    .map((row): RecipeIngredient | null => {
      const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
      if (!ingredient?.name_ja) return null;

      return {
        id: toIngredientCodeFromDbRow(ingredient) ?? `none-${ingredient.name_ja}`,
        name_ja: ingredient.name_ja,
        quantity: row.quantity ?? '',
        is_optional: row.is_optional ?? false,
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
  };
}

export function fallbackRecipes() {
  return MOCK_RECIPES.map((recipe) => ({
    ...recipe,
    steps: normalizeRecipeSteps(recipe.steps),
  }));
}
