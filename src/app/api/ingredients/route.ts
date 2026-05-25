import { NextResponse } from 'next/server';
import { INGREDIENT_MASTER } from '@/lib/mockData';
import { normalizeIngredientOption } from '@/lib/ingredientCodes';
import { createClient } from '@/lib/supabase/server';
import type { IngredientsResponse } from '@/lib/apiTypes';

function fallbackResponse() {
  return NextResponse.json({ ingredients: INGREDIENT_MASTER, source: 'fallback' } satisfies IngredientsResponse);
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return fallbackResponse();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
      .select('ingredient_code, name_ja, name_en, category, dietary_tags')
      .eq('is_allergen', true)
      .order('category', { ascending: true })
      .order('name_ja', { ascending: true });

    if (error) throw error;

    const ingredients = (data ?? [])
      .map((row) => normalizeIngredientOption(row))
      .filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient));

    if (ingredients.length === 0) return fallbackResponse();

    return NextResponse.json({ ingredients, source: 'database' } satisfies IngredientsResponse);
  } catch (error) {
    console.warn('Failed to load ingredients from Supabase. Falling back to bundled master.', error);
    return fallbackResponse();
  }
}
