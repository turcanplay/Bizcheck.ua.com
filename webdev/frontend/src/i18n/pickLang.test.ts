import { describe, it, expect } from 'vitest';
import { pickLang, pickLangValue, pickLangOrNull } from '@/i18n/pickLang';

/**
 * Quiz/catalog content is typed by hand in the admin panel, so half-translated
 * rows are the norm, not an edge case. These tests pin the contract every
 * display site relies on: never render an empty string when the OTHER language
 * has content.
 */
describe('pickLangValue', () => {
  it('returns the requested language when it has content', () => {
    expect(pickLangValue('Українська', 'English', 'uk')).toBe('Українська');
    expect(pickLangValue('Українська', 'English', 'en')).toBe('English');
  });

  it('falls back to the other language when the requested one is an empty string', () => {
    expect(pickLangValue('Українська', '', 'en')).toBe('Українська');
    expect(pickLangValue('', 'English', 'uk')).toBe('English');
  });

  it('falls back to the other language when the requested one is null', () => {
    expect(pickLangValue('Українська', null, 'en')).toBe('Українська');
    expect(pickLangValue(null, 'English', 'uk')).toBe('English');
  });

  it('falls back when the requested one is undefined', () => {
    expect(pickLangValue('Українська', undefined, 'en')).toBe('Українська');
    expect(pickLangValue(undefined, 'English', 'uk')).toBe('English');
  });

  it('treats a whitespace-only value as missing', () => {
    expect(pickLangValue('Українська', '   ', 'en')).toBe('Українська');
    expect(pickLangValue('\n\t ', 'English', 'uk')).toBe('English');
  });

  it('returns an empty string when BOTH languages are missing', () => {
    expect(pickLangValue('', '', 'uk')).toBe('');
    expect(pickLangValue(null, null, 'en')).toBe('');
    expect(pickLangValue(undefined, '  ', 'uk')).toBe('');
  });

  it('returns the original value untrimmed so formatting survives', () => {
    expect(pickLangValue('  padded  ', '', 'uk')).toBe('  padded  ');
    expect(pickLangValue('line1\nline2', '', 'uk')).toBe('line1\nline2');
  });
});

describe('pickLang (suffixed row)', () => {
  const test = { slug: 'x', name_uk: 'Тест', name_en: 'Test' };

  it('reads <base>_uk / <base>_en off the row', () => {
    expect(pickLang(test, 'name', 'uk')).toBe('Тест');
    expect(pickLang(test, 'name', 'en')).toBe('Test');
  });

  it('falls back across languages per field independently', () => {
    const half = { name_uk: 'Тест', name_en: '', description_uk: '', description_en: 'Desc' };
    expect(pickLang(half, 'name', 'en')).toBe('Тест');
    expect(pickLang(half, 'description', 'uk')).toBe('Desc');
  });

  it('returns an empty string for a null/undefined row', () => {
    expect(pickLang(null, 'name', 'uk')).toBe('');
    expect(pickLang(undefined, 'name', 'en')).toBe('');
  });

  it('returns an empty string when the row lacks the field entirely', () => {
    expect(pickLang({} as { name_uk?: string; name_en?: string }, 'name', 'uk')).toBe('');
  });

  it('handles nullable optional columns (question notes)', () => {
    const q = { note_uk: 'Підказка', note_en: null };
    expect(pickLang(q, 'note', 'en')).toBe('Підказка');
    expect(pickLang({ note_uk: null, note_en: null }, 'note', 'uk')).toBe('');
  });
});

describe('pickLangOrNull', () => {
  it('behaves like pickLang when there is content', () => {
    expect(pickLangOrNull({ note_uk: 'a', note_en: 'b' }, 'note', 'en')).toBe('b');
  });

  it('still falls back to the other language', () => {
    expect(pickLangOrNull({ note_uk: 'a', note_en: null }, 'note', 'en')).toBe('a');
  });

  it('returns null (not "") when both are missing, so callers can skip the container', () => {
    expect(pickLangOrNull({ note_uk: null, note_en: null }, 'note', 'uk')).toBeNull();
    expect(pickLangOrNull({ note_uk: '', note_en: '  ' }, 'note', 'en')).toBeNull();
  });
});
