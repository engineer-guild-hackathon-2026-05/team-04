import 'server-only';

import type { IngredientMaster, Recipe } from '@/lib/mockData';

export const OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';

export class OpenRouterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterConfigError';
  }
}

export class OpenRouterResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterResponseError';
  }
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

type SelectRecipeInput = {
  mood: string;
  count: number;
  candidates: Recipe[];
};

type OriginalIngredientInput = {
  name_ja: string;
  quantity?: string;
};

type SelectIngredientSubstitutionInput = {
  originalIngredients: OriginalIngredientInput[];
  candidates: IngredientMaster[];
};

export type IngredientSubstitutionSelection = {
  originalIngredientName: string;
  substituteIngredientId: string;
  reason: string;
  usageNote?: string;
};

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const configuredModel = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new OpenRouterConfigError('OPENROUTER_API_KEY is not configured.');
  }

  if (configuredModel && configuredModel !== OPENROUTER_MODEL) {
    throw new OpenRouterConfigError(`OPENROUTER_MODEL must be exactly ${OPENROUTER_MODEL}.`);
  }

  return { apiKey, model: OPENROUTER_MODEL };
}

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(stripJsonFence(content)) as unknown;
  } catch {
    throw new OpenRouterResponseError('OpenRouter response was not valid JSON.');
  }
}

async function requestJsonFromOpenRouter(system: string, user: string, temperature: number) {
  const { apiKey, model } = getOpenRouterConfig();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    throw new OpenRouterResponseError(`OpenRouter request failed with status ${response.status}.`);
  }

  const payload = await response.json().catch(() => null) as OpenRouterResponse | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterResponseError('OpenRouter response did not include JSON content.');
  }

  return parseJsonContent(content);
}

function buildSelectionPrompt(input: SelectRecipeInput, retryReason?: string) {
  const count = Math.max(1, Math.min(input.count, 3));
  const retryInstruction = retryReason
    ? `\n前回の応答は ${retryReason} により利用できませんでした。候補IDだけから重複なしで${count}件を選び直してください。`
    : '';
  const candidates = input.candidates.map((recipe, index) => ({
    index: index + 1,
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((ingredient) => ingredient.name_ja),
  }));

  return `あなたは既存レシピ一覧から気分に合う料理を選ぶ推薦担当です。
- 候補レシピはサーバー側で食材制限を除外済みです。
- 新しいレシピを作らないでください。
- 候補に存在する id だけを使ってください。
- 同じ id を重複させないでください。
- 気分・要望が日本語以外でも意味を解釈し、選定理由は内部で判断してください。
- JSON以外の文章を返さないでください。${retryInstruction}
気分・要望: ${input.mood}
選ぶ件数: ${count}
候補レシピJSON: ${JSON.stringify(candidates)}
JSON形式: {"recipe_ids":["候補id1","候補id2","候補id3"]}`;
}

function parseSelectedRecipeIds(payload: unknown, candidates: Recipe[], count: number) {
  const object = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as { recipe_ids?: unknown }
    : null;
  const ids = object?.recipe_ids;
  if (!Array.isArray(ids)) {
    throw new OpenRouterResponseError('OpenRouter selection did not include recipe_ids.');
  }

  if (ids.length !== count || ids.some((id) => typeof id !== 'string')) {
    throw new OpenRouterResponseError('OpenRouter selected invalid recipe ids.');
  }

  const allowedIds = new Set(candidates.map((recipe) => recipe.id));
  const selectedIds = ids as string[];
  const uniqueIds = Array.from(new Set(selectedIds));
  if (uniqueIds.length !== count || uniqueIds.some((id) => !allowedIds.has(id))) {
    throw new OpenRouterResponseError('OpenRouter selected invalid recipe ids.');
  }
  return uniqueIds;
}

async function requestRecipeSelectionFromOpenRouter(input: SelectRecipeInput, retryReason?: string): Promise<string[]> {
  const count = Math.max(1, Math.min(input.count, 3));
  if (input.candidates.length < count) {
    throw new OpenRouterResponseError('Not enough edible recipe candidates.');
  }

  const parsed = await requestJsonFromOpenRouter(
    'You select existing recipe ids from a provided candidate list and return JSON only.',
    buildSelectionPrompt(input, retryReason),
    0.4,
  );
  return parseSelectedRecipeIds(parsed, input.candidates, count);
}

function buildIngredientSubstitutionPrompt(input: SelectIngredientSubstitutionInput, retryReason?: string) {
  const retryInstruction = retryReason
    ? `\n前回の応答は ${retryReason} により利用できませんでした。候補IDだけから選び直してください。`
    : '';
  const originalIngredients = input.originalIngredients.map((ingredient, index) => ({
    index: index + 1,
    name_ja: ingredient.name_ja,
    quantity: ingredient.quantity ?? '',
  }));
  const candidates = input.candidates.map((ingredient, index) => ({
    index: index + 1,
    id: ingredient.id,
    name_ja: ingredient.name_ja,
    name_en: ingredient.name_en,
    category: ingredient.category,
    dietary_tags: ingredient.dietary_tags,
  }));

  return `あなたは日本のスーパーで買いやすい食材への置き換えを提案する料理アシスタントです。
- 元レシピの材料のうち、日本の一般的なスーパーで通常入手しにくい材料だけを置き換えてください。
- 置き換えが不要な材料は返さないでください。
- 代替材料は必ず候補食材JSONに存在する id だけを使ってください。
- 新しい食材名や候補外の id を作らないでください。
- アレルギー安全性のため、候補外の材料や推測の材料を絶対に使わないでください。
- JSON以外の文章を返さないでください。${retryInstruction}
元レシピ材料JSON: ${JSON.stringify(originalIngredients)}
候補食材JSON: ${JSON.stringify(candidates)}
JSON形式: {"substitutions":[{"original_ingredient_name":"元材料名","substitute_ingredient_id":"候補id","reason":"短い理由","usage_note":"分量や使い方の短いメモ"}]}`;
}

function parseIngredientSubstitutionSelections(
  payload: unknown,
  input: SelectIngredientSubstitutionInput,
): IngredientSubstitutionSelection[] {
  const object = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as { substitutions?: unknown }
    : null;
  const substitutions = object?.substitutions;
  if (!Array.isArray(substitutions)) {
    throw new OpenRouterResponseError('OpenRouter substitution response did not include substitutions.');
  }

  const allowedIngredientIds = new Set(input.candidates.map((ingredient) => ingredient.id));
  const originalNames = new Set(input.originalIngredients.map((ingredient) => ingredient.name_ja));
  const seenOriginalNames = new Set<string>();
  const parsed: IngredientSubstitutionSelection[] = [];

  for (const item of substitutions.slice(0, input.originalIngredients.length)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new OpenRouterResponseError('OpenRouter substitution item was invalid.');
    }
    const candidate = item as {
      original_ingredient_name?: unknown;
      substitute_ingredient_id?: unknown;
      reason?: unknown;
      usage_note?: unknown;
    };
    const originalIngredientName = typeof candidate.original_ingredient_name === 'string'
      ? candidate.original_ingredient_name.trim()
      : '';
    const substituteIngredientId = typeof candidate.substitute_ingredient_id === 'string'
      ? candidate.substitute_ingredient_id.trim()
      : '';
    const reason = typeof candidate.reason === 'string' ? candidate.reason.trim().slice(0, 160) : '';
    const usageNote = typeof candidate.usage_note === 'string' ? candidate.usage_note.trim().slice(0, 160) : '';

    if (
      !originalNames.has(originalIngredientName) ||
      seenOriginalNames.has(originalIngredientName) ||
      !allowedIngredientIds.has(substituteIngredientId) ||
      !reason
    ) {
      throw new OpenRouterResponseError('OpenRouter selected invalid ingredient substitutions.');
    }

    seenOriginalNames.add(originalIngredientName);
    parsed.push({
      originalIngredientName,
      substituteIngredientId,
      reason,
      ...(usageNote ? { usageNote } : {}),
    });
  }

  return parsed;
}

async function requestIngredientSubstitutionsFromOpenRouter(
  input: SelectIngredientSubstitutionInput,
  retryReason?: string,
): Promise<IngredientSubstitutionSelection[]> {
  if (input.originalIngredients.length === 0 || input.candidates.length === 0) return [];

  const parsed = await requestJsonFromOpenRouter(
    'You select substitute ingredient ids only from a provided ingredient catalog and return JSON only.',
    buildIngredientSubstitutionPrompt(input, retryReason),
    0.2,
  );
  return parseIngredientSubstitutionSelections(parsed, input);
}

export async function selectRecipeIdsWithOpenRouter(input: SelectRecipeInput): Promise<string[]> {
  try {
    return await requestRecipeSelectionFromOpenRouter(input);
  } catch (error) {
    if (!(error instanceof OpenRouterResponseError)) throw error;
    return requestRecipeSelectionFromOpenRouter(input, error.message);
  }
}

export async function selectIngredientSubstitutionsWithOpenRouter(
  input: SelectIngredientSubstitutionInput,
): Promise<IngredientSubstitutionSelection[]> {
  try {
    return await requestIngredientSubstitutionsFromOpenRouter(input);
  } catch (error) {
    if (!(error instanceof OpenRouterResponseError)) throw error;
    return requestIngredientSubstitutionsFromOpenRouter(input, error.message);
  }
}
