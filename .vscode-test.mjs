import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/src/test/integration/**/*.js',
  mocha: {
    parallel: false,
    timeout: 10_000,
  },
});
