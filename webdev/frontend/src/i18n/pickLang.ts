import type { Lang } from '@/i18n/translations';

/**
 * Bilingual field resolution with cross-language fallback.
 *
 * All quiz/catalog content lives in the database as `<field>_uk` / `<field>_en`
 * column pairs and is entered BY HAND from the admin panel. In practice one of
 * the two is very often left blank (the Ukrainian text is written first, the
 * English translation lands days later, or never).
 *
 * The old `lang === 'uk' ? x.name_uk : x.name_en` pattern rendered an empty
 * string in that case — an English visitor got a report with blank block
 * titles, blank question texts and blank answers. A report showing Ukrainian
 * text to an EN visitor is imperfect; a report showing NOTHING is broken.
 *
 * So: prefer the requested language, fall back to the other one, and only
 * return '' when BOTH are missing. Whitespace-only values count as missing —
 * an admin who types a space into the EN box has not translated anything.
 *
 * Use this everywhere a `_uk`/`_en` pair is resolved for display. Do not
 * re-introduce a bare ternary.
 */

const OTHER_LANG: Record<Lang, Lang> = { uk: 'en', en: 'uk' };

function isBlank(v: string | null | undefined): boolean {
  return v == null || v.trim() === '';
}

/**
 * Core resolver over two already-extracted values.
 *
 * Returns the preferred language's value when it has content, otherwise the
 * other language's value, otherwise `''`. The returned string is the ORIGINAL
 * value (not trimmed) so intentional formatting/newlines survive.
 */
export function pickLangValue(
  uk: string | null | undefined,
  en: string | null | undefined,
  lang: Lang,
): string {
  const byLang = { uk, en };
  const preferred = byLang[lang];
  if (!isBlank(preferred)) return preferred as string;
  const fallback = byLang[OTHER_LANG[lang]];
  if (!isBlank(fallback)) return fallback as string;
  return '';
}

/** A row carrying a `<base>_uk` / `<base>_en` column pair. */
export type BilingualRow<K extends string> = Partial<
  Record<`${K}_uk` | `${K}_en`, string | null | undefined>
>;

/**
 * Resolve `row.<base>_uk` / `row.<base>_en` for `lang`, with fallback.
 *
 *   pickLang(test, 'name', lang)          → test.name_uk  / test.name_en
 *   pickLang(question, 'note', lang)      → question.note_uk / question.note_en
 *
 * A null/undefined row yields `''` so callers never have to null-guard first.
 */
export function pickLang<K extends string>(
  row: BilingualRow<K> | null | undefined,
  base: K,
  lang: Lang,
): string {
  if (!row) return '';
  const uk = row[`${base}_uk` as keyof BilingualRow<K>] as string | null | undefined;
  const en = row[`${base}_en` as keyof BilingualRow<K>] as string | null | undefined;
  return pickLangValue(uk, en, lang);
}

/**
 * Same as {@link pickLang} but returns `null` instead of `''` when neither
 * language has content. For optional fields (question notes) whose consumers
 * branch on `null`/falsy to decide whether to render a container at all.
 */
export function pickLangOrNull<K extends string>(
  row: BilingualRow<K> | null | undefined,
  base: K,
  lang: Lang,
): string | null {
  return pickLang(row, base, lang) || null;
}
