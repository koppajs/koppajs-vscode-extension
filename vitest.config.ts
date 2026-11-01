import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/unit/**/*.test.ts'],
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
      include: [
        'src/data/kpaBlocks.ts',
        'src/diagnosticsEngine.ts',
        'src/utils/blockUtils.ts',
        'src/utils/htmlUtils.ts',
      ],
    },
  },
});
