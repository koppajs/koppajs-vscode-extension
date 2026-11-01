import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originalGuard = 'if (!matcher.makeRe()) {';
const compatibleGuard = 'if (matcher.set.length === 0) {';
const sourceHashes = {
  'lib/common/fileOperations.js':
    '5d38e3f825f80f4e72fd931c50d014cc86f636218b724740377fc7bc9023f907',
  'lib/common/utils/globPattern.js':
    'ec8f8ed49366dc71c63a6908f0de06568086058cef3e59d6665df4c721826129',
};

function digest(source) {
  return createHash('sha256').update(source).digest('hex');
}

export function prepareLanguageClient(
  clientDirectory = path.join(rootDirectory, 'node_modules/vscode-languageclient'),
) {
  const require = createRequire(path.join(clientDirectory, 'package.json'));
  const client = JSON.parse(readFileSync(path.join(clientDirectory, 'package.json'), 'utf8'));
  const minimatch = require('minimatch/package.json');
  if (client.version !== '11.0.0' || minimatch.version !== '11.0.3') {
    throw new Error(
      `Language client compatibility patch requires vscode-languageclient 11.0.0 and minimatch 11.0.3; found ${client.version} and ${minimatch.version}. Review the patch before updating dependencies.`,
    );
  }

  // Validate every file before writing any file. Never patch an unknown upstream revision.
  const updates = Object.entries(sourceHashes).map(([relativePath, originalHash]) => {
    const filename = path.join(clientDirectory, relativePath);
    const source = readFileSync(filename, 'utf8');
    const original = source.replace(compatibleGuard, originalGuard);
    if (digest(original) !== originalHash || original.split(originalGuard).length !== 2) {
      throw new Error(
        `Unexpected language client source: ${relativePath}. Review the compatibility patch.`,
      );
    }
    // minimatch 11 matches directly without compiling a RegExp. Preserve rejection of empty sets.
    const updated = original.replace(originalGuard, compatibleGuard);
    return { filename, source, updated };
  });
  for (const { filename, source, updated } of updates) {
    if (source !== updated) {
      writeFileSync(filename, updated);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareLanguageClient();
  console.log('Language client glob compatibility verified.');
}
