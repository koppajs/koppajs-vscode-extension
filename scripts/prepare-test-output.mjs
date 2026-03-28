import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDirectory = path.join(rootDirectory, 'out');
const packageJsonPath = path.join(outDirectory, 'package.json');

mkdirSync(outDirectory, { recursive: true });
writeFileSync(packageJsonPath, `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
