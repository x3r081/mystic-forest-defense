import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This is a React Three Fiber app. Its render loop is intentionally
      // imperative: `useFrame` callbacks mutate Three.js objects returned from
      // hooks (camera, meshes, materials) every frame, and `useMemo` factories
      // generate stable per-instance seeds with `Math.random()`. The React
      // Compiler purity/immutability rules flag these correct, idiomatic
      // patterns as violations, so we disable them for this project while
      // keeping the genuinely useful hook rules (rules-of-hooks, deps).
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
    },
  },
])
