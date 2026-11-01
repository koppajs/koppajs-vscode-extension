import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Resolve the ZIP reader from its owning tool, not an incidental hoisted dependency.
const vsceRequire = createRequire(require.resolve('@vscode/vsce'));
const { open } = vsceRequire('yauzl');
const runtimeFiles = [
  'assets/icon.png',
  'dist/extension.js',
  'dist/language-server.js',
  'dist/package.json',
  'language-configuration.json',
  'syntaxes/kpa.tmLanguage.json',
];
const requiredFiles = [
  'extension/package.json',
  ...runtimeFiles.map((file) => `extension/${file}`),
];

function checkEntryName(name) {
  const segments = name.toLowerCase().split('/');
  if (
    name.includes('\\') ||
    name.startsWith('/') ||
    segments.some((part) => part === '.' || part === '..')
  ) {
    throw new Error(`Unsafe VSIX entry: ${name}`);
  }
  if (
    segments.some((part) =>
      ['.diffuno', 'node_modules', 'src', 'out', 'test', 'tests', '__tests__', 'scripts'].includes(
        part,
      ),
    ) ||
    /\.(?:map|[cm]?tsx?|jsx)$/i.test(name) ||
    /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?js$/i.test(name) ||
    name === 'extension/dist/kpa-check.js'
  ) {
    throw new Error(`Forbidden VSIX entry: ${name}`);
  }
}

export function assertWorkspaceMatches(entries, rootDirectory) {
  for (const file of runtimeFiles) {
    const expected = entries.get(`extension/${file}`);
    if (!expected || !readFileSync(path.join(rootDirectory, file)).equals(expected)) {
      throw new Error(`Packaged and tested workspace file differ: ${file}`);
    }
  }
}

export function assertReleaseUnchanged(entries, rootDirectory, vsixPath, archiveBeforeTests) {
  assertWorkspaceMatches(entries, rootDirectory);
  if (!readFileSync(vsixPath).equals(archiveBeforeTests)) {
    throw new Error('VSIX archive changed during release host tests');
  }
}

export async function checkReleaseArchive(vsixPath, rootDirectory) {
  const entries = await new Promise((resolve, reject) => {
    open(vsixPath, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) {
        reject(error);
        return;
      }
      const contents = new Map();
      const names = new Set();
      const fail = (failure) => {
        zip.close();
        reject(failure);
      };
      zip.on('error', fail);
      zip.on('end', () => resolve(contents));
      zip.on('entry', (entry) => {
        try {
          checkEntryName(entry.fileName);
          const canonicalName = entry.fileName.toLowerCase();
          if (names.has(canonicalName)) {
            throw new Error(`Duplicate VSIX entry: ${entry.fileName}`);
          }
          names.add(canonicalName);
          if (!requiredFiles.includes(entry.fileName)) {
            zip.readEntry();
            return;
          }
          // Bound buffering even when a corrupt archive advertises an excessive size.
          if (entry.uncompressedSize > 64 * 1024 * 1024) {
            throw new Error(`Oversized VSIX runtime file: ${entry.fileName}`);
          }
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) {
              fail(streamError);
              return;
            }
            const chunks = [];
            stream.on('error', fail);
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => {
              contents.set(entry.fileName, Buffer.concat(chunks));
              zip.readEntry();
            });
          });
        } catch (entryError) {
          fail(entryError);
        }
      });
      zip.readEntry();
    });
  });

  for (const file of requiredFiles) {
    if (!entries.get(file)?.length) {
      throw new Error(`Missing or empty VSIX runtime file: ${file}`);
    }
  }
  const manifest = JSON.parse(entries.get('extension/package.json').toString('utf8'));
  if (manifest.main !== './dist/extension.js' || manifest.type !== 'module') {
    throw new Error('Unexpected VSIX extension manifest main/type');
  }
  if (manifest.icon !== 'assets/icon.png') {
    throw new Error('VSIX extension manifest must reference assets/icon.png');
  }
  const marker = JSON.parse(entries.get('extension/dist/package.json').toString('utf8'));
  if (marker.type !== 'commonjs') {
    throw new Error('VSIX dist/package.json must declare type commonjs');
  }
  assertWorkspaceMatches(entries, rootDirectory);
  return entries;
}
