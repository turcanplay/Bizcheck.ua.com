"""Site settings — a tiny key/value store for editable page configuration.

Currently holds the CTA-button target test slugs (see routes/site_settings.py),
the registered sales chat and the feedback-prompt configuration.

Reads are cached in-process for `utils.cache.DEFAULT_TTL` seconds because they
sit on hot paths (`_sales_chat_id()` runs on every lead notification,
`feedback` reads the prompt on every outreach) while writes happen a handful of
times per month. `set()` invalidates the namespace, so the worker that performed
the write sees its own change immediately; OTHER gunicorn workers converge
within the TTL. See utils/cache.py for the full multi-worker rationale.
"""
from database.db import query, execute
from utils.cache import settings_cache

# Cache keys for the two read shapes.
_ALL_KEY = ("__all__",)


class SiteSettings:
    @staticmethod
    def get_all():
        """Return {setting_key: setting_value} for every stored row."""
        def _load():
            rows = query(
                "SELECT setting_key, setting_value FROM site_settings", fetch_all=True
            ) or []
            return {r["setting_key"]: r["setting_value"] for r in rows}

        # dict(...) so a caller mutating the result cannot poison the cache.
        return dict(settings_cache.get_or_set(_ALL_KEY, _load))

    @staticmethod
    def get(key, default=""):
        """Single setting. Cached per key; misses fall through to the DB.

        The MISS is cached too (as None → returned as `default`): a key that is
        not configured is looked up just as often as one that is, and caching
        only hits would leave those lookups hammering the DB.
        """
        def _load():
            row = query(
                "SELECT setting_value FROM site_settings WHERE setting_key = %s",
                (key,), fetch_one=True,
            )
            return row["setting_value"] if row else None

        value = settings_cache.get_or_set(("key", key), _load)
        return default if value is None else value

    @staticmethod
    def set(key, value):
        """Upsert a single key. Idempotent."""
        execute(
            """INSERT INTO site_settings (setting_key, setting_value, updated_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (setting_key)
               DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()""",
            (key, value),
        )
        # Drop the WHOLE namespace, not just this key: get_all() caches an
        # aggregate that this write also invalidates.
        settings_cache.invalidate()
