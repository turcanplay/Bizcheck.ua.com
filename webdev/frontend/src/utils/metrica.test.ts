import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module keeps `started` in module state → re-import it fresh per test.
async function load() {
  vi.resetModules();
  return import('./metrica');
}

// The stub queues raw `arguments` objects → normalise them to arrays.
function calls(): unknown[][] {
  return ((window.ym as unknown as { a?: ArrayLike<unknown>[] }).a ?? []).map((c) => Array.from(c));
}

function tagScripts() {
  return Array.from(document.querySelectorAll('script')).filter((s) =>
    s.src.startsWith('https://mc.yandex.ru/metrika/tag.js'),
  );
}

describe('Yandex Metrica loader', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.ym;
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('loads tag.js once and initialises the counter', async () => {
    window.history.replaceState(null, '', '/uk/');
    const m = await load();
    m.startMetrica();
    m.startMetrica();
    expect(tagScripts()).toHaveLength(1);
    const queue = calls();
    expect(queue[0].slice(0, 2)).toEqual([m.METRICA_ID, 'init']);
    expect(queue[0][2]).toMatchObject({ webvisor: true, clickmap: true, trackLinks: true });
  });

  it('never loads on the admin panel', async () => {
    window.history.replaceState(null, '', '/admin_bizcheck_md_crowe/login');
    const m = await load();
    m.startMetrica();
    expect(tagScripts()).toHaveLength(0);
    expect(window.ym).toBeUndefined();
  });

  it('sends a hit per SPA navigation, skipping repeats and admin URLs', async () => {
    window.history.replaceState(null, '', '/uk/');
    const o = window.location.origin;
    const m = await load();
    m.trackMetricaHit(`${o}/uk/privacy`); // before start → ignored
    m.startMetrica();
    const hits = () => calls().filter((c) => c[1] === 'hit');

    m.trackMetricaHit(`${o}/uk/privacy`);
    m.trackMetricaHit(`${o}/uk/privacy`);
    m.trackMetricaHit(`${o}/admin_bizcheck_md_crowe/`);
    expect(hits()).toHaveLength(1);
    expect(hits()[0][2]).toBe(`${o}/uk/privacy`);
    expect(hits()[0][3]).toEqual({ referer: `${o}/uk/` });
  });
});
