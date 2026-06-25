"""End-to-end smoke test against a running backend. Run inside the backend container."""

import json
import os
import sys
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def call(method, path, body=None):
    url = f'http://localhost:4001{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={'Content-Type': 'application/json'} if body else {},
    )
    try:
        r = urllib.request.urlopen(req, timeout=5)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {}


def main():
    results = []

    # Health
    c, b = call('GET', '/api/health')
    results.append(('health', c == 200 and b.get('status') == 'ok', f'HTTP {c} {b}'))

    # Tests list
    c, b = call('GET', '/api/tests')
    slugs = sorted(t['slug'] for t in b.get('tests', []))
    results.append(('tests list', c == 200 and slugs == ['business', 'gdpr', 'hr'],
                    f'HTTP {c}  slugs={slugs}'))

    # Quiz without ?test param
    c, b = call('GET', '/api/blocks/quiz')
    results.append(('quiz no-param rejected', c == 400, f'HTTP {c} {b}'))

    # Quiz per test
    for slug in ('business', 'gdpr', 'hr'):
        c, b = call('GET', f'/api/blocks/quiz?test={slug}')
        blocks = b.get('blocks', [])
        nq = sum(len(bl.get('questions', [])) for bl in blocks)
        ok = c == 200 and len(blocks) == 1 and nq == 1 and b.get('test', {}).get('slug') == slug
        results.append((f'quiz {slug}', ok, f'HTTP {c} blocks={len(blocks)} questions={nq}'))

    # Quiz bogus slug
    c, b = call('GET', '/api/blocks/quiz?test=nope')
    results.append(('quiz bogus', c == 200 and b.get('blocks') == [] and b.get('test') is None,
                    f'HTTP {c} {b}'))

    # Submission with test_slug
    c, b = call('POST', '/api/submissions', {
        'first_name': 'Ion', 'last_name': 'Popescu',
        'email': 'ion@example.com', 'phone': '+37360000000',
        'consent': True, 'test_slug': 'business', 'language': 'ro',
    })
    sub = b.get('submission', {})
    ok = c == 201 and sub.get('test_id') == 1 and sub.get('first_name') == 'Ion'
    results.append(('POST submission with test_slug', ok,
                    f'HTTP {c} id={sub.get("id")} test_id={sub.get("test_id")} first_name={sub.get("first_name")}'))

    # Fernet round-trip: read raw ciphertext from DB, confirm it isn't plaintext
    from database.db import query
    row = query(
        "SELECT first_name FROM submissions WHERE id = %s",
        (sub.get('id'),), fetch_one=True,
    )
    raw = row['first_name'] if row else None
    encrypted = raw and raw != 'Ion' and raw.startswith('gAAAAA')
    results.append(('PII encrypted at rest', bool(encrypted),
                    f'raw_in_db[:40]={raw[:40] if raw else None!r}'))

    # Submission with bad slug
    c, b = call('POST', '/api/submissions', {
        'first_name': 'X', 'email': 'x@y.z', 'consent': True, 'test_slug': 'doesnotexist',
    })
    results.append(('POST submission bad slug rejected', c == 400, f'HTTP {c} {b}'))

    # Summary
    print()
    passed = 0
    for name, ok, detail in results:
        mark = 'PASS' if ok else 'FAIL'
        print(f'[{mark}] {name}  —  {detail}')
        if ok:
            passed += 1
    print()
    print(f'Result: {passed}/{len(results)} passed.')


if __name__ == '__main__':
    main()
