import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertReleaseUnchanged, checkReleaseArchive } from './release-archive.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDirectory, 'package.json'), 'utf8'));
const releaseDirectory = path.join(rootDirectory, '.local', 'release');
const vsixPath = path.join(releaseDirectory, `${packageJson.name}-${packageJson.version}.vsix`);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

rmSync(releaseDirectory, { force: true, recursive: true });
mkdirSync(releaseDirectory, { recursive: true });

const packageResult = spawnSync(
  npmExecutable,
  [
    'exec',
    '--',
    'vsce',
    'package',
    '--out',
    vsixPath,
    '--githubBranch',
    'main',
    '--no-dependencies',
  ],
  {
    cwd: rootDirectory,
    stdio: 'inherit',
  },
);

if (packageResult.error) {
  throw packageResult.error;
}
if (packageResult.status !== 0) {
  process.exit(packageResult.status ?? 1);
}

if (!existsSync(vsixPath)) {
  throw new Error(`VSIX package was not created: ${vsixPath}`);
}

const stats = statSync(vsixPath);

if (stats.size <= 0) {
  throw new Error(`VSIX package is empty: ${vsixPath}`);
}

const entries = await checkReleaseArchive(vsixPath, rootDirectory);
const archiveBeforeTests = readFileSync(vsixPath);
console.log('VSIX payload verified; testing byte-identical workspace release bundles.');

const testResult = spawnSync(npmExecutable, ['run', 'test:integration:release'], {
  cwd: rootDirectory,
  stdio: 'inherit',
});
if (testResult.error) {
  throw testResult.error;
}
if (testResult.status !== 0) {
  process.exit(testResult.status ?? 1);
}
assertReleaseUnchanged(entries, rootDirectory, vsixPath, archiveBeforeTests);
console.log(`VSIX release check passed: ${path.relative(rootDirectory, vsixPath)}`);
