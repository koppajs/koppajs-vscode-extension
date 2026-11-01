import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const cli = path.resolve('scripts/kpa-check.mjs');
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-english-cli-')));
  directories.push(root);
  fs.mkdirSync(path.join(root, 'valid'));
  fs.mkdirSync(path.join(root, 'invalid'));
  const valid = path.join(root, 'valid', 'Valid.kpa');
  const invalid = path.join(root, 'invalid', 'Invalid.kpa');
  fs.writeFileSync(valid, '[template]\n<div></div>\n[/template]');
  fs.writeFileSync(invalid, '[template]\n<MissingCard />\n[/template]');
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    return result;
  };
  return { root, valid, invalid, run };
}

describe('English repository CLI', () => {
  it('preserves successful and failing exit codes and prints English text', () => {
    const f = fixture();
    const valid = f.run(f.valid);
    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain('no diagnostics found');
    expect(valid.stderr).toBe('');
    const invalid = f.run(f.invalid);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toContain('Component [MissingCard] was used in the [template] block');
    expect(invalid.stderr).toContain('found 1 diagnostic(s) in 1 .kpa file(s)');
  });

  it('preserves JSON metadata and translates only message fields', () => {
    const f = fixture();
    const result = f.run('--json', f.invalid);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout);
    expect(report.exitCode).toBe(1);
    expect(report.status).toBe('diagnostics');
    expect(report.summary).toEqual({ checkedFileCount: 1, diagnosticCount: 1, targetCount: 1 });
    expect(report.diagnostics[0]).toMatchObject({
      filePath: f.invalid,
      code: 'kpa.unresolved-component-tag',
      line: 2,
      severity: 'warning',
    });
    expect(report.diagnostics[0].message).toContain('Component [MissingCard]');
  });

  it('keeps help, version and unsupported-option behavior', () => {
    const f = fixture();
    const help = f.run('--help');
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('Run KoppaJS diagnostics for .kpa files.');
    const version = f.run('--version');
    expect(version.status).toBe(0);
    expect(version.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(JSON.parse(f.run('--json', '--help').stdout).kind).toBe('help');
    const unknown = f.run('--not-an-option');
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('kpa-check received an unknown option: --not-an-option');
    const unknownJson = f.run('--json', '--not-an-option');
    expect(unknownJson.status).toBe(2);
    expect(JSON.parse(unknownJson.stdout).message).toContain(
      'received an unknown option: --not-an-option',
    );
    const conflict = f.run('--help', '--version');
    expect(conflict.status).toBe(2);
    expect(conflict.stderr).toContain('received conflicting control options: --help, --version');
    const conflictJson = f.run('--json', '--help', '--version');
    expect(conflictJson.status).toBe(2);
    expect(JSON.parse(conflictJson.stdout).message).toContain(
      'received conflicting control options: --help, --version',
    );
  });

  it('preserves non-English user paths and the end-of-options marker', () => {
    const f = fixture();
    const missing = path.join(f.root, 'größe.kpa');
    const result = f.run('--json', missing);
    expect(result.status).toBe(2);
    const report = JSON.parse(result.stdout);
    expect(report.message).toBe('kpa-check received 1 nonexistent target(s):\n- größe.kpa');
    expect(report.missingTargets).toEqual([missing]);
    const separator = f.run('--', '--json');
    expect(separator.status).toBe(2);
    expect(separator.stderr).toContain('nonexistent target(s)');
    expect(separator.stderr).toContain('--json');
  });

  it('reports an empty target directory in English', () => {
    const f = fixture();
    const empty = path.join(f.root, 'empty');
    fs.mkdirSync(empty);
    const result = f.run(empty);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('kpa-check found no .kpa files.');
  });
});
