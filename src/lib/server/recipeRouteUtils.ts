import 'server-only';

import type { createClient } from '@/lib/supabase/server';
import { parseRestrictionInput, restrictionFactsFromMaster, validateKnownRestrictionCodes, type ParsedRestrictionInput, type RestrictionFact } from '@/lib/recipeAi';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RestrictedJoinRow = {
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
    dietary_tags?: string[] | null;
  } | null;
};

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function splitRestrictionInput(value: unknown): ParsedRestrictionInput | { error: string; unknownValues: string[] } {
  const parsed = parseRestrictionInput(value);
  if ('error' in parsed) return parsed;

  const unknownIngredientCodes = validateKnownRestrictionCodes(parsed.ingredientCodes);
  if (unknownIngredientCodes.length > 0) {
    return { error: 'Unknown restricted ingredient codes.', unknownValues: unknownIngredientCodes };
  }

  return parsed;
}

export async function readUserRestrictionFacts(supabase: SupabaseServerClient, userId: string): Promise<RestrictionFact[]> {
  const { data, error } = await supabase
    .from('user_restricted_ingredients')
    .select('ingredients ( ingredient_code, name_ja, name_en, dietary_tags )')
    .eq('user_id', userId);

  if (error) throw error;

  return ((data ?? []) as RestrictedJoinRow[])
    .map((row): RestrictionFact | null => {
      const ingredient = row.ingredients;
      if (!ingredient?.ingredient_code || !ingredient.name_ja) return null;
      return {
        id: ingredient.ingredient_code,
        name_ja: ingredient.name_ja,
        name_en: ingredient.name_en ?? ingredient.ingredient_code,
        dietary_tags: ingredient.dietary_tags ?? [],
      };
    })
    .filter((item): item is RestrictionFact => Boolean(item));
}

export async function mergedRestrictionContext(input: {
  supabase: SupabaseServerClient;
  userId: string;
  clientRestrictedIngredients: unknown;
}) {
  const parsed = splitRestrictionInput(input.clientRestrictedIngredients);
  if ('error' in parsed) return parsed;

  const savedFacts = await readUserRestrictionFacts(input.supabase, input.userId);
  const clientFacts = restrictionFactsFromMaster(parsed.ingredientCodes);
  const factsById = new Map<string, RestrictionFact>();

  for (const fact of [...savedFacts, ...clientFacts]) {
    factsById.set(fact.id, fact);
  }

  return {
    restrictions: Array.from(factsById.values()),
    dietaryConstraints: parsed.dietaryConstraints,
  };
}
