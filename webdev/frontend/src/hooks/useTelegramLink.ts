import { useCallback, useState } from 'react';
import { API_BASE } from '@/config/api';

/**
 * Mints a Telegram deep-link for a submission and hands the user off to the bot.
 *
 * Backend contract (routes/telegram.py): POST /tg/link/<id> returns
 * { token, url, pdf_ready } on 200. The URL must always come from the
 * response — there is deliberately no hardcoded bot username fallback,
 * because a link without a fresh token cannot identify the user.
 *
 * The handoff assigns `window.location.href` and must keep doing so — opening a
 * popup here is a bug. It happens after an `await`, by which point the click's
 * user activation is spent, so Safari/Firefox block a popup opened from there,
 * silently: a blocked window is indistinguishable from success unless the
 * return value is checked. Navigating the tab is not subject to popup blocking,
 * and t.me hands off to the Telegram app just the same.
 *
 * Shared by CtaPage (the live delivery flow) and the report CallToAction so the
 * two cannot drift apart again.
 */
export function useTelegramLink(submissionId: number | null, submissionToken?: string | null) {
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState(false);
  const [tgPending, setTgPending] = useState(false);

  const openTelegram = useCallback(async () => {
    // Without a submission there is no deep-link token, so the bot could not
    // identify the user anyway — surface the error instead of opening it blind.
    if (!submissionId) {
      setTgError(true);
      return;
    }

    setTgLoading(true);
    setTgError(false);
    setTgPending(false);

    try {
      const res = await fetch(`${API_BASE}/tg/link/${submissionId}`, {
        method: 'POST',
        headers: submissionToken ? { 'X-Submission-Token': submissionToken } : {},
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      if (!data.url) throw new Error('failed');
      // pdf_ready=false → the PDF is not persisted yet; the bot would only
      // answer "pdf_pending". Hold the user here instead.
      if (!data.pdf_ready) {
        setTgPending(true);
        return;
      }
      window.location.href = data.url;
    } catch {
      setTgError(true);
    } finally {
      setTgLoading(false);
    }
  }, [submissionId, submissionToken]);

  /** Clear any error/pending notice — e.g. when the user switches delivery method. */
  const resetTelegram = useCallback(() => {
    setTgError(false);
    setTgPending(false);
  }, []);

  return { tgLoading, tgError, tgPending, openTelegram, resetTelegram };
}
