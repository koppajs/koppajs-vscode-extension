import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const vsceRequire = createRequire(repositoryRequire.resolve('@vscode/vsce'));
const { ZipFile } = vsceRequire('yazl') as {
  ZipFile: new () => {
    addBuffer: (buffer: Buffer, name: string) => void;
    end: () => void;
    outputStream: NodeJS.ReadableStream;
  };
};
const scriptUrl = pathToFileURL(path.resolve('scripts/release-archive.mjs')).href;
const runtime = {
  'assets/icon.png': 'fixture-icon-bytes',
  'dist/extension.js': 'exports.activate = () => {};\n',
  'dist/language-server.js': 'module.exports = {};\n',
  'dist/package.json': '{"type":"commonjs"}\n',
  'language-configuration.json': '{}',
  'syntaxes/kpa.tmLanguage.json': '{}',
};

async function withArchive(
  change: (entries: Map<string, string>) => void,
  run: (directory: string, archive: string) => void,
) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koppa-release-archive-'));
  try {
    for (const [file, source] of Object.entries(runtime)) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), source);
    }
    const entries = new Map([
      ['[Content_Types].xml', '<Types/>'],
      ['extension.vsixmanifest', '<PackageManifest/>'],
      [
        'extension/package.json',
        '{"main":"./dist/extension.js","type":"module","icon":"assets/icon.png"}',
      ],
      ['extension/README.md', '# Fixture'],
      ...Object.entries(runtime).map(([file, source]): [string, string] => [
        `extension/${file}`,
        source,
      ]),
    ]);
    change(entries);
    const archive = path.join(directory, 'fixture.vsix');
    const zip = new ZipFile();
    for (const [file, source] of entries) {
      zip.addBuffer(Buffer.from(source), file);
    }
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(archive);
      output.on('close', resolve);
      output.on('error', reject);
      zip.outputStream.on('error', reject);
      zip.outputStream.pipe(output);
      zip.end();
    });
    run(directory, archive);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function check(directory: string, archive: string, afterCheck = '') {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { checkReleaseArchive, assertReleaseUnchanged } from ${JSON.stringify(scriptUrl)};
       import fs from 'node:fs';
       const root = ${JSON.stringify(directory)};
       const entries = await checkReleaseArchive(${JSON.stringify(archive)}, root);
       const archiveBeforeTests = fs.readFileSync(${JSON.stringify(archive)});
       ${afterCheck}
       assertReleaseUnchanged(entries, root, ${JSON.stringify(archive)}, archiveBeforeTests);`,
    ],
    { encoding: 'utf8', timeout: 5_000 },
  );
}

async function rejects(change: (entries: Map<string, string>) => void, message: string) {
  await withArchive(change, (directory, archive) => {
    const result = check(directory, archive);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
  });
}

describe('release VSIX archive contract', () => {
  it('accepts a real ZIP with runtime bundles, marker and normal product assets', async () => {
    await withArchive(
      () => {},
      (directory, archive) => {
        const result = check(directory, archive);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
      },
    );
  });

  it.each(['extension/package.json', ...Object.keys(runtime).map((file) => `extension/${file}`)])(
    'rejects missing or empty %s',
    async (file) => {
      await rejects(
        (entries) => entries.delete(file),
        `Missing or empty VSIX runtime file: ${file}`,
      );
      await rejects(
        (entries) => entries.set(file, ''),
        `Missing or empty VSIX runtime file: ${file}`,
      );
    },
  );

  it.each([
    'extension/.diffuno/kanban/tasks.json',
    'extension/.DIFFUNO/quick-actions.json',
    'extension/node_modules/pkg/index.js',
    'extension/dist/node_modules/pkg/index.js',
    'extension/src/extension.js',
    'extension/out/integration.js',
    'extension/test/fixture.json',
    'extension/tests/fixture.json',
    'extension/__tests__/fixture.json',
    'extension/scripts/build.mjs',
    'extension/dist/extension.js.map',
    'extension/dist/component.ts',
    'extension/dist/component.tsx',
    'extension/dist/component.mts',
    'extension/dist/component.cts',
    'extension/dist/component.jsx',
    'extension/dist/extension.test.js',
    'extension/dist/extension.spec.cjs',
    'extension/dist/kpa-check.js',
    'extension/DIST/EXTENSION.JS.MAP',
  ])('rejects forbidden payload %s', async (file) => {
    await rejects((entries) => entries.set(file, 'unwanted'), `Forbidden VSIX entry: ${file}`);
  });

  it.each(['module', undefined])('rejects a non-CommonJS marker (%s)', async (type) => {
    await rejects(
      (entries) => entries.set('extension/dist/package.json', JSON.stringify({ type })),
      'must declare type commonjs',
    );
  });

  it.each([
    { main: './out/extension.js', type: 'module' },
    { main: './dist/extension.js', type: 'commonjs' },
  ])('rejects manifest drift: %j', async (manifest) => {
    await rejects(
      (entries) => entries.set('extension/package.json', JSON.stringify(manifest)),
      'Unexpected VSIX extension manifest main/type',
    );
  });

  it.each([undefined, 'assets/missing.png'])(
    'rejects an incorrect icon reference (%s)',
    async (icon) => {
      await rejects(
        (entries) =>
          entries.set(
            'extension/package.json',
            JSON.stringify({
              main: './dist/extension.js',
              type: 'module',
              icon,
            }),
          ),
        'VSIX extension manifest must reference assets/icon.png',
      );
    },
  );

  it('rejects malformed JSON', async () => {
    await rejects((entries) => entries.set('extension/dist/package.json', '{'), 'SyntaxError');
  });

  it.each(Object.keys(runtime))('rejects byte drift in %s', async (file) => {
    await rejects(
      (entries) => entries.set(`extension/${file}`, `${runtime[file as keyof typeof runtime]} `),
      `Packaged and tested workspace file differ: ${file}`,
    );
  });

  it('detects workspace rebuilds after the initial archive check', async () => {
    await withArchive(
      () => {},
      (directory, archive) => {
        const result = check(
          directory,
          archive,
          `fs.appendFileSync(root + '/dist/extension.js', '// rebuilt');`,
        );
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          'Packaged and tested workspace file differ: dist/extension.js',
        );
      },
    );
  });

  it('detects archive changes after the initial archive check', async () => {
    await withArchive(
      () => {},
      (directory, archive) => {
        const result = check(
          directory,
          archive,
          `fs.appendFileSync(${JSON.stringify(archive)}, 'changed');`,
        );
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('VSIX archive changed during release host tests');
      },
    );
  });

  it('rejects case-colliding runtime entries', async () => {
    await rejects(
      (entries) => entries.set('extension/dist/Extension.js', 'duplicate'),
      'Duplicate VSIX entry',
    );
  });

  it('rejects a corrupt archive', async () => {
    await withArchive(
      () => {},
      (directory, archive) => {
        fs.writeFileSync(archive, 'not a zip');
        const result = check(directory, archive);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/end of central directory/i);
      },
    );
  });
});
