import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  version: '1.144.0',
  files: 'out/src/test/integration/**/*.js',
  mocha: {
    parallel: false,
    timeout: 10_000,
  },
});
