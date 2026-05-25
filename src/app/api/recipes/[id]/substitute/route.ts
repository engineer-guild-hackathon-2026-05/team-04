import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSubstituteRequest, RecipeSubstituteResponse } from '@/lib/apiTypes';
import type { IngredientMaster } from '@/lib/mockData';
import { OpenRouterConfigError, OpenRouterResponseError, selectIngredientSubstitutionsWithOpenRouter } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { getRecipeRouteUser, isUuid, mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { createClient } from '@/lib/supabase/server';
import { includesRestrictedIngredientText, isDietaryConflictIngredient } from '@/lib/recipeAi';

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
  recipe_ingredients?: RecipeIngredientRow[] | null;
};

type IngredientCatalogRow = {
  ingredient_code?: string | null;
  name_ja?: string | null;
  name_en?: string | null;
  category?: string | null;
  dietary_tags?: string[] | null;
};

type OriginalIngredient = {
  name_ja: string;
  quantity?: string;
};

function mapIngredientCatalogRow(row: IngredientCatalogRow): IngredientMaster | null {
  if (!row.ingredient_code || !row.name_ja) return null;
  return {
    id: row.ingredient_code,
    name_ja: row.name_ja,
    name_en: row.name_en ?? row.ingredient_code,
    category: row.category ?? 'その他',
    dietary_tags: row.dietary_tags ?? [],
  };
}

function originalIngredientsFromRecipe(recipe: RecipeRow): OriginalIngredient[] {
  return (recipe.recipe_ingredients ?? [])
    .map((row): OriginalIngredient | null => {
      const name = row.ingredients?.name_ja?.trim();
      if (!name) return null;
      const quantity = row.quantity?.trim();
      return {
        name_ja: name,
        ...(quantity ? { quantity } : {}),
      };
    })
    .filter((ingredient): ingredient is OriginalIngredient => Boolean(ingredient));
}

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

  const user = await getRecipeRouteUser(supabase);
  if (!user) {
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
    const isAuthorizedRecipe = recipe.is_public === true || (user.source === 'supabase' && recipe.created_by === user.id);
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

    const { data: ingredientRows, error: ingredientError } = await supabase
      .from('ingredients')
      .select('ingredient_code, name_ja, name_en, category, dietary_tags')
      .order('name_ja', { ascending: true });

    if (ingredientError) throw ingredientError;

    const candidateIngredients = ((ingredientRows ?? []) as IngredientCatalogRow[])
      .map(mapIngredientCatalogRow)
      .filter((ingredient): ingredient is IngredientMaster => Boolean(ingredient))
      .filter((ingredient) =>
        !includesRestrictedIngredientText([ingredient.id, ingredient.name_ja, ingredient.name_en], restrictionContext.restrictions))
      .filter((ingredient) => !isDietaryConflictIngredient(ingredient, restrictionContext.dietaryConstraints));

    const originalIngredients = originalIngredientsFromRecipe(recipe);
    const selections = await selectIngredientSubstitutionsWithOpenRouter({
      originalIngredients,
      candidates: candidateIngredients,
    });

    const ingredientsById = new Map(candidateIngredients.map((ingredient) => [ingredient.id, ingredient]));
    const quantityByName = new Map(originalIngredients.map((ingredient) => [ingredient.name_ja, ingredient.quantity]));
    const substitutions = selections.map((selection) => {
      const substituteIngredient = ingredientsById.get(selection.substituteIngredientId);
      if (!substituteIngredient) {
        throw new OpenRouterResponseError('AIの代替食材が候補外でした。');
      }
      return {
        originalIngredientName: selection.originalIngredientName,
        ...(quantityByName.get(selection.originalIngredientName) ? { originalQuantity: quantityByName.get(selection.originalIngredientName) } : {}),
        substituteIngredient,
        reason: selection.reason,
        ...(selection.usageNote ? { usageNote: selection.usageNote } : {}),
      };
    });

    return NextResponse.json({ substitutions, source: 'ai' } satisfies RecipeSubstituteResponse);
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      return apiError(503, 'server_ai_not_configured', 'AI再提案のサーバー設定が不足しています。');
    }
    if (error instanceof OpenRouterResponseError) {
      return apiError(502, 'ai_response_invalid', 'AIの応答を安全に利用できませんでした。');
    }
    console.warn('Failed to suggest ingredient substitutions.', error);
    return apiError(500, 'ingredient_substitute_failed', '日本の食材で再提案できませんでした。');
  }
}
