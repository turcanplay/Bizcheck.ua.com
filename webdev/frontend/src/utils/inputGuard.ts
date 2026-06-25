/**
 * Client-side input guard for PUBLIC (pre-admin) forms.
 *
 * This is a UX convenience + first line of defense ONLY. The server
 * (utils/validators.py) re-sanitizes everything — never trust this layer.
 * It mirrors the server's intent so the user sees clean values and clear
 * errors before a round-trip.
 *
 *  - strips HTML angle brackets and control chars (stored-XSS hygiene)
 *  - collapses whitespace, trims, caps length
 *  - one-line variant also removes newlines (names, roles, search)
 */

// C0 control chars except tab(\x09)/newline(\x0A)/carriage-return(\x0D).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

/** Remove angle brackets so nothing can look like a tag downstream. */
function stripTags(v: string): string {
  return v.replace(/[<>]/g, '');
}

/** Multi-line text (reviews): keep newlines, drop control chars + tags, cap length. */
export function sanitizeText(value: string, maxLen = 600): string {
  return stripTags(String(value ?? ''))
    .replace(CONTROL_CHARS, '')
    .slice(0, maxLen);
}

/** Single-line text (name, role, search): also kill newlines + collapse runs of spaces. */
export function sanitizeOneLine(value: string, maxLen = 100): string {
  return stripTags(String(value ?? ''))
    .replace(CONTROL_CHARS, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLen);
}

export interface FieldRule {
  min?: number;
  max?: number;
  required?: boolean;
}

/**
 * Validate a (already-sanitized) value against a rule.
 * Returns an error CODE (stable, localizable) or null when valid.
 */
export function validateField(value: string, rule: FieldRule): string | null {
  const len = value.trim().length;
  if (rule.required && len === 0) return 'required';
  if (rule.min != null && len > 0 && len < rule.min) return 'too_short';
  if (rule.max != null && len > rule.max) return 'too_long';
  return null;
}
