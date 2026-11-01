import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: [
      '.diffuno/**',
      'coverage/**',
      'dist/**',
      'out/**',
      '.vscode-test/**',
      '.local/**',
      '*.vsix',
      '**/*.d.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.es2022, ...globals.mocha, ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs['eslint-recommended'].overrides[0].rules,
      ...tseslint.configs.recommended.rules,
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.es2022, ...globals.node },
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
];
