import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const cliRequire = createRequire(repositoryRequire.resolve('@vscode/test-cli'));
const mochaRequire = createRequire(cliRequire.resolve('mocha'));

function consumerRequire(name: string) {
  return createRequire(repositoryRequire.resolve(name));
}

describe('dependency security regressions', () => {
  it.each([
    'vscode-languageclient',
    '@eslint/config-array',
    '@typescript-eslint/typescript-estree',
    '@vscode/test-cli',
    '@vscode/vsce',
    'eslint',
    'mocha',
    'test-exclude',
  ])('bounds globparts amplification through %s', (consumer) => {
    const require = consumer === 'mocha' ? mochaRequire : consumerRequire(consumer);
    const { Minimatch } = require('minimatch') as {
      Minimatch: new (
        pattern: string,
        options: { optimizationLevel: number; braceExpandMax: number },
      ) => { globParts: string[][] };
    };
    const matcher = new Minimatch('**/../a/b/**/../c/d', {
      optimizationLevel: 2,
      braceExpandMax: 2,
    });
    expect(matcher.globParts.length).toBeLessThanOrEqual(2);
  });

  it.each(['@vscode/test-cli', 'test-exclude', 'mocha'])(
    'stops filesystem traversal after cancellation through %s',
    async (consumer) => {
      const require = consumer === 'mocha' ? mochaRequire : consumerRequire(consumer);
      const { glob } = require('glob') as {
        glob: (pattern: string, options: object) => Promise<string[]>;
      };
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-glob-abort-'));
      const controller = new AbortController();
      const reason = new Error('controlled traversal cancellation');
      let reads = 0;
      try {
        fs.mkdirSync(path.join(directory, 'child', 'nested'), { recursive: true });
        fs.writeFileSync(path.join(directory, 'child', 'nested', 'file.txt'), 'fixture');
        // Synchronous callbacks make the tiny traversal deterministic: no timers or pending I/O.
        const readdir = (
          target: fs.PathLike,
          options: { withFileTypes: true },
          callback: (error: null, entries: fs.Dirent[]) => void,
        ) => {
          reads++;
          const entries = fs.readdirSync(target, options);
          if (reads === 1) {
            controller.abort(reason);
          }
          callback(null, entries);
        };
        await expect(
          glob('**/*', {
            cwd: directory,
            signal: controller.signal,
            fs: { ...fs, readdir },
          }),
        ).rejects.toBe(reason);
        expect(reads).toBe(1);
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it.each(['\r', '\u2028', '\u2029'])(
    'terminates patch parsing with a %j filename separator',
    (separator) => {
      const { parsePatch } = mochaRequire('diff') as { parsePatch: (patch: string) => unknown };
      const patch = `--- a${separator}b\n+++ c\n@@ -1 +1 @@\n-a\n+b\n`;
      const result = vm.runInNewContext(
        'parsePatch(patch)',
        { parsePatch, patch },
        { timeout: 500 },
      );
      expect(result).toMatchObject([{ oldFileName: `a${separator}b`, newFileName: 'c' }]);
    },
  );
});
