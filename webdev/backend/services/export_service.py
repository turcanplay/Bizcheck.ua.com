"""Admin Excel/ZIP export helpers for test submissions.

Builds a structured workbook for a test's submissions and packages PDFs
or per-user Excels as a ZIP archive.
"""
import gc
import html
import json
import logging
import os
import re
import tempfile
import zipfile
from datetime import date, datetime
from io import BytesIO

import openpyxl
from openpyxl.cell import Cell, WriteOnlyCell
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet._write_only import WriteOnlyWorksheet

from models.block import Block
from models.question import Question
from models.submission import Submission
from models.test import Test
from services.scoring import display_pct


log = logging.getLogger(__name__)


class ExportTooLarge(Exception):
    """Raised when an export archive would exceed the Telegram size limit."""
    pass


# Cap on per-user detail sheets in a combined workbook. Past this many
# completed users we omit the individual sheets (anti-OOM / anti-timeout);
# the full data still lives in the summary sheets + the admin panel.
MAX_USER_SHEETS = 300


_HEADER_FONT = Font(bold=True, size=10)
_HEADER_FILL = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
_HEADER_ALIGN = Alignment(wrap_text=True, vertical="center", horizontal="center")
_CELL_ALIGN = Alignment(wrap_text=True, vertical="top")
_BOLD_FONT = Font(bold=True)
_TITLE_FONT = Font(bold=True, size=14)
_SECTION_FONT = Font(bold=True, size=12)
_FIXED_COLS = {
    "ID": 5, "Ім'я": 12, "Прізвище": 12, "Email": 24, "Телефон": 14,
    "Сектор": 16, "Розмір компанії": 15, "Вік компанії": 15, "Оборот": 16,
    "Статус": 12, "Дата": 18, "Мова": 8, "Доставка": 12, "Згода": 13,
    "Telegram @user": 16, "Telegram ім'я": 16, "Telegram ChatID": 14,
    "Загальний бал %": 11,
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


# ──────────────────────────────────────────────────────────────────
# Percentages as SHOWN — the one place this file decides how a score prints
# ──────────────────────────────────────────────────────────────────
# A computed 0 is displayed as 1 (services.scoring.display_pct): "0%" reads like
# a broken calculation rather than a result. The web report, the PDF, the email
# and the Telegram notification already print it that way, so an export that
# printed a bare 0 contradicted the report the client received.
#
# Two rules apply to everything below:
#   • DISPLAY ONLY — nothing here is written back to the DB and nothing here
#     feeds zone_of(); a stored 0 stays 0 and stays in the `risk` zone.
#   • ONLY PERCENTAGES — per-question answer points (answers_json) are raw
#     scores where 0 means "answered no", not a percentage. They are exported
#     untouched.

def _display_pct_cell(val):
    """A percentage for a SPREADSHEET cell: numeric, with a computed 0 → 1.

    Returns a plain ``int`` so the column stays sortable and formattable in
    Excel — never a string. Anything that is not a number (``None``, ``""``,
    a stray label like ``"—"``) is passed through untouched, so an unknown or
    empty score keeps rendering as an empty/placeholder cell and never turns
    into a fabricated "1".
    """
    shown = display_pct(val)
    return val if shown is None else shown


def _fmt_score(val) -> str:
    """Render a numeric score as 'NN%'; '—' when missing/non-numeric.

    Deliberately a STRING: its two call sites are label/value pairs (the HTML
    report and the second column of a per-user detail sheet), not a numeric
    column. A computed 0 renders as "1%" — same rule as _display_pct_cell.
    """
    shown = display_pct(val)
    return "—" if shown is None else f"{shown}%"


def _collect_questions_for_blocks(blocks):
    """Return (question_keys_ordered, question_labels).

    Keys are composed `b{block_id}q{question_id}` and labels are friendly
    `B1 Q2: first 40 chars...` strings (in UK).

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
            question_labels[key] = f"B{b_idx + 1} Q{q_idx + 1}: {(q['text_uk'] or '')[:40]}"
            question_keys_ordered.append(key)
            subs = [sq for sq in block_questions if sq.get("parent_question_id") == q["id"]]
            for sq_idx, sq in enumerate(subs):
                skey = f"b{b['id']}q{sq['id']}"
                question_labels[skey] = (
                    f"B{b_idx + 1} Q{q_idx + 1}.{sq_idx + 1}: {(sq['text_uk'] or '')[:40]}"
                )
                question_keys_ordered.append(skey)

    return question_keys_ordered, question_labels


def _get_test_blocks(test_id):
    return Block.find_by_test(test_id) if test_id else Block.find_all()


# ──────────────────────────────────────────────────────────────────
# Streaming sheets (openpyxl write_only) + style/defuse at write time
# ──────────────────────────────────────────────────────────────────
# A normal openpyxl Workbook keeps every cell of every sheet as a live Python
# object until save(). A combined export is 3 summary sheets + up to
# MAX_USER_SHEETS detail sheets, so the peak heap scaled with the corpus:
# ~42 MB for an 0.88 MB .xlsx at 500 submissions, ×4 gunicorn workers.
#
# write_only sheets serialize each row to a temp XML file the instant it is
# appended, so the heap stays flat. The price is that a written cell can no
# longer be reached: the two post-processing passes this module used to run —
# header styling and formula defusing — MUST happen while the row is being
# built. Both do, below:
#   • styling  → _cell() attaches font/fill/alignment to explicit Cell objects,
#                which ws.append() accepts alongside plain values;
#   • defusing → _cell() flips data_type "f"→"s", and _StreamSheet.append()
#                re-checks EVERY value on the way out, so even a plain
#                ws.append(["=WEBSERVICE(...)"]) cannot emit a live formula.


def _defuse(cell):
    """Force a formula-typed cell back to text (CWE-1236). Idempotent."""
    if cell.data_type == "f":
        cell.data_type = "s"
    return cell


def _cell(ws, value, *, font=None, fill=None, alignment=_CELL_ALIGN):
    """One styled, formula-defused cell, ready to be handed to ws.append().

    Works for both streaming and in-memory sheets: openpyxl's ``append``
    accepts pre-built ``Cell`` objects in either mode.
    """
    c = WriteOnlyCell(ws, value=value)
    if font is not None:
        c.font = font
    if fill is not None:
        c.fill = fill
    if alignment is not None:
        c.alignment = alignment
    return _defuse(c)


def _append(ws, values, *, font=None, fill=None, alignment=_CELL_ALIGN):
    """Append one fully styled, fully defused row."""
    ws.append([_cell(ws, v, font=font, fill=fill, alignment=alignment) for v in values])


class _StreamSheet(WriteOnlyWorksheet):
    """Write-only sheet that cannot emit a live formula.

    Rows leave for disk the moment they are appended, which is precisely why
    ``_defuse_formulas`` (a post-hoc walk over ``ws.iter_rows()``) can no longer
    protect them. This override is the single funnel every row of a streaming
    sheet passes through, so the guarantee is structural rather than a
    convention callers have to remember — including for raw values, which
    openpyxl would otherwise type as formulas itself.
    """

    def append(self, row):
        super().append([
            _defuse(v) if isinstance(v, Cell)
            else _cell(self, v, alignment=None) if isinstance(v, str) and v.startswith("=")
            else v
            for v in row
        ])


def _stream_sheet(wb, title):
    """Create a ``_StreamSheet`` on a write_only workbook.

    ``wb.create_sheet()`` hardcodes ``WriteOnlyWorksheet``, so the sheet is
    instantiated directly and registered the same way create_sheet does
    (``_add_sheet`` is what create_sheet itself calls; the title setter still
    validates and de-duplicates the name).
    """
    ws = _StreamSheet(parent=wb, title=title)
    wb._add_sheet(ws)
    return ws


def _finish_sheet(ws):
    """Flush a streaming sheet and release its file descriptor.

    Without this every sheet keeps its temp XML file open until ``wb.save()`` —
    303 open descriptors for a full combined export. Closing as we go keeps it
    at one. A closed sheet is still archived at save time (``ExcelWriter``
    checks ``ws.closed`` first), so nothing else changes.
    """
    if isinstance(ws, WriteOnlyWorksheet) and not ws.closed:
        ws.close()


def _discard_workbook(wb):
    """Close and delete the temp files behind a half-built streaming workbook.

    Each streaming sheet parks its rows in a temp XML file that only ``save()``
    ever removes. If a build raises half-way (a DB error mid-scan) those files
    would survive until the worker exits, so an export that fails repeatedly
    fills the disk. Best effort: cleanup must never mask the original error.
    """
    for ws in wb.worksheets:
        writer = getattr(ws, "_writer", None)
        if writer is None:
            continue
        try:
            if not ws.closed:
                ws.close()
            writer.cleanup()
        except Exception:
            log.warning("[export] could not discard the temp sheet file for %r",
                        getattr(ws, "title", "?"), exc_info=True)


def _size_columns(ws, headers):
    """Column widths + frozen header row.

    MUST run BEFORE the first append on a streaming sheet: openpyxl emits
    ``<cols>`` and ``<sheetViews>`` when the first row is written, and anything
    set afterwards is silently dropped.
    """
    for col_idx, header_val in enumerate(headers, 1):
        letter = openpyxl.utils.get_column_letter(col_idx)
        if header_val in _FIXED_COLS:
            ws.column_dimensions[letter].width = _FIXED_COLS[header_val]
        elif header_val.endswith(" %"):
            ws.column_dimensions[letter].width = 12
        else:
            ws.column_dimensions[letter].width = 18
    ws.freeze_panes = "A2"


def _append_header_row(ws, headers):
    _append(ws, headers, font=_HEADER_FONT, fill=_HEADER_FILL, alignment=_HEADER_ALIGN)


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
            # Displayed percentage (0 → 1). A block carrying no usable score
            # stays blank rather than becoming a "1" out of nowhere.
            shown = display_pct(b.get("score"))
            block_map[title] = "" if shown is None else shown

    tg_name = f"{s.get('tg_first_name') or ''} {s.get('tg_last_name') or ''}".strip()
    row = [
        # ── contact / identitate ──
        s["id"], s.get("first_name") or "", s.get("last_name") or "",
        s.get("email") or "", s.get("phone") or "",
        # ── companie ──
        s.get("sector") or "", s.get("company_size") or "",
        s.get("company_age") or "", s.get("company_revenue") or "",
        # ── status / meta ──
        s.get("status", ""), str(s.get("created_at", "")),
        s.get("language", ""), _infer_delivery(s),
        "Так" if s.get("consent") else "Ні",
        # ── Telegram (strâns la un loc) ──
        s.get("tg_username", ""), tg_name, s.get("tg_chat_id", ""),
        # ── scor total (afișat: 0 → 1) ──
        _display_pct_cell(s.get("total_score", "")),
    ]
    # scoruri pe blocuri, apoi răspunsurile la întrebări — la final
    for t in block_titles:
        row.append(block_map.get(t, ""))
    for qkey in question_keys_ordered:
        score = answers_data.get(qkey)
        row.append(score if score is not None else "")
    return row


def _summary_headers(block_titles, question_labels, question_keys_ordered):
    headers = [
        "ID", "Ім'я", "Прізвище", "Email", "Телефон",
        "Сектор", "Розмір компанії", "Вік компанії", "Оборот",
        "Статус", "Дата", "Мова", "Доставка", "Згода",
        "Telegram @user", "Telegram ім'я", "Telegram ChatID",
        "Загальний бал %",
    ]
    headers += [f"{t} %" for t in block_titles]
    headers += [question_labels.get(k, k) for k in question_keys_ordered]
    return headers


def _fill_summary_sheet(ws, subs, block_titles, question_keys_ordered, question_labels):
    headers = _summary_headers(block_titles, question_labels, question_keys_ordered)
    _size_columns(ws, headers)
    _append_header_row(ws, headers)
    for s in subs:
        _append(ws, _summary_row(s, block_titles, question_keys_ordered))


# Trimmed view for non-completed ("У процесі") submissions: only contact data,
# company info and the total score — no per-question answers, no block scores.
_PROCESSED_HEADERS = [
    "ID", "Ім'я", "Прізвище", "Email", "Телефон",
    "Сектор", "Розмір компанії", "Вік компанії", "Оборот",
    "Статус", "Дата", "Загальний бал %",
]


def _processed_row(s):
    return [
        s["id"], s.get("first_name") or "", s.get("last_name") or "",
        s.get("email") or "", s.get("phone") or "",
        s.get("sector") or "", s.get("company_size") or "",
        s.get("company_age") or "", s.get("company_revenue") or "",
        s.get("status", ""), str(s.get("created_at", "")),
        _display_pct_cell(s.get("total_score", "")),
    ]


def _fill_processed_sheet(ws, subs):
    """Fill a sheet with the trimmed contact+company+score view (no answers)."""
    _size_columns(ws, _PROCESSED_HEADERS)
    _append_header_row(ws, _PROCESSED_HEADERS)
    for s in subs:
        _append(ws, _processed_row(s))


def _fill_single_user_sheet(ws, sub, question_keys_ordered, question_labels):
    """Render one user's full detail on a dedicated sheet.

    Every cell is emitted already styled and already defused, so the sheet needs
    no second pass — which is what lets it be a streaming sheet.
    """
    # Widths first: on a streaming sheet <cols> is written with the first row.
    ws.column_dimensions['A'].width = 46
    ws.column_dimensions['B'].width = 56

    _append(ws, ["BizCheck — Індивідуальний звіт"], font=_TITLE_FONT)
    ws.append([])

    name = f"{sub.get('first_name') or ''} {sub.get('last_name') or ''}".strip() or "—"
    pairs = [
        ("Повне ім'я", name),
        ("Email", sub.get("email") or "—"),
        ("Телефон", sub.get("phone") or "—"),
        ("Сектор", sub.get("sector") or "—"),
        ("Розмір компанії", sub.get("company_size") or "—"),
        ("Вік компанії", sub.get("company_age") or "—"),
        ("Оборот", sub.get("company_revenue") or "—"),
        ("Мова", sub.get("language") or "—"),
        ("Обраний канал доставки", _infer_delivery(sub)),
        ("Telegram @username", sub.get("tg_username") or "—"),
        ("Telegram відображуване ім'я", f"{sub.get('tg_first_name') or ''} {sub.get('tg_last_name') or ''}".strip() or "—"),
        ("Статус", sub.get("status") or "—"),
        ("Дата заповнення", str(sub.get("created_at") or "—")),
        ("Загальний бал %", _display_pct_cell(sub.get("total_score", "—"))),
    ]
    for k, v in pairs:
        ws.append([_cell(ws, k, font=_BOLD_FONT), _cell(ws, v)])

    ws.append([])
    _append(ws, ["Бали за блоками"], font=_SECTION_FONT)

    bs = _parse_json_field(sub.get("block_scores_json")) or []
    if isinstance(bs, list):
        for b in bs:
            _append(ws, [b.get("title", "—"), _fmt_score(b.get("score"))])

    ws.append([])
    _append(ws, ["Детальні відповіді за питаннями"], font=_SECTION_FONT)
    _append(ws, ["Питання", "Бал"], font=_HEADER_FONT, fill=_HEADER_FILL)

    answers = _parse_json_field(sub.get("answers_json")) or {}
    if not isinstance(answers, dict):
        answers = {}
    for qkey in question_keys_ordered:
        _append(ws, [question_labels.get(qkey, qkey), answers.get(qkey, "")])


def _filter_submissions_for_test(test_id):
    subs = Submission.find_all(test_id=test_id)
    return subs


def _created_date(created_at):
    """Best-effort extraction of a ``date`` from a submission's ``created_at``.

    Accepts a ``datetime``, a ``date``, or an ISO string. Returns ``None`` when
    the value cannot be parsed (caller decides how to treat those rows).
    """
    if created_at is None:
        return None
    if isinstance(created_at, datetime):
        return created_at.date()
    if isinstance(created_at, date):
        return created_at
    try:
        return date.fromisoformat(str(created_at)[:10])
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────────────────────────────────
# Public builders
# ──────────────────────────────────────────────────────────────────

def build_test_combined_workbook(test_id, date_from=None, date_to=None):
    """Multi-sheet workbook: summary sheets + one sheet per completed user.

    Summary sheets, in order:
      • "Зведення"  — toți participanții (general), cu răspunsuri la întrebări
      • "Завершені" — doar cei care au terminat tot (status == completed)
      • "У процесі" — cei nefinalizați (started / in_progress / abandoned),
                       doar date de contact + companie + scor total (fără răspunsuri)
    Then one detail sheet per *completed* user (cei în proces nu primesc foaie
    individuală cu răspunsuri — apar doar pe foaia trimisă "У процесі").

    When ``date_from`` and/or ``date_to`` (``datetime.date``) are provided,
    submissions are kept only when their ``created_at`` (as a date) falls in the
    inclusive range. Rows whose ``created_at`` can't be parsed are INCLUDED
    (kept) so that filtering never silently drops data.
    """
    subs = _filter_submissions_for_test(test_id)

    if date_from is not None or date_to is not None:
        def _in_range(s):
            d = _created_date(s.get("created_at"))
            if d is None:
                return True  # unparseable → keep, don't lose data
            if date_from is not None and d < date_from:
                return False
            if date_to is not None and d > date_to:
                return False
            return True
        subs = [s for s in subs if _in_range(s)]

    blocks = _get_test_blocks(test_id)
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)
    block_titles = _block_titles_from_subs(subs)

    completed = [s for s in subs if (s.get("status") or "") == "completed"]
    in_progress = [s for s in subs if (s.get("status") or "") != "completed"]

    # Streaming workbook: each sheet goes to disk as it is built, so the heap
    # never holds more than the row being written (see _StreamSheet).
    wb = openpyxl.Workbook(write_only=True)
    try:
        summary = _stream_sheet(wb, "Зведення")
        _fill_summary_sheet(summary, subs, block_titles, question_keys_ordered, question_labels)
        _finish_sheet(summary)

        finished_ws = _stream_sheet(wb, "Завершені")
        _fill_summary_sheet(finished_ws, completed, block_titles, question_keys_ordered,
                            question_labels)
        _finish_sheet(finished_ws)

        in_progress_ws = _stream_sheet(wb, "У процесі")
        _fill_processed_sheet(in_progress_ws, in_progress)
        _finish_sheet(in_progress_ws)

        # One sheet per completed user. Name: "{id}_FirstLast" truncated to 31 chars.
        # Over MAX_USER_SHEETS completed users we omit the individual sheets to avoid
        # OOM / request timeouts — the complete data still lives in the summary sheets
        # ("Зведення" / "Завершені" / "У процесі") and in the admin panel.
        used_names = {"Зведення", "Завершені", "У процесі"}
        for s in completed[:MAX_USER_SHEETS]:
            raw = f"{s['id']}_{s.get('first_name') or ''}_{s.get('last_name') or ''}"
            base = _safe_sheet_name(raw)
            name, i = base, 1
            while name in used_names:
                suffix = f"_{i}"
                name = base[: 31 - len(suffix)] + suffix
                i += 1
            used_names.add(name)
            ws = _stream_sheet(wb, name)
            _fill_single_user_sheet(ws, s, question_keys_ordered, question_labels)
            _finish_sheet(ws)
    except BaseException:
        _discard_workbook(wb)
        raise

    return wb


def build_all_submissions_workbook():
    """Global multi-sheet workbook across ALL tests (admin "Submissions" tab).

    Same layout as the per-test combined workbook, minus per-user sheets
    (the global table can hold thousands of rows):
      • "Зведення"  — toate submisiile, cu răspunsuri la întrebări
      • "Завершені" — status == completed, cu răspunsuri
      • "У процесі" — nefinalizați, doar contact + companie + scor total
    """
    subs = Submission.find_all()
    blocks = Block.find_all()
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)
    block_titles = _block_titles_from_subs(subs)

    completed = [s for s in subs if (s.get("status") or "") == "completed"]
    in_progress = [s for s in subs if (s.get("status") or "") != "completed"]

    wb = openpyxl.Workbook(write_only=True)
    try:
        summary = _stream_sheet(wb, "Зведення")
        _fill_summary_sheet(summary, subs, block_titles, question_keys_ordered, question_labels)
        _finish_sheet(summary)

        finished_ws = _stream_sheet(wb, "Завершені")
        _fill_summary_sheet(finished_ws, completed, block_titles, question_keys_ordered,
                            question_labels)
        _finish_sheet(finished_ws)

        in_progress_ws = _stream_sheet(wb, "У процесі")
        _fill_processed_sheet(in_progress_ws, in_progress)
        _finish_sheet(in_progress_ws)
    except BaseException:
        _discard_workbook(wb)
        raise

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


def build_single_user_report_html(submission_id) -> tuple[str, str]:
    """Render one submission's full report as a standalone, printable HTML page.

    Works for ANY submission regardless of whether a PDF was uploaded — the
    admin can always review the report from the data we store. All dynamic
    values are HTML-escaped (defense-in-depth on top of write-path sanitization).

    Returns (html_string, display_name).
    """
    sub = Submission.find_by_id(submission_id)
    if not sub:
        raise ValueError("Submission not found")
    blocks = _get_test_blocks(sub.get("test_id"))
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)

    e = html.escape
    name = f"{sub.get('first_name') or ''} {sub.get('last_name') or ''}".strip() or "—"

    info_pairs = [
        ("Повне ім'я", name),
        ("Email", sub.get("email") or "—"),
        ("Телефон", sub.get("phone") or "—"),
        ("Сектор", sub.get("sector") or "—"),
        ("Розмір компанії", sub.get("company_size") or "—"),
        ("Вік компанії", sub.get("company_age") or "—"),
        ("Оборот", sub.get("company_revenue") or "—"),
        ("Мова", sub.get("language") or "—"),
        ("Канал доставки", _infer_delivery(sub)),
        ("Telegram @username", sub.get("tg_username") or "—"),
        ("Статус", sub.get("status") or "—"),
        ("Дата заповнення", str(sub.get("created_at") or "—")),
    ]
    info_rows = "".join(
        f"<tr><th>{e(k)}</th><td>{e(str(v))}</td></tr>" for k, v in info_pairs
    )

    bs = _parse_json_field(sub.get("block_scores_json")) or []
    block_rows = ""
    if isinstance(bs, list):
        for b in bs:
            if not isinstance(b, dict):
                continue
            title = e(str(b.get("title", "—")))
            block_rows += f"<tr><td>{title}</td><td class='num'>{_fmt_score(b.get('score'))}</td></tr>"
    if not block_rows:
        block_rows = "<tr><td colspan='2' class='empty'>Немає балів за блоками</td></tr>"

    answers = _parse_json_field(sub.get("answers_json")) or {}
    if not isinstance(answers, dict):
        answers = {}
    q_rows = ""
    for qkey in question_keys_ordered:
        val = answers.get(qkey)
        val_str = "" if val is None else e(str(val))
        q_rows += f"<tr><td>{e(question_labels.get(qkey, qkey))}</td><td class='num'>{val_str}</td></tr>"
    if not q_rows:
        q_rows = "<tr><td colspan='2' class='empty'>Немає записаних відповідей</td></tr>"

    page = f"""<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BizCheck — Звіт {e(name)}</title>
<style>
  :root {{ --ink:#1d2530; --muted:#6b7685; --line:#e3e8ef; --head:#0b2e4f; --accent:#0b6; }}
  * {{ box-sizing:border-box; }}
  body {{ font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:var(--ink);
         margin:0; padding:32px; background:#f5f7fa; }}
  .sheet {{ max-width:860px; margin:0 auto; background:#fff; border:1px solid var(--line);
            border-radius:10px; padding:32px 36px; }}
  h1 {{ font-size:22px; margin:0 0 4px; color:var(--head); }}
  .sub {{ color:var(--muted); font-size:13px; margin-bottom:24px; }}
  h2 {{ font-size:15px; margin:28px 0 10px; color:var(--head);
        border-bottom:2px solid var(--line); padding-bottom:6px; }}
  table {{ width:100%; border-collapse:collapse; font-size:13px; }}
  th, td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--line);
           vertical-align:top; }}
  .info th {{ width:200px; color:var(--muted); font-weight:600; }}
  td.num {{ text-align:right; width:90px; font-variant-numeric:tabular-nums; font-weight:600; }}
  .empty {{ color:var(--muted); font-style:italic; text-align:center; }}
  .total {{ display:inline-block; margin-top:10px; padding:6px 14px; background:var(--head);
            color:#fff; border-radius:6px; font-weight:700; font-size:15px; }}
  @media print {{ body {{ background:#fff; padding:0; }} .sheet {{ border:0; }} }}
</style>
</head>
<body>
  <div class="sheet">
    <h1>BizCheck — Індивідуальний звіт</h1>
    <div class="sub">ID подання #{e(str(sub.get('id', '')))}</div>

    <h2>Дані компанії та контакт</h2>
    <table class="info">{info_rows}</table>

    <h2>Загальний бал</h2>
    <span class="total">{_fmt_score(sub.get('total_score'))}</span>

    <h2>Бали за блоками</h2>
    <table>{block_rows}</table>

    <h2>Детальні відповіді за питаннями</h2>
    <table>{q_rows}</table>
  </div>
</body>
</html>"""
    return page, name


def _defuse_formulas(wb):
    """Force every string cell to be TEXT, never a live formula (CWE-1236).

    openpyxl types a string starting with "=" as a formula cell, so free text a
    submitter controls becomes executable content in the workbook the admin
    downloads. `sector` / `company_size` / `company_age` / `company_revenue` are
    written by the PUBLIC PATCH /submissions/{id} and only pass through
    clean_text, which strips HTML but has no reason to know about spreadsheet
    syntax — there is no allow-list behind the UI dropdown. Block titles and
    answer labels arrive the same way inside block_scores_json.

    Overriding data_type (rather than prefixing an apostrophe) keeps the text
    readable verbatim in the sheet, and numbers/dates keep their own types.

    Streaming sheets cannot be walked here — their rows are already XML on disk
    by the time this runs — so they defuse in ``_StreamSheet.append`` instead.
    Anything streaming that is NOT a ``_StreamSheet`` would slip through
    unprotected, so it is a hard error rather than a silent skip.
    """
    for ws in wb.worksheets:
        if isinstance(ws, WriteOnlyWorksheet):
            if not isinstance(ws, _StreamSheet):
                raise RuntimeError(
                    f"write-only sheet {ws.title!r} bypassed formula defusing; "
                    "create streaming sheets with _stream_sheet()"
                )
            continue
        for row in ws.iter_rows():
            for cell in row:
                _defuse(cell)


def workbook_to_bytes(wb) -> bytes:
    # Single choke point: every .xlsx this app emits is serialized here.
    _defuse_formulas(wb)
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return out.getvalue()


# How often build_pdfs_zip_for_test invokes its ``on_progress`` callback. The
# callback is both a progress report AND the liveness heartbeat of an async
# export job (services/export_jobs.py), so it must fire often enough that a job
# is never mistaken for a dead worker, and rarely enough that writing the job
# state file does not dominate the run. Every 10 submissions ≈ every 0.6 s at
# the measured 16 s / 250 submissions.
_PROGRESS_EVERY = 10


def build_pdfs_zip_for_test(test_id, max_bytes=None, *, dest_dir=None,
                            on_progress=None) -> str:
    """ZIP every submission's stored PDF for this test, written to a temp file.

    Streams to a NamedTemporaryFile on disk (not BytesIO) to keep memory flat.
    When ``max_bytes`` is a number, the on-disk size is checked after each PDF
    and ``ExportTooLarge`` is raised once it would be exceeded. When ``max_bytes``
    is ``None`` (default), NO size limit is applied — streaming from disk avoids
    OOM regardless of archive size.

    ``dest_dir`` — directory the temp file is created in. Defaults to the system
    temp dir. An async job passes its own spool directory so the finished archive
    can be renamed into place with os.replace (same filesystem → atomic, and no
    1.6 GB copy across devices).

    ``on_progress`` — optional ``callable(done, total)`` invoked every
    ``_PROGRESS_EVERY`` submissions and once at the end. Exceptions raised by
    the callback are swallowed: progress reporting must never fail an export.

    Returns the filesystem PATH to the temp .zip (caller is responsible for
    removing it once served).
    """
    subs = _filter_submissions_for_test(test_id)
    total = len(subs)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", dir=dest_dir)
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for idx, s in enumerate(subs, 1):
                pdf = Submission.get_pdf(s["id"])
                if pdf:
                    date_part = str(s.get("created_at") or "").replace(":", "-").replace(" ", "_")[:19]
                    contact = s.get("phone") or s.get("email") or ""
                    stem = _safe_filename(
                        f"{s['id']}_{s.get('first_name') or ''}_{s.get('last_name') or ''}_{contact}_{date_part}"
                    )
                    zf.writestr(f"{stem}.pdf", pdf)
                    if max_bytes is not None:
                        tmp.flush()
                        if os.fstat(tmp.fileno()).st_size > max_bytes:
                            raise ExportTooLarge()
                if on_progress is not None and (idx % _PROGRESS_EVERY == 0 or idx == total):
                    try:
                        on_progress(idx, total)
                    except Exception:
                        log.warning("[export] progress callback failed", exc_info=True)
    except BaseException:
        tmp.close()
        try:
            os.remove(tmp.name)
        except OSError:
            # Swallowed so the ORIGINAL export error is the one re-raised below,
            # but a leaked temp file can fill the disk — say so.
            log.warning("[export] could not remove the partial temp zip %s", tmp.name,
                        exc_info=True)
        raise
    tmp.close()
    return tmp.name


# How many per-user workbooks build_excels_zip_for_test discards before forcing
# a full collection. Small enough that the openpyxl cycle garbage never becomes
# a meaningful share of RSS, large enough that the collections stay noise.
_GC_EVERY = 50


def build_excels_zip_for_test(test_id, *, dest_dir=None) -> str:
    """ZIP with one Excel per submission, written to a temp file on disk.

    Same shape as ``build_pdfs_zip_for_test``: the archive is streamed into a
    NamedTemporaryFile instead of a BytesIO, so a worker serving this export
    holds ONE workbook at a time (tens of KB) rather than the whole archive.
    The build is fast (<1 s up to 500 submissions) — this is purely about RSS,
    not latency, which is why it stays synchronous and does NOT go through
    services/export_jobs.py.

    ``dest_dir`` — directory the temp file is created in (defaults to the system
    temp dir), mirroring the PDF builder.

    Returns the filesystem PATH to the temp .zip. The caller MUST remove it once
    served — routes/submissions.py does that from an ``after_this_request`` hook,
    which fires even when the client aborts mid-download.
    """
    subs = _filter_submissions_for_test(test_id)
    blocks = _get_test_blocks(test_id)
    question_keys_ordered, question_labels = _collect_questions_for_blocks(blocks)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", dir=dest_dir)
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for idx, s in enumerate(subs, 1):
                wb = openpyxl.Workbook()
                ws = wb.active
                name = f"{s.get('first_name') or ''} {s.get('last_name') or ''}".strip() or f"sub{s['id']}"
                ws.title = _safe_sheet_name(name)
                _fill_single_user_sheet(ws, s, question_keys_ordered, question_labels)

                date_part = str(s.get("created_at") or "").replace(":", "-").replace(" ", "_")[:19]
                stem = _safe_filename(f"{s['id']}_{name}_{date_part}")
                zf.writestr(f"{stem}.xlsx", workbook_to_bytes(wb))

                # openpyxl objects are mutually referential (ws.parent is the
                # workbook, cell.parent is the sheet), so a discarded workbook is
                # a REFERENCE CYCLE: refcounting cannot free it and it survives
                # until a generational sweep reaches it. Left alone, one
                # workbook's worth of garbage per submission piles up and the
                # heap grows with the corpus again — measured 4.4 KB/submission,
                # i.e. the exact leak this function moved to disk to avoid.
                # A full collect every _GC_EVERY workbooks keeps the profile flat
                # for well under 1% of the build time.
                if idx % _GC_EVERY == 0:
                    gc.collect()
    except BaseException:
        tmp.close()
        try:
            os.remove(tmp.name)
        except OSError:
            # Swallowed so the ORIGINAL export error is the one re-raised below,
            # but a leaked temp file can fill the disk — say so.
            log.warning("[export] could not remove the partial temp zip %s", tmp.name,
                        exc_info=True)
        raise
    tmp.close()
    return tmp.name


# ──────────────────────────────────────────────────────────────────
# Bot picker / single-file helpers
# ──────────────────────────────────────────────────────────────────

def list_submissions_for_picker(test_id, q=None, limit=20):
    """Most-recent submissions for a test, shaped for the bot's inline picker.

    Returns at most ``limit`` dicts {"id", "label"}, newest first, optionally
    filtered by ``q`` (case-insensitive match in first/last name or @username).
    label = "First Last" → else "@username" → else "#<id>"; a trailing
    "· …NNNN" (last 4 phone digits) is appended when a phone is on file.
    """
    subs = Submission.find_all(test_id=test_id) or []
    subs = sorted(subs, key=lambda s: str(s.get("created_at") or ""), reverse=True)

    if q:
        needle = q.strip().lower()
        if needle:
            subs = [
                s for s in subs
                if needle in (s.get("first_name") or "").lower()
                or needle in (s.get("last_name") or "").lower()
                or needle in (s.get("tg_username") or "").lower()
            ]

    out = []
    for s in subs[:limit]:
        name = f"{s.get('first_name') or ''} {s.get('last_name') or ''}".strip()
        if name:
            label = name
        elif s.get("tg_username"):
            label = f"@{s['tg_username'].lstrip('@')}"
        else:
            label = f"#{s['id']}"
        phone = s.get("phone") or ""
        digits = re.sub(r"\D", "", phone)
        if digits:
            label = f"{label} · …{digits[-4:]}"
        out.append({"id": s["id"], "label": label})
    return out


def single_pdf_filename(sub) -> str:
    """Filename for a single submission's stored PDF, based on contact data."""
    contact = sub.get("phone") or sub.get("email") or ""
    stem = _safe_filename(
        f"{sub['id']}_{sub.get('first_name') or ''}_{sub.get('last_name') or ''}_{contact}"
    )
    return stem + ".pdf"


def export_basename(test_id, kind) -> str:
    """Base filename (no extension) for a test export: Виписка_<kind>_<test>_<date>."""
    test = Test.find_by_id(test_id) or {}
    name = test.get("name_uk") or test.get("name_en") or f"Test {test_id}"
    return f"Виписка_{kind}_{_safe_filename(name)}_{date.today().isoformat()}"
