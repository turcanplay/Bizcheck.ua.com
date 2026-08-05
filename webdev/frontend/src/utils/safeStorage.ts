/**
 * Guarded access to `localStorage` / `sessionStorage`.
 *
 * Web Storage throws in more situations than most call sites expect:
 *  - Safari private mode and iOS "block all cookies" throw `SecurityError`
 *    on the mere *property access* (`window.localStorage`), not just on use;
 *  - a full quota throws `QuotaExceededError` on `setItem`;
 *  - a stale/corrupt value throws inside `JSON.parse` on read.
 *
 * Unguarded, any of those becomes an exception inside a React event handler or
 * effect and tears down the tree — losing the quiz the user was filling in, to
 * save which was the whole point of the write.
 *
 * The contract here is deliberately boring: a read never throws and falls back,
 * a write never throws and reports success as a boolean. Storage is a cache,
 * never the source of truth — callers must stay correct when it does nothing.
 *
 * This covers the shapes already hand-rolled elsewhere (`utils/durableSave.ts`
 * read/writeOutbox, `i18n/routing.ts` read/writeStoredLang) so those can migrate
 * onto it later without a third semantics appearing.
 */

export type StorageArea = 'local' | 'session';

/**
 * Resolve the underlying Storage object, or null when it is unavailable.
 * The access itself is inside the try — that is where private mode throws.
 */
function resolve(area: StorageArea): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Raw string read. Returns null when absent or when storage is unavailable. */
export function readString(area: StorageArea, key: string): string | null {
  const store = resolve(area);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** Raw string write. Returns false when the value could not be persisted. */
export function writeString(area: StorageArea, key: string, value: string): boolean {
  const store = resolve(area);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false; // quota exceeded / storage disabled — non-fatal by design
  }
}

/** Delete a key. Returns false when storage is unavailable. */
export function removeKey(area: StorageArea, key: string): boolean {
  const store = resolve(area);
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and JSON-parse a key, returning `fallback` when it is missing,
 * unparseable, or storage is unavailable. No shape validation is done — the
 * caller owns the type it asserts (parse `unknown` and narrow if the value can
 * be stale).
 */
export function readJson<T>(area: StorageArea, key: string, fallback: T): T {
  const raw = readString(area, key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * JSON-stringify and write a value. Returns false when it could not be
 * persisted — including when the value itself is not serialisable (a cycle),
 * which must not take the page down either.
 */
export function writeJson(area: StorageArea, key: string, value: unknown): boolean {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  if (raw === undefined) return false; // JSON.stringify(undefined) — nothing to store
  return writeString(area, key, raw);
}
