/**
 * Single source of truth for public-facing contact details.
 *
 * Everything that renders an email / phone / company website (landing footer,
 * report footer, PDF promo block, privacy page, CTA screens) must import from
 * here instead of hardcoding the value, so a market change is a one-file edit.
 *
 * TODO: confirmă datele de contact pentru piața UA — valorile de mai jos sunt
 * încă cele moldovenești (moștenite din bizcheck.md). Nu au fost schimbate
 * pentru că nu avem încă email / telefon / adresă ucrainene reale.
 */

/** Public support / sales inbox. TODO: confirmă datele de contact pentru piața UA. */
export const CONTACT_EMAIL = 'office@bizcheck.md';

/** Phone in E.164 form — used for the `tel:` href. TODO: confirmă datele de contact pentru piața UA. */
export const CONTACT_PHONE_HREF = '+37379027317';

/** Phone as displayed to the user. TODO: confirmă datele de contact pentru piața UA. */
export const CONTACT_PHONE = '+373 79 027 317';

/** Corporate site of the Crowe member firm behind the platform (real, keep). */
export const COMPANY_WEBSITE = 'https://crowe-tm.md';

/** Same, without the scheme — for link labels. */
export const COMPANY_WEBSITE_LABEL = 'crowe-tm.md';

/** Legal / commercial name of the firm behind the platform. */
export const COMPANY_NAME = 'Crowe Turcan Mikhailenko';

/** Public Telegram account for support. */
export const CONTACT_TELEGRAM = '@CROWE_TM';
export const CONTACT_TELEGRAM_URL = 'https://t.me/CROWE_TM';

/** `mailto:` / `tel:` hrefs, precomputed so callers never rebuild them. */
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;
export const CONTACT_PHONE_TEL = `tel:${CONTACT_PHONE_HREF}`;
