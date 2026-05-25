import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const fixedDemoName = ({ localName, demoName, demoEmail }) =>
  localName || demoName || demoEmail?.split('@')[0] || 'デモユーザー';
assert.equal(fixedDemoName({ localName: '保存済み表示名', demoName: undefined, demoEmail: 'demo@example.com' }), '保存済み表示名');

assert.match(source, /const\s+merged\s*=\s*mergeProfile\(parsed,[\s\S]*demoProfile\?\.userName[\s\S]*demoProfile\?\.email\?\.split\('@'\)\[0\][\s\S]*'デモユーザー'/);
assert.match(source, /function\s+writeDemoProfile\(updates:\s*StoredProfile\)/);
assert.match(source, /if\s*\(demoSession\s*===\s*'authenticated'\)\s*\{[\s\S]*writeDemoProfile\(profile\)/s);

console.log('demo profile name preservation regression checks passed');
