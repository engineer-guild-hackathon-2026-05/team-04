import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSuggestRequest, RecipeSuggestResponse } from '@/lib/apiTypes';
import { mapRecipeRowToRecipe } from '@/lib/recipeMapping';
import type { Recipe } from '@/lib/mockData';
import { OpenRouterConfigError, OpenRouterResponseError, selectRecipeIdsWithOpenRouter } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { getRecipeRouteUser, mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { createClient } from '@/lib/supabase/server';
import { includesRestrictedIngredientText, isDietaryConflictIngredient, type RestrictionFact } from '@/lib/recipeAi';

const MAX_RECIPE_CANDIDATES_FOR_AI = 40;

function normalizeMood(value: unknown) {
  if (typeof value !== 'string') return null;
  const mood = value.trim();
  if (!mood || mood.length > 160) return null;
  return mood;
}

type RecipeIngredientJoinRow = {
  display_name_ja?: string | null;
  preparation_tags?: string[] | null;
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
    category?: string | null;
    is_allergen?: boolean | null;
    dietary_tags?: string[] | null;
  } | null;
};

type RecipeCandidateRow = {
  recipe_ingredients?: RecipeIngredientJoinRow[] | null;
  is_vegan?: boolean | null;
};

function ingredientNames(row: RecipeCandidateRow) {
  return (row.recipe_ingredients ?? [])
    .flatMap((item) => {
      const ingredient = item.ingredients;
      return [
        ingredient?.ingredient_code,
        item.display_name_ja,
        ingredient?.name_ja,
        ingredient?.name_en,
      ].filter(Boolean);
    });
}

function includesRestrictedIngredient(row: RecipeCandidateRow, restrictions: RestrictionFact[]) {
  return includesRestrictedIngredientText(ingredientNames(row), restrictions);
}

function violatesDietaryConstraints(row: RecipeCandidateRow, dietaryConstraints: string[]) {
  if (dietaryConstraints.length === 0) return false;
  if (dietaryConstraints.includes('diet-vegan') && row.is_vegan !== true) return true;

  return (row.recipe_ingredients ?? []).some((item) => {
    const ingredient = item.ingredients;
    return isDietaryConflictIngredient({
      id: ingredient?.ingredient_code,
      name_ja: item.display_name_ja ?? ingredient?.name_ja,
      name_en: ingredient?.name_en,
      category: ingredient?.category,
      dietary_tags: ingredient?.dietary_tags,
    }, dietaryConstraints);
  });
}

async function fetchEdibleRecipeCandidates(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  restrictions: RestrictionFact[];
  dietaryConstraints: string[];
}): Promise<Recipe[]> {
  const { data, error } = await input.supabase
    .from('recipes')
    .select(`
      id,
      title,
      description,
      cuisine,
      flag,
      image_url,
      cook_time_min,
      servings,
      is_vegan,
      is_gluten_free,
      tags,
      cultural_background,
      parent_recipe_id,
      steps,
      recipe_ingredients (
        quantity,
        is_optional,
        display_name_ja,
        preparation_tags,
        ingredients!recipe_ingredients_ingredient_id_fkey ( ingredient_code, name_ja, name_en, category, is_allergen, dietary_tags )
      )
    `)
    .or(`is_public.eq.true,created_by.eq.${input.userId}`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return ((data ?? []) as RecipeCandidateRow[])
    .filter((row) => !includesRestrictedIngredient(row, input.restrictions))
    .filter((row) => !violatesDietaryConstraints(row, input.dietaryConstraints))
    .slice(0, MAX_RECIPE_CANDIDATES_FOR_AI)
    .map((row) => mapRecipeRowToRecipe(row))
    .filter((recipe): recipe is Recipe => Boolean(recipe));
}

export async function POST(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return apiError(503, 'supabase_not_configured', 'Supabaseの設定が不足しています。');
  }

  const user = await getRecipeRouteUser(supabase);
  if (!user) {
    return apiError(401, 'authentication_required', 'ログイン後にAIレシピ提案を利用できます。');
  }

  const payload = await request.json().catch(() => null) as Partial<RecipeSuggestRequest> | null;
  if (!payload) return apiError(400, 'invalid_json', 'リクエスト本文を確認してください。');

  const mood = normalizeMood(payload.mood);
  if (!mood) return apiError(400, 'invalid_mood', '気分や要望を1〜160文字で入力してください。');

  try {
    const restrictionContext = await mergedRestrictionContext({
      supabase,
      userId: user.id,
      clientRestrictedIngredients: payload.restrictedIngredients,
    });
    if ('error' in restrictionContext) {
      return apiError(400, 'invalid_restricted_ingredients', '利用できないNG材料が含まれています。', restrictionContext.unknownValues);
    }

    const candidates = await fetchEdibleRecipeCandidates({
      supabase,
      userId: user.id,
      restrictions: restrictionContext.restrictions,
      dietaryConstraints: restrictionContext.dietaryConstraints,
    });
    if (candidates.length < 3) {
      return apiError(422, 'not_enough_recipe_candidates', '条件に合うレシピが3件未満です。プロフィールの制限を見直してください。');
    }

    const selectedRecipeIds = await selectRecipeIdsWithOpenRouter({
      mood,
      count: 3,
      candidates,
    });

    const recipesById = new Map(candidates.map((recipe) => [recipe.id, recipe]));
    const recipes = selectedRecipeIds
      .map((id) => recipesById.get(id))
      .filter((recipe): recipe is Recipe => Boolean(recipe));

    return NextResponse.json({ recipes, source: 'ai' } satisfies RecipeSuggestResponse);
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      return apiError(503, 'server_ai_not_configured', 'AIレシピ提案のサーバー設定が不足しています。');
    }
    if (error instanceof OpenRouterResponseError) {
      return apiError(502, 'ai_response_invalid', 'AIの応答を安全に利用できませんでした。');
    }
    console.warn('Failed to suggest AI recipes.', error);
    return apiError(500, 'ai_recipe_suggest_failed', 'AIレシピ提案に失敗しました。');
  }
}
