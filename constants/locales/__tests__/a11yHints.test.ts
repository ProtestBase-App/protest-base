/**
 * A hint key that does not resolve is read aloud as its raw path, and only someone using
 * a screen reader would ever notice: `t()` falls back to the key and `TranslationKey` is
 * a plain string, so neither the type checker nor a render catches it.
 */

import fs from 'fs';
import path from 'path';

import { en } from '@/constants/locales/en';
import { fr } from '@/constants/locales/fr';
import { nl } from '@/constants/locales/nl';

const ROOT = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const usedKeys = new Set(
  ['app', 'components']
    .flatMap((dir) => sourceFiles(path.join(ROOT, dir)))
    .flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(/a11y\.hints\.(\w+)/g)].map((match) => match[1])
    )
);

describe('a11y.hints', () => {
  it('is actually used by the source this test scans', () => {
    expect(usedKeys.size).toBeGreaterThan(0);
  });

  it.each([
    ['en', en],
    ['fr', fr],
    ['nl', nl],
  ])('%s has every hint the app asks for, and no other', (_name, locale) => {
    expect(Object.keys(locale.a11y.hints).sort()).toEqual([...usedKeys].sort());
  });
});
