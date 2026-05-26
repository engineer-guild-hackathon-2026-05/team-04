import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const suggestRoute = readFileSync('src/app/api/recipes/suggest/route.ts', 'utf8');
const openRouterSource = readFileSync('src/lib/server/openRouter.ts', 'utf8');
const page = readFileSync('src/app/page.tsx', 'utf8');
const listView = readFileSync('src/app/components/ListView.tsx', 'utf8');

assert.doesNotMatch(
  suggestRoute,
  /candidates\.length\s*<\s*3/,
  '気分推薦は候補が1〜2件でも返すため、3件未満を一律エラーにしないでください。',
);
assert.match(
  suggestRoute,
  /candidates\.length\s*===\s*0[\s\S]*not_enough_recipe_candidates/,
  '気分推薦は候補0件の場合だけ not_enough_recipe_candidates にしてください。',
);
assert.match(
  suggestRoute,
  /count:\s*Math\.min\(3,\s*candidates\.length\)/,
  'OpenRouterへ要求する推薦数は候補数と3件上限の小さい方にしてください。',
);
assert.match(
  openRouterSource,
  /Math\.min\(input\.count,\s*3,\s*input\.candidates\.length\)/,
  'OpenRouter recipe selectionも候補数が1〜2件ならその件数で選択してください。',
);
assert.match(
  openRouterSource,
  /ids\.length\s*===\s*0\s*\|\|\s*ids\.length\s*>\s*count/,
  'OpenRouter recipe selectionは0件を拒否しつつ、1〜count件の返却を許容してください。',
);
assert.match(
  page,
  /setSuggestedRecipeCount\(suggestedRecipes\.length\)[\s\S]*setSuggestStatus\('success'\)/,
  '気分推薦の成功UIは実際に返った1〜3件の件数を保持してください。',
);
assert.match(
  listView,
  /おすすめレシピを\$\{suggestedRecipeCount\}件選びました。/,
  '気分推薦の成功UIは固定3件ではなく実際の返却件数を表示してください。',
);
assert.doesNotMatch(
  listView,
  /おすすめレシピを3件選びました。/,
  '気分推薦は1〜2件成功もあり得るため、成功文言を3件固定にしないでください。',
);

const tmpDir = mkdtempSync(join(tmpdir(), 'ai-suggest-partial-'));
const copiedOpenRouterPath = join(tmpDir, 'openRouter.ts');
writeFileSync(copiedOpenRouterPath, openRouterSource.replace("import 'server-only';\n\n", ''));

const behaviorScript = String.raw`
import assert from 'node:assert/strict';

const openRouter = await import(process.env.OPENROUTER_MODULE_URL);
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
delete process.env.OPENROUTER_MODEL;

const recipe = (id) => ({
  id,
  title: id,
  description: '',
  cuisine: 'test',
  flag: '🍽️',
  image: '',
  cookTime: 10,
  servings: 1,
  tags: [],
  ingredients: [{ id: 'ing-rice', name_ja: '米', name_en: 'rice', category: '穀物', dietary_tags: [] }],
  steps: ['作る'],
});

async function run(ids, candidates, count = 3) {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ recipe_ids: ids }) } }] }),
    };
  };
  const result = await openRouter.selectRecipeIdsWithOpenRouter({ mood: '疲れた', count, candidates });
  return { result, calls };
}

{
  const { result, calls } = await run(['r1'], [recipe('r1')]);
  assert.deepEqual(result, ['r1']);
  assert.match(calls[0].messages[1].content, /選ぶ件数: 1/);
  assert.match(calls[0].messages[1].content, /JSON形式: \{"recipe_ids":\["候補id1"\]\}/);
}

{
  const { result, calls } = await run(['r1', 'r2'], [recipe('r1'), recipe('r2')]);
  assert.deepEqual(result, ['r1', 'r2']);
  assert.match(calls[0].messages[1].content, /選ぶ件数: 2/);
  assert.match(calls[0].messages[1].content, /JSON形式: \{"recipe_ids":\["候補id1","候補id2"\]\}/);
}

{
  const { result } = await run(['r1', 'r1', 'r2'], [recipe('r1'), recipe('r2'), recipe('r3')]);
  assert.deepEqual(result, ['r1', 'r2'], '重複を除いた1〜3件なら表示可能な推薦として返してください。');
}

{
  await assert.rejects(
    () => openRouter.selectRecipeIdsWithOpenRouter({ mood: '疲れた', count: 3, candidates: [] }),
    /Not enough edible recipe candidates/,
  );
}

{
  await assert.rejects(
    () => run([], [recipe('r1')]),
    /OpenRouter selected invalid recipe ids/,
  );
}
`;

try {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '-e', behaviorScript],
    {
      env: {
        ...process.env,
        OPENROUTER_MODULE_URL: pathToFileURL(copiedOpenRouterPath).href,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, 'AI気分推薦の1〜2件許容runtime testが失敗しました。');
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log('AI suggest partial results regression checks passed');
