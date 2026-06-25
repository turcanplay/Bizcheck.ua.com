"""Site settings routes — editable page configuration.

Public  GET  /api_crowe_bizcheck/site-settings        → read CTA targets (SPA)
Admin   PUT  /api_crowe_bizcheck/admin/site-settings   → update CTA targets

The only settings today are the three landing-page CTA button targets. Each
value is a test slug; an empty value means "no target" → the button keeps its
old behavior (scroll to the catalog).
"""
from flask import Blueprint, jsonify, request

from models.site_settings import SiteSettings
from models.test import Test
from middleware.admin_middleware import admin_required
from utils.validators import clean_slug

site_settings_bp = Blueprint("site_settings", __name__, url_prefix="/api_crowe_bizcheck")
admin_site_settings_bp = Blueprint("admin_site_settings", __name__, url_prefix="/api_crowe_bizcheck/admin")

# Allow-list of editable keys. Anything outside this set is rejected — keeps the
# key/value table from becoming a dumping ground and blocks mass-assignment.
CTA_KEYS = ("cta_hero_test", "cta_about_test", "cta_final_test", "cta_catalog_test")

# Boolean feature flags (stored as "1"/"0"). Admin toggles, SPA reads.
# email_delivery_enabled: when "0", the post-test "email" delivery method is
# shown as "coming soon" (disabled). Lets the admin turn email delivery off
# instantly if it misbehaves, without a deploy.
FLAG_KEYS = ("email_delivery_enabled",)

# Defaults for flags when not yet stored. Email delivery is OFF by default until
# the admin explicitly enables it (deliverability/DNS still being set up).
_FLAG_DEFAULTS = {"email_delivery_enabled": "0"}


def _truthy(v):
    return "1" if v in (True, 1, "1", "true", "True", "on", "yes") else "0"


def _settings_payload():
    """Return all editable keys (CTA targets + feature flags), with defaults."""
    stored = SiteSettings.get_all()
    out = {k: stored.get(k, "") for k in CTA_KEYS}
    for k in FLAG_KEYS:
        out[k] = stored.get(k, _FLAG_DEFAULTS.get(k, "0"))
    return out


@site_settings_bp.route("/site-settings", methods=["GET"])
def public_site_settings():
    """Public — the SPA reads this to wire up CTA buttons + feature flags."""
    return jsonify({"settings": _settings_payload()})


@admin_site_settings_bp.route("/site-settings", methods=["GET"])
@admin_required
def admin_get_site_settings():
    return jsonify({"settings": _settings_payload()})


@admin_site_settings_bp.route("/site-settings", methods=["PUT"])
@admin_required
def admin_update_site_settings():
    data = request.get_json(silent=True) or {}

    # Validate every supplied key BEFORE writing anything (all-or-nothing).
    to_write = {}
    for key in CTA_KEYS:
        if key not in data:
            continue
        raw = data[key]
        if raw in (None, ""):
            to_write[key] = ""           # explicit "no target"
            continue
        try:
            slug = clean_slug(raw)
        except ValueError:
            return jsonify({"error": f"Invalid slug for {key}"}), 400
        if not Test.find_by_slug(slug):
            return jsonify({"error": f"Unknown test slug for {key}: {slug}"}), 400
        to_write[key] = slug

    for key in FLAG_KEYS:
        if key in data:
            to_write[key] = _truthy(data[key])

    for key, value in to_write.items():
        SiteSettings.set(key, value)

    return jsonify({"settings": _settings_payload()})