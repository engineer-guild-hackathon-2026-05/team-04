import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { DEMO_AUTH_COOKIE, hasDemoAuthCookie } from '@/lib/demoMode';
import { isIngredientCodeFormat, toIngredientCodeFromDbRow } from '@/lib/ingredientCodes';
import { createClient } from '@/lib/supabase/server';
import type { ProfileFallbackField, ProfilePayload, ProfileResponse } from '@/lib/apiTypes';

type PreferenceRow = {
  preferred_dishes?: string[] | null;
  preferred_cuisines?: string[] | null;
};

type RestrictedJoinRow = {
  ingredient_id: string;
  reason: string | null;
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
  } | null;
};

const DEMO_PROFILE_NAME = 'デモユーザー';

const EMPTY_PROFILE: ProfilePayload = {
  userName: '旅するグルメ',
  restrictedIngredients: [],
  preferredDishes: [],
  preferredCuisines: [],
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

async function isDemoAuthenticated() {
  const cookieStore = await cookies();
  return hasDemoAuthCookie(cookieStore.get(DEMO_AUTH_COOKIE)?.value);
}

async function restoreRestrictedIngredientRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rows: RestrictedJoinRow[],
) {
  if (rows.length === 0) return;

  const { error } = await supabase.from('user_restricted_ingredients').insert(
    rows.map((row) => ({
      user_id: userId,
      ingredient_id: row.ingredient_id,
      reason: row.reason ?? 'allergy',
    })),
  );

  if (error) {
    console.warn('Failed to restore restricted ingredient rows after profile API insert failure.', error);
  }
}

async function replaceRestrictedIngredients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedCodes: string[],
) {
  const ingredientCodes = Array.from(new Set(requestedCodes.filter(isIngredientCodeFormat)));
  if (ingredientCodes.length === 0) {
    const { data: existingRows, error: existingError } = await supabase
      .from('user_restricted_ingredients')
      .select('ingredient_id, reason')
      .eq('user_id', userId);
    if (existingError) throw existingError;

    const { error: deleteError } = await supabase
      .from('user_restricted_ingredients')
      .delete()
      .eq('user_id', userId);
    if (deleteError) throw deleteError;

    return { savedCodes: [], existingRows: existingRows ?? [] };
  }

  const { data: ingredients, error: lookupError } = await supabase
    .from('ingredients')
    .select('id, ingredient_code, name_ja')
    .in('ingredient_code', ingredientCodes);

  if (lookupError) throw lookupError;

  const resolvedIngredients = ingredients ?? [];
  const resolvedCodes = new Set(
    resolvedIngredients
      .map((ingredient) => ingredient.ingredient_code)
      .filter((code): code is string => Boolean(code)),
  );

  const missingCodes = ingredientCodes.filter((code) => !resolvedCodes.has(code));
  if (missingCodes.length > 0) {
    throw new Error(`Some restricted ingredients could not be resolved: ${missingCodes.join(', ')}`);
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('user_restricted_ingredients')
    .select('ingredient_id, reason')
    .eq('user_id', userId);
  if (existingError) throw existingError;

  const { error: deleteError } = await supabase
    .from('user_restricted_ingredients')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  const inserts = resolvedIngredients.map((ingredient) => ({
    user_id: userId,
    ingredient_id: ingredient.id,
    reason: 'allergy',
  }));

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('user_restricted_ingredients').insert(inserts);
    if (insertError) {
      await restoreRestrictedIngredientRows(supabase, userId, (existingRows ?? []) as RestrictedJoinRow[]);
      throw insertError;
    }
  }

  return { savedCodes: ingredientCodes, existingRows: existingRows ?? [] };
}

export async function GET() {
  if (await isDemoAuthenticated()) {
    return NextResponse.json({ ...EMPTY_PROFILE, userName: DEMO_PROFILE_NAME, source: 'demo' } satisfies ProfileResponse);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const fallbackName =
    user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0] || EMPTY_PROFILE.userName;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: restrictedRows, error: restrictedError } = await supabase
    .from('user_restricted_ingredients')
    .select('ingredient_id, reason, ingredients ( ingredient_code, name_ja )')
    .eq('user_id', user.id);

  const { data: preferences, error: preferencesError } = await supabase
    .from('user_preferences')
    .select('preferred_dishes, preferred_cuisines')
    .eq('user_id', user.id)
    .maybeSingle();

  const fallbackFields: ProfileFallbackField[] = [];
  if (profileError) {
    fallbackFields.push('userName');
    console.warn('Failed to read profiles. Falling back to local profile name on the client.', profileError);
  }
  if (restrictedError) {
    fallbackFields.push('restrictedIngredients');
    console.warn('Failed to read user_restricted_ingredients. Falling back to local restrictions on the client.', restrictedError);
  }
  if (preferencesError) {
    fallbackFields.push('preferences');
    console.warn('Failed to read user_preferences. Falling back to local preferences on the client.', preferencesError);
  }

  const source: ProfileResponse['source'] = fallbackFields.length === 0
    ? 'database'
    : fallbackFields.length === 3
      ? 'local-fallback'
      : 'partial-fallback';

  const restrictedIngredients = restrictedError
    ? []
    : ((restrictedRows ?? []) as RestrictedJoinRow[])
      .map((row) => toIngredientCodeFromDbRow(row.ingredients ?? {}))
      .filter((code): code is string => Boolean(code));
  const preferenceRow = preferencesError ? {} as PreferenceRow : (preferences ?? {}) as PreferenceRow;

  return NextResponse.json({
    userName: profile?.name || fallbackName,
    restrictedIngredients,
    preferredDishes: preferenceRow.preferred_dishes ?? [],
    preferredCuisines: preferenceRow.preferred_cuisines ?? [],
    source,
    ...(fallbackFields.length > 0 ? { fallbackFields } : {}),
  } satisfies ProfileResponse);
}

export async function PUT(request: NextRequest) {
  const payload = await request.json().catch(() => null) as Partial<ProfilePayload> | null;
  if (!payload) return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });

  const submittedUserName = typeof payload.userName === 'string' && payload.userName.trim()
    ? payload.userName.trim()
    : null;
  const requestedUserName = submittedUserName ?? DEMO_PROFILE_NAME;
  const preferredDishes = normalizeStringArray(payload.preferredDishes);
  const preferredCuisines = normalizeStringArray(payload.preferredCuisines);
  const requestedRestrictedIngredients = normalizeStringArray(payload.restrictedIngredients);

  if (await isDemoAuthenticated()) {
    return NextResponse.json({
      userName: requestedUserName,
      restrictedIngredients: requestedRestrictedIngredients,
      preferredDishes,
      preferredCuisines,
      source: 'demo',
    } satisfies ProfileResponse);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userName = submittedUserName
    ?? user.user_metadata?.name
    ?? user.email?.split('@')[0]
    ?? EMPTY_PROFILE.userName;

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, name: userName }, { onConflict: 'id' });
  if (profileError) throw profileError;

  const { error: preferencesError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      preferred_dishes: preferredDishes,
      preferred_cuisines: preferredCuisines,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (preferencesError) throw preferencesError;

  const { savedCodes } = await replaceRestrictedIngredients(supabase, user.id, requestedRestrictedIngredients);

  const localOnlyRestrictions = requestedRestrictedIngredients.filter((code) => !code.startsWith('ing-'));
  const savedRestrictedIngredients = [
    ...savedCodes,
    ...localOnlyRestrictions,
  ];

  return NextResponse.json({
    userName,
    restrictedIngredients: savedRestrictedIngredients,
    preferredDishes,
    preferredCuisines,
    source: 'database',
  } satisfies ProfileResponse);
}
