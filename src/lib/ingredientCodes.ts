import { INGREDIENT_MASTER, type IngredientMaster } from './mockData';

export const INGREDIENT_CODES = INGREDIENT_MASTER.map((ingredient) => ingredient.id);
export const INGREDIENT_CODE_SET = new Set(INGREDIENT_CODES);
export const INGREDIENT_CODE_BY_NAME_JA = new Map(
  INGREDIENT_MASTER.map((ingredient) => [ingredient.name_ja, ingredient.id] as const),
);
export const INGREDIENT_CODE_BY_NAME_EN = new Map(
  INGREDIENT_MASTER.map((ingredient) => [ingredient.name_en, ingredient.id] as const),
);

export const INGREDIENT_CODE_SEED_ROWS = INGREDIENT_MASTER.map((ingredient) => ({
  ingredient_code: ingredient.id,
  name_ja: ingredient.name_ja,
  name_en: ingredient.name_en,
  category: ingredient.category,
  dietary_tags: ingredient.dietary_tags,
}));

export function isIngredientCode(value: string) {
  return INGREDIENT_CODE_SET.has(value);
}

export function toIngredientCodeFromDbRow(row: { ingredient_code?: string | null; name_ja?: string | null }) {
  if (row.ingredient_code && INGREDIENT_CODE_SET.has(row.ingredient_code)) return row.ingredient_code;
  if (row.name_ja) return INGREDIENT_CODE_BY_NAME_JA.get(row.name_ja) ?? null;
  return null;
}

export function normalizeIngredientOption(row: {
  ingredient_code?: string | null;
  name_ja?: string | null;
  name_en?: string | null;
  category?: string | null;
  dietary_tags?: string[] | null;
}): IngredientMaster | null {
  const id = toIngredientCodeFromDbRow(row);
  if (!id || !row.name_ja || !row.name_en || !row.category) return null;

  return {
    id,
    name_ja: row.name_ja,
    name_en: row.name_en,
    category: row.category,
    dietary_tags: row.dietary_tags ?? [],
  };
}
