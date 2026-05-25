import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

assert.equal(
  packageJson.devDependencies?.supabase,
  '2.101.0',
  'Supabase CLI は CI/ローカル再現性のため exact version で pin してください。',
);
assert.equal(
  packageLock.packages?.['']?.devDependencies?.supabase,
  '2.101.0',
  'package-lock の root devDependencies も Supabase CLI exact version を保持してください。',
);
assert.equal(
  packageLock.packages?.['node_modules/supabase']?.version,
  '2.101.0',
  'lockfile は Supabase CLI 2.101.0 を解決してください。',
);

console.log('supabase CLI exact version pin regression checks passed');
