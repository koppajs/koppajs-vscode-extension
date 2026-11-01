import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const cliRequire = createRequire(repositoryRequire.resolve('@vscode/test-cli'));
const mochaPath = cliRequire.resolve('mocha');
const mochaRequire = createRequire(mochaPath);
const minimatchConsumers = [
  'eslint',
  '@eslint/config-array',
  '@typescript-eslint/typescript-estree',
  '@vscode/vsce',
  '@vscode/test-cli',
  'test-exclude',
  'vscode-languageclient',
];

interface MinimatchApi {
  minimatch: (file: string, pattern: string, options?: object) => boolean;
  Minimatch: new (
    pattern: string,
    options?: object,
  ) => {
    match: (file: string, partial?: boolean) => boolean;
  };
}

function withFixture<T>(run: (directory: string) => T): T {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-tooling-glob-'));
  try {
    for (const file of [
      'src/main.ts',
      'src/.hidden.ts',
      'src/main.test.ts',
      'src/generated/drop.ts',
      'src/generated/keep.ts',
      'src/nested/extra.ts',
      'src/readme.md',
      'node_modules/dependency/index.ts',
    ]) {
      const target = path.join(directory, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, 'export const value = 1;\n');
    }
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function runNode(source: string, cwd: string): string {
  const result = spawnSync(process.execPath, ['-e', source], {
    cwd,
    encoding: 'utf8',
    timeout: 15_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr + result.stdout).toBe(0);
  return result.stdout;
}

describe('tooling glob dependency compatibility', () => {
  it.each(minimatchConsumers)('preserves minimatch APIs resolved by %s', (consumer) => {
    const consumerRequire = createRequire(repositoryRequire.resolve(consumer));
    const { minimatch, Minimatch } = consumerRequire('minimatch') as MinimatchApi;
    expect(minimatch('src/.hidden.ts', 'src/**', { dot: true })).toBe(true);
    expect(minimatch('src/.hidden.ts', 'src/**')).toBe(false);
    expect(minimatch('src/main.ts', '**/*.{js,ts}')).toBe(true);
    expect(minimatch('src/main.test.ts', '**/!(*.test).ts')).toBe(false);
    const matcher = new Minimatch('src/**/*.ts', { dot: true });
    expect(matcher.match('src/nested', true)).toBe(true);
    expect(matcher.match('src/nested/extra.ts')).toBe(true);
    expect(matcher.match('other/extra.ts')).toBe(false);
  });

  it('preserves minimatch APIs for Mocha and each installed glob parent', () => {
    const globParents = [
      cliRequire,
      createRequire(repositoryRequire.resolve('test-exclude')),
      mochaRequire,
    ];
    for (const parentRequire of [
      mochaRequire,
      ...globParents.map((parent) => createRequire(parent.resolve('glob'))),
    ]) {
      const { minimatch, Minimatch } = parentRequire('minimatch') as MinimatchApi;
      expect(minimatch('test/skip.test.cjs', '**/skip.*', { windowsPathsNoEscape: true })).toBe(
        true,
      );
      expect(new Minimatch('**/*.{cjs,mjs}').match('test/pass.test.cjs')).toBe(true);
    }
  });

  it('uses ESLint file discovery and config-array include/exclude matching', () => {
    withFixture((directory) => {
      const output = runNode(
        `
        const { ESLint } = require(${JSON.stringify(repositoryRequire.resolve('eslint'))});
        (async () => {
          const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: true,
            overrideConfig: [
              { ignores: ['src/generated/**'] },
              { files: ['src/**/*.ts'], ignores: ['**/*.test.ts'],
                rules: { 'no-unused-vars': 'error' } }
            ] });
          const reports = await eslint.lintFiles(['src/**/!(*.test).ts']);
          console.log(JSON.stringify(reports.map(report => ({
            file: require('node:path').relative(process.cwd(), report.filePath).replaceAll('\\\\', '/'),
            errors: report.errorCount
          })).sort((a, b) => a.file.localeCompare(b.file))));
        })().catch(error => { console.error(error); process.exitCode = 1; });
      `,
        directory,
      );
      expect(JSON.parse(output)).toEqual([
        { file: 'src/.hidden.ts', errors: 0 },
        { file: 'src/main.ts', errors: 0 },
        { file: 'src/nested/extra.ts', errors: 0 },
      ]);
    });
  });

  it('matches typescript-estree project-service allowDefaultProject patterns', () => {
    withFixture((directory) => {
      fs.writeFileSync(
        path.join(directory, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true }, include: ['src/**/*.ts'] }),
      );
      const output = runNode(
        `
        const { parseAndGenerateServices } = require(${JSON.stringify(repositoryRequire.resolve('@typescript-eslint/typescript-estree'))});
        const options = { tsconfigRootDir: process.cwd(),
          projectService: { allowDefaultProject: ['standalone-*.ts'] } };
        const parsed = parseAndGenerateServices('const value: number = 1;',
          { ...options, filePath: require('node:path').join(process.cwd(), 'standalone-ok.ts') });
        if (!parsed.services.program) throw new Error('Default project was not provided');
        let rejected = false;
        try {
          parseAndGenerateServices('const value: number = 1;',
            { ...options, filePath: require('node:path').join(process.cwd(), 'rejected.ts') });
        } catch (error) {
          if (!String(error).includes('allowDefaultProject')) throw error;
          rejected = true;
        }
        if (!rejected) throw new Error('Nonmatching default project file was accepted');
        console.log('matched and rejected');
      `,
        directory,
      );
      expect(output.trim()).toBe('matched and rejected');
    });
  });

  it('gathers test-cli files with brace globs, ignores, absolute paths and deduplication', () => {
    withFixture((directory) => {
      const gatherPath = path.join(
        path.dirname(repositoryRequire.resolve('@vscode/test-cli')),
        'cli/gatherFiles.mjs',
      );
      const gatherUrl = pathToFileURL(gatherPath).href;
      const absolute = path.join(directory, 'src/main.ts');
      const ignored = path.join(directory, 'src/nested/extra.ts');
      const output = runNode(
        `
        const { registerHooks } = require('node:module');
        // Only replace CLI argument state: importing bin.mjs would start VS Code and exit.
        const argsUrl = 'data:text/javascript,' + encodeURIComponent(
          'export const args = ' + ${JSON.stringify(JSON.stringify({ ignore: ['**/generated/**', '**/*.test.ts', ignored] }))}
        );
        registerHooks({ resolve(specifier, context, nextResolve) {
          if (context.parentURL === ${JSON.stringify(gatherUrl)} && specifier === '../bin.mjs') {
            return { url: argsUrl, shortCircuit: true };
          }
          return nextResolve(specifier, context);
        }});
        (async () => {
          const { gatherFiles } = await import(${JSON.stringify(gatherUrl)});
          const files = await gatherFiles(${JSON.stringify(path.join(directory, '.vscode-test.mjs'))},
            { files: ['src/**/*.{ts,js}', ${JSON.stringify(absolute)}, ${JSON.stringify(ignored)}] });
          console.log(JSON.stringify(files.sort()));
        })().catch(error => { console.error(error); process.exitCode = 1; });
      `,
        directory,
      );
      expect(JSON.parse(output)).toEqual([absolute]);
    });
  });

  it('retains test-exclude synchronous and asynchronous glob aliases and negated excludes', async () => {
    const TestExclude = repositoryRequire('test-exclude') as new (options: object) => {
      globSync: () => string[];
      glob: () => Promise<string[]>;
      shouldInstrument: (filename: string) => boolean;
    };
    // Keep the fixture alive until the asynchronous glob has settled.
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-test-exclude-'));
    try {
      for (const file of [
        'src/main.ts',
        'src/.hidden.ts',
        'src/generated/drop.ts',
        'src/generated/keep.ts',
        'src/main.test.ts',
        'node_modules/pkg/index.ts',
      ]) {
        const filename = path.join(directory, file);
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, '');
      }
      for (const negate of [false, true]) {
        const exclude = new TestExclude({
          cwd: directory,
          extension: ['.ts'],
          include: ['src/**'],
          exclude: [
            '**/*.test.ts',
            'src/generated/**',
            ...(negate ? ['!src/generated/keep.ts'] : []),
          ],
        });
        const expected = [
          'src/.hidden.ts',
          ...(negate ? ['src/generated/keep.ts'] : []),
          'src/main.ts',
        ];
        expect(exclude.globSync().sort()).toEqual(expected);
        expect((await exclude.glob()).sort()).toEqual(expected);
        expect(exclude.shouldInstrument(path.join(directory, '../outside.ts'))).toBe(false);
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('retains VSCE packaging ignore negation and dotfile matching', () => {
    withFixture((directory) => {
      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({
          name: 'fixture',
          version: '1.0.0',
          publisher: 'fixture',
          engines: { vscode: '^1.100.0' },
        }),
      );
      fs.writeFileSync(
        path.join(directory, '.vscodeignore'),
        'src/**\n!src/main.ts\n!src/.hidden.ts\n',
      );
      const output = runNode(
        `
        const { listFiles, PackageManager } = require(${JSON.stringify(repositoryRequire.resolve('@vscode/vsce'))});
        listFiles({ cwd: process.cwd(), packageManager: PackageManager.None })
          .then(files => console.log(JSON.stringify(files.sort())))
          .catch(error => { console.error(error); process.exitCode = 1; });
      `,
        directory,
      );
      const files = JSON.parse(output) as string[];
      expect(files).toContain('package.json');
      expect(files).toContain('src/main.ts');
      expect(files).toContain('src/.hidden.ts');
      expect(files).not.toContain('src/generated/drop.ts');
      expect(files).not.toContain('src/main.test.ts');
      expect(files.some((file) => file.startsWith('node_modules/'))).toBe(false);
    });
  });

  it.each([false, true])('renders Mocha assertion diffs with inlineDiffs=%s', (inlineDiffs) => {
    withFixture((directory) => {
      const fixture = path.join(directory, 'assertion.test.cjs');
      fs.writeFileSync(
        fixture,
        `const assert = require('node:assert/strict');
        describe('diff compatibility', function () {
          it('shows changed words', function () { assert.equal('actual token\\n', 'expected token\\n'); });
        });`,
      );
      const output = runNode(
        `
        const Mocha = require(${JSON.stringify(mochaPath)});
        const collectFiles = require(${JSON.stringify(mochaRequire.resolve('mocha/lib/cli/collect-files'))});
        const result = collectFiles({ spec: ['*.test.{cjs,mjs}'], extension: ['cjs'],
          ignore: ['**/skip.*'], file: [], recursive: false, sort: true });
        if (result.files.length !== 1) throw new Error('Mocha glob collection failed');
        const mocha = new Mocha({ reporter: 'spec', color: false, inlineDiffs: ${inlineDiffs} });
        result.files.forEach(file => mocha.addFile(file));
        mocha.run(failures => { process.exitCode = failures === 1 ? 0 : 1; });
      `,
        directory,
      );
      expect(output).toContain('1 failing');
      expect(output).toContain('actual');
      expect(output).toContain('expected');
      expect(output).not.toContain('failed to generate Mocha diff');
      expect(output).toContain(inlineDiffs ? 'actual expected' : '+ expected - actual');
    });
  });
});
