/**
 * Durable submission-save outbox.
 *
 * Guarantees a submission's latest data reaches the backend even across flaky
 * networks, brief backend downtime (e.g. a redeploy), and tab closes.
 *
 * Why a single latest-snapshot per submission is enough: every answer PATCH
 * carries the FULL answers snapshot and the backend is last-write-wins
 * (models/submission.py Submission.update overwrites wholesale). So we only
 * persist the LATEST pending payload per submission id and replay it until the
 * server acks with a 2xx. Partial writes (e.g. contact-only) are MERGED into
 * the pending entry so nothing queued is lost.
 *
 * Concurrency: enqueueSave, a background flush, and the CTA gate's
 * flushAndConfirm can all run at once. Each entry carries a monotonic `seq`
 * bumped on every enqueue. A send captures the seq it dispatched; after the
 * (awaited) request we RE-READ the outbox and only delete/mutate the key if its
 * seq is unchanged — so a newer snapshot merged in mid-flight is never clobbered
 * (the classic lost-update). We never write back a pre-await whole-outbox copy.
 *
 * Pending writes live in localStorage (NOT sessionStorage) so they survive a
 * tab close / browser restart — the next page load flushes them. On page hide
 * we also fire a keepalive PATCH so an in-flight answer isn't lost on close.
 *
 * Silent by design: no UI. Callers fire-and-forget via enqueueSave().
 */
import { API_BASE } from '@/config/api';

const OUTBOX_KEY = 'bizcheck_save_outbox_v1';
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_BACKOFF_EXP = 5; // 2s → 4s → 8s → 16s → 30s(cap)
const REQUEST_TIMEOUT_MS = 15_000;

interface OutboxEntry {
  token: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  seq: number; // bumped on every enqueue; guards against lost updates
}
type Outbox = Record<string, OutboxEntry>;
type SendResult = 'ok' | 'retry' | 'drop';

function readOutbox(): Outbox {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as Outbox) : {};
  } catch {
    return {};
  }
}

function writeOutbox(box: Outbox): void {
  try {
    if (Object.keys(box).length === 0) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(box));
  } catch {
    // localStorage unavailable/full (private mode, quota) — nothing else to do.
  }
}

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
// Per-key single-flight via promise COALESCING: concurrent deliverKey calls for
// the same submission share ONE in-flight request and all receive its real
// result (rather than a competing send, or a bail-out 'retry' that would make a
// caller like flushAndConfirm report a false failure). This keeps deliveries
// race-free (only one send per key at a time, so the seq counter need not be
// globally monotonic) AND lets a caller await the true outcome.
const inFlight = new Map<string, Promise<SendResult>>();
// Keys whose last delivery was a permanent drop (400/422). The gate must never
// report these as saved just because the outbox is now empty.
const droppedKeys = new Set<string>();

/**
 * Queue a PATCH for durable delivery. Merges into any pending entry for the
 * same submission (so a contact-only write and an answers write both survive)
 * and bumps the entry's seq so an in-flight send won't delete this fresh data.
 */
export function enqueueSave(
  subId: number,
  token: string | null,
  payload: Record<string, unknown>,
): void {
  if (!subId) return;
  const box = readOutbox();
  const key = String(subId);
  const prev = box[key];
  box[key] = {
    token: token ?? prev?.token ?? null,
    payload: { ...(prev?.payload ?? {}), ...payload },
    attempts: 0,
    seq: (prev?.seq ?? 0) + 1,
  };
  droppedKeys.delete(key); // fresh data supersedes any prior permanent-drop verdict
  writeOutbox(box);
  void flushOutbox();
}

async function sendPatch(key: string, entry: OutboxEntry): Promise<SendResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (entry.token) headers['X-Submission-Token'] = entry.token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/submissions/${key}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(entry.payload),
      signal: controller.signal,
    });
    if (res.ok) return 'ok';
    // Only a genuinely malformed request is unrecoverable. Everything else —
    // 5xx, 429, 408/425 timeouts, and 401/403/404 during a redeploy / token
    // propagation window — is transient and MUST be retried, never dropped.
    if (res.status === 400 || res.status === 422) return 'drop';
    return 'retry';
  } catch {
    return 'retry'; // network error / offline / timeout(abort)
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deliver one submission's pending entry with a single request. Re-reads the
 * outbox after the await and only removes/mutates the key if its seq is
 * unchanged, so concurrent enqueues are never clobbered.
 */
function deliverKey(key: string): Promise<SendResult> {
  const existing = inFlight.get(key);
  if (existing) return existing; // coalesce onto the in-flight delivery
  const entry = readOutbox()[key];
  if (!entry) return Promise.resolve('ok'); // already delivered
  const sentSeq = entry.seq;
  const p = (async (): Promise<SendResult> => {
    const result = await sendPatch(key, entry);

    const after = readOutbox();
    const cur = after[key];
    if (!cur) return result; // removed meanwhile

    if (cur.seq !== sentSeq) {
      // Fresh data merged in during the send — leave it for the next flush.
      return 'retry';
    }
    if (result === 'ok' || result === 'drop') {
      delete after[key];
      writeOutbox(after);
      if (result === 'drop') droppedKeys.add(key);
      else droppedKeys.delete(key);
    } else {
      cur.attempts += 1;
      writeOutbox(after);
    }
    return result;
  })();
  inFlight.set(key, p);
  return p.finally(() => { inFlight.delete(key); });
}

/** True if this submission still has data waiting to be delivered. */
export function isPending(subId: number): boolean {
  return Boolean(readOutbox()[String(subId)]);
}

/** True if this submission's data was permanently dropped (400/422) — i.e. it is
 *  NOT saved and won't be retried. The save-gate must treat this as a failure
 *  even though the outbox is empty, so recovery is offered. */
export function wasDropped(subId: number): boolean {
  return droppedKeys.has(String(subId));
}

/**
 * Force one delivery attempt for a single submission and report whether its
 * data is now confirmed saved (2xx AND nothing left pending for it). Used by the
 * CTA save-gate, which paces a couple of retries. If it can't confirm, a
 * background retry is scheduled so delivery keeps going after the gate gives up.
 */
export async function flushAndConfirm(subId: number): Promise<boolean> {
  const key = String(subId);
  if (droppedKeys.has(key)) return false; // permanently failed — never claim it saved
  if (!readOutbox()[key]) return true; // already delivered
  const result = await deliverKey(key);
  if (result === 'ok' && !readOutbox()[key]) return true;
  scheduleRetry();
  return false;
}

/** Attempt to deliver every pending entry. Safe to call repeatedly. */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (const key of Object.keys(readOutbox())) {
      await deliverKey(key);
    }
  } finally {
    flushing = false;
  }
  if (Object.keys(readOutbox()).length > 0) scheduleRetry();
}

function scheduleRetry(): void {
  if (retryTimer) return;
  const box = readOutbox();
  if (Object.keys(box).length === 0) return;
  const maxAttempts = Math.max(0, ...Object.values(box).map(e => e.attempts));
  const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.min(maxAttempts, MAX_BACKOFF_EXP));
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

/**
 * Last-ditch delivery when the page is being hidden/closed. Fires every pending
 * entry with keepalive:true so the browser completes the request even after the
 * tab is gone. We do NOT clear the outbox here (delivery is unconfirmable) — the
 * next load re-flushes; a duplicate PATCH is harmless (idempotent last-write).
 */
export function flushOutboxOnHide(): void {
  const box = readOutbox();
  for (const key of Object.keys(box)) {
    const entry = box[key];
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (entry.token) headers['X-Submission-Token'] = entry.token;
    try {
      void fetch(`${API_BASE}/submissions/${key}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(entry.payload),
        keepalive: true,
      });
    } catch {
      // ignore — page is unloading
    }
  }
}

// Register global delivery triggers once, at module load (client-only SPA).
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushOutbox());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOutboxOnHide();
  });
  window.addEventListener('pagehide', () => flushOutboxOnHide());
  // Deliver anything left over from a previous tab/session/browser run.
  void flushOutbox();
}
