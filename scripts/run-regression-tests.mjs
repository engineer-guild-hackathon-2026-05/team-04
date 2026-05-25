import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const regressionDir = 'scripts/regression';
const testFiles = readdirSync(regressionDir)
  .filter((file) => file.endsWith('.test.mjs'))
  .sort();

if (testFiles.length === 0) {
  console.error('No regression tests found.');
  process.exit(1);
}

const failures = [];

for (const file of testFiles) {
  const testPath = join(regressionDir, file);
  const result = spawnSync(process.execPath, [testPath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    failures.push({ file, status: result.status ?? 1 });
    console.error(`✗ ${file} failed with exit code ${result.status ?? 1}`);
  } else {
    console.log(`✓ ${file}`);
  }
}

if (failures.length > 0) {
  console.error(`Regression test failures: ${failures.map(({ file }) => file).join(', ')}`);
  process.exit(1);
}

console.log(`All ${testFiles.length} regression tests passed.`);
