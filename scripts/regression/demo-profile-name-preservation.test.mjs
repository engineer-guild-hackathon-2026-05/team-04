import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const fixedDemoName = ({ demoLocalName, demoName, demoEmail }) =>
  demoLocalName || demoName || demoEmail?.split('@')[0] || 'デモユーザー';
assert.equal(
  fixedDemoName({ demoLocalName: '保存済みデモ表示名', demoName: undefined, demoEmail: 'demo@example.com' }),
  '保存済みデモ表示名',
);

assert.match(
  source,
  /const\s+merged\s*=\s*mergeProfile\(demoProfile\s*\?\?\s*null,[\s\S]*demoProfile\?\.userName[\s\S]*demoProfile\?\.email\?\.split\('@'\)\[0\][\s\S]*'デモユーザー'/,
  'demo session は通常プロフィールではなく demoProfile を表示名復元のlocal sourceにしてください。',
);
assert.match(source, /function\s+writeDemoProfile\(updates:\s*StoredProfile\)/);
assert.match(source, /if\s*\(demoSession\s*===\s*'authenticated'\)\s*\{[\s\S]*writeDemoProfile\(profile\)/s);

console.log('demo profile name preservation regression checks passed');
