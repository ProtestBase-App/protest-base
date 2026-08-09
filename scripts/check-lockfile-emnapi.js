#!/usr/bin/env node

/**
 * Guards package-lock.json against the npm-version skew that breaks EAS builds.
 *
 * `@unrs/resolver-binding-wasm32-wasi` (eslint-import-resolver-typescript ->
 * unrs-resolver) declares @emnapi/core + @emnapi/runtime as optional deps.
 * npm 11 prunes those optional entries out of the lockfile; npm 10 — which the
 * EAS build image runs — then rejects the result with
 * "Missing: @emnapi/wasi-threads from lock file" and the build dies.
 *
 * The repo pins both packages as root devDependencies so they are non-optional
 * and survive either npm. This script asserts that shape still holds.
 *
 * Two distinct failures are checked, because `npm ci` only catches the first:
 *   1. missing top-level entries  -> lockfile is already broken for EAS
 *   2. nested copies under the binding -> lockfile is still valid, but the
 *      nested copies are optional again, so the next npm 11 write silently
 *      reintroduces failure 1. This is the early warning, and it fires when
 *      the root pin drifts from the version the binding requires.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED = [
  'node_modules/@emnapi/core',
  'node_modules/@emnapi/runtime',
  'node_modules/@emnapi/wasi-threads',
];

const BINDING = 'node_modules/@unrs/resolver-binding-wasm32-wasi';

// process.cwd() rather than __dirname, matching scripts/reset-project.js — npm
// scripts always run from the package root.
const lockPath = path.join(process.cwd(), 'package-lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const keys = Object.keys(lock.packages || {});

const missing = REQUIRED.filter((k) => !keys.includes(k));
const nested = keys.filter((k) => k.startsWith(`${BINDING}/node_modules/@emnapi/`));

if (missing.length === 0 && nested.length === 0) {
  console.log(`OK: ${REQUIRED.length} top-level @emnapi entries, no nested copies.`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error('FAIL: @emnapi entries missing from package-lock.json:');
  missing.forEach((k) => console.error(`  - ${k}`));
  console.error('\nThe lockfile was written by an npm that prunes optional deps (npm 11+).');
  console.error('EAS `npm ci` will fail on this. Regenerate it, then re-run this check.');
}

if (nested.length > 0) {
  console.error('\nFAIL: nested @emnapi copies under the wasm32-wasi binding:');
  nested.forEach((k) => console.error(`  - ${k}`));
  const required = lock.packages[BINDING]?.dependencies?.['@emnapi/core'];
  console.error(
    `\nThe root devDependency pin has drifted from the version the binding requires${
      required ? ` (${required})` : ''
    }.`
  );
  console.error('Nested copies are optional again and will be pruned by the next npm 11 write.');
  console.error('Fix: set @emnapi/core and @emnapi/runtime in devDependencies to that version.');
}

process.exit(1);
