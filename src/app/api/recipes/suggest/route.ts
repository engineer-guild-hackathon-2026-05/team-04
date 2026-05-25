import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSuggestRequest, RecipeSuggestResponse } from '@/lib/apiTypes';
import { mapRecipeRowToRecipe } from '@/lib/recipeMapping';
import type { Recipe } from '@/lib/mockData';
import { OpenRouterConfigError, OpenRouterResponseError, selectRecipeIdsWithOpenRouter } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { createClient } from '@/lib/supabase/server';
import type { RestrictionFact } from '@/lib/recipeAi';

function normalizeMood(value: unknown) {
  if (typeof value !== 'string') return null;
  const mood = value.trim();
  if (!mood || mood.length > 160) return null;
  return mood;
}

type RecipeIngredientJoinRow = {
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
  } | null;
};

type RecipeCandidateRow = {
  recipe_ingredients?: RecipeIngredientJoinRow[] | null;
  is_vegan?: boolean | null;
};

const MEAT_PATTERNS = [
  /牛肉|豚肉|鶏肉|羊肉|肉|ハム|ベーコン|ソーセージ|鴨|ラム/,
  /beef|pork|chicken|meat|ham|bacon|sausage|duck|lamb|mutton/i,
];

const SEAFOOD_PATTERNS = [
  /魚|さけ|鮭|さば|鯖|まぐろ|ツナ|えび|海老|かに|蟹|いか|イカ|たこ|タコ|あわび|いくら|貝|牡蠣|ホタテ/,
  /fish|salmon|mackerel|tuna|shrimp|prawn|crab|squid|octopus|abalone|roe|shellfish|oyster|scallop/i,
];

const EGG_PATTERNS = [/卵|玉子|たまご|エッグ/, /egg/i];
const DAIRY_PATTERNS = [/乳|牛乳|バター|チーズ|ヨーグルト|クリーム|ミルク/, /milk|butter|cheese|yogurt|cream|dairy/i];
const OTHER_ANIMAL_PRODUCT_PATTERNS = [/ゼラチン|はちみつ|蜂蜜|ラード|ブイヨン|コンソメ/, /gelatin|honey|lard|bouillon|consomme|stock/i];

function includesAnyPattern(haystack: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(haystack));
}

function ingredientNames(row: RecipeCandidateRow) {
  return (row.recipe_ingredients ?? [])
    .flatMap((item) => {
      const ingredient = item.ingredients;
      return [ingredient?.ingredient_code, ingredient?.name_ja, ingredient?.name_en].filter(Boolean);
    });
}

function includesRestrictedIngredient(row: RecipeCandidateRow, restrictions: RestrictionFact[]) {
  if (restrictions.length === 0) return false;
  const haystack = ingredientNames(row).join('\n').toLowerCase();
  return restrictions.some((restriction) =>
    [restriction.id, restriction.name_ja, restriction.name_en]
      .filter(Boolean)
      .some((name) => haystack.includes(name.toLowerCase())),
  );
}

function violatesDietaryConstraints(row: RecipeCandidateRow, dietaryConstraints: string[]) {
  if (dietaryConstraints.length === 0) return false;
  const haystack = ingredientNames(row).join('\n');
  const hasMeat = includesAnyPattern(haystack, MEAT_PATTERNS);
  const hasSeafood = includesAnyPattern(haystack, SEAFOOD_PATTERNS);
  const hasEgg = includesAnyPattern(haystack, EGG_PATTERNS);
  const hasDairy = includesAnyPattern(haystack, DAIRY_PATTERNS);
  const hasOtherAnimal = includesAnyPattern(haystack, OTHER_ANIMAL_PRODUCT_PATTERNS);

  if (dietaryConstraints.includes('diet-vegan')) {
    return row.is_vegan !== true || hasMeat || hasSeafood || hasEgg || hasDairy || hasOtherAnimal;
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
        ingredients!recipe_ingredients_ingredient_id_fkey ( ingredient_code, name_ja, name_en )
      )
    `)
    .or(`is_public.eq.true,created_by.eq.${input.userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as RecipeCandidateRow[])
    .filter((row) => !includesRestrictedIngredient(row, input.restrictions))
    .filter((row) => !violatesDietaryConstraints(row, input.dietaryConstraints))
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
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
