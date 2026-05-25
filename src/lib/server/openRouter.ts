import 'server-only';

import { validateAiRecipeCollection, type AiGeneratedRecipe, type RestrictionFact } from '@/lib/recipeAi';

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

type GenerateRecipeInput = {
  purpose: 'suggest' | 'substitute';
  mood?: string;
  count?: number;
  originalRecipe?: {
    title: string;
    description: string;
    cuisine: string;
    ingredients: string[];
  };
  restrictions: RestrictionFact[];
  dietaryConstraints: string[];
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
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

function restrictionPromptFacts(restrictions: RestrictionFact[], dietaryConstraints: string[]) {
  const ingredientFacts = restrictions.length === 0
    ? 'なし'
    : restrictions.map((item) => `${item.name_ja} (${item.name_en || item.id})`).join('、');
  const dietLabels: Record<string, string> = {
    'diet-vegan': 'ヴィーガン（肉・魚介・卵・乳製品・ゼラチン・はちみつを含めない）',
    'diet-lacto-vegetarian': 'ラクト・ベジタリアン（肉・魚介・卵・ゼラチンを含めず、乳製品は可）',
    'diet-ovo-vegetarian': 'オボ・ベジタリアン（肉・魚介・乳製品・ゼラチンを含めず、卵は可）',
    'diet-pescatarian': 'ペスカタリアン（肉類を含めず、魚介は可）',
  };
  const dietFacts = dietaryConstraints.length === 0
    ? 'なし'
    : dietaryConstraints.map((constraint) => dietLabels[constraint] ?? constraint).join('、');
  return `避ける材料: ${ingredientFacts}\n食事制約: ${dietFacts}`;
}

function buildPrompt(input: GenerateRecipeInput) {
  const count = Math.max(1, Math.min(input.count ?? 1, 3));
  const sharedRules = [
    '日本語で返答すること。',
    'JSON以外の文章を返さないこと。',
    '材料は1〜12件、手順は1〜10件にすること。',
    '避ける材料や食事制約に違反する材料を絶対に含めないこと。',
    'cultural_background には料理の文化的背景を80〜240文字で書くこと。',
    '画像URLが不明な場合は空文字にすること。',
  ].join('\n- ');

  if (input.purpose === 'substitute' && input.originalRecipe) {
    return `あなたは世界料理を日本で安全に作れるよう再提案する料理家です。\n- ${sharedRules}\n${restrictionPromptFacts(input.restrictions, input.dietaryConstraints)}\n元レシピ: ${input.originalRecipe.title}\n説明: ${input.originalRecipe.description}\n地域: ${input.originalRecipe.cuisine}\n元材料: ${input.originalRecipe.ingredients.join('、')}\n日本で入手しやすい代替材料を使った派生レシピを1件だけ作ってください。\nJSON形式: {"recipes":[{"title":"...","description":"...","cuisine":"...","flag":"🌍","image_url":"","cook_time_min":20,"servings":2,"is_vegan":false,"is_gluten_free":false,"tags":["..."],"cultural_background":"...","ingredients":[{"name_ja":"...","name_en":"...","quantity":"...","is_optional":false}],"steps":[{"order":1,"text":"..."}]}]}`;
  }

  return `あなたは気分に合う世界料理を安全に提案する料理家です。\n- ${sharedRules}\n${restrictionPromptFacts(input.restrictions, input.dietaryConstraints)}\n気分・要望: ${input.mood ?? ''}\n条件に合う世界料理レシピを${count}件作ってください。\nJSON形式: {"recipes":[{"title":"...","description":"...","cuisine":"...","flag":"🌍","image_url":"","cook_time_min":20,"servings":2,"is_vegan":false,"is_gluten_free":false,"tags":["..."],"cultural_background":"...","ingredients":[{"name_ja":"...","name_en":"...","quantity":"...","is_optional":false}],"steps":[{"order":1,"text":"..."}]}]}`;
}

export async function generateRecipesWithOpenRouter(input: GenerateRecipeInput): Promise<AiGeneratedRecipe[]> {
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
        { role: 'system', content: 'You generate safe, structured recipe JSON only.' },
        { role: 'user', content: buildPrompt(input) },
      ],
      temperature: 0.7,
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(content));
  } catch {
    throw new OpenRouterResponseError('OpenRouter response was not valid JSON.');
  }

  try {
    return validateAiRecipeCollection(parsed, {
      maxRecipes: Math.max(1, Math.min(input.count ?? 1, 3)),
      restrictions: input.restrictions,
      dietaryConstraints: input.dietaryConstraints,
    });
  } catch (error) {
    throw new OpenRouterResponseError(error instanceof Error ? error.message : 'OpenRouter response failed validation.');
  }
}
