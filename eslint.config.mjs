// Минимальные правила ESLint (22.11.2026): ошибки, а не стиль. Стиль — Prettier, типы — tsc.
// Проверяются скрипты .mjs (конвейер, тесты, сборка сайта, бот). Файлы TypeScript проверяет `npm run typecheck`.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'web/dist/',
      'web/gen/',
      'node_modules/',
      'data/',
      'extracts/',
      'out/',
      'tests/js/.tmp-*/',
      'src/',
      'web/static/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: {
      // код в тестах и сборке намеренно плотный: пустые catch и неиспользуемые аргументы допустимы
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
    },
  },
];
