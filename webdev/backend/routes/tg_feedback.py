"""
Telegram feedback outreach.

Admin asks a single, editable question to a person in Telegram and the person's
first reply is captured. Two creation modes (see database/db.py tg_outreach):

  contact → admin gives a @username that already exists among our Telegram
            contacts (people who received a report in TG). We know their chat_id,
            so the backend sends the question instantly via the Bot API.
  link    → admin gets a personal deep-link (t.me/<bot>?start=fb_<token>) to send
            the person by any channel. When they open it the bot binds their
            chat_id and the question is sent then.

Admin endpoints (cookie + CSRF, @admin_required):
  GET    /admin/feedback              list outreaches
  POST   /admin/feedback              create {mode, username?}
  DELETE /admin/feedback/<id>         remove
  GET    /admin/feedback/contacts     reachable TG contacts (username picker)
  GET    /admin/feedback/prompt       {ro, ru}
  PUT    /admin/feedback/prompt       set {ro, ru}

Bot endpoints (called by the polling bot service, guarded by X-Bot-Secret when
BOT_SHARED_SECRET is configured):
  POST   /tg/feedback/open           {token, chat_id, username, lang} link opened
  POST   /tg/feedback/reply          {chat_id, username, text} capture first reply
"""
import os
import re
import time
import uuid

from flask import Blueprint, jsonify, request

from models.tg_outreach import TgOutreach
from middleware.admin_middleware import admin_required
from utils.validators import clean_text, clean_optional, MAX_NAME
import services.feedback as fb

admin_feedback_bp = Blueprint("admin_feedback", __name__, url_prefix="/api_crowe_bizcheck/admin")
tg_feedback_bp = Blueprint("tg_feedback", __name__, url_prefix="/api_crowe_bizcheck/tg/feedback")

_REPLY_MAX = 4000

# Prompt text, defaults, thank-you, language helpers and send/scheduling logic
# all live in services.feedback so the manual and automatic flows share them.
_norm_lang = fb.norm_lang
_THANKS = fb.THANKS


def _bot_username():
    return os.getenv("TELEGRAM_BOT_USERNAME", "CROWE_BIZCHECK_bot")


def _public_row(row):
    """Shape an outreach row for the admin UI, adding the deep-link for link-mode."""
    if not row:
        return None
    out = {
        "id": row["id"],
        "mode": row["mode"],
        "username": row.get("username") or "",
        "tg_chat_id": row.get("tg_chat_id"),
        "lang": row.get("lang") or "ru",
        "status": row.get("status"),
        "reply_text": row.get("reply_text") or "",
        "error": row.get("error") or "",
        "created_at": str(row.get("created_at") or ""),
        "sent_at": str(row.get("sent_at") or "") if row.get("sent_at") else "",
        "answered_at": str(row.get("answered_at") or "") if row.get("answered_at") else "",
    }
    if row.get("mode") == "link":
        out["link"] = f"https://t.me/{_bot_username()}?start=fb_{row['token']}"
    return out


def _bot_authorized(req) -> bool:
    """Bot-only endpoints. Enforce the shared secret when one is configured;
    if BOT_SHARED_SECRET is unset (e.g. not yet deployed), allow but the caller
    still needs a valid unguessable token / known chat for anything to happen."""
    secret = (os.getenv("BOT_SHARED_SECRET") or "").strip()
    if not secret:
        return True
    return req.headers.get("X-Bot-Secret", "") == secret


# ---------------------------------------------------------------------------
# Admin: prompt editor
# ---------------------------------------------------------------------------

@admin_feedback_bp.route("/feedback/prompt", methods=["GET"])
@admin_required
def get_prompt():
    return jsonify({"ro": fb.get_prompt("ro"), "ru": fb.get_prompt("ru")})


@admin_feedback_bp.route("/feedback/prompt", methods=["PUT"])
@admin_required
def set_prompt():
    data = request.get_json(silent=True) or {}
    from models.site_settings import SiteSettings
    for lang in ("ro", "ru"):
        if lang in data:
            # Keep emoji + newlines, strip control chars / cap length.
            text = clean_text(data.get(lang), max_len=4000)
            SiteSettings.set(fb.PROMPT_KEYS[lang], text)
    return jsonify({"ro": fb.get_prompt("ro"), "ru": fb.get_prompt("ru")})


# ---------------------------------------------------------------------------
# Admin: automatic-feedback settings (toggle + delay)
# ---------------------------------------------------------------------------

@admin_feedback_bp.route("/feedback/auto", methods=["GET"])
@admin_required
def get_auto():
    return jsonify({"enabled": fb.auto_enabled(), "delay_min": fb.auto_delay_min()})


@admin_feedback_bp.route("/feedback/auto", methods=["PUT"])
@admin_required
def set_auto():
    data = request.get_json(silent=True) or {}
    from models.site_settings import SiteSettings
    if "enabled" in data:
        SiteSettings.set(fb.AUTO_ENABLED_KEY, "1" if data.get("enabled") else "0")
    if "delay_min" in data:
        try:
            n = int(data.get("delay_min"))
        except (TypeError, ValueError):
            return jsonify({"error": "delay_min must be a number"}), 400
        n = max(fb.MIN_DELAY_MIN, min(fb.MAX_DELAY_MIN, n))
        SiteSettings.set(fb.AUTO_DELAY_KEY, str(n))
    return jsonify({"enabled": fb.auto_enabled(), "delay_min": fb.auto_delay_min()})


# ---------------------------------------------------------------------------
# Admin: outreach list / create / delete
# ---------------------------------------------------------------------------

@admin_feedback_bp.route("/feedback", methods=["GET"])
@admin_required
def list_feedback():
    # Only the replies we received — the target list is never persisted.
    rows = [_public_row(r) for r in TgOutreach.list_answered()]
    return jsonify({"items": rows, "count": len(rows)})


@admin_feedback_bp.route("/feedback/contacts", methods=["GET"])
@admin_required
def list_contacts():
    out = []
    for c in TgOutreach.contacts():
        if not c.get("tg_username"):
            continue
        out.append({
            "username": c["tg_username"],
            "lang": c.get("language") or "ru",
        })
    return jsonify({"contacts": out})


def _parse_target(raw):
    """Parse one admin-entered target into a username or a numeric chat_id.

    Accepts: '@user', 'user', 't.me/user', 'https://t.me/user', or a numeric
    Telegram id. Returns {"chat_id": int|None, "username": str|None} or None.
    """
    s = (raw or "").strip()
    if not s:
        return None
    # Numeric Telegram id (user ids positive; allow a leading '-' just in case).
    if re.fullmatch(r"-?\d{4,15}", s):
        return {"chat_id": int(s), "username": None}
    # Username, possibly inside a t.me / telegram.me link or prefixed with '@'.
    m = re.search(r"(?:t\.me/|telegram\.me/|@)?([A-Za-z0-9_]{4,32})/?$", s, re.I)
    if m:
        return {"chat_id": None, "username": m.group(1)}
    return None


@admin_feedback_bp.route("/feedback/send", methods=["POST"])
@admin_required
def send_feedback():
    """Bulk send. The admin pastes one or more targets (username / tgId / link);
    we send the preset question to each reachable one immediately and return a
    personal link for anyone we can't reach directly. NOTHING about the target
    list is persisted — only chat_ids needed to capture the eventual reply, and
    the replies themselves.
    """
    data = request.get_json(silent=True) or {}
    targets = data.get("targets")
    if isinstance(targets, str):
        targets = re.split(r"[\n,;]+", targets)
    if not isinstance(targets, list):
        targets = []

    lang_override = (data.get("lang") or "auto").strip().lower()
    if lang_override not in ("auto", "ro", "ru"):
        lang_override = "auto"

    results = []
    for raw in targets[:200]:
        parsed = _parse_target(raw)
        if not parsed:
            if (raw or "").strip():
                results.append({"target": str(raw).strip(), "status": "invalid"})
            continue

        chat_id = parsed["chat_id"]
        username = parsed["username"]
        lang = lang_override if lang_override in ("ro", "ru") else "ru"

        # Resolve a @username to a chat_id (+ language) from our existing contacts.
        if username:
            contact = TgOutreach.find_contact_by_username(username)
            if contact:
                chat_id = contact["tg_chat_id"]
                if lang_override == "auto":
                    lang = _norm_lang(contact.get("language"))

        token = uuid.uuid4().hex

        # Reachable directly → send now. The marker row stores ONLY chat_id+lang
        # (no typed identity), so the reply can later be matched and captured.
        if chat_id is not None:
            ok, err, text = fb.send_question(chat_id, lang)
            # Keep the bulk loop under Telegram's ~30 msg/s cap. send_question
            # also backs off on 429; this avoids hitting it in the first place.
            time.sleep(0.05)
            if ok:
                row = TgOutreach.create(
                    mode="direct", username=None, tg_chat_id=chat_id,
                    lang=lang, token=token, status="pending",
                )
                TgOutreach.mark_sent(row["id"], chat_id, text)
                results.append({"target": str(raw).strip(), "status": "sent",
                                "username": username})
                continue
            # Most common failure: the person never started the bot (Telegram
            # forbids messaging them). Fall through to a shareable link.

        # Not reachable → mint a personal link the admin can forward manually.
        link_lang = lang if lang_override in ("ro", "ru") else "ru"
        row = TgOutreach.create(
            mode="link", username=None, tg_chat_id=None,
            lang=link_lang, token=token, status="pending",
        )
        results.append({
            "target": str(raw).strip(), "status": "link", "username": username,
            "link": f"https://t.me/{_bot_username()}?start=fb_{token}",
        })

    return jsonify({
        "results": results,
        "sent": sum(1 for r in results if r["status"] == "sent"),
        "links": sum(1 for r in results if r["status"] == "link"),
        "invalid": sum(1 for r in results if r["status"] == "invalid"),
    })


@admin_feedback_bp.route("/feedback/<int:outreach_id>", methods=["DELETE"])
@admin_required
def delete_feedback(outreach_id):
    row = TgOutreach.delete(outreach_id)
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Bot: personal-link opened → bind chat + send the question
# ---------------------------------------------------------------------------

@tg_feedback_bp.route("/open", methods=["POST"])
def feedback_open():
    if not _bot_authorized(request):
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    chat_id = data.get("chat_id")
    username = clean_optional(data.get("username"), max_len=MAX_NAME) or None

    try:
        chat_id = int(chat_id)
    except (TypeError, ValueError):
        return jsonify({"error": "chat_id must be an integer"}), 400

    row = TgOutreach.find_by_token(token)
    if not row or row.get("mode") != "link":
        return jsonify({"error": "unknown token"}), 404

    # Already answered → don't re-send (idempotent if they click the link again).
    if row.get("status") == "answered":
        return jsonify({"ok": True, "already": True})

    lang = _norm_lang(row.get("lang"))
    TgOutreach.bind_chat(row["id"], chat_id, username, lang)

    ok, err, text = fb.send_question(chat_id, lang)
    if ok:
        TgOutreach.mark_sent(row["id"], chat_id, text)
        return jsonify({"ok": True})
    TgOutreach.mark_failed(row["id"], err)
    return jsonify({"ok": False, "error": err}), 502


# ---------------------------------------------------------------------------
# Bot: a person sent a free-text message → capture it if we're awaiting a reply
# ---------------------------------------------------------------------------

@tg_feedback_bp.route("/reply", methods=["POST"])
def feedback_reply():
    if not _bot_authorized(request):
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True) or {}
    chat_id = data.get("chat_id")
    try:
        chat_id = int(chat_id)
    except (TypeError, ValueError):
        return jsonify({"error": "chat_id must be an integer"}), 400

    text = clean_text(data.get("text"), max_len=_REPLY_MAX)
    if not text:
        return jsonify({"matched": False})

    row = TgOutreach.find_awaiting_reply_by_chat(chat_id)
    if not row:
        return jsonify({"matched": False})

    username = clean_optional(data.get("username"), max_len=MAX_NAME)
    TgOutreach.mark_answered(row["id"], text, username)
    lang = _norm_lang(row.get("lang"))
    return jsonify({"matched": True, "lang": lang, "ack": _THANKS[lang]})
