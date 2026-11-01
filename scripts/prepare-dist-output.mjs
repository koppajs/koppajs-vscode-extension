import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(rootDirectory, 'dist');
const packageJsonPath = path.join(distDirectory, 'package.json');

mkdirSync(distDirectory, { recursive: true });
writeFileSync(packageJsonPath, `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
