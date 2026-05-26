import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSubstituteRequest, RecipeSubstituteResponse } from '@/lib/apiTypes';
import type { IngredientMaster } from '@/lib/mockData';
import { OpenRouterConfigError, OpenRouterResponseError, selectIngredientSubstitutionsWithOpenRouter } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { getRecipeRouteUser, isUuid, mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { createClient } from '@/lib/supabase/server';
import { includesRestrictedIngredientText, isDietaryConflictIngredient, type RestrictionFact } from '@/lib/recipeAi';
import { violatesPreparationRestrictions } from '@/lib/preparationRestrictions';

const MAX_SUBSTITUTE_CANDIDATES_FOR_AI = 80;
const FETCH_SUBSTITUTE_CANDIDATE_PAGE_SIZE = 200;
const MAX_SUBSTITUTE_CANDIDATE_PAGES = 10;
const SHELLFISH_INGREDIENT_CODES = new Set(['ing-shrimp', 'ing-crab', 'ing-squid', 'ing-abalone']);
const FISH_INGREDIENT_CODES = new Set(['ing-salmon', 'ing-mackerel', 'ing-roe']);
const SHELLFISH_TERMS = /えび|海老|かに|蟹|いか|イカ|あわび|貝|牡蠣|ホタテ|shrimp|prawn|crab|squid|abalone|shellfish|oyster|scallop/i;
const FISH_TERMS = /魚|さけ|鮭|さば|鯖|まぐろ|ツナ|いくら|fish|salmon|mackerel|tuna|roe/i;

type RecipeIngredientRow = {
  display_name_ja?: string | null;
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
      const name = row.display_name_ja?.trim() || row.ingredients?.name_ja?.trim();
      if (!name) return null;
      const quantity = row.quantity?.trim();
      return {
        name_ja: name,
        ...(quantity ? { quantity } : {}),
      };
    })
    .filter((ingredient): ingredient is OriginalIngredient => Boolean(ingredient));
}

function inferredPreparationTags(ingredient: IngredientMaster) {
  const tags = new Set<string>();
  const dietaryTags = new Set(ingredient.dietary_tags ?? []);
  const text = [ingredient.id, ingredient.name_ja, ingredient.name_en, ingredient.category].join('\n');
  const isShellfish = SHELLFISH_INGREDIENT_CODES.has(ingredient.id) ||
    dietaryTags.has('shellfish') ||
    SHELLFISH_TERMS.test(text);
  const isFish = FISH_INGREDIENT_CODES.has(ingredient.id) ||
    dietaryTags.has('fish') ||
    FISH_TERMS.test(text);

  if (isShellfish || isFish) {
    tags.add('raw');
    tags.add('seafood');
  }
  if (isShellfish) tags.add('shellfish');
  if (isFish) tags.add('fish');

  return Array.from(tags);
}

function violatesPreparationCandidateConstraints(
  ingredient: IngredientMaster,
  preparationRestrictions: string[],
) {
  if (preparationRestrictions.length === 0) return false;

  return violatesPreparationRestrictions({
    ingredients: [{
      id: ingredient.id,
      name_ja: ingredient.name_ja,
      quantity: '',
      is_optional: false,
      category: ingredient.category,
      dietary_tags: ingredient.dietary_tags,
      preparation_tags: inferredPreparationTags(ingredient),
    }],
  }, preparationRestrictions);
}

async function fetchSubstituteCandidateIngredients(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  restrictions: RestrictionFact[];
  dietaryConstraints: string[];
  preparationRestrictions: string[];
}) {
  const candidateIngredients: IngredientMaster[] = [];
  let page = 0;

  while (candidateIngredients.length < MAX_SUBSTITUTE_CANDIDATES_FOR_AI && page < MAX_SUBSTITUTE_CANDIDATE_PAGES) {
    const from = page * FETCH_SUBSTITUTE_CANDIDATE_PAGE_SIZE;
    const to = from + FETCH_SUBSTITUTE_CANDIDATE_PAGE_SIZE - 1;
    const { data, error } = await input.supabase
      .from('ingredients')
      .select('ingredient_code, name_ja, name_en, category, dietary_tags')
      .order('name_ja', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = (data ?? []) as IngredientCatalogRow[];
    for (const row of rows) {
      const ingredient = mapIngredientCatalogRow(row);
      if (!ingredient) continue;
      if (includesRestrictedIngredientText([ingredient.id, ingredient.name_ja, ingredient.name_en], input.restrictions)) continue;
      if (isDietaryConflictIngredient(ingredient, input.dietaryConstraints)) continue;
      if (violatesPreparationCandidateConstraints(ingredient, input.preparationRestrictions)) continue;

      candidateIngredients.push(ingredient);
      if (candidateIngredients.length >= MAX_SUBSTITUTE_CANDIDATES_FOR_AI) break;
    }

    if (rows.length < FETCH_SUBSTITUTE_CANDIDATE_PAGE_SIZE) break;
    page += 1;
  }

  return candidateIngredients;
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

  const payload = await request.json().catch(() => null) as Partial<RecipeSubstituteRequest> | null;
  if (!payload) return apiError(400, 'invalid_json', 'リクエスト本文を確認してください。');

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
          display_name_ja,
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

    const candidateIngredients = await fetchSubstituteCandidateIngredients({
      supabase,
      restrictions: restrictionContext.restrictions,
      dietaryConstraints: restrictionContext.dietaryConstraints,
      preparationRestrictions: restrictionContext.preparationRestrictions,
    });

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
