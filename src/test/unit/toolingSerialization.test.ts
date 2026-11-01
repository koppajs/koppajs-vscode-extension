import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const cliRequire = createRequire(repositoryRequire.resolve('@vscode/test-cli'));
const mochaPath = cliRequire.resolve('mocha');
const mochaRequire = createRequire(mochaPath);
const serialize = mochaRequire('serialize-javascript') as (value: unknown) => string;

describe('Mocha serialization dependency', () => {
  it('preserves CommonJS serialization of worker options', () => {
    const output = serialize({
      grep: /serialization/i,
      date: new Date('2026-10-31T00:00:00.000Z'),
      beforeAll: function () {
        return 'worker hook';
      },
    });
    const restored = vm.runInNewContext(`(${output})`) as {
      grep: RegExp;
      date: Date;
      beforeAll: () => string;
    };
    expect(restored.grep.test('SERIALIZATION')).toBe(true);
    expect(restored.date.toISOString()).toBe('2026-10-31T00:00:00.000Z');
    expect(restored.beforeAll()).toBe('worker hook');
  });

  it.each(['regexp', 'date'])('does not evaluate injected %s properties', (kind) => {
    const payload = '"+(globalThis.injected=true)+"';
    const value: object = Object.create(kind === 'regexp' ? RegExp.prototype : Date.prototype);
    if (kind === 'regexp') {
      Object.defineProperties(value, {
        source: { value: 'x' },
        flags: { value: payload },
        toJSON: { value: () => '@placeholder' },
      });
    } else {
      Object.defineProperties(value, {
        toISOString: { value: () => payload },
        toJSON: { value: () => '2026-10-31' },
      });
    }
    if (kind === 'date') {
      expect(() => serialize({ value })).toThrowError(new TypeError('Invalid Date ISO string'));
      return;
    }
    const output = serialize({ value });
    const context = vm.createContext({ injected: false });
    try {
      vm.runInContext(`(${output})`, context, { timeout: 1_000 });
    } catch (error) {
      // Escaped malicious RegExp flags are invalid, rather than executable code.
      expect((error as Error).name).toBe('SyntaxError');
      expect(kind).toBe('regexp');
    }
    expect(context.injected).toBe(false);
  });

  it('runs Mocha workers with serialized regular expressions and hooks', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-mocha-serialization-'));
    const fixture = path.join(directory, 'worker.cjs');
    try {
      fs.writeFileSync(
        fixture,
        `const assert = require('node:assert/strict');
        describe('serialization', function () {
          it('receives the worker hook', function () { assert.equal(this.workerValue, 'safe'); });
          it('runs the second case', function () { assert.equal(this.workerValue, 'safe'); });
        });`,
      );
      const hooks = path.join(directory, 'hooks.cjs');
      fs.writeFileSync(
        hooks,
        "exports.mochaHooks = { beforeAll: function () { this.workerValue = 'safe'; } };",
      );
      const runner = path.join(directory, 'runner.cjs');
      fs.writeFileSync(
        runner,
        `const Mocha = require(${JSON.stringify(mochaPath)});
        const mocha = new Mocha({
          parallel: true, jobs: 2, reporter: 'json', grep: /serialization/i,
          require: [${JSON.stringify(hooks)}]
        });
        mocha.addFile(${JSON.stringify(fixture)});
        mocha.run(failures => { process.exitCode = failures ? 1 : 0; });`,
      );
      const result = spawnSync(process.execPath, [runner], {
        encoding: 'utf8',
        timeout: 15_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr + result.stdout).toBe(0);
      const report = JSON.parse(result.stdout) as {
        stats: { passes: number; failures: number; pending: number };
      };
      expect(report.stats).toMatchObject({ passes: 2, failures: 0, pending: 0 });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 20_000);
});
