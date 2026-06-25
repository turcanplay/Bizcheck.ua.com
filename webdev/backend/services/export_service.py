"""Admin Excel/ZIP export helpers for test submissions.

Builds a structured workbook for a test's submissions and packages PDFs
or per-user Excels as a ZIP archive.
"""
import json
import re
import zipfile
from io import BytesIO

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

from models.block import Block
from models.question import Question
from models.submission import Submission


_HEADER_FONT = Font(bold=True, size=10)
_HEADER_FILL = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
_HEADER_ALIGN = Alignment(wrap_text=True, vertical="center", horizontal="center")
_CELL_ALIGN = Alignment(wrap_text=True, vertical="top")
_FIXED_COLS = {
    "ID": 5, "First Name": 12, "Last Name": 12, "Email": 22,
    "Phone": 14, "Sector": 16, "Company Size": 10, "Company Age": 10,
    "Total Score %": 10, "Status": 10, "Consent": 8, "Date": 18,
    "TG Chat ID": 14, "TG Username": 16, "TG First Name": 14, "TG Last Name": 14,
    "Delivery": 12, "Language": 8,
}

# Openpyxl sheet-name constraints: ≤31 chars, no / \ ? * [ ]
_INVALID_SHEET_CHARS = re.compile(r"[\\/:*?\[\]]")


def _safe_filename(name: str) -> str:
    return re.sub(r"[^\w\- ]+", "_", (name or "").strip())[:80] or "report"


def _safe_sheet_name(name: str) -> str:
    clean = _INVALID_SHEET_CHARS.sub("_", (name or "").strip())[:31]
    return clean or "Sheet"


def _infer_delivery(sub: dict) -> str:
    """Guess the delivery channel the user picked based on captured state."""
    if sub.get("tg_chat_id"):
        return "Telegram"
    if sub.get("email"):
        return "Email"
    return "PDF"


def _parse_json_field(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None
    return val


def _collect_questions_for_blocks(blocks):
    """Return (question_keys_ordered, question_labels).

    Keys are composed `b{block_id}q{question_id}` and labels are friendly
    `B1 Q2: first 40 chars...` strings (in RO).

    Batched: one query fetches questions for all blocks at once (ANY(%s)),
    replacing per-block round-trips. For 10 blocks with 50 questions, this
    collapses 10 queries into 1.
    """
    if not blocks:
        return [], {}

    block_ids = [b["id"] for b in blocks]
    all_questions = Question.find_by_blocks(block_ids)

    # Group questions by block for ordered traversal.
    by_block: dict[int, list] = {b["id"]: [] for b in blocks}
    for q in all_questions:
        by_block.setdefault(q["block_id"], []).append(q)

    question_keys_ordered: list[str] = []
    question_labels: dict[str, str] = {}

    for b_idx, b in enumerate(blocks):
        block_questions = by_block.get(b["id"], [])
        top_level = [q for q in block_questions if not q.get("parent_question_id")]
        for q_idx, q in enumerate(top_level):
            key = f"b{b['id']}q{q['id']}"
            question_labels[key] = f"B{b_idx + 1} Q{q_idx + 1}: {(q['text_ro'] or '')[:40]}"
            question_keys_ordered.append(key)
            subs = [sq for sq in block_questions if sq.get("parent_question_id") == q["id"]]
            for sq_idx, sq in enumerate(subs):
                skey = f"b{b['id']}q{sq['id']}"
                question_labels[skey] = (
                    f"B{b_idx + 1} Q{q_idx + 1}.{sq_idx + 1}: {(sq['text_ro'] or '')[:40]}"
                )
                question_keys_ordered.append(skey)

    return question_keys_ordered, question_labels


def _get_test_blocks(test_id):
    return Block.find_by_test(test_id) if test_id else Block.find_all()


def _style_header_row(ws, headers):
    for cell in ws[1]:
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL
        cell.alignment = _HEADER_ALIGN
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.alignment = _CELL_ALIGN
    for col_idx, header_val in enumerate(headers, 1):
        letter = openpyxl.utils.get_column_letter(col_idx)
        if header_val in _FIXED_COLS:
            ws.column_dimensions[letter].width = _FIXED_COLS[header_val]
        elif header_val.endswith(" %"):
            ws.column_dimensions[letter].width = 12
        else:
            ws.column_dimensions[letter].width = 18
    ws.freeze_panes = "A2"


def _block_titles_from_subs(subs):
    """Unique block titles across submissions, preserving first-seen order."""
    titles, seen = [], set()
    for s in subs:
        bs = _parse_json_field(s.get("block_scores_json")) or []
        for b in bs if isinstance(bs, list) else []:
            title = b.get("title", f"Block {b.get('id', '?')}")
            if title not in seen:
                seen.add(title)
                titles.append(title)
    return titles


def _summary_row(s, block_titles, question_keys_ordered):
    answers_data = _parse_json_field(s.get("answers_json")) or {}
    if not isinstance(answers_data, dict):
        answers_data = {}

    bs = _parse_json_field(s.get("block_scores_json")) or []
    block_map = {}
    if isinstance(bs, list):
        for b in bs:
            title = b.get("title", f"Block {b.get('id', '?')}")
            block_map[title] = round(b.get("score", 0))

    row = [
        s["id"], s.get("first_name") or "", s.get("last_name") or "",
        s.get("email") or "", s.get("phone") or "",
        s.get("sector") or "", s.get("company_size") or "", s.get("company_age") or "",
        s.get("total_score", ""),
    ]
    for t in block_titles:
        row.append(block_map.get(t, ""))
    row += [
        s.get("status", ""),
        "Yes" if s.get("consent") else "No",
        str(s.get("created_at", "")),
        s.get("language", ""),
        _infer_delivery(s),
        s.get("tg_chat_id", ""),
        s.get("tg_username", ""),
        s.get("tg_first_name", ""),
        s.get("tg_last_name", ""),
    ]
    for qkey in question_keys_ordered:
        score = answers_data.get(qkey)
        row.append(score if score is not None else "")
    return row


def _summary_headers(block_titles, question_labels, question_keys_ordered):
    headers = [
        "ID", "First Name", "Last Name", "Email", "Phone", "Sector",
        "Company Size", "Company Age", "Total Score %",
    ]
    headers += [f"{t} %" for t in block_titles]
    headers += [
        "Status", "Consent", "Date", "Language", "Delivery",
        "TG Chat ID", "TG Username", "TG First Name", "TG Last Name",
    ]
    headers += [question_labels.get(k, k) for k in question_keys_ordered]
    return headers


def _fill_summary_sheet(ws, subs, block_titles, question_keys_ordered, question_labels):
    headers = _summary_headers(block_titles, question_labels, question_keys_ordered)
    ws.append(headers)
    for s in subs:
        ws.append(_summary_row(s, block_titles, question_keys_ordered))
    _style_header_row(ws, headers)


def _fill_single_user_sheet(ws, sub, question_keys_ordered, question_labels):
    """Render one user's full detail on a dedicated sheet."""
    ws.append(["BizCheck — Raport individual"])
    ws.cell(row=1, column=1).font = Font(bold=True, size=14)
    ws.append([])

    name = f"{sub.get('first_name') or ''} {sub.get('last_name') or ''}".strip() or "—"
    pairs = [
        ("Nume complet", name),
        ("Email", sub.get("email") or "—"),
        ("Telefon", sub.get("phone") or "—"),
        ("Sector", sub.get("sector") or "—"),
        ("Mărime companie", sub.get("company_size") or "—"),
        ("Vechime companie", sub.get("company_age") or "—"),
        ("Limba", sub.get("language") or "—"),
        ("Canal livrare ales", _infer_delivery(sub)),
        ("Telegram @username", sub.get("tg_username") or "—"),
        ("Telegram nume afișat", f"{sub.get('tg_first_name') or ''} {sub.get('tg_last_name') or ''}".strip() or "—"),
        ("Status", sub.get("status") or "—"),
        ("Dată completare", str(sub.get("created_at") or "—")),
        ("Scor total %", sub.get("total_score", "—")),
    ]
    for k, v in pairs:
        ws.append([k, v])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=True)

    ws.append([])
    ws.append(["Scoruri per bloc"])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=12)

    bs = _parse_json_field(sub.get("block_scores_json")) or []
    if isinstance(bs, list):
        for b in bs:
            ws.append([b.get("title", "—"), f"{round(b.get('score', 0))}%"])

    ws.append([])
    ws.append(["Răspunsuri detaliate per întrebare"])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=12)
    ws.append(["Întrebare", "Scor"])
    for c in ws[ws.max_row]:
        c.font = _HEADER_FONT
        c.fill = _HEADER_FILL

    answers = _parse_json_field(sub.get("answers_json")) or {}
    if not isinstance(answers, dict):
        answers = {}
    for qkey in question_keys_ordered:
        ws.append([question_labels.get(qkey, qkey), answers.get(qkey, "")])

    for row in ws.iter_rows():
        for cell in row:
            cell.alignment = _CELL_ALIGN
    ws.column_dimensions['A'].width = 46
    ws.column_dimensions['B'].width = 56


def _filter_submissions_for_test(test_id):
    subs = Submission.find_all(test_id=test_id)
    return subs


# ──────────────────────────────────────────────────────────────────
# Public builders
# ──────────────────────────────────────────────────────────────────

def build_test_combined_workbook(test_id):
    """Multi-sheet workbook: one summary sheet + one sheet per user."""
    subs = _filter_submissions_for_test(test_id)
    blocks = _get_test_blocks(test_id)
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)
    block_titles = _block_titles_from_subs(subs)

    wb = openpyxl.Workbook()
    summary = wb.active
    summary.title = "Sumar"
    _fill_summary_sheet(summary, subs, block_titles, question_keys_ordered, question_labels)

    # One sheet per user. Name: "{id}_FirstLast" truncated to 31 chars.
    used_names = {"Sumar"}
    for s in subs:
        raw = f"{s['id']}_{s.get('first_name') or ''}_{s.get('last_name') or ''}"
        base = _safe_sheet_name(raw)
        name, i = base, 1
        while name in used_names:
            suffix = f"_{i}"
            name = base[: 31 - len(suffix)] + suffix
            i += 1
        used_names.add(name)
        ws = wb.create_sheet(title=name)
        _fill_single_user_sheet(ws, s, question_keys_ordered, question_labels)

    return wb


def build_single_user_workbook(submission_id):
    sub = Submission.find_by_id(submission_id)
    if not sub:
        raise ValueError("Submission not found")
    blocks = _get_test_blocks(sub.get("test_id"))
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)

    wb = openpyxl.Workbook()
    ws = wb.active
    name = f"{sub.get('first_name') or ''} {sub.get('last_name') or ''}".strip() or f"sub{submission_id}"
    ws.title = _safe_sheet_name(name)
    _fill_single_user_sheet(ws, sub, question_keys_ordered, question_labels)
    return wb, _safe_filename(f"{name}_{sub.get('created_at')}")


def workbook_to_bytes(wb) -> bytes:
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return out.getvalue()


def build_pdfs_zip_for_test(test_id) -> bytes:
    """ZIP containing every submission's stored PDF for this test."""
    subs = _filter_submissions_for_test(test_id)
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in subs:
            pdf = Submission.get_pdf(s["id"])
            if not pdf:
                continue
            date_part = str(s.get("created_at") or "").replace(":", "-").replace(" ", "_")[:19]
            stem = _safe_filename(
                f"{s['id']}_{s.get('first_name') or ''}_{s.get('last_name') or ''}_{date_part}"
            )
            zf.writestr(f"{stem}.pdf", pdf)
    buf.seek(0)
    return buf.getvalue()


def build_excels_zip_for_test(test_id) -> bytes:
    """ZIP containing one Excel per submission (individual detailed report)."""
    subs = _filter_submissions_for_test(test_id)
    blocks = _get_test_blocks(test_id)
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in subs:
            wb = openpyxl.Workbook()
            ws = wb.active
            name = f"{s.get('first_name') or ''} {s.get('last_name') or ''}".strip() or f"sub{s['id']}"
            ws.title = _safe_sheet_name(name)
            _fill_single_user_sheet(ws, s, question_keys_ordered, question_labels)

            date_part = str(s.get("created_at") or "").replace(":", "-").replace(" ", "_")[:19]
            stem = _safe_filename(f"{s['id']}_{name}_{date_part}")
            zf.writestr(f"{stem}.xlsx", workbook_to_bytes(wb))
    buf.seek(0)
    return buf.getvalue()
