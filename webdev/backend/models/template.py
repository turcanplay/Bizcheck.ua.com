"""Template model — document template metadata (PDFs in template_files)."""

import json
from database.db import query, execute


def _prep_json(v):
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return json.dumps(v)
    return v


class Template:
    @staticmethod
    def create(slug, title_uk, title_en, description_uk="", description_en="",
               is_active=True, is_paid=False, price=None, currency="MDL",
               category=None, features=None, is_coming_soon=False):
        ft = _prep_json(features) if features is not None else json.dumps([])
        return execute(
            """INSERT INTO templates (slug, title_uk, title_en, description_uk, description_en,
                                      is_active, is_coming_soon, is_paid, price, currency, category, features)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
               RETURNING *""",
            (slug, title_uk, title_en, description_uk, description_en,
             is_active, is_coming_soon, is_paid, price, currency, category, ft),
        )

    @staticmethod
    def find_by_id(template_id):
        return query("SELECT * FROM templates WHERE id = %s", (template_id,), fetch_one=True)

    @staticmethod
    def find_by_slug(slug):
        return query("SELECT * FROM templates WHERE slug = %s", (slug,), fetch_one=True)

    @staticmethod
    def find_active():
        return query(
            "SELECT * FROM templates WHERE is_active = TRUE ORDER BY id ASC",
            fetch_all=True,
        )

    @staticmethod
    def find_all():
        return query("SELECT * FROM templates ORDER BY id ASC", fetch_all=True)

    @staticmethod
    def update(template_id, slug, title_uk, title_en, description_uk, description_en,
               is_active, is_paid=False, price=None, currency="MDL",
               category=None, features=None, is_coming_soon=False):
        ft = _prep_json(features)
        return execute(
            """UPDATE templates
               SET slug = %s, title_uk = %s, title_en = %s,
                   description_uk = %s, description_en = %s,
                   is_active = %s, is_coming_soon = %s, is_paid = %s,
                   price = %s, currency = %s, category = %s,
                   features = COALESCE(%s::jsonb, features)
               WHERE id = %s RETURNING *""",
            (slug, title_uk, title_en, description_uk, description_en,
             is_active, is_coming_soon, is_paid, price, currency, category, ft, template_id),
        )

    @staticmethod
    def delete(template_id):
        execute("DELETE FROM templates WHERE id = %s", (template_id,))
        return True
