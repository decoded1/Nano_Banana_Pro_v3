// eslint.config.js - ESLint v9 Flat Configuration
// Nano Banana Pro - Strict TypeScript Quality Enforcement

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginImport from 'eslint-plugin-import';
import pluginHtml from 'eslint-plugin-html';

export default tseslint.config(
  // 1. Global Settings - Path Alias Resolver Configuration
  {
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true,
        },
      },
    },
  },

  // 2. TypeScript Files Configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2022,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: pluginImport,
    },
    rules: {
      // Base JavaScript recommended rules
      ...pluginJs.configs.recommended.rules,

      // TypeScript ESLint recommended rules
      ...tseslint.configs.recommended.reduce((acc, config) => {
        return { ...acc, ...(config.rules || {}) };
      }, {}),

      // TypeScript ESLint strict rules (maximum type safety)
      ...tseslint.configs.strict.reduce((acc, config) => {
        return { ...acc, ...(config.rules || {}) };
      }, {}),

      // TypeScript ESLint stylistic rules
      ...tseslint.configs.stylistic.reduce((acc, config) => {
        return { ...acc, ...(config.rules || {}) };
      }, {}),

      // Custom rule overrides
      'no-console': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Disable type-unaware rules that conflict with type-aware versions
      'no-undef': 'off',

      // Import plugin rules
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // 3. HTML Files Configuration
  {
    files: ['**/*.html'],
    plugins: {
      html: pluginHtml,
    },
    languageOptions: {
      sourceType: 'module',
    },
  },

  // 4. JSON Files Configuration (basic parsing)
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: {
        parse: (text) => {
          try {
            JSON.parse(text);
            return { type: 'Program', body: [], sourceType: 'module' };
          } catch {
            throw new Error('Invalid JSON');
          }
        },
      },
    },
    rules: {},
  },

  // 5. Prettier Conflict Resolution (MUST be last before ignores)
  eslintConfigPrettier,

  // 6. Global Ignore List
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      'index.html.original',
      '.husky/',
    ],
  }
);
