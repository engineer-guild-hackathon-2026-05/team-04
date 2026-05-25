import { NextResponse, type NextRequest } from 'next/server';
import { RecipeSuggestRequest, RecipeSuggestResponse } from '@/lib/apiTypes';
import { generateRecipesWithOpenRouter, OpenRouterConfigError, OpenRouterResponseError } from '@/lib/server/openRouter';
import { apiError } from '@/lib/server/apiErrors';
import { mergedRestrictionContext } from '@/lib/server/recipeRouteUtils';
import { persistAiRecipes } from '@/lib/server/recipePersistence';
import { ServiceRoleConfigError } from '@/lib/supabase/serviceRole';
import { createClient } from '@/lib/supabase/server';

function normalizeMood(value: unknown) {
  if (typeof value !== 'string') return null;
  const mood = value.trim();
  if (!mood || mood.length > 160) return null;
  return mood;
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

    const generatedRecipes = await generateRecipesWithOpenRouter({
      purpose: 'suggest',
      mood,
      count: 3,
      restrictions: restrictionContext.restrictions,
      dietaryConstraints: restrictionContext.dietaryConstraints,
    });

    const recipes = await persistAiRecipes(
      generatedRecipes.map((generatedRecipe) => ({ userId: user.id, recipe: generatedRecipe })),
    );

    return NextResponse.json({ recipes, source: 'ai' } satisfies RecipeSuggestResponse);
  } catch (error) {
    if (error instanceof OpenRouterConfigError || error instanceof ServiceRoleConfigError) {
      return apiError(503, 'server_ai_not_configured', 'AIレシピ提案のサーバー設定が不足しています。');
    }
    if (error instanceof OpenRouterResponseError) {
      return apiError(502, 'ai_response_invalid', 'AIの応答を安全に利用できませんでした。');
    }
    console.warn('Failed to suggest AI recipes.', error);
    return apiError(500, 'ai_recipe_suggest_failed', 'AIレシピ提案に失敗しました。');
  }
}
