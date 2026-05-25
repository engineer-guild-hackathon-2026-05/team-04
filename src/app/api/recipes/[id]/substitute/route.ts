import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSubstituteRequest, RecipeSubstituteResponse } from '@/lib/apiTypes';
import { generateRecipesWithOpenRouter, OpenRouterConfigError, OpenRouterResponseError } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { isUuid, mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { persistAiRecipe } from '@/lib/server/recipePersistence';
import { ServiceRoleConfigError } from '@/lib/supabase/serviceRole';
import { createClient } from '@/lib/supabase/server';

type RecipeIngredientRow = {
  quantity?: string | null;
  ingredients?: {
    id?: string | null;
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
  } | null;
};

type RecipeRow = {
  id: string;
  is_public?: boolean | null;
  created_by?: string | null;
  title?: string | null;
  description?: string | null;
  cuisine?: string | null;
  recipe_ingredients?: RecipeIngredientRow[] | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'persisted_recipe_required', '対象レシピを確認できませんでした。');
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return apiError(503, 'supabase_not_configured', 'Supabaseの設定が不足しています。');
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return apiError(401, 'authentication_required', 'ログイン後に日本の食材で再提案できます。');
  }

  const payload = await request.json().catch(() => ({})) as Partial<RecipeSubstituteRequest> | null;

  try {
    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        id,
        is_public,
        created_by,
        title,
        description,
        cuisine,
        recipe_ingredients (
          quantity,
          ingredients!recipe_ingredients_ingredient_id_fkey ( id, ingredient_code, name_ja, name_en )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (recipeError) throw recipeError;
    if (!recipeRow) {
      return apiError(404, 'recipe_not_found', '対象レシピを確認できませんでした。');
    }

    const recipe = recipeRow as RecipeRow;
    const isAuthorizedRecipe = recipe.is_public === true || recipe.created_by === user.id;
    if (!isAuthorizedRecipe) {
      return apiError(404, 'recipe_not_found', '対象レシピを確認できませんでした。');
    }

    const restrictionContext = await mergedRestrictionContext({
      supabase,
      userId: user.id,
      clientRestrictedIngredients: payload?.restrictedIngredients,
    });
    if ('error' in restrictionContext) {
      return apiError(400, 'invalid_restricted_ingredients', '利用できないNG材料が含まれています。', restrictionContext.unknownValues);
    }

    const originalIngredients = (recipe.recipe_ingredients ?? [])
      .map((row) => row.ingredients?.name_ja ? `${row.ingredients.name_ja}${row.quantity ? `（${row.quantity}）` : ''}` : null)
      .filter((item): item is string => Boolean(item));

    const [generatedRecipe] = await generateRecipesWithOpenRouter({
      purpose: 'substitute',
      count: 1,
      originalRecipe: {
        title: recipe.title ?? '保存済みレシピ',
        description: recipe.description ?? '',
        cuisine: recipe.cuisine ?? '世界',
        ingredients: originalIngredients,
      },
      restrictions: restrictionContext.restrictions,
      dietaryConstraints: restrictionContext.dietaryConstraints,
    });

    const substitutions = (recipe.recipe_ingredients ?? [])
      .map((row) => {
        const ingredientId = row.ingredients?.id;
        const ingredientNameJa = row.ingredients?.name_ja;
        if (!ingredientId || !ingredientNameJa) return null;
        return { ingredientNameJa, substitutedFromIngredientId: ingredientId };
      })
      .filter((item): item is { ingredientNameJa: string; substitutedFromIngredientId: string } => Boolean(item));

    const persistedRecipe = await persistAiRecipe({
      userId: user.id,
      recipe: generatedRecipe,
      parentRecipeId: id,
      substitutions,
    });
    const responseRecipe = {
      ...persistedRecipe,
      cultural_background: persistedRecipe.cultural_background ?? generatedRecipe.cultural_background,
    };

    return NextResponse.json({ recipe: responseRecipe } satisfies RecipeSubstituteResponse);
  } catch (error) {
    if (error instanceof OpenRouterConfigError || error instanceof ServiceRoleConfigError) {
      return apiError(503, 'server_ai_not_configured', 'AI再提案のサーバー設定が不足しています。');
    }
    if (error instanceof OpenRouterResponseError) {
      return apiError(502, 'ai_response_invalid', 'AIの応答を安全に利用できませんでした。');
    }
    console.warn('Failed to substitute AI recipe.', error);
    return apiError(500, 'ai_recipe_substitute_failed', '日本の食材で再提案できませんでした。');
  }
}
