import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTelegramLink } from './useTelegramLink';

/**
 * Regressions this file guards:
 *
 *  1. `tgLoading` only disables the button on the NEXT render, so two clicks in
 *     the same tick used to mint two deep-link tokens (two POST /tg/link) and
 *     race two hand-offs. openTelegram must be single-flight.
 *  2. pdf_ready=false must park the user on `tgPending` — never navigate — or
 *     the bot answers "pdf_pending" and the report looks lost.
 *  3. A failed request must surface `tgError` and clear `tgLoading`.
 */
describe('useTelegramLink', () => {
  const original = globalThis.fetch;

  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = original; });

  /** Resolves only when `release()` is called — lets two calls overlap. */
  function deferredFetch(body: unknown) {
    let release: () => void = () => {};
    const gate = new Promise<void>(res => { release = res; });
    const fetchMock = vi.fn(async () => {
      await gate;
      return { ok: true, status: 200, json: async () => body } as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return { fetchMock, release: () => release() };
  }

  it('fires a single request when openTelegram is invoked twice before it resolves', async () => {
    const { fetchMock, release } = deferredFetch({ url: 'https://t.me/x?start=t', pdf_ready: false });
    const { result } = renderHook(() => useTelegramLink(42, 'tok'));

    await act(async () => {
      void result.current.openTelegram();
      void result.current.openTelegram();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { release(); });
    await waitFor(() => expect(result.current.tgLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sets tgPending and does not navigate when the PDF is not ready', async () => {
    globalThis.fetch = vi.fn(async () => (
      { ok: true, status: 200, json: async () => ({ url: 'https://t.me/x?start=t', pdf_ready: false }) } as Response
    )) as unknown as typeof fetch;

    const { result } = renderHook(() => useTelegramLink(42, 'tok'));
    await act(async () => { await result.current.openTelegram(); });

    expect(result.current.tgPending).toBe(true);
    expect(result.current.tgError).toBe(false);
    expect(result.current.tgLoading).toBe(false);
  });

  it('releases the guard after a failure, so a retry is possible', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) } as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useTelegramLink(42, 'tok'));
    await act(async () => { await result.current.openTelegram(); });
    expect(result.current.tgError).toBe(true);
    expect(result.current.tgLoading).toBe(false);

    await act(async () => { await result.current.openTelegram(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('errors without calling the API when there is no submission', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useTelegramLink(null, 'tok'));
    await act(async () => { await result.current.openTelegram(); });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.tgError).toBe(true);
  });
});
