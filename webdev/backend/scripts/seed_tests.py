"""
Seed multi-test schema: truncate existing quiz content and load placeholder
tests (business, gdpr, hr) from scripts/seeds/*.sql.

DESTRUCTIVE: wipes blocks, questions, answers, results and any submissions
(submissions cascade because they reference nothing destructive, but we also
reset them for a clean slate). Does NOT touch users.

Run:
    python scripts/seed_tests.py
"""

import os
import sys
import glob

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database.db import migrate, get_conn, put_conn, close

SEEDS_DIR = os.path.join(os.path.dirname(__file__), "seeds")
SEED_ORDER = ["business.sql", "gdpr.sql", "hr.sql"]


def truncate_quiz_data():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                TRUNCATE TABLE
                    answers, questions, blocks, submissions, results, tests
                RESTART IDENTITY CASCADE;
            """)
            conn.commit()
    finally:
        put_conn(conn)


def run_seed(filename):
    path = os.path.join(SEEDS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
    finally:
        put_conn(conn)


def main():
    print("Running migrations...")
    migrate()

    print("Truncating quiz data (blocks, questions, answers, submissions, results, tests)...")
    truncate_quiz_data()

    for filename in SEED_ORDER:
        print(f"Seeding {filename}...")
        run_seed(filename)

    print("\nSeed complete. Active tests:")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT slug, name_uk FROM tests WHERE is_active ORDER BY id")
            for row in cur.fetchall():
                print(f"  - {row[0]}: {row[1]}")
    finally:
        put_conn(conn)


if __name__ == "__main__":
    try:
        main()
    finally:
        close()
