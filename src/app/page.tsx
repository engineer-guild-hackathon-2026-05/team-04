'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import ListView from './components/ListView';
import ProfileView from './components/ProfileView';
import RecipeModal from './components/RecipeModal';
import { INGREDIENT_MASTER, Recipe } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';

type CurrentView = 'landing' | 'list' | 'profile';
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type RestrictionReason = 'allergy' | 'dislike' | 'religious';

type StoredProfile = {
  email?: string;
  userName?: string;
  restrictedIngredients?: string[];
  restrictedIngredientReasons?: Record<string, RestrictionReason>;
  preferredDishes?: string[];
  preferredCuisines?: string[];
};

const PROFILE_STORAGE_KEY = 'globalbites_profile';
const DEMO_PROFILE_STORAGE_KEY = 'globalbites_demo_profile';

const ingredientMasterIds = new Set(INGREDIENT_MASTER.map((ingredient) => ingredient.id));
const ingredientNameEnToLocalId = new Map(
  INGREDIENT_MASTER.map((ingredient) => [ingredient.name_en, ingredient.id]),
);
const ingredientByLocalId = new Map(
  INGREDIENT_MASTER.map((ingredient) => [ingredient.id, ingredient]),
);
const religiousRestrictionIds = new Set(['ing-pork', 'ing-beef', 'ing-shrimp', 'ing-crab', 'ing-gelatin']);

type RestrictedIngredientSyncResult =
  | { ok: true; localIds: string[]; reasons: Record<string, RestrictionReason> }
  | { ok: false; error: unknown };

type RestrictedIngredientDbRow = {
  ingredient_id: string;
  reason: string | null;
};

function readStoredProfile(storageKey: string, label: string) {
  const storedProfile = localStorage.getItem(storageKey);
  if (!storedProfile) return null;

  try {
    return JSON.parse(storedProfile) as StoredProfile;
  } catch (e) {
    console.error(`Failed to parse ${label}`, e);
    return null;
  }
}

function writeStoredProfile(updates: StoredProfile) {
  const current = readStoredProfile(PROFILE_STORAGE_KEY, 'local storage profile') ?? {};
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
}

function readDemoProfile() {
  return readStoredProfile(DEMO_PROFILE_STORAGE_KEY, 'demo profile');
}

function writeDemoProfile(updates: StoredProfile) {
  const current = readDemoProfile() ?? {};
  localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
}

function mergeSyncedRestrictedIngredients(localIds: string[], databaseIngredientIds: string[]) {
  const localOnlyRestrictionIds = localIds.filter((id) => !ingredientMasterIds.has(id));
  return Array.from(new Set([...databaseIngredientIds, ...localOnlyRestrictionIds]));
}

function isRestrictionReason(value: unknown): value is RestrictionReason {
  return value === 'allergy' || value === 'dislike' || value === 'religious';
}

function inferRestrictionReason(localId: string): RestrictionReason {
  if (religiousRestrictionIds.has(localId)) return 'religious';
  if (!ingredientMasterIds.has(localId)) return 'dislike';
  return 'allergy';
}

function mergeRestrictionReasons(
  selectedIds: string[],
  savedReasons: Record<string, RestrictionReason> = {},
) {
  return Object.fromEntries(
    selectedIds.map((id) => [id, savedReasons[id] ?? inferRestrictionReason(id)]),
  ) as Record<string, RestrictionReason>;
}

function localIngredients(localIds: string[]) {
  return localIds
    .map((id) => ingredientByLocalId.get(id))
    .filter((ingredient): ingredient is NonNullable<ReturnType<typeof ingredientByLocalId.get>> =>
      Boolean(ingredient),
    );
}

type DemoSessionStatus = 'authenticated' | 'unauthenticated' | 'disabled' | 'failed';

async function fetchDemoSession(): Promise<DemoSessionStatus> {
  const response = await fetch('/auth/demo', { cache: 'no-store' }).catch(() => null);
  if (!response) return 'failed';
  if (response.ok) return 'authenticated';
  if (response.status === 401) return 'unauthenticated';
  if (response.status === 404) return 'disabled';
  return 'failed';
}

async function fetchRestrictedIngredientLocalIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<RestrictedIngredientSyncResult> {
  const { data: restrictedRows, error: restrictedError } = await supabase
    .from('user_restricted_ingredients')
    .select('ingredient_id, reason')
    .eq('user_id', userId);

  if (restrictedError) return { ok: false, error: restrictedError };

  const ingredientIds = restrictedRows?.map((row) => row.ingredient_id).filter(Boolean) ?? [];
  if (ingredientIds.length === 0) return { ok: true, localIds: [], reasons: {} };

  const reasonByIngredientId = new Map<string, unknown>(
    restrictedRows
      ?.filter((row) => Boolean(row.ingredient_id))
      .map((row) => [row.ingredient_id, row.reason] as const) ?? [],
  );

  const { data: ingredients, error: ingredientError } = await supabase
    .from('ingredients')
    .select('id, name_en')
    .in('id', ingredientIds);

  if (ingredientError) return { ok: false, error: ingredientError };

  const syncedPairs = ingredients
    ?.map((ingredient) => {
      const localId = ingredientNameEnToLocalId.get(ingredient.name_en);
      if (!localId) return null;
      return {
        localId,
        reason: reasonByIngredientId.get(ingredient.id),
      };
    })
    .filter((pair): pair is { localId: string; reason: unknown } => Boolean(pair)) ?? [];

  return {
    ok: true,
    localIds: syncedPairs.map((pair) => pair.localId),
    reasons: Object.fromEntries(
      syncedPairs.map((pair) => [
        pair.localId,
        isRestrictionReason(pair.reason) ? pair.reason : inferRestrictionReason(pair.localId),
      ]),
    ) as Record<string, RestrictionReason>,
  };
}

async function restoreRestrictedIngredientRows(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rows: RestrictedIngredientDbRow[],
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
    console.warn('Failed to restore restricted ingredient rows after insert failure.', error);
  }
}

async function replaceRestrictedIngredients(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  localIds: string[],
  restrictionReasons: Record<string, RestrictionReason> = {},
) {
  const selectedIngredients = localIngredients(localIds);
  const uniqueNameEns = Array.from(new Set(selectedIngredients.map((ingredient) => ingredient.name_en)));
  let replacementIngredients: { id: string; name_en: string }[] = [];

  if (uniqueNameEns.length > 0) {
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('id, name_en')
      .in('name_en', uniqueNameEns);

    if (error) throw error;

    replacementIngredients = ingredients ?? [];
    if (replacementIngredients.length !== uniqueNameEns.length) {
      throw new Error('Some restricted ingredients could not be resolved before replacement.');
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('user_restricted_ingredients')
    .select('ingredient_id, reason')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const existingReasonByIngredientId = new Map(
    ((existingRows ?? []) as RestrictedIngredientDbRow[]).map((row) => [row.ingredient_id, row.reason]),
  );

  const inserts = replacementIngredients.map((ingredient) => {
    const localId = ingredientNameEnToLocalId.get(ingredient.name_en);
    return {
      user_id: userId,
      ingredient_id: ingredient.id,
      reason: localId
        ? (restrictionReasons[localId] ??
          (isRestrictionReason(existingReasonByIngredientId.get(ingredient.id))
            ? existingReasonByIngredientId.get(ingredient.id) as RestrictionReason
            : inferRestrictionReason(localId)))
        : 'allergy',
    };
  });

  const { error: deleteError } = await supabase
    .from('user_restricted_ingredients')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('user_restricted_ingredients').insert(inserts);
    if (insertError) {
      await restoreRestrictedIngredientRows(
        supabase,
        userId,
        (existingRows ?? []) as RestrictedIngredientDbRow[],
      );
      throw insertError;
    }
  }
}

export default function Home() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<CurrentView>('list');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('ゲスト愛好家');
  const [restrictedIngredients, setRestrictedIngredients] = useState<string[]>([]);
  const [restrictedIngredientReasons, setRestrictedIngredientReasons] = useState<Record<string, RestrictionReason>>({});
  const [preferredDishes, setPreferredDishes] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const parsed = readStoredProfile(PROFILE_STORAGE_KEY, 'local storage profile');
    const locallyStoredRestrictedIngredients = parsed?.restrictedIngredients ?? [];

    if (parsed?.userName) setUserName(parsed.userName);
    if (parsed?.restrictedIngredients) {
      setRestrictedIngredients(parsed.restrictedIngredients);
      setRestrictedIngredientReasons(
        mergeRestrictionReasons(parsed.restrictedIngredients, parsed.restrictedIngredientReasons),
      );
    }
    if (parsed?.preferredDishes) setPreferredDishes(parsed.preferredDishes);
    if (parsed?.preferredCuisines) setPreferredCuisines(parsed.preferredCuisines);

    const syncSupabaseSession = async () => {
      try {
        const demoSession = await fetchDemoSession();
        if (demoSession === 'authenticated') {
          const demoProfile = readDemoProfile();
          setIsLoggedIn(true);
          setCurrentView('list');
          setUserName(
            parsed?.userName || demoProfile?.userName || demoProfile?.email?.split('@')[0] || 'デモユーザー',
          );
          setAuthStatus('authenticated');
          return;
        }

        if (demoSession === 'failed') {
          console.error('Demo session check failed. Falling back to Supabase auth.');
        }

        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setIsLoggedIn(false);
          setCurrentView('landing');
          setAuthStatus('unauthenticated');
          return;
        }

        setIsLoggedIn(true);
        setCurrentView('list');

        const fallbackName =
          session.user.user_metadata?.name ||
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          '旅するグルメ';
        setUserName(fallbackName);

        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileError) throw profileError;

          if (profile?.name) {
            setUserName(profile.name);
            writeStoredProfile({ userName: profile.name });
          }

          const restrictedIngredientSync = await fetchRestrictedIngredientLocalIds(
            supabase,
            session.user.id,
          );

          if (restrictedIngredientSync.ok) {
            const mergedRestrictedIngredients = mergeSyncedRestrictedIngredients(
              locallyStoredRestrictedIngredients,
              restrictedIngredientSync.localIds,
            );
            setRestrictedIngredients(mergedRestrictedIngredients);
            const mergedRestrictionReasons = mergeRestrictionReasons(
              mergedRestrictedIngredients,
              { ...parsed?.restrictedIngredientReasons, ...restrictedIngredientSync.reasons },
            );
            setRestrictedIngredientReasons(mergedRestrictionReasons);
            writeStoredProfile({
              restrictedIngredients: mergedRestrictedIngredients,
              restrictedIngredientReasons: mergedRestrictionReasons,
            });
          } else {
            console.warn(
              'Supabase restricted ingredient sync failed. Keeping local restrictions.',
              restrictedIngredientSync.error,
            );
          }
        } catch (profileSyncError) {
          console.warn('Authenticated session kept, but profile preference sync failed.', profileSyncError);
        }

        setAuthStatus('authenticated');
      } catch (error) {
        console.error('Auth session sync failed. Treating the user as signed out.', error);
        setIsLoggedIn(false);
        setCurrentView('landing');
        setAuthStatus('unauthenticated');
      }
    };

    void syncSupabaseSession();
  }, []);

  const saveToLocalStorage = (updates: StoredProfile) => {
    const current: StoredProfile = {
      userName: updates.userName !== undefined ? updates.userName : userName,
      restrictedIngredients:
        updates.restrictedIngredients !== undefined
          ? updates.restrictedIngredients
          : restrictedIngredients,
      restrictedIngredientReasons:
        updates.restrictedIngredientReasons !== undefined
          ? updates.restrictedIngredientReasons
          : restrictedIngredientReasons,
      preferredDishes: updates.preferredDishes !== undefined ? updates.preferredDishes : preferredDishes,
      preferredCuisines:
        updates.preferredCuisines !== undefined ? updates.preferredCuisines : preferredCuisines,
    };
    writeStoredProfile(current);
  };

  const handleNavigateHome = () => {
    if (isLoggedIn) {
      setCurrentView('list');
      router.push('/app');
      return;
    }

    setCurrentView('landing');
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/login?redirect=/app');
  };

  const handleSignOut = async () => {
    const demoSession = await fetchDemoSession();
    await fetch('/auth/demo', { method: 'DELETE' }).catch(() => null);

    if (demoSession !== 'authenticated') {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    setIsLoggedIn(false);
    setUserName('ゲスト愛好家');
    setRestrictedIngredients([]);
    setRestrictedIngredientReasons({});
    setPreferredDishes([]);
    setPreferredCuisines([]);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
    setCurrentView('landing');
    setAuthStatus('unauthenticated');
    router.push('/');
  };

  const handleSaveProfile = async (profile: {
    userName: string;
    restrictedIngredients: string[];
    restrictedIngredientReasons: Record<string, RestrictionReason>;
    preferredDishes: string[];
    preferredCuisines: string[];
  }) => {
    setUserName(profile.userName);
    setRestrictedIngredients(profile.restrictedIngredients);
    setRestrictedIngredientReasons(profile.restrictedIngredientReasons);
    setPreferredDishes(profile.preferredDishes);
    setPreferredCuisines(profile.preferredCuisines);

    saveToLocalStorage({
      userName: profile.userName,
      restrictedIngredients: profile.restrictedIngredients,
      restrictedIngredientReasons: profile.restrictedIngredientReasons,
      preferredDishes: profile.preferredDishes,
      preferredCuisines: profile.preferredCuisines,
    });

    setCurrentView('list');

    const demoSession = await fetchDemoSession();
    if (demoSession === 'authenticated') {
      writeDemoProfile({
        userName: profile.userName,
        restrictedIngredients: profile.restrictedIngredients,
        restrictedIngredientReasons: profile.restrictedIngredientReasons,
        preferredDishes: profile.preferredDishes,
        preferredCuisines: profile.preferredCuisines,
      });
      return;
    }
    if (demoSession === 'failed') {
      console.error('Demo session check failed while saving profile. Falling back to Supabase auth.');
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ name: profile.userName })
        .eq('id', user.id);
      if (profileUpdateError) throw profileUpdateError;

      await replaceRestrictedIngredients(
        supabase,
        user.id,
        profile.restrictedIngredients,
        profile.restrictedIngredientReasons,
      );
    } catch (dbErr) {
      console.warn('Supabase DB update failed. Synchronized locally.', dbErr);
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="app-container">
        <main className="main-content auth-loading-content">
          <section className="auth-loading-card" role="status" aria-live="polite">
            <div className="auth-loading-spinner" aria-hidden="true" />
            <p className="auth-loading-title">ログイン状態を確認しています...</p>
            <p className="auth-loading-copy">保存されたセッションを確認し、レシピ一覧へ移動します。</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        setCurrentView={setCurrentView}
        onNavigateHome={handleNavigateHome}
        userName={userName}
        isLoggedIn={isLoggedIn}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main className="main-content">
        {authStatus === 'unauthenticated' && currentView === 'landing' && (
          <LandingView onSignIn={handleSignIn} />
        )}

        {currentView === 'list' && (
          <ListView
            restrictedIngredients={restrictedIngredients}
            preferredDishes={preferredDishes}
            preferredCuisines={preferredCuisines}
            onSelectRecipe={setSelectedRecipe}
            setCurrentView={setCurrentView}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            initialUserName={userName}
            initialRestrictedIngredients={restrictedIngredients}
            initialRestrictedIngredientReasons={restrictedIngredientReasons}
            initialPreferredDishes={preferredDishes}
            initialPreferredCuisines={preferredCuisines}
            onSaveProfile={handleSaveProfile}
            onBackToRecipes={() => setCurrentView('list')}
          />
        )}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        restrictedIngredients={restrictedIngredients}
      />
    </div>
  );
}
