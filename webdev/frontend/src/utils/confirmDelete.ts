import { saveErrorMessage } from '@/api/admin';

/**
 * The one delete flow for the admin panel: confirm → delete → reload.
 *
 * Every admin list used to inline `if (!confirm(...)) return; await
 * adminApi.deleteX(id); await load();`. With no try/catch, a 403 (expired
 * session / CSRF mismatch), 409 or 500 rejected the promise unhandled: `load()`
 * never ran, the row stayed on screen, and the admin walked away believing the
 * record was gone. This wraps the whole flow so a failure is *seen* and the list
 * is deliberately NOT reloaded (reloading would repaint the same row and read as
 * success).
 *
 * The panel is Ukrainian-only — messages are not translated.
 */
export interface ConfirmDeleteOptions {
  /** Text for the confirm() dialog. Cancelling aborts without side effects. */
  message: string;
  /** The actual delete call, e.g. `() => adminApi.deleteFaq(id)`. */
  remove: () => Promise<unknown>;
  /** Re-fetch the list. Only runs when `remove` resolved. */
  reload: () => void | Promise<void>;
  /**
   * Show the failure. Defaults to `alert` — unconditionally visible, matching
   * the mass-delete flow in AdminSubmissions. Pass a setter to route it into a
   * page's own error banner instead.
   */
  onError?: (message: string) => void;
}

/**
 * Returns true only when the delete actually succeeded (so callers can chain
 * extra work); false on cancel and on failure.
 */
export async function confirmDelete({
  message,
  remove,
  reload,
  onError,
}: ConfirmDeleteOptions): Promise<boolean> {
  if (!confirm(message)) return false;
  try {
    await remove();
  } catch (e) {
    const text = saveErrorMessage(e, 'Не вдалося видалити');
    if (onError) onError(text);
    else alert(text);
    return false; // no reload — the row is still there, and truthfully so
  }
  await reload();
  return true;
}
