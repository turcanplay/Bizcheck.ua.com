"""Shared pytest configuration for the backend unit-test suite.

These unit tests run WITHOUT a live Postgres or a running backend. The model
layer is monkeypatched wherever a DB round-trip would otherwise happen, so no
psycopg2 connection is ever opened.

Environment defaults required by modules-under-test are set here BEFORE any of
them are imported (JWT secrets, the PII encryption key, admin creds).
"""
import os
import sys

# --- Secrets / config that modules read at import or first use --------------
os.environ.setdefault("JWT_SECRET", "unit-test-secret-do-not-use-in-prod")
os.environ.setdefault("JWT_REFRESH_SECRET", "unit-test-refresh-secret")
os.environ.setdefault("PII_ENCRYPTION_KEY", "unit-test-pii-key")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "admin")

# Make backend/ importable whether pytest is launched from repo root or backend/.
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(_HERE)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
