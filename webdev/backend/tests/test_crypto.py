"""Unit tests for utils.crypto — Fernet field encryption of PII at rest.

PII_ENCRYPTION_KEY is set to a passphrase in conftest, exercising the SHA-256
key-derivation branch (passphrase → 32-byte urlsafe-b64 Fernet key).
"""
from utils import crypto


class TestRoundTrip:
    def test_encrypt_then_decrypt_is_identity(self):
        ct = crypto.encrypt_value("Ion Popescu")
        assert ct != "Ion Popescu"           # actually encrypted
        assert crypto.decrypt_value(ct) == "Ion Popescu"

    def test_ciphertext_is_nondeterministic(self):
        # Fernet embeds a random IV → two encryptions of the same value differ.
        assert crypto.encrypt_value("x") != crypto.encrypt_value("x")

    def test_unicode_survives_roundtrip(self):
        s = "Ștefan Țincă · Кириллица"
        assert crypto.decrypt_value(crypto.encrypt_value(s)) == s

    def test_non_string_is_coerced(self):
        ct = crypto.encrypt_value(12345)
        assert crypto.decrypt_value(ct) == "12345"


class TestNoneHandling:
    def test_encrypt_none_returns_none(self):
        assert crypto.encrypt_value(None) is None

    def test_decrypt_none_returns_none(self):
        assert crypto.decrypt_value(None) is None


class TestLegacyPlaintextFallback:
    def test_decrypt_of_plaintext_returns_it_unchanged(self):
        # Legacy rows written before encryption existed: decrypt must not raise,
        # it returns the raw value so old data is still readable.
        assert crypto.decrypt_value("not-a-fernet-token") == "not-a-fernet-token"


class TestFieldHelpers:
    def test_encrypt_fields_only_touches_pii(self):
        row = {"first_name": "Ana", "email": "a@b.md", "sector": "IT", "phone": None}
        enc = crypto.encrypt_fields(row)
        assert enc["first_name"] != "Ana"
        assert enc["email"] != "a@b.md"
        assert enc["sector"] == "IT"          # non-PII untouched
        assert enc["phone"] is None            # None preserved
        # original dict not mutated
        assert row["first_name"] == "Ana"

    def test_decrypt_row_roundtrips_pii(self):
        row = {"first_name": "Ana", "last_name": "P", "email": "a@b.md", "phone": "+373"}
        dec = crypto.decrypt_row(crypto.encrypt_fields(row))
        assert dec == row

    def test_decrypt_row_none_returns_none(self):
        assert crypto.decrypt_row(None) is None

    def test_decrypt_rows_handles_empty_and_none(self):
        assert crypto.decrypt_rows(None) == []
        assert crypto.decrypt_rows([]) == []

    def test_decrypt_rows_maps_each(self):
        rows = [crypto.encrypt_fields({"email": "a@b.md"}),
                crypto.encrypt_fields({"email": "c@d.md"})]
        out = crypto.decrypt_rows(rows)
        assert [r["email"] for r in out] == ["a@b.md", "c@d.md"]
