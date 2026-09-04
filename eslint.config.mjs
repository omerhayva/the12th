import { createRequire } from 'node:module';
import { defineConfig, globalIgnores } from 'eslint/config';

const require = createRequire(import.meta.url);
const nextVitalsModule = require('eslint-config-next/core-web-vitals');
const nextTsModule = require('eslint-config-next/typescript');

const nextVitals = Array.isArray(nextVitalsModule)
  ? nextVitalsModule
  : nextVitalsModule?.default ?? [];
const nextTs = Array.isArray(nextTsModule)
  ? nextTsModule
  : nextTsModule?.default ?? [];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
