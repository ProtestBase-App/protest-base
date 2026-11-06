#!/usr/bin/env node

/**
 * Points git at the tracked hooks in .githooks/, so the pre-commit secret scan runs for
 * everyone who installs dependencies. Runs from the `prepare` script on every
 * `npm install` / `npm ci`.
 *
 * It must never fail an install: EAS and CI run `npm ci` where the project may not be a
 * git work tree, so anything unexpected is skipped. A different core.hooksPath that
 * someone set on purpose is left alone.
 */

const { execFileSync } = require('child_process');

const HOOKS_PATH = '.githooks';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

try {
  if (git(['rev-parse', '--is-inside-work-tree']) === 'true') {
    const current = git(['config', '--local', '--default', '', '--get', 'core.hooksPath']);

    if (current === HOOKS_PATH) {
      // Already enabled.
    } else if (current) {
      console.log(
        `Git hooks: core.hooksPath is "${current}", left as is; the secret scan in ${HOOKS_PATH}/ is not enabled.`
      );
    } else {
      git(['config', '--local', 'core.hooksPath', HOOKS_PATH]);
      console.log(`Git hooks: enabled ${HOOKS_PATH}/ (secret scan before each commit).`);
    }
  }
} catch (error) {
  console.log(
    `Git hooks: skipped (${error instanceof Error ? error.message.split('\n')[0] : String(error)}).`
  );
}
