import { NextResponse } from 'next/server';
import { mapRecipeRowToRecipe } from '@/lib/recipeMapping';
import { createPublicReadClient } from '@/lib/supabase/public';
import type { RecipesResponse } from '@/lib/apiTypes';

function unavailableResponse() {
  return NextResponse.json({ recipes: [], source: 'database' } satisfies RecipesResponse, { status: 503 });
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return unavailableResponse();
  }

  try {
    const supabase = createPublicReadClient();
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
          display_name_ja,
          preparation_tags,
          ingredients!recipe_ingredients_ingredient_id_fkey ( ingredient_code, name_ja, name_en, category, is_allergen, dietary_tags )
        ),
        recipe_culture_sections (
          section_key,
          label,
          title,
          body,
          sort_order
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const recipes = (data ?? [])
      .map((row) => mapRecipeRowToRecipe(row))
      .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

    return NextResponse.json({ recipes, source: 'database' } satisfies RecipesResponse);
  } catch (error) {
    console.error('Failed to load recipes from Supabase.', error);
    return unavailableResponse();
  }
}
