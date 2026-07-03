# Frontend — Design System (Crowe brand)

The UI follows the **Crowe Global Brand Standards**. All color and type decisions flow from one
token file — `src/styles/variables.css` — imported once via `src/index.css`. Change a brand value
there and it cascades; do **not** reintroduce hardcoded off-brand hex or web fonts.

## Palette

**Primary — always the most prominent:**

| Token | Hex | Use |
|---|---|---|
| `--crowe-indigo` / `--ink` / `--navy-deep` | `#011E41` | Ground, headings, body text |
| `--crowe-amber` / `--gold` | `#F5A800` | **All action buttons**, primary accent |

**Accents — kept under ~20% coverage (variety, never dominant):**

| Token | Hex | Typical use |
|---|---|---|
| `--accent-teal` | `#05AB8C` | Success / positive |
| `--accent-sky` | `#54C0E8` | — |
| `--accent-blue` | `#0075C9` | Links, info, focus rings |
| `--accent-purple` | `#B14FC5` | Rare accent chips only |
| `--accent-pink` | `#E5376B` | — |

Indigo and amber scales (`--indigo-50…950`, `--amber-dark/-light/-pale`) plus indigo-tinted shadows
and three brand gradients (`--grad-brand` indigo→amber, `--grad-indigo`, `--grad-amber`) are defined
alongside. Legacy aliases (`--navy*`, `--gold*`) are retained and re-anchored to Crowe values so older
`var(--navy)` references stay correct.

## Buttons

Every **primary action button** is Crowe Amber (`#F5A800`) with **Indigo text** (`#011E41`) for contrast —
hero CTA, quiz *Next*, Start form, catalog CTA, final CTA, review submit, about CTA, report CTA.
Exceptions by design: **Telegram** buttons keep Telegram blue (platform affordance); **destructive/danger**
admin actions and validation **errors** stay red (`--red #D64535`).

## Typography

- Font stack: **`'Helvetica Neue', Helvetica, Arial, sans-serif`** — the Crowe standard (Helvetica primary,
  Arial secondary), served from the **system** stack. No web fonts: Inter + DM Serif Display and the Google
  Fonts `<link>`s were removed from `index.html`, and `fonts.googleapis`/`fonts.gstatic` were dropped from the
  nginx CSP. `--font-sans` and `--font-serif` both map to this stack (use weight for display).
- Rules: **sentence case** for copy; all-caps only for short labels/buttons/eyebrows; **left-aligned**
  (no `text-align: justify`).

## Report score bands

`utils/scoring.ts` → `getZoneColor()` and the report zone emojis:

| Band | Color | Emoji |
|---|---|---|
| Safe (≥80) | Teal `#05AB8C` | 🟢 |
| Developing (70–79) | Amber `#F5A800` | 🟡 |
| Warning (65–69) | Burnt amber `#E07B00` | 🟠 |
| Risk (<65) | Red `#D64535` | 🔴 |

## Migration note

The pre-Crowe UI was internally inconsistent — the landing sections hardcoded an off-brand
electric-blue (`#2D4BFF`) + purple (`#7C5BFF`) scheme with red CTAs, while `variables.css` declared a
different navy/gold set. ~700 hardcoded values across ~40 files were unified onto the Crowe palette,
the decorative blue→purple gradients were retired in favor of indigo→blue (the brand references are pure
indigo + amber), and buttons were standardized to amber. See the theme values in `variables.css`.
