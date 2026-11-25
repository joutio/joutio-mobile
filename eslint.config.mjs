import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * L'app ne touche jamais au cache (`docs/frontend/donnees-et-etat.md`) : TanStack Query ne s'importe qu'au montage du
 * provider (`src/app/_layout.tsx`, réseau de `onlineManager`). Les lectures et mutations viennent de `@joutio/client`.
 */
const NO_CACHE = {
  paths: [{ name: '@tanstack/react-query', message: "Les données passent par les hooks de @joutio/client : l'app ne touche jamais au cache." }],
}

export default defineConfig([
  globalIgnores(['ios', 'android', 'node_modules', '.expo', 'modules/*/build', 'patches']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, __DEV__: 'readonly' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React Native charge par `require` les modules natifs facultatifs et les ressources (`whatwg-fetch`, avatars).
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', NO_CACHE],
    },
  },
  {
    files: ['src/app/_layout.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
])
