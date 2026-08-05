import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { confirmDelete } from '@/utils/confirmDelete';

/**
 * The admin delete flow. The bug this guards: a rejected delete (403 on an
 * expired session, 409, 500) left the promise unhandled, the reload never ran,
 * and the row stayed on screen looking exactly like a success.
 */

let confirmSpy: ReturnType<typeof vi.spyOn>;
let alertSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('confirmDelete — cancelled', () => {
  it('does nothing at all when the admin cancels', async () => {
    confirmSpy.mockReturnValue(false);
    const remove = vi.fn().mockResolvedValue(undefined);
    const reload = vi.fn();

    await expect(confirmDelete({ message: 'Видалити?', remove, reload })).resolves.toBe(false);

    expect(remove).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('asks with the message it was given', async () => {
    await confirmDelete({
      message: 'Видалити запитання "X"?',
      remove: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn(),
    });
    expect(confirmSpy).toHaveBeenCalledWith('Видалити запитання "X"?');
  });
});

describe('confirmDelete — success', () => {
  it('deletes, then reloads exactly once', async () => {
    const order: string[] = [];
    const remove = vi.fn(async () => { order.push('remove'); });
    const reload = vi.fn(async () => { order.push('reload'); });

    await expect(confirmDelete({ message: 'ok?', remove, reload })).resolves.toBe(true);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['remove', 'reload']); // reload only AFTER the server acked
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('awaits an async reload before resolving', async () => {
    let done = false;
    await confirmDelete({
      message: 'ok?',
      remove: vi.fn().mockResolvedValue(undefined),
      reload: () => new Promise<void>(res => { setTimeout(() => { done = true; res(); }, 0); }),
    });
    expect(done).toBe(true);
  });
});

describe('confirmDelete — failure', () => {
  it('a 403 is surfaced to the admin and the list is NOT reloaded', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('403: Forbidden'));
    const reload = vi.fn();

    await expect(confirmDelete({ message: 'ok?', remove, reload })).resolves.toBe(false);

    expect(reload).not.toHaveBeenCalled(); // a repaint of the same row reads as success
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(String(alertSpy.mock.calls[0][0])).toContain('403');
  });

  it('never rejects — the caller cannot produce an unhandled rejection', async () => {
    await expect(
      confirmDelete({
        message: 'ok?',
        remove: () => Promise.reject(new Error('boom')),
        reload: vi.fn(),
      }),
    ).resolves.toBe(false);
  });

  it('falls back to a Ukrainian message for a non-Error rejection', async () => {
    await confirmDelete({
      message: 'ok?',
      remove: () => Promise.reject('nope'),
      reload: vi.fn(),
    });
    expect(alertSpy).toHaveBeenCalledWith('Не вдалося видалити');
  });

  it('routes the error to onError instead of alert when one is given', async () => {
    const onError = vi.fn();
    await confirmDelete({
      message: 'ok?',
      remove: () => Promise.reject(new Error('500: Server error')),
      reload: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith('500: Server error');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
