import 'server-only';

import { cookies } from 'next/headers';
import { DEMO_AUTH_COOKIE, hasDemoAuthCookie } from '@/lib/demoMode';
import type { createClient } from '@/lib/supabase/server';
import { parseRestrictionInput, type ParsedRestrictionInput, type RestrictionFact } from '@/lib/recipeAi';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type RecipeRouteUser = {
  id: string;
  source: 'supabase' | 'demo';
};

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
  return parseRestrictionInput(value);
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

export async function readRestrictionFactsByCodes(
  supabase: SupabaseServerClient,
  codes: string[],
): Promise<RestrictionFact[] | { error: string; unknownValues: string[] }> {
  if (codes.length === 0) return [];

  const { data, error } = await supabase
    .from('ingredients')
    .select('ingredient_code, name_ja, name_en, dietary_tags')
    .in('ingredient_code', codes);

  if (error) throw error;

  const facts = ((data ?? []) as Array<{
    ingredient_code?: string | null;
    name_ja?: string | null;
    name_en?: string | null;
    dietary_tags?: string[] | null;
  }>)
    .map((ingredient): RestrictionFact | null => {
      if (!ingredient.ingredient_code || !ingredient.name_ja) return null;
      return {
        id: ingredient.ingredient_code,
        name_ja: ingredient.name_ja,
        name_en: ingredient.name_en ?? ingredient.ingredient_code,
        dietary_tags: ingredient.dietary_tags ?? [],
      };
    })
    .filter((item): item is RestrictionFact => Boolean(item));

  const resolvedCodes = new Set(facts.map((fact) => fact.id));
  const unknownValues = codes.filter((code) => !resolvedCodes.has(code));
  if (unknownValues.length > 0) {
    return { error: 'Unknown restricted ingredient codes.', unknownValues };
  }

  return facts;
}

export async function getRecipeRouteUser(supabase: SupabaseServerClient): Promise<RecipeRouteUser | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!userError && user) {
    return { id: user.id, source: 'supabase' };
  }

  const cookieStore = await cookies();
  if (hasDemoAuthCookie(cookieStore.get(DEMO_AUTH_COOKIE)?.value)) {
    return { id: '00000000-0000-0000-0000-000000000000', source: 'demo' };
  }

  return null;
}

export async function mergedRestrictionContext(input: {
  supabase: SupabaseServerClient;
  userId: string;
  clientRestrictedIngredients: unknown;
}) {
  const parsed = splitRestrictionInput(input.clientRestrictedIngredients);
  if ('error' in parsed) return parsed;

  const savedFacts = input.userId === '00000000-0000-0000-0000-000000000000'
    ? []
    : await readUserRestrictionFacts(input.supabase, input.userId);
  const clientFacts = await readRestrictionFactsByCodes(input.supabase, parsed.ingredientCodes);
  if ('error' in clientFacts) return clientFacts;
  const factsById = new Map<string, RestrictionFact>();

  for (const fact of [...savedFacts, ...clientFacts]) {
    factsById.set(fact.id, fact);
  }

  return {
    restrictions: Array.from(factsById.values()),
    dietaryConstraints: parsed.dietaryConstraints,
  };
}
