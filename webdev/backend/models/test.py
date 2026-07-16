"""Test model — handles the `tests` table (multi-test support)."""

import json
from database.db import query, execute


def _prep_json(v):
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return json.dumps(v)
    return v


class Test:
    @staticmethod
    def create(slug, name_uk, name_en, description_uk="", description_en="",
               is_active=True, is_paid=False, price=None, currency="MDL",
               category=None, features=None, scoring_zones=None, zone_recommendations=None,
               report_type="bizcheck", is_coming_soon=False, order_index=0):
        sz = _prep_json(scoring_zones) if scoring_zones is not None else json.dumps(
            {"safe": 80, "developing": 70, "warn": 65, "risk": 0}
        )
        zr = _prep_json(zone_recommendations)
        ft = _prep_json(features) if features is not None else json.dumps([])
        return execute(
            """INSERT INTO tests (slug, name_uk, name_en, description_uk, description_en,
                                   is_active, is_coming_soon, is_paid, price, currency, category, features,
                                   scoring_zones, zone_recommendations, report_type, order_index)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s)
               RETURNING *""",
            (slug, name_uk, name_en, description_uk, description_en,
             is_active, is_coming_soon, is_paid, price, currency, category, ft, sz, zr, report_type, order_index),
        )

    @staticmethod
    def find_by_id(test_id):
        return query("SELECT * FROM tests WHERE id = %s", (test_id,), fetch_one=True)

    @staticmethod
    def find_by_slug(slug):
        return query("SELECT * FROM tests WHERE slug = %s", (slug,), fetch_one=True)

    @staticmethod
    def find_active():
        return query(
            "SELECT * FROM tests WHERE is_active = TRUE ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def find_all():
        return query("SELECT * FROM tests ORDER BY order_index ASC, id ASC", fetch_all=True)

    @staticmethod
    def update(test_id, slug, name_uk, name_en, description_uk, description_en,
               is_active, is_paid=False, price=None, currency="MDL",
               category=None, features=None, scoring_zones=None, zone_recommendations=None,
               report_type=None, is_coming_soon=False, order_index=None):
        sz = _prep_json(scoring_zones)
        zr = _prep_json(zone_recommendations)
        ft = _prep_json(features)
        return execute(
            """UPDATE tests
               SET slug = %s, name_uk = %s, name_en = %s,
                   description_uk = %s, description_en = %s,
                   is_active = %s, is_coming_soon = %s, is_paid = %s,
                   price = %s, currency = %s, category = %s,
                   features             = COALESCE(%s::jsonb, features),
                   scoring_zones        = COALESCE(%s::jsonb, scoring_zones),
                   zone_recommendations = COALESCE(%s::jsonb, zone_recommendations),
                   report_type          = COALESCE(%s, report_type),
                   order_index          = COALESCE(%s, order_index)
               WHERE id = %s RETURNING *""",
            (slug, name_uk, name_en, description_uk, description_en,
             is_active, is_coming_soon, is_paid, price, currency, category, ft, sz, zr, report_type, order_index, test_id),
        )

    @staticmethod
    def get_topic_id(test_id):
        """Telegram forum topic (message_thread_id) for this test's notifications, or None."""
        row = query("SELECT tg_topic_id FROM tests WHERE id = %s", (test_id,), fetch_one=True)
        return row.get("tg_topic_id") if row else None

    @staticmethod
    def set_topic_id(test_id, topic_id):
        """Persist the forum topic id created for this test (idempotent overwrite)."""
        execute("UPDATE tests SET tg_topic_id = %s WHERE id = %s", (topic_id, test_id))
        return True

    @staticmethod
    def reorder(items):
        """Bulk-update order_index. `items` is a list of (id, order_index) tuples."""
        for tid, idx in items:
            execute("UPDATE tests SET order_index = %s WHERE id = %s", (idx, tid))
        return True

    @staticmethod
    def delete(test_id):
        execute("DELETE FROM tests WHERE id = %s", (test_id,))
        return True
