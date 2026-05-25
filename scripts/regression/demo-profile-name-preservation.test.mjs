import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const previousDemoName = ({ localName, demoName, demoEmail }) => {
  void localName;
  return demoName || demoEmail?.split('@')[0] || 'デモユーザー';
};
const fixedDemoName = ({ localName, demoName, demoEmail }) =>
  localName || demoName || demoEmail?.split('@')[0] || 'デモユーザー';

assert.equal(
  previousDemoName({ localName: '保存済み表示名', demoName: undefined, demoEmail: 'demo@example.com' }),
  'demo',
  '再現: demo profile が古い/空の場合、local profile に保存した表示名が refresh 後に失われます。',
);
assert.equal(
  fixedDemoName({ localName: '保存済み表示名', demoName: undefined, demoEmail: 'demo@example.com' }),
  '保存済み表示名',
  '修正: demo authenticated branch は local profile の表示名を優先してください。',
);

assert.match(
  source,
  /setUserName\(\s*parsed\?\.userName\s*\|\|\s*demoProfile\?\.userName\s*\|\|\s*demoProfile\?\.email\?\.split\('@'\)\[0\]\s*\|\|\s*'デモユーザー',?\s*\)/,
  'demo authenticated branch では parsed?.userName を demo profile/email fallback より優先してください。',
);
assert.match(
  source,
  /function\s+writeDemoProfile\(updates:\s*StoredProfile\)/,
  'demo profile 保存用 helper を用意してください。',
);
assert.match(
  source,
  /if\s*\(demoSession\s*===\s*'authenticated'\)\s*\{[\s\S]*writeDemoProfile\(\{[\s\S]*userName:\s*profile\.userName/s,
  'demo user の profile save では globalbites_demo_profile も更新してください。',
);

console.log('demo profile name preservation regression checks passed');
