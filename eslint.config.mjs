import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/*.config.mjs'],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // node:test describe/it return promises handled by the test runner
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
