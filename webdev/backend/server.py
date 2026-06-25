"""
BizCheck Backend — Flask application entry point.

Configures middleware (CORS, rate limiting, security headers),
registers route blueprints, serves the admin panel, and runs migrations on startup.
"""

import os
import sys
import atexit
import logging

# Make application logs (email/sales/etc.) visible in `docker compose logs`.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger().setLevel(logging.INFO)

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from werkzeug.middleware.proxy_fix import ProxyFix

from database.db import migrate, close
from routes.auth import auth_bp
from routes.blocks import blocks_bp
from routes.questions import questions_bp
from routes.results import results_bp
from routes.admin import admin_bp
from routes.submissions import submissions_bp
from routes.telegram import tg_bp
from routes.tests import tests_bp, admin_tests_bp
from routes.templates import templates_bp, admin_templates_bp
from routes.content import content_bp, admin_content_bp
from routes.site_settings import site_settings_bp, admin_site_settings_bp

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB max request size

# --- Trusted proxy chain ---
# Backend lives behind exactly one nginx (see webdev/nginx.conf) and is NOT
# exposed to the public internet (only `expose: 4001` in docker-compose, no
# `ports:` mapping). With x_for=1, ProxyFix takes the LAST hop in the
# X-Forwarded-For chain — that is whatever nginx appended via
# proxy_add_x_forwarded_for, which equals the real client IP.
#
# Critical property: a client-supplied `X-Forwarded-For: 1.2.3.4` header is
# preserved as the *prefix* of the chain by nginx, not the suffix. So an
# attacker spoofing XFF cannot influence the rate-limit key.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# --- CORS ---
cors_origins_str = os.getenv("CORS_ORIGIN", "http://localhost:5173")
cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]
CORS(app, origins=cors_origins, supports_credentials=True)


def _real_client_ip():
    """Rate-limit key. After ProxyFix, request.remote_addr is the real client IP."""
    return request.remote_addr or "unknown"


# --- Rate limiting ---
limiter = Limiter(
    key_func=_real_client_ip,
    app=app,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)

# Stricter limits on auth endpoints
limiter.limit("10 per minute")(auth_bp)
# Admin auth: 5/min stops bursts, 40/hour stops slow brute-force across the day.
# Both keyed on the real client IP (ProxyFix x_for=1 + nginx overwriting XFF).
limiter.limit("5 per minute", methods=["POST"])(admin_bp)
limiter.limit("40 per hour", methods=["POST"])(admin_bp)
limiter.limit("60 per minute")(submissions_bp)
# Crearea/upload-ul de submission (POST) e limitat mai strict per-IP (anti-abuz/flood);
# PATCH-urile din timpul testului rămân la 60/min. Cheia e IP-ul real (ProxyFix x_for=1).
limiter.limit("15 per minute", methods=["POST"])(submissions_bp)
limiter.limit("20 per minute")(tg_bp)
limiter.limit("5 per minute", methods=["POST", "PUT", "DELETE"])(admin_tests_bp)
limiter.limit("10 per minute", methods=["POST", "PUT", "DELETE"])(admin_templates_bp)
limiter.limit("10 per minute", methods=["POST", "PUT", "DELETE"])(admin_content_bp)
limiter.limit("10 per minute", methods=["PUT"])(admin_site_settings_bp)
# Public review submission (POST /testimonials). Tight per-IP cap — anti-spam.
# GETs (testimonials/faq listings) stay unlimited.
limiter.limit("3 per minute", methods=["POST"])(content_bp)
limiter.limit("10 per hour", methods=["POST"])(content_bp)

# --- Host allowlist (anti Host-Header-Injection) ---
# nginx forwards the client Host verbatim (proxy_set_header Host $host). If
# ALLOWED_HOSTS is set, reject any request whose Host isn't in the list so a
# spoofed Host can't poison cache keys or any host-derived logic. Opt-in: when
# the env var is empty the check is skipped (dev/tests unaffected). The internal
# health probe is always allowed.
_ALLOWED_HOSTS = {h.strip().lower() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()}


@app.before_request
def _enforce_allowed_host():
    if not _ALLOWED_HOSTS or request.path == "/api/health":
        return None
    host = (request.host or "").split(":")[0].lower()
    if host not in _ALLOWED_HOSTS:
        return jsonify({"error": "Invalid host"}), 400
    return None


# --- Security headers (Helmet-equivalent) ---
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # API is JSON-only and must never be framed → defeat clickjacking/UI-redress.
    # (The SPA's framing is governed by the CSP frame-ancestors in nginx so the
    # Meta Event Setup Tool keeps working; that is a separate response path.)
    response.headers["X-Frame-Options"] = "DENY"
    # Hide the WSGI server + version (reconnaissance / version-disclosure finding).
    response.headers["Server"] = "BizCheck"
    # CSP: keep the Meta Pixel / Facebook directives intact (do NOT tighten —
    # the marketing pixel and Event Setup Tool need Facebook script/iframe access).
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com; "
        "img-src 'self' data: blob: https://www.facebook.com; "
        "connect-src 'self' https://www.facebook.com https://connect.facebook.net; "
        "frame-ancestors 'self' https://*.facebook.com https://*.facebook.net;"
    )
    # API payloads carry submissions, quiz content and PII — never let a
    # browser or intermediary proxy cache them (CWE-525). Orthogonal to CSP.
    if request.path.startswith("/api_crowe_bizcheck/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
    if os.getenv("NODE_ENV") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ---------------------------------------------------------------------------
# Register blueprints
# ---------------------------------------------------------------------------

app.register_blueprint(auth_bp)
app.register_blueprint(blocks_bp)
app.register_blueprint(questions_bp)
app.register_blueprint(results_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(submissions_bp)
app.register_blueprint(tg_bp)
app.register_blueprint(tests_bp)
app.register_blueprint(admin_tests_bp)
app.register_blueprint(templates_bp)
app.register_blueprint(admin_templates_bp)
app.register_blueprint(content_bp)
app.register_blueprint(admin_content_bp)
app.register_blueprint(site_settings_bp)
app.register_blueprint(admin_site_settings_bp)

# ---------------------------------------------------------------------------
# Admin panel now lives in the React SPA under /admin/*.
# Nginx serves index.html for any unknown path, which React Router handles.
# ---------------------------------------------------------------------------

# Health check
# ---------------------------------------------------------------------------

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


# ---------------------------------------------------------------------------
# Global error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(413)
def payload_too_large(e):
    return jsonify({"error": "Request payload too large"}), 413


@app.errorhandler(429)
def rate_limited(e):
    return jsonify({"error": "Too many requests. Please slow down."}), 429


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

# Validate required environment variables
_required_env = ["JWT_SECRET", "JWT_REFRESH_SECRET"]
if os.getenv("NODE_ENV") == "production":
    # Without these, login_admin would have no credentials to compare against.
    # It now fails closed, but in production we want a hard boot failure rather
    # than a silently unreachable admin panel.
    _required_env += ["PII_ENCRYPTION_KEY", "ADMIN_USERNAME", "ADMIN_PASSWORD"]
for _var in _required_env:
    if not os.getenv(_var):
        print(f"FATAL: {_var} environment variable is not set", file=sys.stderr)
        sys.exit(1)

# Warn loudly in dev if PII key is missing; encryption calls will raise on first use.
if not os.getenv("PII_ENCRYPTION_KEY"):
    print("WARNING: PII_ENCRYPTION_KEY not set — PII encryption will fail at runtime.",
          file=sys.stderr)

# Run migrations on import
migrate()

# Graceful shutdown
atexit.register(close)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 4001))
    debug = os.getenv("NODE_ENV") != "production"
    print(f"🚀 BizCheck API running on http://localhost:{port}")
    print(f"📊 Admin panel at http://localhost:{port}/admin")
    app.run(host="0.0.0.0", port=port, debug=debug)
