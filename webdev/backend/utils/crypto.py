"""
Field-level encryption for PII at rest.

Uses Fernet (AES-128-CBC + HMAC-SHA256) for authenticated encryption.
Encrypted columns on `submissions`: first_name, last_name, email, phone.

The key is read from PII_ENCRYPTION_KEY. In production the application refuses
to start if the key is missing (see server.py startup checks). In dev an
explicit RuntimeError is raised on first use.

Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken

_fernet = None

PII_FIELDS = ("first_name", "last_name", "email", "phone")


def _get_fernet():
    global _fernet
    if _fernet is None:
        raw_key = os.getenv("PII_ENCRYPTION_KEY", "")
        if not raw_key:
            raise RuntimeError(
                "PII_ENCRYPTION_KEY is not set. Generate one with: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        try:
            Fernet(raw_key.encode())
            key = raw_key.encode()
        except Exception:
            # Accept any passphrase: derive a Fernet-compatible key via SHA-256.
            derived = hashlib.sha256(raw_key.encode()).digest()
            key = base64.urlsafe_b64encode(derived)
        _fernet = Fernet(key)
    return _fernet


def encrypt_value(plaintext):
    """Encrypt a single string value. Returns base64 Fernet ciphertext (str)."""
    if plaintext is None:
        return None
    if not isinstance(plaintext, str):
        plaintext = str(plaintext)
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_value(ciphertext):
    """Decrypt a single value. Returns plaintext; falls back to the raw value
    if decryption fails (legacy plaintext rows left over from previous runs)."""
    if ciphertext is None:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return ciphertext


def encrypt_fields(data, fields=PII_FIELDS):
    """Return a copy of `data` with listed fields encrypted (None preserved)."""
    out = dict(data)
    for f in fields:
        if f in out and out[f] is not None:
            out[f] = encrypt_value(out[f])
    return out


def decrypt_row(row, fields=PII_FIELDS):
    """Return a copy of the DB row with listed fields decrypted."""
    if row is None:
        return None
    out = dict(row)
    for f in fields:
        if f in out and out[f] is not None:
            out[f] = decrypt_value(out[f])
    return out


def decrypt_rows(rows, fields=PII_FIELDS):
    return [decrypt_row(r, fields) for r in (rows or [])]
