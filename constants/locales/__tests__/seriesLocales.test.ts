/**
 * The recurring-events copy (`series.*`) and the two duplicate-guard strings that came
 * with it must say the same thing in the three languages: a key present in one locale
 * only renders as its raw path, and a missing `{{variable}}` silently drops a number or
 * a date from the sentence.
 */

import fs from 'fs';
import path from 'path';

import { en } from '@/constants/locales/en';
import { fr } from '@/constants/locales/fr';
import { nl } from '@/constants/locales/nl';

type Tree = { [key: string]: string | Tree };

const LOCALES: Record<'en' | 'fr' | 'nl', Tree> = {
  en: en as unknown as Tree,
  fr: fr as unknown as Tree,
  nl: nl as unknown as Tree,
};

const OTHER_LOCALES = ['fr', 'nl'] as const;

/** Every string leaf under a node, keyed by its dot path. */
function leaves(node: string | Tree, prefix = ''): Record<string, string> {
  if (typeof node === 'string') return { [prefix]: node };
  return Object.entries(node).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...leaves(child, prefix ? `${prefix}.${key}` : key) }),
    {}
  );
}

/** The `{one, other}` objects of a tree, keyed by the dot path of the object. */
function pluralNodes(node: string | Tree, prefix = ''): Record<string, string[]> {
  if (typeof node === 'string') return {};
  const found: Record<string, string[]> = {};
  if (typeof node.one === 'string' && typeof node.other === 'string') {
    found[prefix] = Object.keys(node).sort();
  }
  for (const [key, child] of Object.entries(node)) {
    Object.assign(found, pluralNodes(child, prefix ? `${prefix}.${key}` : key));
  }
  return found;
}

/** The distinct `{{variables}}` of a string, sorted. */
function variablesOf(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]))].sort();
}

function lookup(tree: Tree, dotPath: string): string | Tree | undefined {
  return dotPath
    .split('.')
    .reduce<string | Tree | undefined>(
      (node, key) => (node && typeof node !== 'string' ? node[key] : undefined),
      tree
    );
}

describe('series locales', () => {
  const seriesOf = (locale: keyof typeof LOCALES) => LOCALES[locale].series as Tree;

  it('has a series section in every locale', () => {
    for (const locale of ['en', 'fr', 'nl'] as const) {
      expect(typeof seriesOf(locale)).toBe('object');
      expect(Object.keys(leaves(seriesOf(locale))).length).toBeGreaterThan(100);
    }
  });

  describe('key tree', () => {
    it.each(OTHER_LOCALES)('has the same keys under series in %s as in en', (locale) => {
      const reference = Object.keys(leaves(seriesOf('en'))).sort();

      expect(Object.keys(leaves(seriesOf(locale))).sort()).toEqual(reference);
    });

    it.each(['en', 'fr', 'nl'] as const)('has no empty string under series in %s', (locale) => {
      const empty = Object.entries(leaves(seriesOf(locale)))
        .filter(([, text]) => text.trim() === '')
        .map(([key]) => key);

      expect(empty).toEqual([]);
    });
  });

  describe('interpolation variables', () => {
    it.each(OTHER_LOCALES)('uses the same {{variables}} per string in %s as in en', (locale) => {
      const reference = leaves(seriesOf('en'));
      const translated = leaves(seriesOf(locale));

      const mismatches = Object.keys(reference)
        .filter((key) => key in translated)
        .filter((key) => {
          // A "1 event" singular may spell the number out instead of using {{count}}, in
          // any language; the plural form below is the one that must always carry it.
          const isSingular = key.endsWith('.one');
          const expected = variablesOf(reference[key]);
          const actual = variablesOf(translated[key]);
          if (isSingular) return actual.some((name) => !variablesOf(reference[key]).includes(name));
          return expected.join() !== actual.join();
        })
        .map((key) => ({
          key,
          en: variablesOf(reference[key]),
          [locale]: variablesOf(translated[key]),
        }));

      expect(mismatches).toEqual([]);
    });

    it.each(['en', 'fr', 'nl'] as const)(
      'gives every plural "other" form in %s its {{count}}',
      (locale) => {
        const missing = Object.entries(leaves(seriesOf(locale)))
          .filter(([key]) => key.endsWith('.other'))
          .filter(([, text]) => !variablesOf(text).includes('count'))
          .map(([key]) => key);

        expect(missing).toEqual([]);
      }
    );
  });

  describe('plural shapes', () => {
    it('has plural nodes at all', () => {
      expect(Object.keys(pluralNodes(seriesOf('en'))).length).toBeGreaterThan(5);
    });

    it.each(OTHER_LOCALES)('has {one, other} exactly where en has it, in %s', (locale) => {
      expect(pluralNodes(seriesOf(locale))).toEqual(pluralNodes(seriesOf('en')));
    });
  });

  describe('keys the screens ask for', () => {
    const SOURCES = [
      'app/(tabs)/(more)/create-event.tsx',
      'app/(tabs)/(more)/draft-events.tsx',
      'app/draft-edit/[id].tsx',
      'app/event-edit/[id].tsx',
      'app/event/[id].tsx',
      'app/series/[id].tsx',
      'components/CancelEventModal.tsx',
      'components/RepeatFields.tsx',
      'components/SeriesBadge.tsx',
      'components/SeriesScopeDialog.tsx',
      'utils/recurrence.ts',
    ];

    const literalKeys = (file: string): string[] => {
      const source = fs.readFileSync(path.join(__dirname, '..', '..', '..', file), 'utf8');
      return [...source.matchAll(/['"`](series\.[A-Za-z0-9_.]+)['"`]/g)].map((match) => match[1]);
    };

    it.each(SOURCES)('only asks for series keys that exist in every locale: %s', (file) => {
      const unresolved = literalKeys(file).flatMap((key) =>
        (['en', 'fr', 'nl'] as const)
          .filter((locale) => lookup(LOCALES[locale], key) === undefined)
          .map((locale) => `${locale}:${key}`)
      );

      expect(unresolved).toEqual([]);
    });

    it('finds the keys it is meant to check', () => {
      expect(literalKeys('components/RepeatFields.tsx')).toEqual(
        expect.arrayContaining(['series.repeat.once', 'series.ordinals.last'])
      );
    });
  });
});

describe('duplicate-guard locales for series', () => {
  it.each(['en', 'fr', 'nl'] as const)(
    'has duplicates.yourDate and clashingDates in %s',
    (locale) => {
      const duplicates = LOCALES[locale].duplicates as Tree;

      expect(typeof duplicates.yourDate).toBe('string');
      expect(typeof duplicates.clashingDates).toBe('string');
      expect(variablesOf(duplicates.yourDate as string)).toEqual(['date']);
      expect(variablesOf(duplicates.clashingDates as string)).toEqual(['dates']);
    }
  );

  it('keeps the two apart from the English wording in fr and nl', () => {
    for (const locale of OTHER_LOCALES) {
      const duplicates = LOCALES[locale].duplicates as Tree;
      const reference = LOCALES.en.duplicates as Tree;

      expect(duplicates.yourDate).not.toBe(reference.yourDate);
      expect(duplicates.clashingDates).not.toBe(reference.clashingDates);
    }
  });
});
