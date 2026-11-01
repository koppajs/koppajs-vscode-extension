import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import koppajs from '@koppajs/koppajs-vite-plugin';
import { build, version as viteVersion } from 'vite';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const fixtureRoot = path.join(repositoryRoot, 'src/test/fixtures/ecosystem');
const componentPath = path.join(fixtureRoot, 'counter-page.kpa');
const cliPath = path.join(
  path.dirname(fileURLToPath(import.meta.resolve('@koppajs/koppajs-kpa-check'))),
  'cli.js',
);

function checkDiagnostics(filePath, expectedExitCode) {
  const result = spawnSync(process.execPath, [cliPath, '--json', filePath], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `kpa-check terminated with ${result.signal}`);
  assert.equal(result.status, expectedExitCode, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.stderr, '', 'kpa-check must not emit stderr');

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, 'check');
  assert.equal(report.status, expectedExitCode === 0 ? 'ok' : 'diagnostics');
  assert.equal(report.exitCode, expectedExitCode);
  assert.equal(report.summary.checkedFileCount, 1, 'CLI must check the actual KPA file');
  assert.deepEqual(report.resolvedTargets, [filePath]);
  return report;
}

assert.match(viteVersion, /^8\./, 'This compatibility check must use Vite 8');
const source = readFileSync(componentPath, 'utf8');
const cleanReport = checkDiagnostics(componentPath, 0);
assert.equal(cleanReport.summary.diagnosticCount, 0);
assert.deepEqual(cleanReport.diagnostics, []);

// Build the exact file checked above, without writing or executing browser output.
const result = await build({
  root: fixtureRoot,
  configFile: false,
  mode: 'production',
  logLevel: 'silent',
  plugins: [koppajs()],
  build: { write: false, minify: false },
});
const results = Array.isArray(result) ? result : [result];
const chunks = results.flatMap((entry) =>
  'output' in entry ? entry.output.filter((output) => output.type === 'chunk') : [],
);
assert.ok(
  chunks.some((chunk) => chunk.isEntry),
  'Vite must emit a browser entry chunk',
);
assert.ok(
  chunks.every((chunk) => chunk.imports.length === 0),
  'Dependencies must be bundled',
);
const moduleIds = chunks.flatMap((chunk) => chunk.moduleIds.map((id) => id.replaceAll('\\', '/')));
for (const expectedModule of [
  '/@koppajs/koppajs-core/',
  '/@koppajs/koppajs-router/',
  '/ecosystem/counter-page.kpa',
]) {
  assert.ok(
    moduleIds.some((id) => id.includes(expectedModule)),
    `Production output must include ${expectedModule}`,
  );
}
const code = chunks.map((chunk) => chunk.code).join('\n');
assert.ok(code.includes('contractVersion'), 'Plugin must emit the Core component contract');
assert.ok(code.includes('data-k-struct'), 'Plugin must transform the canonical template');
assert.ok(code.includes('formatCount'), 'Plugin must retain the explicit controller');
assert.ok(code.includes('ecosystem-counter'), 'Registered route component must survive bundling');
assert.doesNotMatch(code, /from\s*["']@koppajs\//, 'No unresolved ecosystem package imports');
assert.equal(
  readFileSync(componentPath, 'utf8'),
  source,
  'Build must not mutate the shared fixture',
);

// A temporary broken copy proves the CLI is analysing bindings, not just scanning files.
const invalidDirectory = mkdtempSync(path.join(tmpdir(), 'kpa-ecosystem-invalid-'));
try {
  const invalidPath = path.join(invalidDirectory, 'counter-page.kpa');
  const invalidSource = source.replace('{{formatCount(count)}}', '{{ecosystemMissing}}');
  assert.notEqual(invalidSource, source, 'Negative control must change a template binding');
  writeFileSync(invalidPath, invalidSource);
  const invalidReport = checkDiagnostics(invalidPath, 1);
  assert.equal(invalidReport.summary.diagnosticCount, 1);
  assert.equal(invalidReport.diagnostics.length, 1);
  assert.equal(invalidReport.diagnostics[0].filePath, invalidPath);
  assert.match(invalidReport.diagnostics[0].message, /ecosystemMissing/);
} finally {
  rmSync(invalidDirectory, { recursive: true, force: true });
}

console.log(
  `Ecosystem compatibility passed: Vite ${viteVersion} production build and shared KPA CLI diagnostics.`,
);
console.log(
  'Scope: package bundling and diagnostics only; browser mounting, events and router navigation are not executed.',
);
