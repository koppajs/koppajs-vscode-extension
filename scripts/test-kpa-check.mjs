import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const validDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-check-cli-valid-'));
const invalidDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-check-cli-invalid-'));
const validFilePath = path.join(validDirectory, 'Valid.kpa');
const invalidFilePath = path.join(invalidDirectory, 'Invalid.kpa');

fs.writeFileSync(validFilePath, ['[template]', '  <div></div>', '[/template]'].join('\n'));
fs.writeFileSync(invalidFilePath, ['[template]', '  <UserCard />', '[/template]'].join('\n'));

const cliPath = path.join(
  process.cwd(),
  'node_modules',
  '@koppajs',
  'koppajs-kpa-check',
  'dist',
  'cli.js',
);

const validRun = spawnSync(process.execPath, [cliPath, validFilePath], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (validRun.status !== 0 || !validRun.stdout.includes('keine Diagnostics gefunden')) {
  console.error(validRun.stdout);
  console.error(validRun.stderr);
  throw new Error('kpa-check sollte fuer eine gueltige Datei erfolgreich sein.');
}

const invalidRun = spawnSync(process.execPath, [cliPath, invalidFilePath], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (
  invalidRun.status !== 1 ||
  !invalidRun.stdout.includes('Komponente [UserCard] wurde im [template]-Block verwendet')
) {
  console.error(invalidRun.stdout);
  console.error(invalidRun.stderr);
  throw new Error('kpa-check sollte fuer eine fehlerhafte Datei Diagnostics liefern.');
}
