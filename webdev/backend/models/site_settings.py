"""Site settings — a tiny key/value store for editable page configuration.

Currently holds the CTA-button target test slugs (see routes/site_settings.py).
Keys are application-defined constants; values are plain strings.
"""
from database.db import query, execute


class SiteSettings:
    @staticmethod
    def get_all():
        """Return {setting_key: setting_value} for every stored row."""
        rows = query("SELECT setting_key, setting_value FROM site_settings", fetch_all=True) or []
        return {r["setting_key"]: r["setting_value"] for r in rows}

    @staticmethod
    def get(key, default=""):
        row = query(
            "SELECT setting_value FROM site_settings WHERE setting_key = %s",
            (key,), fetch_one=True,
        )
        return row["setting_value"] if row else default

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