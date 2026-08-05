import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AdminFaqItem } from '@/api/admin';

/**
 * End-to-end (component level) proof for the admin delete flow, on a
 * representative list page.
 *
 * The bug: every admin list ran `await adminApi.deleteX(id); await load();`
 * with no try/catch. On a 403 — the common case, an expired admin session —
 * the promise rejected unhandled, `load()` never ran, the row stayed on screen
 * and the admin believed the record was deleted. Silent data-loss-in-reverse.
 *
 * Written against AdminFaq because it is the plainest of the nine call sites;
 * they all now go through the same `confirmDelete` helper.
 */

const listFaqMock = vi.fn();
const deleteFaqMock = vi.fn();

vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin');
  return {
    ...actual, // keeps the real saveErrorMessage used by confirmDelete
    adminApi: {
      listFaq: () => listFaqMock(),
      deleteFaq: (id: number) => deleteFaqMock(id),
      createFaq: vi.fn(),
      updateFaq: vi.fn(),
    },
  };
});

const { default: AdminFaq } = await import('@/pages/admin/AdminFaq');

const ITEM: AdminFaqItem = {
  id: 7,
  question_uk: 'Чи це безкоштовно?',
  question_en: 'Is it free?',
  answer_uk: 'Так.',
  answer_en: 'Yes.',
  order_index: 0,
  is_active: true,
};

let confirmSpy: ReturnType<typeof vi.spyOn>;
let alertSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  listFaqMock.mockReset().mockResolvedValue({ faq: [ITEM] });
  deleteFaqMock.mockReset();
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderList() {
  render(<AdminFaq />);
  await screen.findByText('Чи це безкоштовно?');
  expect(listFaqMock).toHaveBeenCalledTimes(1); // initial load
}

function deleteButton() {
  return screen.getByRole('button', { name: '🗑' });
}

describe('admin delete flow — failure', () => {
  it('a 403 is shown to the admin and the list is NOT silently reloaded', async () => {
    await renderList();
    deleteFaqMock.mockRejectedValue(new Error('403: Доступ заборонено'));

    await userEvent.click(deleteButton());

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(String(alertSpy.mock.calls[0][0])).toContain('403');
    // Still exactly the initial load: no reload was attempted, so the row on
    // screen is honestly still there rather than looking freshly confirmed.
    expect(listFaqMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Чи це безкоштовно?')).toBeInTheDocument();
  });

  it('a 500 does not take the page down', async () => {
    await renderList();
    deleteFaqMock.mockRejectedValue(new Error('500: Internal Server Error'));

    await userEvent.click(deleteButton());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /Часті запитання/ })).toBeInTheDocument();
  });
});

describe('admin delete flow — success and cancel', () => {
  it('reloads the list exactly once after a successful delete', async () => {
    await renderList();
    deleteFaqMock.mockResolvedValue({ message: 'ok' });
    listFaqMock.mockResolvedValue({ faq: [] });

    await userEvent.click(deleteButton());

    await waitFor(() => expect(listFaqMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Ще немає запитань.')).toBeInTheDocument());
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('cancelling deletes nothing and reloads nothing', async () => {
    await renderList();
    confirmSpy.mockReturnValue(false);

    await userEvent.click(deleteButton());

    expect(deleteFaqMock).not.toHaveBeenCalled();
    expect(listFaqMock).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
