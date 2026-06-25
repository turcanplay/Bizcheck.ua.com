"""Models for landing content: testimonials and FAQ items."""

from database.db import query, execute


class Testimonial:
    @staticmethod
    def create(name, role, quote_ro, quote_ru, rating, avatar_url, order_index, is_active,
               lang="ro", is_user_submitted=False):
        return execute(
            """INSERT INTO testimonials
                   (name, role, quote_ro, quote_ru, rating, avatar_url, order_index,
                    is_active, lang, is_user_submitted)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (name, role, quote_ro, quote_ru, rating, avatar_url, order_index,
             is_active, lang, is_user_submitted),
        )

    @staticmethod
    def create_public(name, role, quote, rating, lang):
        """A review submitted by an end user from the public site.

        Stored in ONE language only (`lang`): the text goes into the matching
        quote_ro / quote_ru column, the other stays empty. Goes live immediately
        (is_active=TRUE) and is flagged is_user_submitted so the admin can tell
        public reviews apart from curated ones.
        """
        quote_ro = quote if lang == "ro" else ""
        quote_ru = quote if lang == "ru" else ""
        return execute(
            """INSERT INTO testimonials
                   (name, role, quote_ro, quote_ru, rating, avatar_url, order_index,
                    is_active, lang, is_user_submitted)
               VALUES (%s, %s, %s, %s, %s, NULL, 0, TRUE, %s, TRUE) RETURNING *""",
            (name, role, quote_ro, quote_ru, rating, lang),
        )

    @staticmethod
    def find_by_id(tid):
        return query("SELECT * FROM testimonials WHERE id = %s", (tid,), fetch_one=True)

    @staticmethod
    def find_active():
        return query(
            "SELECT * FROM testimonials WHERE is_active = TRUE ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def find_all():
        return query(
            "SELECT * FROM testimonials ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def update(tid, name, role, quote_ro, quote_ru, rating, avatar_url, order_index, is_active,
               lang=None):
        # lang is only changed when provided (admin editing a public review);
        # COALESCE keeps the stored value otherwise.
        return execute(
            """UPDATE testimonials
               SET name=%s, role=%s, quote_ro=%s, quote_ru=%s,
                   rating=%s, avatar_url=%s, order_index=%s, is_active=%s,
                   lang=COALESCE(%s, lang)
               WHERE id=%s RETURNING *""",
            (name, role, quote_ro, quote_ru, rating, avatar_url, order_index, is_active, lang, tid),
        )

    @staticmethod
    def delete(tid):
        execute("DELETE FROM testimonials WHERE id = %s", (tid,))


class FaqItem:
    @staticmethod
    def create(question_ro, question_ru, answer_ro, answer_ru, order_index, is_active):
        return execute(
            """INSERT INTO faq_items (question_ro, question_ru, answer_ro, answer_ru, order_index, is_active)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (question_ro, question_ru, answer_ro, answer_ru, order_index, is_active),
        )

    @staticmethod
    def find_by_id(fid):
        return query("SELECT * FROM faq_items WHERE id = %s", (fid,), fetch_one=True)

    @staticmethod
    def find_active():
        return query(
            "SELECT * FROM faq_items WHERE is_active = TRUE ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def find_all():
        return query(
            "SELECT * FROM faq_items ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def update(fid, question_ro, question_ru, answer_ro, answer_ru, order_index, is_active):
        return execute(
            """UPDATE faq_items
               SET question_ro=%s, question_ru=%s, answer_ro=%s, answer_ru=%s,
                   order_index=%s, is_active=%s
               WHERE id=%s RETURNING *""",
            (question_ro, question_ru, answer_ro, answer_ru, order_index, is_active, fid),
        )

    @staticmethod
    def delete(fid):
        execute("DELETE FROM faq_items WHERE id = %s", (fid,))
