import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const clientDirectory = path.resolve('node_modules/vscode-languageclient');
const scriptUrl = pathToFileURL(path.resolve('scripts/prepare-languageclient.mjs')).href;
const files = ['lib/common/fileOperations.js', 'lib/common/utils/globPattern.js'];
const originalGuard = 'if (!matcher.makeRe()) {';
const compatibleGuard = 'if (matcher.set.length === 0) {';

function withClientFixture(run: (directory: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-client-preparation-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ version: '11.0.0' }));
    const matcherDirectory = path.join(directory, 'node_modules/minimatch');
    fs.mkdirSync(matcherDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(matcherDirectory, 'package.json'),
      JSON.stringify({ version: '11.0.3' }),
    );
    for (const file of files) {
      const source = fs.readFileSync(path.join(clientDirectory, file), 'utf8');
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), source.replace(compatibleGuard, originalGuard));
    }
    run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function prepare(directory: string) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { prepareLanguageClient } from ${JSON.stringify(scriptUrl)};
      prepareLanguageClient(${JSON.stringify(directory)});`,
    ],
    { encoding: 'utf8', timeout: 5_000 },
  );
}

describe('language client installation preparation', () => {
  it('migrates exactly two guards and is idempotent', () => {
    withClientFixture((directory) => {
      const originals = files.map((file) => fs.readFileSync(path.join(directory, file), 'utf8'));
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = prepare(directory);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
        files.forEach((file, index) => {
          expect(fs.readFileSync(path.join(directory, file), 'utf8')).toBe(
            originals[index].replace(originalGuard, compatibleGuard),
          );
        });
      }
    });
  });

  it.each(['client version', 'matcher version', 'source'])(
    'rejects unknown %s before writing',
    (kind) => {
      withClientFixture((directory) => {
        if (kind === 'client version') {
          fs.writeFileSync(
            path.join(directory, 'package.json'),
            JSON.stringify({ version: '11.0.1' }),
          );
        } else if (kind === 'matcher version') {
          fs.writeFileSync(
            path.join(directory, 'node_modules/minimatch/package.json'),
            JSON.stringify({ version: '11.0.4' }),
          );
        } else {
          fs.appendFileSync(path.join(directory, files[1]), '\n// unknown upstream change\n');
        }
        const before = files.map((file) => fs.readFileSync(path.join(directory, file), 'utf8'));
        const result = prepare(directory);
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          kind === 'source'
            ? 'Unexpected language client source'
            : 'Review the patch before updating dependencies',
        );
        expect(files.map((file) => fs.readFileSync(path.join(directory, file), 'utf8'))).toEqual(
          before,
        );
      });
    },
  );
});
