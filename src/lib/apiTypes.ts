import type { IngredientMaster, Recipe } from './mockData';

export type RestrictionReason = 'allergy' | 'dislike' | 'religious';

export type ProfilePayload = {
  userName: string;
  restrictedIngredients: string[];
  restrictedIngredientReasons: Record<string, RestrictionReason>;
  preferredDishes: string[];
  preferredCuisines: string[];
};

export type IngredientsResponse = {
  ingredients: IngredientMaster[];
  source: 'database' | 'fallback';
};

export type ProfileFallbackField = 'userName' | 'restrictedIngredients' | 'preferences';

export type ProfileResponse = ProfilePayload & {
  source: 'database' | 'demo' | 'local-fallback' | 'partial-fallback';
  fallbackFields?: ProfileFallbackField[];
};

export type RecipesResponse = {
  recipes: Recipe[];
  source: 'database';
};

export type ApiErrorResponse = {
  error: string;
  code: string;
  details?: unknown;
};

export type RecipeSuggestRequest = {
  mood: string;
  locale?: 'ja';
  restrictedIngredients?: string[];
};

export type RecipeSuggestResponse = {
  recipes: Recipe[];
  source: 'ai';
};

export type RecipeSubstituteRequest = {
  restrictedIngredients?: string[];
};

export type IngredientSubstitution = {
  originalIngredientName: string;
  originalQuantity?: string;
  substituteIngredient: IngredientMaster;
  reason: string;
  usageNote?: string;
};

export type RecipeSubstituteResponse = {
  substitutions: IngredientSubstitution[];
  source: 'ai';
};
