import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const supabaseConfig = readFileSync('supabase/config.toml', 'utf8');
const authDocs = readFileSync('docs/auth.md', 'utf8');
const databaseDocs = readFileSync('docs/database.md', 'utf8');
const listViewSource = readFileSync('src/app/components/ListView.tsx', 'utf8');
const signoutRouteSource = readFileSync('src/app/auth/signout/route.ts', 'utf8');
const layoutSource = readFileSync('src/app/layout.tsx', 'utf8');

const seedBlock = supabaseConfig.match(/\[db\.seed\]([\s\S]*?)(?:\n\[|$)/)?.[1] ?? '';
const seedEnabled = /enabled\s*=\s*true/.test(seedBlock);
const seedPaths = [...seedBlock.matchAll(/"([^"]+\.sql)"/g)].map((match) => match[1]);

if (seedEnabled) {
  for (const seedPath of seedPaths) {
    const resolvedPath = normalize(join('supabase', seedPath));
    assert.equal(
      existsSync(resolvedPath),
      true,
      `db.seed が有効な場合は seed file が存在する必要があります: ${resolvedPath}`,
    );
    assert.equal(
      dirname(resolvedPath).startsWith('supabase'),
      true,
      `seed file は supabase 配下を参照してください: ${resolvedPath}`,
    );
  }
}
assert.equal(seedEnabled, false, 'seed data は migration で管理するため db.seed は無効にしてください。');

assert.match(
  authDocs,
  /data:\s*\{\s*name:\s*displayName\s*\}/,
  'signup metadata の docs は実装と DB trigger が参照する name キーに合わせてください。',
);
assert.doesNotMatch(
  authDocs,
  /data:\s*\{\s*display_name:/,
  'docs/auth.md に display_name metadata 例を再導入しないでください。',
);

assert.match(
  databaseDocs,
  /NEXT_PUBLIC_SUPABASE_URL=https:\/\/<project>\.supabase\.co/,
  'docs/database.md の URL 環境変数名は実装と同じ NEXT_PUBLIC_SUPABASE_URL にしてください。',
);
assert.match(
  databaseDocs,
  /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>/,
  'docs/database.md の publishable key 環境変数名は実装と同じ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY にしてください。',
);
assert.doesNotMatch(
  databaseDocs,
  /\nSUPABASE_(?:URL|PUBLISHABLE_KEY)=/,
  'docs/database.md に実装が読まない SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY 例を再導入しないでください。',
);

assert.match(
  listViewSource,
  /<button\s+[^>]*type="button"[\s\S]*aria-label="検索をクリア"[\s\S]*setSearchQuery\(''\)/,
  '検索クリアボタンには type="button" と用途が伝わる aria-label を付けてください。',
);

assert.doesNotMatch(
  signoutRouteSource,
  /フロントは POST \/auth\/signout を叩くだけでよい/,
  '未使用 endpoint であることと矛盾するコメントを再導入しないでください。',
);
assert.match(
  signoutRouteSource,
  /サーバー側でセッション cookie を失効させるためのログアウト用エンドポイント/,
  'signout route のコメントは現状の責務に合わせてください。',
);

assert.match(
  layoutSource,
  /import type \{ ReactNode \} from "react";/,
  'layout.tsx は React namespace global に依存せず ReactNode を type import してください。',
);
assert.match(layoutSource, /children: ReactNode;/, 'children の型は import 済み ReactNode を使ってください。');
assert.doesNotMatch(
  layoutSource,
  /children: React\.ReactNode;/,
  'layout.tsx で未 import の React namespace に依存しないでください。',
);

console.log('PR review fix regression checks passed');
