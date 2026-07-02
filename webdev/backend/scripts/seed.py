"""Seed script — imports questions from intrebari_complete.json. Run: python scripts/seed.py"""

import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from database.db import migrate, query, execute, close

JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "intrebari_complete.json")


def seed():
    print("Running migrations...")
    migrate()
    row = query("SELECT COUNT(*) as count FROM blocks", fetch_one=True)
    if row and row["count"] > 0:
        print(f"Database already has {row['count']} blocks. Skipping seed.")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Seeding database...")

    # 1. Insert blocks
    block_map = {}  # json id -> db id
    for i, b in enumerate(data["blocuri"]):
        block = execute(
            "INSERT INTO blocks (title_ro, title_ru, order_index) VALUES (%s, %s, %s) RETURNING id",
            (b["name_ro"], b["name_ru"], i),
        )
        block_map[b["id"]] = block["id"]
        print(f"  Block {block['id']}: {b['name_ro']}")

    # 2. Insert questions (without parent_question_id for now)
    question_map = {}  # json id -> db id
    for q in data["intrebari"]:
        db_block_id = block_map[q["bloc_id"]]
        note_ro = q.get("_nota", None)
        row = execute(
            "INSERT INTO questions (block_id, text_ro, text_ru, note_ro, note_ru, order_index) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (db_block_id, q["text_ro"], q["text_ru"], note_ro, None, q["ordine"]),
        )
        question_map[q["id"]] = row["id"]

    # 3. Insert answers with next_question_id
    total_a = 0
    for q in data["intrebari"]:
        db_q_id = question_map[q["id"]]
        for opt in q["optiuni"]:
            next_q_db_id = None
            if opt.get("next_intrebare_id") is not None:
                next_q_db_id = question_map.get(opt["next_intrebare_id"])
            execute(
                "INSERT INTO answers (question_id, text_ro, text_ru, score, next_question_id) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (db_q_id, opt["text_ro"], opt["text_ru"], opt["valoare"], next_q_db_id),
            )
            total_a += 1

    # 4. Set parent_question_id based on branching
    for q in data["intrebari"]:
        # Questions with id >= 100 are sub-questions triggered by a parent
        # We detect parents by looking at which answers point to this question
        pass  # parent_question_id is optional; branching works via next_question_id on answers

    print(f"\nSeed complete: {len(data['intrebari'])} questions, {total_a} answers across {len(data['blocuri'])} blocks")


if __name__ == "__main__":
    try:
        seed()
    finally:
        close()
