import fs from 'fs';
import path from 'path';
import en from '@/constants/locales/en';
import fr from '@/constants/locales/fr';
import nl from '@/constants/locales/nl';

// The component tests mock t(), so a key that doesn't exist only shows on a device, as the raw
// key. These are the screens of the sign-in second step, its setup and account deletion.
const ROOT = path.resolve(__dirname, '../..');
const SOURCES = [
  'components/auth',
  'app/(auth)/sign-in.tsx',
  'app/(tabs)/(more)/delete-account.tsx',
];

function sourceFiles(entry: string): string[] {
  const full = path.join(ROOT, entry);
  if (fs.statSync(full).isFile()) return [full];
  return fs
    .readdirSync(full)
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => path.join(full, name));
}

function keysUsed(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCES.flatMap(sourceFiles)) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

function hasText(locale: object, key: string): boolean {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);
  return (
    typeof value === 'string' ||
    (typeof value === 'object' &&
      value !== null &&
      typeof (value as { other?: unknown }).other === 'string')
  );
}

describe('two-step verification text', () => {
  it('finds the keys it checks', () => {
    expect(keysUsed()).toEqual(expect.arrayContaining(['mfa.enrollTitle', 'errors.network']));
  });

  it.each([
    ['en', en],
    ['fr', fr],
    ['nl', nl],
  ])('has every key the screens use in %s', (_locale, data) => {
    expect(keysUsed().filter((key) => !hasText(data, key))).toEqual([]);
  });

  // The lock is per account: on a shared account, someone else's wrong codes lock everyone out,
  // so the text has to name the account rather than suggest this person typed them.
  it.each([
    ['en', en, /this account/i],
    ['fr', fr, /ce compte/i],
    ['nl', nl, /dit account/i],
  ])('says in %s that the whole account is locked', (_locale, data, account) => {
    const { blocked, lockedFor } = data.mfa;
    for (const text of [blocked, lockedFor.one, lockedFor.other]) {
      expect(text).toMatch(account);
    }
    expect(lockedFor.other).toContain('{{count}}');
  });
});
