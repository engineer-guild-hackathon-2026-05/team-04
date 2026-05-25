import 'server-only';

import { aiRecipeToRecipe, type AiGeneratedRecipe } from '@/lib/recipeAi';
import type { Recipe } from '@/lib/mockData';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

type PersistedRecipeResult = {
  recipe_id?: string;
};

type PersistAiRecipeInput = {
  userId: string;
  recipe: AiGeneratedRecipe;
  parentRecipeId?: string | null;
  substitutions?: Array<{ ingredientNameJa: string; substitutedFromIngredientId: string }>;
};

function toRpcRecipePayload(input: PersistAiRecipeInput) {
  return {
    parentRecipeId: input.parentRecipeId ?? null,
    recipe: {
      title: input.recipe.title,
      description: input.recipe.description,
      cuisine: input.recipe.cuisine,
      flag: input.recipe.flag,
      image_url: input.recipe.image_url,
      cook_time_min: input.recipe.cook_time_min,
      servings: input.recipe.servings,
      is_vegan: input.recipe.is_vegan,
      is_gluten_free: input.recipe.is_gluten_free,
      tags: input.recipe.tags,
      cultural_background: input.recipe.cultural_background,
      steps: input.recipe.steps,
    },
    ingredients: input.recipe.ingredients,
    substitutions: input.substitutions ?? [],
  };
}

function parsePersistedRecipeResults(data: unknown): PersistedRecipeResult[] {
  if (Array.isArray(data)) {
    return data.map((item) => typeof item === 'string' ? { recipe_id: item } : item as PersistedRecipeResult);
  }
  if (typeof data === 'string') return [{ recipe_id: data }];
  if (data && typeof data === 'object') return [data as PersistedRecipeResult];
  return [];
}

export async function persistAiRecipes(inputs: PersistAiRecipeInput[]): Promise<Recipe[]> {
  if (inputs.length === 0) return [];
  const [firstInput] = inputs;
  if (inputs.some((input) => input.userId !== firstInput.userId)) {
    throw new Error('AI recipe batch persistence requires one user id.');
  }

  const serviceRole = createServiceRoleClient();
  const { data, error } = await serviceRole.rpc('insert_ai_recipes_mvp', {
    p_user_id: firstInput.userId,
    p_recipes: inputs.map(toRpcRecipePayload),
  });

  if (error) throw error;

  const results = parsePersistedRecipeResults(data);
  if (results.length !== inputs.length) {
    throw new Error('AI recipe batch insert RPC returned an unexpected number of recipe ids.');
  }

  return inputs.map((input, index) => {
    const recipeId = results[index]?.recipe_id;
    if (!recipeId) throw new Error('AI recipe insert RPC did not return a recipe id.');
    return aiRecipeToRecipe(input.recipe, recipeId, input.parentRecipeId ?? null);
  });
}

export async function persistAiRecipe(input: PersistAiRecipeInput): Promise<Recipe> {
  const [recipe] = await persistAiRecipes([input]);
  if (!recipe) throw new Error('AI recipe insert RPC did not return a recipe.');
  return recipe;
}
