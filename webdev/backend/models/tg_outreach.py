"""TgOutreach — admin-driven Telegram feedback requests.

One row per person the admin wants to ask the feedback question. See the table
definition + lifecycle notes in database/db.py (migrate). Thin data layer; the
sending / business logic lives in routes/tg_feedback.py.
"""
from database.db import query, execute


_COLUMNS = (
    "id, mode, username, tg_chat_id, lang, token, status, "
    "prompt_sent, reply_text, error, created_at, sent_at, answered_at, due_at"
)


class TgOutreach:
    @staticmethod
    def create(mode, username, tg_chat_id, lang, token, status="pending",
               due_at_minutes=None):
        """Insert an outreach. due_at_minutes (if given) sets due_at = NOW() + N
        minutes — used by the automatic flow to schedule the send."""
        due_expr = "NOW() + (%s || ' minutes')::interval" if due_at_minutes is not None else "NULL"
        params = [mode, username, tg_chat_id, lang, token, status]
        if due_at_minutes is not None:
            params.append(str(int(due_at_minutes)))
        row = execute(
            f"""INSERT INTO tg_outreach
                    (mode, username, tg_chat_id, lang, token, status, due_at)
                VALUES (%s, %s, %s, %s, %s, %s, {due_expr})
                RETURNING {_COLUMNS}""",
            tuple(params),
        )
        return row

    @staticmethod
    def has_auto_for_chat(chat_id):
        """True if this chat already has an automatic feedback row (any status) —
        so re-delivering a report never schedules a second auto-ask."""
        row = query(
            "SELECT 1 FROM tg_outreach WHERE tg_chat_id = %s AND mode = 'auto' LIMIT 1",
            (chat_id,), fetch_one=True,
        )
        return bool(row)

    @staticmethod
    def claim_due():
        """Atomically claim ONE due scheduled row (FOR UPDATE SKIP LOCKED), flip
        it to 'sending', and return it. Concurrent workers each get a different
        row (or None), so no auto message is ever sent twice."""
        return execute(
            """UPDATE tg_outreach SET status = 'sending'
                WHERE id = (
                    SELECT id FROM tg_outreach
                     WHERE status = 'scheduled' AND due_at IS NOT NULL AND due_at <= NOW()
                     ORDER BY due_at
                     FOR UPDATE SKIP LOCKED
                     LIMIT 1
                )
               RETURNING id, tg_chat_id, lang""",
        )

    @staticmethod
    def list_answered(limit=500):
        """Only the replies we actually received — this is the sole data the
        admin cares to keep. Pending send-markers / unopened links stay hidden."""
        return query(
            f"""SELECT {_COLUMNS} FROM tg_outreach
                 WHERE status = 'answered'
                 ORDER BY answered_at DESC NULLS LAST, created_at DESC
                 LIMIT %s""",
            (limit,), fetch_all=True,
        ) or []

    @staticmethod
    def find_by_id(outreach_id):
        return query(
            f"SELECT {_COLUMNS} FROM tg_outreach WHERE id = %s",
            (outreach_id,), fetch_one=True,
        )

    @staticmethod
    def find_by_token(token):
        return query(
            f"SELECT {_COLUMNS} FROM tg_outreach WHERE token = %s",
            (token,), fetch_one=True,
        )

    @staticmethod
    def find_awaiting_reply_by_chat(chat_id):
        """Most recent outreach to this chat that has been sent but not answered."""
        return query(
            f"""SELECT {_COLUMNS} FROM tg_outreach
                 WHERE tg_chat_id = %s AND status = 'sent'
                 ORDER BY sent_at DESC NULLS LAST, created_at DESC
                 LIMIT 1""",
            (chat_id,), fetch_one=True,
        )

    @staticmethod
    def mark_sent(outreach_id, chat_id, prompt_text):
        execute(
            """UPDATE tg_outreach
                  SET status = 'sent', tg_chat_id = %s, prompt_sent = %s,
                      sent_at = NOW(), error = NULL
                WHERE id = %s""",
            (chat_id, prompt_text, outreach_id),
        )

    @staticmethod
    def mark_failed(outreach_id, error):
        execute(
            "UPDATE tg_outreach SET status = 'failed', error = %s WHERE id = %s",
            (error, outreach_id),
        )

    @staticmethod
    def mark_answered(outreach_id, reply_text, username=None):
        """Save the reply + the answerer's actual @username (captured from the
        incoming message, not from any stored target list)."""
        execute(
            """UPDATE tg_outreach
                  SET status = 'answered', reply_text = %s,
                      username = COALESCE(%s, username), answered_at = NOW()
                WHERE id = %s""",
            (reply_text, username, outreach_id),
        )

    @staticmethod
    def bind_chat(outreach_id, chat_id, username, lang):
        execute(
            """UPDATE tg_outreach
                  SET tg_chat_id = %s, username = COALESCE(%s, username), lang = %s
                WHERE id = %s""",
            (chat_id, username, lang, outreach_id),
        )

    @staticmethod
    def delete(outreach_id):
        return execute(
            "DELETE FROM tg_outreach WHERE id = %s RETURNING id",
            (outreach_id,),
        )

    @staticmethod
    def contacts():
        """Distinct Telegram contacts we can reach directly (have a chat_id),
        newest first. Powers the admin username picker."""
        return query(
            """SELECT DISTINCT ON (tg_chat_id)
                      tg_chat_id, tg_username, language, created_at
                 FROM submissions
                WHERE tg_chat_id IS NOT NULL
                ORDER BY tg_chat_id, created_at DESC""",
            fetch_all=True,
        ) or []

    @staticmethod
    def find_contact_by_username(username):
        """Latest submission contact for a @username that has a chat_id."""
        return query(
            """SELECT tg_chat_id, tg_username, language
                 FROM submissions
                WHERE LOWER(tg_username) = LOWER(%s) AND tg_chat_id IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 1""",
            (username,), fetch_one=True,
        )
