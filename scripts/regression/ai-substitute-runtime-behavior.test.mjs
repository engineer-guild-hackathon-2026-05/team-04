import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const tmpDir = mkdtempSync(join(tmpdir(), 'ai-substitute-runtime-'));
const copiedOpenRouterPath = join(tmpDir, 'openRouter.ts');
const source = readFileSync('src/lib/server/openRouter.ts', 'utf8')
  .replace("import 'server-only';\n\n", '');
writeFileSync(copiedOpenRouterPath, source);

const behaviorScript = String.raw`
import assert from 'node:assert/strict';

const openRouter = await import(process.env.OPENROUTER_MODULE_URL);
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
delete process.env.OPENROUTER_MODEL;

const originalIngredients = [{ name_ja: 'パクチー', quantity: '1束' }];
const candidates = [{
  id: 'ing-mitsuba',
  name_ja: '三つ葉',
  name_en: 'mitsuba',
  category: '野菜',
  dietary_tags: [],
}];

async function runWithResponses(responses, fn) {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    const payload = responses.shift();
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    };
  };
  const result = await fn(calls);
  return { result, calls };
}

{
  const { result, calls } = await runWithResponses([
    { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'not-in-db', reason: '候補外' }] },
    { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'ing-mitsuba', reason: '香りが近い', usage_note: '少量から調整' }] },
  ], () => openRouter.selectIngredientSubstitutionsWithOpenRouter({ originalIngredients, candidates }));

  assert.equal(calls.length, 2, 'DB外IDの初回応答は再生成されるべきです。');
  assert.match(calls[1].messages[1].content, /候補IDだけから選び直してください。/);
  assert.deepEqual(result, [{
    originalIngredientName: 'パクチー',
    substituteIngredientId: 'ing-mitsuba',
    reason: '香りが近い',
    usageNote: '少量から調整',
  }]);
}

{
  const { result, calls } = await runWithResponses([
    { substitutions: [
      { original_ingredient_name: 'パクチー', substitute_ingredient_id: 'ing-mitsuba', reason: '香りが近い' },
      { original_ingredient_name: 'ミント', substitute_ingredient_id: 'not-in-db', reason: '余分な候補外ID' },
    ] },
    { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'ing-mitsuba', reason: '香りが近い' }] },
  ], () => openRouter.selectIngredientSubstitutionsWithOpenRouter({ originalIngredients, candidates }));

  assert.equal(calls.length, 2, '過長配列に混入したDB外IDも無視せず再生成されるべきです。');
  assert.equal(result[0].substituteIngredientId, 'ing-mitsuba');
}

{
  const invalidResponse = { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'not-in-db', reason: '候補外' }] };
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(invalidResponse) } }] }),
    };
  };

  await assert.rejects(
    () => openRouter.selectIngredientSubstitutionsWithOpenRouter({ originalIngredients, candidates }),
    /after retries/,
  );
  assert.equal(calls.length, 3, 'DB外IDが続く場合は最大3回で停止してください。');
}

{
  await runWithResponses([
    { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'ing-mitsuba' }] },
    { substitutions: [{ original_ingredient_name: 'パクチー', substitute_ingredient_id: 'ing-mitsuba', reason: '香りが近い' }] },
  ], async (calls) => {
    const result = await openRouter.selectIngredientSubstitutionsWithOpenRouter({ originalIngredients, candidates });
    assert.equal(calls.length, 2, 'reason欠落は無効応答として再生成されるべきです。');
    assert.equal(result[0].reason, '香りが近い');
  });
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
  assert.equal(result.status, 0, 'OpenRouter代替食材の実行時retry挙動テストが失敗しました。');
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log('AI substitute runtime behavior regression checks passed');
