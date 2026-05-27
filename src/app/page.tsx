'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import ListView from './components/ListView';
import ProfileView from './components/ProfileView';
import RecipeModal from './components/RecipeModal';
import { INGREDIENT_MASTER, type IngredientMaster, type Recipe } from '@/lib/mockData';
import type {
  ApiErrorResponse,
  IngredientSubstitution,
  IngredientsResponse,
  ProfileFallbackField,
  ProfilePayload,
  ProfileResponse,
  RecipeSuggestResponse,
  RecipeSubstituteResponse,
  RecipesResponse,
  RestrictionReason,
} from '@/lib/apiTypes';
import { DEMO_SESSION_STORAGE_KEY, LEGACY_DEMO_PROFILE_STORAGE_KEY, LEGACY_DEMO_SESSION_STORAGE_KEY } from '@/lib/demoSessionKeys';

type CurrentView = 'landing' | 'list' | 'profile';
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
type AiRequestStatus = 'idle' | 'loading' | 'success' | 'error';

type StoredProfile = {
  email?: string;
  userName?: string;
  restrictedIngredients?: string[];
  restrictedIngredientReasons?: Record<string, RestrictionReason>;
  preferredDishes?: string[];
  preferredCuisines?: string[];
};

type ProfileSaveErrorResponse = {
  error?: string;
  unknownCodes?: string[];
};

const PROFILE_STORAGE_KEY = 'edible_profile';
const LEGACY_PROFILE_STORAGE_KEY = 'globalbites_profile';
const DEFAULT_USER_NAME = 'ゲスト愛好家';

class ProfileSaveValidationError extends Error {
  constructor(readonly unknownCodes: string[]) {
    super('Unknown restricted ingredient codes.');
    this.name = 'ProfileSaveValidationError';
  }
}

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

type DemoSessionStatus = 'authenticated' | 'unauthenticated' | 'disabled' | 'failed';

type DemoSessionResult = {
  status: 'authenticated';
  sessionId: string;
  userName?: string;
} | {
  status: Exclude<DemoSessionStatus, 'authenticated'>;
};

async function fetchDemoSession(): Promise<DemoSessionResult> {
  const response = await fetch('/auth/demo', { cache: 'no-store' }).catch(() => null);
  if (!response) return { status: 'failed' };
  if (response.ok) {
    const data = await response.json().catch(() => null) as { sessionId?: string; userName?: string } | null;
    if (data?.sessionId) {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, data.sessionId);
      localStorage.removeItem(LEGACY_DEMO_SESSION_STORAGE_KEY);
      return { status: 'authenticated', sessionId: data.sessionId, userName: data.userName };
    }
    return { status: 'failed' };
  }
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 404) return { status: 'disabled' };
  return { status: 'failed' };
}

async function fetchProfileFromApi() {
  const response = await fetch('/api/me/profile', { cache: 'no-store' });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Profile API failed: ${response.status}`);
  return (await response.json()) as ProfileResponse;
}

async function saveProfileToApi(profile: ProfilePayload) {
  const response = await fetch('/api/me/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ProfileSaveErrorResponse | null;
    if (response.status >= 400 && response.status < 500 && Array.isArray(body?.unknownCodes)) {
      throw new ProfileSaveValidationError(body.unknownCodes);
    }
    throw new Error(`Profile save API failed: ${response.status}`);
  }
  return (await response.json()) as ProfileResponse;
}

function getAiRecipeErrorMessage(status: number, body: ApiErrorResponse | null, fallback: string) {
  if (status === 401) return 'ログイン後にAIレシピ提案を利用できます。';
  const rawMessage = body?.error;
  return typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage.trim() : fallback;
}

function mergeRecipesById(currentRecipes: Recipe[], incomingRecipes: Recipe[]) {
  const currentRecipeById = new Map(currentRecipes.map((recipe) => [recipe.id, recipe]));
  const seen = new Set<string>();
  return [...incomingRecipes.map((recipe) => currentRecipeById.get(recipe.id) ?? recipe), ...currentRecipes].filter((recipe) => {
    if (seen.has(recipe.id)) return false;
    seen.add(recipe.id);
    return true;
  });
}

function buildSubstituteCacheKey(recipeId: string, restrictedIngredients: string[]) {
  return `${recipeId}:${[...restrictedIngredients].sort().join('|')}`;
}

function getProfileFallbackFields(remoteProfile: ProfileResponse | null) {
  if (!remoteProfile) return new Set<ProfileFallbackField>();
  if (remoteProfile.fallbackFields) return new Set(remoteProfile.fallbackFields);
  if (remoteProfile.source === 'local-fallback') {
    return new Set<ProfileFallbackField>(['userName', 'restrictedIngredients', 'preferences']);
  }
  return new Set<ProfileFallbackField>();
}

function buildRestrictionReasons(
  restrictedIngredients: string[],
  ...reasonMaps: Array<Record<string, RestrictionReason> | undefined>
) {
  return Object.fromEntries(
    restrictedIngredients.flatMap((id) => {
      const reason = reasonMaps.find((map) => map?.[id])?.[id];
      return reason ? [[id, reason] as const] : [];
    }),
  ) as Record<string, RestrictionReason>;
}

function getAuthenticatedInitialView(remoteProfile: ProfileResponse | null): CurrentView {
  return remoteProfile?.needsProfileSetup ? 'profile' : 'list';
}

function mergeProfile(localProfile: StoredProfile | null, remoteProfile: ProfileResponse | null): ProfilePayload {
  const fallbackFields = getProfileFallbackFields(remoteProfile);
  const shouldUseLocalRestrictions = fallbackFields.has('restrictedIngredients');
  const preserveLocalIngredientCodes = false;
  const shouldUseLocalUserName = fallbackFields.has('userName');
  const shouldUseLocalPreferences = fallbackFields.has('preferences');
  const restrictedIngredients = shouldUseLocalRestrictions
    ? localProfile?.restrictedIngredients ?? []
    : Array.from(new Set([
      ...(remoteProfile?.restrictedIngredients ?? []),
      ...(localProfile?.restrictedIngredients ?? []).filter(
        (id) => preserveLocalIngredientCodes || !id.startsWith('ing-'),
      ),
    ]));

  return {
    userName: shouldUseLocalUserName
      ? localProfile?.userName || remoteProfile?.userName || DEFAULT_USER_NAME
      : remoteProfile?.userName || localProfile?.userName || DEFAULT_USER_NAME,
    restrictedIngredients,
    restrictedIngredientReasons: shouldUseLocalRestrictions
      ? buildRestrictionReasons(restrictedIngredients, localProfile?.restrictedIngredientReasons)
      : buildRestrictionReasons(
        restrictedIngredients,
        remoteProfile?.restrictedIngredientReasons,
        localProfile?.restrictedIngredientReasons,
      ),
    preferredDishes: shouldUseLocalPreferences
      ? localProfile?.preferredDishes ?? []
      : remoteProfile?.preferredDishes ?? localProfile?.preferredDishes ?? [],
    preferredCuisines: shouldUseLocalPreferences
      ? localProfile?.preferredCuisines ?? []
      : remoteProfile?.preferredCuisines ?? localProfile?.preferredCuisines ?? [],
  };
}

export default function Home() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<CurrentView>('list');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [isProfileSetupRequired, setIsProfileSetupRequired] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>(DEFAULT_USER_NAME);
  const [restrictedIngredients, setRestrictedIngredients] = useState<string[]>([]);
  const [restrictedIngredientReasons, setRestrictedIngredientReasons] = useState<Record<string, RestrictionReason>>({});
  const [preferredDishes, setPreferredDishes] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<IngredientMaster[]>(INGREDIENT_MASTER);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestStatus, setSuggestStatus] = useState<AiRequestStatus>('idle');
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestedRecipeCount, setSuggestedRecipeCount] = useState(0);
  const [substituteStatus, setSubstituteStatus] = useState<AiRequestStatus>('idle');
  const [substituteError, setSubstituteError] = useState<string | null>(null);
  const [substituteSuggestions, setSubstituteSuggestions] = useState<IngredientSubstitution[]>([]);
  const [substituteCache, setSubstituteCache] = useState<Record<string, IngredientSubstitution[]>>({});
  const selectedRecipeIdRef = useRef<string | null>(null);
  const activeSubstituteKeyRef = useRef<string | null>(null);
  const substituteRequestSeqRef = useRef(0);
  const selectedRecipeId = selectedRecipe?.id ?? null;

  useEffect(() => {
    selectedRecipeIdRef.current = selectedRecipeId;
    activeSubstituteKeyRef.current = selectedRecipeId
      ? buildSubstituteCacheKey(selectedRecipeId, restrictedIngredients)
      : null;
    substituteRequestSeqRef.current += 1;
    setSubstituteSuggestions([]);
    setSubstituteStatus('idle');
    setSubstituteError(null);
  }, [selectedRecipeId, restrictedIngredients]);

  useEffect(() => {
    const parsed = readStoredProfile(PROFILE_STORAGE_KEY, 'local storage profile')
      ?? readStoredProfile(LEGACY_PROFILE_STORAGE_KEY, 'legacy local storage profile');

    if (parsed?.userName) setUserName(parsed.userName);
    if (parsed?.restrictedIngredients) setRestrictedIngredients(parsed.restrictedIngredients);
    if (parsed?.restrictedIngredientReasons) setRestrictedIngredientReasons(parsed.restrictedIngredientReasons);
    if (parsed?.preferredDishes) setPreferredDishes(parsed.preferredDishes);
    if (parsed?.preferredCuisines) setPreferredCuisines(parsed.preferredCuisines);

    const loadSharedData = async () => {
      const [ingredientsResult, recipesResult] = await Promise.allSettled([
        fetch('/api/ingredients', { cache: 'no-store' }),
        fetch('/api/recipes', { cache: 'no-store' }),
      ]);

      if (ingredientsResult.status === 'fulfilled' && ingredientsResult.value.ok) {
        const payload = (await ingredientsResult.value.json()) as IngredientsResponse;
        if (payload.ingredients.length > 0) setIngredientOptions(payload.ingredients);
      }

      if (recipesResult.status === 'fulfilled' && recipesResult.value.ok) {
        const payload = (await recipesResult.value.json()) as RecipesResponse;
        if (payload.recipes.length > 0) setRecipes(payload.recipes);
      }
    };

    const syncSessionAndProfile = async () => {
      try {
        void loadSharedData();

        const demoSession = await fetchDemoSession();
        if (demoSession.status === 'authenticated') {
          const remoteProfile = await fetchProfileFromApi();
          if (!remoteProfile) {
            setIsLoggedIn(false);
            setCurrentView('landing');
            setAuthStatus('unauthenticated');
            return;
          }

          const merged = mergeProfile(null, remoteProfile);
          setIsLoggedIn(true);
          setCurrentView(new URLSearchParams(window.location.search).get('view') === 'profile' ? 'profile' : 'list');
          setUserName(merged.userName);
          setRestrictedIngredients(merged.restrictedIngredients);
          setRestrictedIngredientReasons(merged.restrictedIngredientReasons);
          setPreferredDishes(merged.preferredDishes);
          setPreferredCuisines(merged.preferredCuisines);
          setAuthStatus('authenticated');
          return;
        }

        if (demoSession.status === 'failed') {
          console.error('Demo session check failed. Falling back to profile API auth.');
        }

        const remoteProfile = await fetchProfileFromApi();
        if (!remoteProfile) {
          setIsLoggedIn(false);
          setIsProfileSetupRequired(false);
          setCurrentView('landing');
          setAuthStatus('unauthenticated');
          return;
        }

        const merged = mergeProfile(parsed, remoteProfile);
        setIsLoggedIn(true);
        setIsProfileSetupRequired(Boolean(remoteProfile.needsProfileSetup));
        setCurrentView(getAuthenticatedInitialView(remoteProfile));
        setUserName(merged.userName);
        setRestrictedIngredients(merged.restrictedIngredients);
        setRestrictedIngredientReasons(merged.restrictedIngredientReasons);
        setPreferredDishes(merged.preferredDishes);
        setPreferredCuisines(merged.preferredCuisines);
        writeStoredProfile(merged);
        setAuthStatus('authenticated');
      } catch (error) {
        console.error('Auth/profile sync failed. Treating the user as signed out.', error);
        setIsLoggedIn(false);
        setIsProfileSetupRequired(false);
        setCurrentView('landing');
        setAuthStatus('unauthenticated');
      }
    };

    void syncSessionAndProfile();
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
    if (isProfileSetupRequired) {
      setCurrentView('profile');
      router.push('/app');
      return;
    }

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

  const handleSignUp = () => {
    router.push('/login?mode=signup&redirect=/app');
  };

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' }).catch(() => null);
    setIsLoggedIn(false);
    setUserName(DEFAULT_USER_NAME);
    setRestrictedIngredients([]);
    setRestrictedIngredientReasons({});
    setPreferredDishes([]);
    setPreferredCuisines([]);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DEMO_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DEMO_PROFILE_STORAGE_KEY);
    setCurrentView('landing');
    setIsProfileSetupRequired(false);
    setAuthStatus('unauthenticated');
    router.push('/');
  };

  const handleSuggestRecipes = async (mood: string) => {
    const trimmedMood = mood.trim();
    if (!trimmedMood) {
      setSuggestStatus('error');
      setSuggestError('気分や食べたい雰囲気を入力してください。');
      setSuggestedRecipeCount(0);
      return;
    }

    setSuggestStatus('loading');
    setSuggestError(null);
    setSuggestedRecipeCount(0);

    try {
      const response = await fetch('/api/recipes/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mood: trimmedMood,
          locale: 'ja',
          restrictedIngredients,
        }),
      });
      const body = await response.json().catch(() => null) as RecipeSuggestResponse | ApiErrorResponse | null;

      if (!response.ok) {
        throw new Error(getAiRecipeErrorMessage(response.status, body && 'error' in body ? body : null, 'AIレシピ提案に失敗しました。時間をおいて再試行してください。'));
      }

      const suggestedRecipes = body && 'recipes' in body && Array.isArray(body.recipes) ? body.recipes : [];
      if (suggestedRecipes.length === 0) {
        throw new Error('提案できるレシピが見つかりませんでした。別の気分でお試しください。');
      }

      setRecipes((currentRecipes) => mergeRecipesById(currentRecipes, suggestedRecipes));
      setSelectedRecipe((currentRecipe) => {
        if (!currentRecipe) return currentRecipe;
        return suggestedRecipes.find((recipe) => recipe.id === currentRecipe.id) ?? currentRecipe;
      });
      setSuggestedRecipeCount(suggestedRecipes.length);
      setSuggestStatus('success');
    } catch (error) {
      setSuggestStatus('error');
      setSuggestError(error instanceof Error ? error.message : 'AIレシピ提案に失敗しました。');
      setSuggestedRecipeCount(0);
    }
  };

  const handleSubstituteRecipe = async (recipeId: string) => {
    const substituteCacheKey = buildSubstituteCacheKey(recipeId, restrictedIngredients);
    if (selectedRecipeIdRef.current !== recipeId || activeSubstituteKeyRef.current !== substituteCacheKey) {
      return;
    }

    const cachedSubstitutions = substituteCache[substituteCacheKey];
    if (cachedSubstitutions) {
      setSubstituteSuggestions(cachedSubstitutions);
      setSubstituteStatus('success');
      setSubstituteError(null);
      return;
    }

    const requestSeq = substituteRequestSeqRef.current + 1;
    substituteRequestSeqRef.current = requestSeq;
    setSubstituteStatus('loading');
    setSubstituteError(null);
    setSubstituteSuggestions([]);

    try {
      const response = await fetch(`/api/recipes/${recipeId}/substitute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          restrictedIngredients,
        }),
      });
      const body = await response.json().catch(() => null) as RecipeSubstituteResponse | ApiErrorResponse | null;

      if (!response.ok) {
        throw new Error(getAiRecipeErrorMessage(response.status, body && 'error' in body ? body : null, '日本の食材での再提案に失敗しました。時間をおいて再試行してください。'));
      }

      const substitutions = body && 'substitutions' in body && Array.isArray(body.substitutions) ? body.substitutions : [];
      setSubstituteCache((currentCache) => ({ ...currentCache, [substituteCacheKey]: substitutions }));
      if (
        substituteRequestSeqRef.current !== requestSeq ||
        selectedRecipeIdRef.current !== recipeId ||
        activeSubstituteKeyRef.current !== substituteCacheKey
      ) {
        return;
      }
      setSubstituteSuggestions(substitutions);
      setSubstituteStatus('success');
    } catch (error) {
      if (
        substituteRequestSeqRef.current !== requestSeq ||
        selectedRecipeIdRef.current !== recipeId ||
        activeSubstituteKeyRef.current !== substituteCacheKey
      ) {
        return;
      }
      setSubstituteStatus('error');
      setSubstituteError(error instanceof Error ? error.message : '日本の食材での再提案に失敗しました。');
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    selectedRecipeIdRef.current = recipe.id;
    activeSubstituteKeyRef.current = buildSubstituteCacheKey(recipe.id, restrictedIngredients);
    substituteRequestSeqRef.current += 1;
    setSubstituteSuggestions([]);
    setSubstituteStatus('idle');
    setSubstituteError(null);
    setSelectedRecipe(recipe);
  };

  const handleCloseRecipeModal = () => {
    selectedRecipeIdRef.current = null;
    activeSubstituteKeyRef.current = null;
    substituteRequestSeqRef.current += 1;
    setSelectedRecipe(null);
    setSubstituteSuggestions([]);
    setSubstituteStatus('idle');
    setSubstituteError(null);
  };

  const handleSaveProfile = async (profile: ProfilePayload) => {
    const previousProfile: ProfilePayload = {
      userName,
      restrictedIngredients,
      restrictedIngredientReasons,
      preferredDishes,
      preferredCuisines,
    };

    setUserName(profile.userName);
    setRestrictedIngredients(profile.restrictedIngredients);
    setRestrictedIngredientReasons(profile.restrictedIngredientReasons);
    setPreferredDishes(profile.preferredDishes);
    setPreferredCuisines(profile.preferredCuisines);

    if (!isProfileSetupRequired) {
      setCurrentView('list');
    }

    const demoSession = await fetchDemoSession();
    if (demoSession.status === 'failed') {
      console.error('Demo session check failed while saving profile. Falling back to profile API.');
    }

    try {
      const savedProfile = await saveProfileToApi(profile);
      if (!savedProfile) {
        if (isProfileSetupRequired) {
          setCurrentView('profile');
          console.warn('Profile setup could not be completed because authentication expired.');
          throw new Error('ログイン状態を確認できませんでした。再度ログインしてプロフィール設定を保存してください。');
        }
        saveToLocalStorage(profile);
        return;
      }
      const merged = mergeProfile(profile, savedProfile);
      setUserName(merged.userName);
      setRestrictedIngredients(merged.restrictedIngredients);
      setRestrictedIngredientReasons(merged.restrictedIngredientReasons);
      setPreferredDishes(merged.preferredDishes);
      setPreferredCuisines(merged.preferredCuisines);
      if (savedProfile.source !== 'demo') {
        writeStoredProfile(merged);
      }
      setIsProfileSetupRequired(false);
      setCurrentView('list');
    } catch (dbErr) {
      if (dbErr instanceof ProfileSaveValidationError) {
        setUserName(previousProfile.userName);
        setRestrictedIngredients(previousProfile.restrictedIngredients);
        setRestrictedIngredientReasons(previousProfile.restrictedIngredientReasons);
        setPreferredDishes(previousProfile.preferredDishes);
        setPreferredCuisines(previousProfile.preferredCuisines);
        setCurrentView('profile');
        console.warn('Profile API rejected unknown restricted ingredient codes.', dbErr.unknownCodes);
        throw new Error('保存できない制限項目が含まれています。選択内容を確認してください。');
      }
      if (isProfileSetupRequired) {
        setCurrentView('profile');
        console.warn('Profile setup could not be completed until the database profile save succeeds.', dbErr);
        throw new Error(
          dbErr instanceof Error && dbErr.message.startsWith('ログイン状態')
            ? dbErr.message
            : 'プロフィール設定を保存できませんでした。通信状態を確認してもう一度お試しください。',
        );
      }
      if (demoSession.status !== 'failed') {
        saveToLocalStorage(profile);
      }
      console.warn('Profile API update failed. Synchronized locally.', dbErr);
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="app-container">
        <main className="main-content auth-loading-content">
          <section className="auth-loading-card" role="status" aria-live="polite">
            <div className="auth-loading-spinner" aria-hidden="true" />
            <p className="auth-loading-title">ログイン状態を確認しています...</p>
            <p className="auth-loading-copy">保存されたセッションを確認し、初回はプロフィール設定へ案内します。</p>
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
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
      />

      <main className="main-content">
        {authStatus === 'unauthenticated' && currentView === 'landing' && (
          <LandingView previewRecipes={recipes.length > 0 ? recipes.slice(0, 3) : undefined} />
        )}

        {currentView === 'list' && !isProfileSetupRequired && (
          <ListView
            recipes={recipes}
            restrictedIngredients={restrictedIngredients}
            preferredDishes={preferredDishes}
            preferredCuisines={preferredCuisines}
            onSelectRecipe={handleSelectRecipe}
            setCurrentView={setCurrentView}
            onSuggestRecipes={handleSuggestRecipes}
            suggestStatus={suggestStatus}
            suggestError={suggestError}
            suggestedRecipeCount={suggestedRecipeCount}
          />
        )}

        {(currentView === 'profile' || isProfileSetupRequired) && (
          <ProfileView
            ingredientOptions={ingredientOptions}
            recipeOptions={recipes}
            initialUserName={userName}
            initialRestrictedIngredients={restrictedIngredients}
            initialRestrictedIngredientReasons={restrictedIngredientReasons}
            initialPreferredDishes={preferredDishes}
            initialPreferredCuisines={preferredCuisines}
            onSaveProfile={handleSaveProfile}
            onBackToRecipes={() => setCurrentView('list')}
            isSetupRequired={isProfileSetupRequired}
          />
        )}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        recipes={recipes}
        onClose={handleCloseRecipeModal}
        onSelectRecipe={setSelectedRecipe}
        restrictedIngredients={restrictedIngredients}
        onSubstituteRecipe={handleSubstituteRecipe}
        substituteStatus={substituteStatus}
        substituteError={substituteError}
        substituteSuggestions={substituteSuggestions}
      />
    </div>
  );
}
