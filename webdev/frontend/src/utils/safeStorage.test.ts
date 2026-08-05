import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readString, writeString, removeKey, readJson, writeJson } from '@/utils/safeStorage';

/**
 * These pin the failure modes that used to take the page down: a throwing
 * setItem (Safari private mode / quota exceeded), a throwing storage *property*
 * access, and corrupt JSON left behind by an older build.
 */

const spies: { restore: () => void }[] = [];

/**
 * Make one Storage method throw, as the browser does when the quota is hit.
 * Patched on Storage.prototype: a jsdom Storage instance is a Proxy whose
 * defineProperty trap turns `vi.spyOn(localStorage, 'setItem')` into a stored
 * *item* named "setItem", leaving the real method in place.
 */
function breakMethod(method: 'getItem' | 'setItem' | 'removeItem') {
  const spy = vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException('QuotaExceededError', 'QuotaExceededError');
  });
  spies.push({ restore: () => spy.mockRestore() });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  spies.splice(0).forEach(s => s.restore());
  vi.restoreAllMocks();
});

describe('safeStorage — happy path', () => {
  it('round-trips a string through localStorage', () => {
    expect(writeString('local', 'k', 'v')).toBe(true);
    expect(readString('local', 'k')).toBe('v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('round-trips JSON through sessionStorage', () => {
    expect(writeJson('session', 'state', { a: 1, b: ['x'] })).toBe(true);
    expect(readJson('session', 'state', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('keeps the two areas separate', () => {
    writeString('local', 'same', 'L');
    writeString('session', 'same', 'S');
    expect(readString('local', 'same')).toBe('L');
    expect(readString('session', 'same')).toBe('S');
  });

  it('removes a key', () => {
    writeString('session', 'k', 'v');
    expect(removeKey('session', 'k')).toBe(true);
    expect(readString('session', 'k')).toBeNull();
  });

  it('returns the fallback for a missing key', () => {
    expect(readJson('local', 'nope', { fallback: true })).toEqual({ fallback: true });
    expect(readString('local', 'nope')).toBeNull();
  });
});

describe('safeStorage — quota exceeded', () => {
  it('writeString reports failure instead of throwing', () => {
    breakMethod('setItem');
    expect(() => writeString('local', 'k', 'v')).not.toThrow();
    expect(writeString('local', 'k', 'v')).toBe(false);
  });

  it('writeJson reports failure instead of throwing — the value is lost, not the page', () => {
    breakMethod('setItem');
    expect(writeJson('session', 'quiz', { answers: { q1: 'a' } })).toBe(false);
    // Nothing persisted, and the caller carries on with its in-memory state.
    expect(readJson('session', 'quiz', null)).toBeNull();
  });

  it('a throwing getItem degrades to the fallback', () => {
    breakMethod('getItem');
    expect(readString('local', 'k')).toBeNull();
    expect(readJson('local', 'k', [])).toEqual([]);
  });

  it('a throwing removeItem reports failure instead of throwing', () => {
    breakMethod('removeItem');
    expect(removeKey('session', 'k')).toBe(false);
  });
});

describe('safeStorage — storage unavailable (Safari private mode)', () => {
  it('survives the storage property access itself throwing', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    spies.push({ restore: () => spy.mockRestore() });

    expect(readString('local', 'k')).toBeNull();
    expect(readJson('local', 'k', 'fb')).toBe('fb');
    expect(writeString('local', 'k', 'v')).toBe(false);
    expect(writeJson('local', 'k', {})).toBe(false);
    expect(removeKey('local', 'k')).toBe(false);
  });
});

describe('safeStorage — corrupt or unserialisable data', () => {
  it('falls back when the stored value is not JSON', () => {
    localStorage.setItem('k', '{not json');
    expect(readJson('local', 'k', { ok: true })).toEqual({ ok: true });
  });

  it('does not throw on a circular value — it just does not persist', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(writeJson('local', 'k', cyclic)).toBe(false);
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('treats undefined as nothing to store', () => {
    expect(writeJson('local', 'k', undefined)).toBe(false);
    expect(localStorage.getItem('k')).toBeNull();
  });
});
