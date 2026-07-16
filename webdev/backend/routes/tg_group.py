"""
Runtime registration of the sales group, consumed by the group bot
(webdev/groupbot/) to serve the /register command inside the team's Telegram
group. Replaces the hardcoded SALES_CHAT_ID env var: whatever chat registers
itself here is where services/sales_notify.py posts new leads.

Whoever can call /register redirects every future lead notification (name,
phone, email) into a chat of their choosing, so — like the export endpoints and
unlike the feedback ones — these are guarded by a STRICT shared secret: when
BOT_SHARED_SECRET is unset the endpoints are DISABLED (403) rather than open.
The group bot sends the secret in the X-Bot-Secret header.

  POST /tg/group/register     {chat_id, title, registered_by} → bind the group
  POST /tg/group/unregister   clear the binding (notifications fall back to env)
  GET  /tg/group/registered    {chat_id, title} — which chat the bot serves

Values live in the `site_settings` key/value store under `sales_chat_id`,
`sales_chat_title` and `sales_chat_registered_by`.
"""
import os

from flask import Blueprint, jsonify, request

from models.site_settings import SiteSettings
from utils.validators import clean_optional

tg_group_bp = Blueprint("tg_group", __name__, url_prefix="/api_crowe_bizcheck/tg/group")


def _authorized(req) -> bool:
    """STRICT: a configured secret is mandatory. No secret → feature off (403)."""
    secret = (os.getenv("BOT_SHARED_SECRET") or "").strip()
    if not secret:
        return False
    return req.headers.get("X-Bot-Secret", "") == secret


@tg_group_bp.before_request
def _guard():
    if not _authorized(request):
        return jsonify({"error": "forbidden"}), 403


@tg_group_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    # Telegram group ids are negative ints; anything non-integer is a bad call.
    try:
        chat_id = int(data.get("chat_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "invalid chat_id"}), 400

    # title / registered_by sunt text liber controlat de utilizator → sanitizare
    # obligatorie înainte de stocare (sunt re-emise în Telegram / panou).
    title = clean_optional(data.get("title")) or ""
    registered_by = clean_optional(data.get("registered_by")) or ""

    SiteSettings.set("sales_chat_id", str(chat_id))
    SiteSettings.set("sales_chat_title", title)
    SiteSettings.set("sales_chat_registered_by", registered_by)

    return jsonify({"ok": True, "chat_id": chat_id})


@tg_group_bp.route("/unregister", methods=["POST"])
def unregister():
    """Clear the binding. Empty (not deleted) so sales_notify falls back to env."""
    SiteSettings.set("sales_chat_id", "")
    return jsonify({"ok": True})


@tg_group_bp.route("/registered", methods=["GET"])
def registered():
    chat_id = SiteSettings.get("sales_chat_id", "") or None
    return jsonify({
        "chat_id": chat_id,
        "title": SiteSettings.get("sales_chat_title", "") or "",
    })
