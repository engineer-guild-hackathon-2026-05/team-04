'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import ListView from './components/ListView';
import ProfileView from './components/ProfileView';
import RecipeModal from './components/RecipeModal';
import { INGREDIENT_MASTER, MOCK_RECIPES, type IngredientMaster, type Recipe } from '@/lib/mockData';
import type { IngredientsResponse, ProfileFallbackField, ProfilePayload, ProfileResponse, RecipesResponse } from '@/lib/apiTypes';

type CurrentView = 'landing' | 'list' | 'profile';
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type StoredProfile = {
  email?: string;
  userName?: string;
  restrictedIngredients?: string[];
  preferredDishes?: string[];
  preferredCuisines?: string[];
};

type ProfileSaveErrorResponse = {
  error?: string;
  unknownCodes?: string[];
};

const PROFILE_STORAGE_KEY = 'globalbites_profile';
const DEMO_PROFILE_STORAGE_KEY = 'globalbites_demo_profile';
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

function readDemoProfile() {
  return readStoredProfile(DEMO_PROFILE_STORAGE_KEY, 'demo profile');
}

function writeDemoProfile(updates: StoredProfile) {
  const current = readDemoProfile() ?? {};
  localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
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

function getProfileFallbackFields(remoteProfile: ProfileResponse | null) {
  if (!remoteProfile) return new Set<ProfileFallbackField>();
  if (remoteProfile.fallbackFields) return new Set(remoteProfile.fallbackFields);
  if (remoteProfile.source === 'local-fallback') {
    return new Set<ProfileFallbackField>(['userName', 'restrictedIngredients', 'preferences']);
  }
  return new Set<ProfileFallbackField>();
}

function mergeProfile(localProfile: StoredProfile | null, remoteProfile: ProfileResponse | null): ProfilePayload {
  const fallbackFields = getProfileFallbackFields(remoteProfile);
  const shouldUseLocalRestrictions = fallbackFields.has('restrictedIngredients');
  const shouldUseLocalPreferences = fallbackFields.has('preferences');
  const preserveLocalIngredientCodes = remoteProfile?.source === 'demo';

  return {
    userName: fallbackFields.has('userName')
      ? localProfile?.userName || remoteProfile?.userName || DEFAULT_USER_NAME
      : remoteProfile?.userName || localProfile?.userName || DEFAULT_USER_NAME,
    restrictedIngredients: shouldUseLocalRestrictions
      ? localProfile?.restrictedIngredients ?? []
      : Array.from(new Set([
        ...(remoteProfile?.restrictedIngredients ?? []),
        ...(localProfile?.restrictedIngredients ?? []).filter(
          (id) => preserveLocalIngredientCodes || !id.startsWith('ing-'),
        ),
      ])),
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>(DEFAULT_USER_NAME);
  const [restrictedIngredients, setRestrictedIngredients] = useState<string[]>([]);
  const [preferredDishes, setPreferredDishes] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<IngredientMaster[]>(INGREDIENT_MASTER);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const parsed = readStoredProfile(PROFILE_STORAGE_KEY, 'local storage profile');

    if (parsed?.userName) setUserName(parsed.userName);
    if (parsed?.restrictedIngredients) setRestrictedIngredients(parsed.restrictedIngredients);
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
        if (demoSession === 'authenticated') {
          const demoProfile = readDemoProfile();
          const merged = mergeProfile(demoProfile ?? null, {
            userName: demoProfile?.userName || demoProfile?.email?.split('@')[0] || 'デモユーザー',
            restrictedIngredients: demoProfile?.restrictedIngredients ?? [],
            preferredDishes: demoProfile?.preferredDishes ?? [],
            preferredCuisines: demoProfile?.preferredCuisines ?? [],
            source: 'demo',
          });
          setIsLoggedIn(true);
          setCurrentView('list');
          setUserName(merged.userName);
          setRestrictedIngredients(merged.restrictedIngredients);
          setPreferredDishes(merged.preferredDishes);
          setPreferredCuisines(merged.preferredCuisines);
          setAuthStatus('authenticated');
          return;
        }

        if (demoSession === 'failed') {
          console.error('Demo session check failed. Falling back to profile API auth.');
        }

        const remoteProfile = await fetchProfileFromApi();
        if (!remoteProfile) {
          setIsLoggedIn(false);
          setCurrentView('landing');
          setAuthStatus('unauthenticated');
          return;
        }

        const sourceProfile = remoteProfile.source === 'demo' ? readDemoProfile() : parsed;
        const merged = mergeProfile(sourceProfile, remoteProfile);
        setIsLoggedIn(true);
        setCurrentView('list');
        setUserName(merged.userName);
        setRestrictedIngredients(merged.restrictedIngredients);
        setPreferredDishes(merged.preferredDishes);
        setPreferredCuisines(merged.preferredCuisines);
        if (remoteProfile.source === 'demo') {
          writeDemoProfile(merged);
        } else {
          writeStoredProfile(merged);
        }
        setAuthStatus('authenticated');
      } catch (error) {
        console.error('Auth/profile sync failed. Treating the user as signed out.', error);
        setIsLoggedIn(false);
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
    await fetch('/auth/signout', { method: 'POST' }).catch(() => null);
    setIsLoggedIn(false);
    setUserName(DEFAULT_USER_NAME);
    setRestrictedIngredients([]);
    setPreferredDishes([]);
    setPreferredCuisines([]);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
    setCurrentView('landing');
    setAuthStatus('unauthenticated');
    router.push('/');
  };

  const handleSaveProfile = async (profile: ProfilePayload) => {
    const previousProfile: ProfilePayload = {
      userName,
      restrictedIngredients,
      preferredDishes,
      preferredCuisines,
    };

    setUserName(profile.userName);
    setRestrictedIngredients(profile.restrictedIngredients);
    setPreferredDishes(profile.preferredDishes);
    setPreferredCuisines(profile.preferredCuisines);

    setCurrentView('list');

    const demoSession = await fetchDemoSession();
    if (demoSession === 'authenticated') {
      writeDemoProfile(profile);
      return;
    }

    if (demoSession === 'failed') {
      console.error('Demo session check failed while saving profile. Falling back to profile API.');
    }

    try {
      const savedProfile = await saveProfileToApi(profile);
      if (!savedProfile) {
        saveToLocalStorage(profile);
        return;
      }
      const merged = mergeProfile(profile, savedProfile);
      setUserName(merged.userName);
      setRestrictedIngredients(merged.restrictedIngredients);
      setPreferredDishes(merged.preferredDishes);
      setPreferredCuisines(merged.preferredCuisines);
      if (savedProfile.source === 'demo') {
        writeDemoProfile(merged);
      } else {
        writeStoredProfile(merged);
      }
    } catch (dbErr) {
      if (dbErr instanceof ProfileSaveValidationError) {
        setUserName(previousProfile.userName);
        setRestrictedIngredients(previousProfile.restrictedIngredients);
        setPreferredDishes(previousProfile.preferredDishes);
        setPreferredCuisines(previousProfile.preferredCuisines);
        setCurrentView('profile');
        console.warn('Profile API rejected unknown restricted ingredient codes.', dbErr.unknownCodes);
        return;
      }
      if (demoSession !== 'failed') {
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
            recipes={recipes}
            restrictedIngredients={restrictedIngredients}
            preferredDishes={preferredDishes}
            preferredCuisines={preferredCuisines}
            onSelectRecipe={setSelectedRecipe}
            setCurrentView={setCurrentView}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            ingredientOptions={ingredientOptions}
            recipeOptions={recipes}
            initialUserName={userName}
            initialRestrictedIngredients={restrictedIngredients}
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
