"""Erase the quiz content of an EXISTING database, on purpose, by hand.

WHY THIS IS A SCRIPT AND NOT A MIGRATION
----------------------------------------
`migrate()` runs on EVERY backend boot, in every gunicorn worker, on every
replica. A DELETE placed there would wipe the content the user typed into the
admin panel the moment the container restarts. There is no idempotent way to
express "empty it once" inside a function that runs forever. So emptying the
database is a deliberate, interactive, one-off operation — this file.

A fresh install already starts empty: `migrate()` only creates tables, it never
inserts quiz rows, and there is no automatic seed. You only need this script to
clear content that is ALREADY in a database.

WHAT IT DELETES
---------------
  tests → blocks → questions → answers      (the quiz content)

`answers`, `questions` and `blocks` are removed by the ON DELETE CASCADE chain
hanging off `tests`.

WHAT IT KEEPS
-------------
  submissions, results, users, templates, testimonials, faq_items,
  site_settings, tg_outreach

Submissions are deliberately preserved: they are real leads with (encrypted)
PII and stored PDFs. `submissions.test_id` is a plain nullable FK with no
cascade, so deleting a test would fail while submissions still point at it —
the script therefore detaches them (`test_id = NULL`) instead of deleting them.
Pass --with-submissions if you really want the leads gone too.

USAGE
-----
    cd webdev/backend
    venv/bin/python scripts/clear_quiz_content.py              # tests + content
    venv/bin/python scripts/clear_quiz_content.py --dry-run    # count only
    venv/bin/python scripts/clear_quiz_content.py --with-submissions

It prints what it is about to destroy and requires you to type DELETE to
confirm. Nothing in the app ever calls it.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database.db import get_conn, put_conn, close  # noqa: E402

CONFIRM_WORD = "DELETE"

COUNT_SQL = """
    SELECT
      (SELECT COUNT(*) FROM tests)       AS tests,
      (SELECT COUNT(*) FROM blocks)      AS blocks,
      (SELECT COUNT(*) FROM questions)   AS questions,
      (SELECT COUNT(*) FROM answers)     AS answers,
      (SELECT COUNT(*) FROM submissions) AS submissions
"""


def counts(cur):
    cur.execute(COUNT_SQL)
    tests, blocks, questions, answers, submissions = cur.fetchone()
    return {
        "tests": tests,
        "blocks": blocks,
        "questions": questions,
        "answers": answers,
        "submissions": submissions,
    }


def main():
    argv = sys.argv[1:]
    dry_run = "--dry-run" in argv
    with_submissions = "--with-submissions" in argv
    unknown = [a for a in argv if a not in ("--dry-run", "--with-submissions")]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}")
        print(__doc__)
        return 2

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            before = counts(cur)

            print("Current content:")
            for key in ("tests", "blocks", "questions", "answers", "submissions"):
                print(f"  {key:12} {before[key]}")

            if dry_run:
                print("\n--dry-run: nothing was deleted.")
                return 0

            if before["tests"] == 0 and before["blocks"] == 0:
                print("\nThe quiz content is already empty. Nothing to do.")
                return 0

            print("\nAbout to DELETE: tests, blocks, questions, answers.")
            if with_submissions:
                print(f"AND to DELETE {before['submissions']} submission(s) "
                      "— real leads, encrypted PII and stored PDFs.")
            else:
                print(f"Keeping {before['submissions']} submission(s); their "
                      "test_id will be set to NULL.")

            answer = input(f"\nType {CONFIRM_WORD} to proceed: ").strip()
            if answer != CONFIRM_WORD:
                print("Aborted — nothing was deleted.")
                return 1

            if with_submissions:
                cur.execute("DELETE FROM submissions")
            else:
                # submissions.test_id has no ON DELETE rule, so it must be
                # detached before the tests row can go.
                cur.execute("UPDATE submissions SET test_id = NULL WHERE test_id IS NOT NULL")

            # blocks → questions → answers all hang off tests by
            # ON DELETE CASCADE, so one statement clears the whole tree.
            cur.execute("DELETE FROM tests")
            # `results` keys off block_id but has no FK, so stale rows would
            # otherwise survive as orphans pointing at deleted blocks.
            cur.execute("DELETE FROM results")

            conn.commit()
            after = counts(cur)

        print("\nDone. Remaining:")
        for key in ("tests", "blocks", "questions", "answers", "submissions"):
            print(f"  {key:12} {after[key]}")
        print("\nAdd the new blocks and questions from the admin panel: "
              "/admin_bizcheck_md_crowe/")
        return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        close()
