import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError, type AdminTest } from '@/api/admin';
import AdminBlockModal from '@/pages/admin/AdminBlockModal';
import AdminTestModal from '@/pages/admin/AdminTestModal';

/**
 * The admin authored-content validators now REJECT an over-long value
 * (400 {"code":"field_too_long","field","limit","length","submitted_length"})
 * instead of truncating it silently. Every save modal must therefore say WHICH
 * field and WHAT the limit is — "Save failed" would leave the admin staring at
 * a form with no clue which of a dozen inputs the server refused.
 */

function tooLong(field: string, limit: number, length: number) {
  return new ApiError(
    `Field '${field}' is too long: ${length} characters after sanitization, the maximum is ${limit}.`,
    400,
    { code: 'field_too_long', field, limit, length, submitted_length: length },
  );
}

afterEach(cleanup);

describe('field_too_long in the save modals', () => {
  it('AdminBlockModal names the field and the limit', async () => {
    const onSave = vi.fn().mockRejectedValue(tooLong('title_uk', 255, 405));
    render(<AdminBlockModal initial={null} testId={1} onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/Відповідність HR/), { target: { value: 'Блок' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    const err = await screen.findByText(/Поле «Назва \(UA\)» задовге/);
    expect(err).toHaveTextContent('405');
    expect(err).toHaveTextContent('255');
    expect(err).toHaveTextContent('150');            // how much to cut
    expect(err.textContent).not.toMatch(/Save failed/);
  });

  it('AdminTestModal points at the description, not at a generic failure', async () => {
    const onSave = vi.fn().mockRejectedValue(tooLong('description_uk', 2000, 2480));
    render(<AdminTestModal initial={null} onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/Аудит HR GDPR/), { target: { value: 'Тест' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText(/Поле «Опис \(UA\)» задовге/)).toHaveTextContent('2000');
  });

  it('leaves every other failure message untouched', async () => {
    const onSave = vi.fn().mockRejectedValue(new ApiError('Slug вже використовується', 409));
    render(<AdminTestModal initial={{ id: 3, name_uk: 'Тест' } as AdminTest} onClose={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText(/Slug вже використовується/)).toBeInTheDocument();
  });

  it('re-enables the form after the rejection so the value can be shortened', async () => {
    const onSave = vi.fn().mockRejectedValue(tooLong('title_en', 255, 300));
    render(<AdminBlockModal initial={null} testId={1} onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/HR Compliance/), { target: { value: 'Block' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    await screen.findByText(/Поле «Назва \(EN\)» задовге/);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Зберегти' })).not.toBeDisabled());
  });
});
