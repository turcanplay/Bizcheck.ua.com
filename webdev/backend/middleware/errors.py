"""App-level error handlers for domain exceptions raised inside routes.

Registered once from server.py. Kept out of server.py itself so the unit tests
can build a minimal Flask app with exactly the same behavior (no live DB, no
blueprint zoo) instead of re-implementing the mapping and drifting from it.
"""
from flask import jsonify

from utils.validators import TextTooLong


def register_error_handlers(app):
    """Attach the domain-exception → HTTP mapping to ``app``."""

    @app.errorhandler(TextTooLong)
    def _field_too_long(exc):
        """400 with a structured payload the admin SPA can point at an input.

        Raised by the strict authored-content validators (utils.validators
        .clean_authored). It must NEVER be reachable from a public write path —
        those keep truncating — so this handler is safe to expose verbatim: it
        contains only the field name and two integers, no user data.
        """
        return jsonify(exc.to_dict()), 400

    return app
