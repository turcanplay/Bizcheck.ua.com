"""Send ONE test event to the CRM webhook to verify the configuration.

POSTs `{"event": "ping", ...}` carrying an obviously fake lead (id 0,
test.lead@example.com) with the exact headers and HMAC signature a real
`lead.created` gets, so the CRM side can build and test its mapping. Reads
CRM_WEBHOOK_URL / CRM_WEBHOOK_SECRET from the environment (the backend
container's .env), so run it where those are set. Touches no database.

Usage (inside the backend dir / container):

    python -m scripts.crm_test_webhook

Exit code 0 when the CRM answered 2xx, 1 otherwise.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.crm_notify import send_test_event  # noqa: E402


def main() -> int:
    ok, status = send_test_event()
    print(f"{'OK' if ok else 'FAILED'}: {status}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
