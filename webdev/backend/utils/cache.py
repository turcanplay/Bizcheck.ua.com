"""In-process TTL cache for hot read paths.

Deliberately dependency-free (no redis/memcached): the two things we cache —
the public quiz payload and the `site_settings` key/value store — are small,
read constantly and written rarely.

IMPORTANT — multi-worker semantics
----------------------------------
Gunicorn runs several worker PROCESSES; each one gets its OWN copy of this
cache. Explicit invalidation (`invalidate()` on a write) therefore only clears
the cache of the worker that handled the write — the other workers keep serving
their stale copy until it expires. That is why every entry also carries a SHORT
TTL: the TTL is the real safety net, invalidation is just the fast path that
makes the admin see their own edit immediately. Never raise the TTL to a value
where a stale read would be user-visible for long (60s is the current budget).

If a future change ever needs cross-worker invalidation, this module is the
single place to swap in a shared backend.
"""

from __future__ import annotations

import threading
import time

# Default freshness budget for every cached namespace (seconds).
DEFAULT_TTL = 60.0


class TTLCache:
    """Thread-safe {key: value} store with a per-entry expiry.

    Not an LRU: the key spaces here are tiny and bounded (one entry per test
    slug, one per settings key), so entries are only ever evicted by TTL or by
    an explicit invalidation.
    """

    __slots__ = ("_ttl", "_data", "_lock", "hits", "misses")

    def __init__(self, ttl: float = DEFAULT_TTL):
        self._ttl = float(ttl)
        self._data: dict = {}
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    @property
    def ttl(self) -> float:
        return self._ttl

    def get(self, key, default=None):
        """Return the cached value, or `default` when absent/expired."""
        now = time.monotonic()
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                self.misses += 1
                return default
            expires_at, value = entry
            if now >= expires_at:
                # Lazy eviction — no background sweeper thread to babysit.
                self._data.pop(key, None)
                self.misses += 1
                return default
            self.hits += 1
            return value

    def set(self, key, value, ttl: float | None = None):
        expires_at = time.monotonic() + (self._ttl if ttl is None else float(ttl))
        with self._lock:
            self._data[key] = (expires_at, value)
        return value

    def get_or_set(self, key, producer, ttl: float | None = None):
        """Return the cached value, computing it with `producer()` on a miss.

        The producer runs OUTSIDE the lock: a slow DB round-trip must never
        block readers of unrelated keys. Two concurrent misses on the same key
        may therefore both compute — harmless (the result is identical) and far
        cheaper than serializing every request behind one mutex.
        """
        sentinel = object()
        cached = self.get(key, sentinel)
        if cached is not sentinel:
            return cached
        value = producer()
        self.set(key, value, ttl=ttl)
        return value

    def invalidate(self, key=None):
        """Drop one key, or the whole namespace when `key` is None."""
        with self._lock:
            if key is None:
                self._data.clear()
            else:
                self._data.pop(key, None)

    def __len__(self):
        with self._lock:
            return len(self._data)


# ---------------------------------------------------------------------------
# Shared namespaces
# ---------------------------------------------------------------------------
# Public quiz payload, keyed by (test_slug, test_id). Invalidated whenever an
# admin writes a test / block / question / answer.
quiz_cache = TTLCache(DEFAULT_TTL)

# site_settings key/value store. Invalidated inside SiteSettings.set().
settings_cache = TTLCache(DEFAULT_TTL)


def invalidate_quiz_cache():
    """Call after ANY admin write that can change the quiz payload."""
    quiz_cache.invalidate()


def invalidate_settings_cache():
    """Call after any write to the site_settings table."""
    settings_cache.invalidate()


def invalidate_all():
    """Test/ops helper — drop every namespace."""
    quiz_cache.invalidate()
    settings_cache.invalidate()
