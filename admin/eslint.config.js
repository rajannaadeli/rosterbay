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
  },
  {
    // CLI-installed shadcn primitives export cva variant helpers alongside
    // components by design — don't edit registry-owned files to satisfy lint.
    // map-markers co-locates leaflet divIcon factories with two tiny map
    // helper components by design (one module = one map vocabulary).
    files: ['src/components/ui/**/*.tsx', 'src/lib/map-markers.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
