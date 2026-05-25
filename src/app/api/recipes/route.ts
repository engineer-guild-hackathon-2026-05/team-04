import { NextResponse } from 'next/server';
import { fallbackRecipes, mapRecipeRowToRecipe } from '@/lib/recipeMapping';
import { createClient } from '@/lib/supabase/server';
import type { RecipesResponse } from '@/lib/apiTypes';

function fallbackResponse() {
  return NextResponse.json({ recipes: fallbackRecipes(), source: 'fallback' } satisfies RecipesResponse);
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fallbackResponse();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
        steps,
        recipe_ingredients (
          quantity,
          is_optional,
          ingredients ( ingredient_code, name_ja, name_en )
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const recipes = (data ?? [])
      .map((row) => mapRecipeRowToRecipe(row))
      .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

    if (recipes.length === 0) return fallbackResponse();

    return NextResponse.json({ recipes, source: 'database' } satisfies RecipesResponse);
  } catch (error) {
    console.warn('Failed to load recipes from Supabase. Falling back to bundled recipes.', error);
    return fallbackResponse();
  }
}
