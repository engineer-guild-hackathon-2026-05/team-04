import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { DEMO_AUTH_COOKIE, hasDemoAuthCookie } from '@/lib/demoMode';
import { isIngredientCodeFormat, toIngredientCodeFromDbRow } from '@/lib/ingredientCodes';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { ProfileFallbackField, ProfilePayload, ProfileResponse, RestrictionReason } from '@/lib/apiTypes';

type PreferenceRow = {
  preferred_dishes?: string[] | null;
  preferred_cuisines?: string[] | null;
  non_ingredient_restrictions?: string[] | null;
  non_ingredient_restriction_reasons?: unknown;
};

type RestrictedJoinRow = {
  ingredient_id: string;
  reason: string | null;
  ingredients?: {
    ingredient_code?: string | null;
    name_ja?: string | null;
  } | null;
};

type ResolvedRestrictedIngredient = {
  id: string;
  ingredient_code?: string | null;
  name_ja?: string | null;
};

type ResolvedRestrictedIngredientRequest = {
  ingredientCodes: string[];
  resolvedIngredients: ResolvedRestrictedIngredient[];
};

class UnknownRestrictedIngredientCodesError extends Error {
  constructor(readonly codes: string[]) {
    super(`Unknown restricted ingredient codes: ${codes.join(', ')}`);
    this.name = 'UnknownRestrictedIngredientCodesError';
  }
}

const DEMO_PROFILE_NAME = 'デモユーザー';

const EMPTY_PROFILE: ProfilePayload = {
  userName: '旅するグルメ',
  restrictedIngredients: [],
  restrictedIngredientReasons: {},
  preferredDishes: [],
  preferredCuisines: [],
};

const RELIGIOUS_RESTRICTION_CODES = new Set(['ing-pork', 'ing-beef', 'ing-shrimp', 'ing-crab', 'ing-gelatin']);

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isRestrictionReason(value: unknown): value is RestrictionReason {
  return value === 'allergy' || value === 'dislike' || value === 'religious';
}

function normalizeRestrictionReasonMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, RestrictionReason] =>
        typeof entry[0] === 'string' && isRestrictionReason(entry[1]),
    ),
  );
}

function inferRestrictionReason(code: string): RestrictionReason {
  if (RELIGIOUS_RESTRICTION_CODES.has(code)) return 'religious';
  if (!code.startsWith('ing-')) return 'dislike';
  return 'allergy';
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

async function resolveRestrictedIngredients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestedCodes: string[],
): Promise<ResolvedRestrictedIngredientRequest> {
  const ingredientCodes = Array.from(new Set(requestedCodes.filter(isIngredientCodeFormat)));
  if (ingredientCodes.length === 0) return { ingredientCodes: [], resolvedIngredients: [] };

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
    throw new UnknownRestrictedIngredientCodesError(missingCodes);
  }

  return { ingredientCodes, resolvedIngredients };
}

async function replaceRestrictedIngredients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  restrictionRequest: ResolvedRestrictedIngredientRequest,
  restrictionReasons: Record<string, RestrictionReason>,
) {
  const { ingredientCodes, resolvedIngredients } = restrictionRequest;
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

  const existingReasonByIngredientId = new Map(
    ((existingRows ?? []) as RestrictedJoinRow[]).map((row) => [row.ingredient_id, row.reason] as const),
  );
  const savedReasons: Record<string, RestrictionReason> = {};
  const inserts = resolvedIngredients.map((ingredient) => {
    const code = ingredient.ingredient_code ?? null;
    const existingReason = existingReasonByIngredientId.get(ingredient.id);
    const reason = code
      ? restrictionReasons[code] ?? (isRestrictionReason(existingReason) ? existingReason : inferRestrictionReason(code))
      : 'allergy';
    if (code) savedReasons[code] = reason;

    return {
      user_id: userId,
      ingredient_id: ingredient.id,
      reason,
    };
  });

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('user_restricted_ingredients').insert(inserts);
    if (insertError) {
      await restoreRestrictedIngredientRows(supabase, userId, (existingRows ?? []) as RestrictedJoinRow[]);
      throw insertError;
    }
  }

  return { savedCodes: ingredientCodes, savedReasons, existingRows: existingRows ?? [] };
}

export async function GET() {
  if (await isDemoAuthenticated()) {
    return NextResponse.json({ ...EMPTY_PROFILE, userName: DEMO_PROFILE_NAME, source: 'demo' } satisfies ProfileResponse);
  }

  if (!hasSupabaseConfig()) {
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
    .select('preferred_dishes, preferred_cuisines, non_ingredient_restrictions, non_ingredient_restriction_reasons')
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
  const restrictedIngredientReasons = restrictedError
    ? {}
    : Object.fromEntries(
      ((restrictedRows ?? []) as RestrictedJoinRow[])
        .map((row) => {
          const code = toIngredientCodeFromDbRow(row.ingredients ?? {});
          if (!code) return null;
          return [code, isRestrictionReason(row.reason) ? row.reason : inferRestrictionReason(code)] as const;
        })
        .filter((entry): entry is readonly [string, RestrictionReason] => Boolean(entry)),
    );
  const preferenceRow = preferencesError ? {} as PreferenceRow : (preferences ?? {}) as PreferenceRow;
  const nonIngredientRestrictions = normalizeStringArray(preferenceRow.non_ingredient_restrictions);
  const nonIngredientRestrictionReasons = normalizeRestrictionReasonMap(preferenceRow.non_ingredient_restriction_reasons);
  const combinedRestrictedIngredients = [
    ...restrictedIngredients,
    ...nonIngredientRestrictions.filter((id) => !restrictedIngredients.includes(id)),
  ];

  return NextResponse.json({
    userName: profile?.name || fallbackName,
    restrictedIngredients: combinedRestrictedIngredients,
    restrictedIngredientReasons: {
      ...restrictedIngredientReasons,
      ...nonIngredientRestrictionReasons,
    },
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
  const requestedRestrictionReasons = normalizeRestrictionReasonMap(payload.restrictedIngredientReasons);

  if (await isDemoAuthenticated()) {
    return NextResponse.json({
      userName: requestedUserName,
      restrictedIngredients: requestedRestrictedIngredients,
      restrictedIngredientReasons: requestedRestrictionReasons,
      preferredDishes,
      preferredCuisines,
      source: 'demo',
    } satisfies ProfileResponse);
  }

  if (!hasSupabaseConfig()) {
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

  let resolvedRestrictedIngredients: ResolvedRestrictedIngredientRequest;
  try {
    resolvedRestrictedIngredients = await resolveRestrictedIngredients(supabase, requestedRestrictedIngredients);
  } catch (error) {
    if (error instanceof UnknownRestrictedIngredientCodesError) {
      return NextResponse.json({
        error: 'Unknown restricted ingredient codes.',
        unknownCodes: error.codes,
      }, { status: 400 });
    }
    throw error;
  }

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
      non_ingredient_restrictions: requestedRestrictedIngredients.filter((code) => !code.startsWith('ing-')),
      non_ingredient_restriction_reasons: Object.fromEntries(
        requestedRestrictedIngredients
          .filter((code) => !code.startsWith('ing-'))
          .map((code) => [code, requestedRestrictionReasons[code] ?? inferRestrictionReason(code)]),
      ),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (preferencesError) throw preferencesError;

  const { savedCodes, savedReasons } = await replaceRestrictedIngredients(
    supabase,
    user.id,
    resolvedRestrictedIngredients,
    requestedRestrictionReasons,
  );

  const localOnlyRestrictions = requestedRestrictedIngredients.filter((code) => !code.startsWith('ing-'));
  const localOnlyRestrictionReasons = Object.fromEntries(
    localOnlyRestrictions.map((code) => [code, requestedRestrictionReasons[code] ?? inferRestrictionReason(code)]),
  ) as Record<string, RestrictionReason>;
  const savedRestrictedIngredients = [
    ...savedCodes,
    ...localOnlyRestrictions,
  ];
  const savedRestrictedIngredientReasons = {
    ...savedReasons,
    ...localOnlyRestrictionReasons,
  };

  return NextResponse.json({
    userName,
    restrictedIngredients: savedRestrictedIngredients,
    restrictedIngredientReasons: savedRestrictedIngredientReasons,
    preferredDishes,
    preferredCuisines,
    source: 'database',
  } satisfies ProfileResponse);
}
