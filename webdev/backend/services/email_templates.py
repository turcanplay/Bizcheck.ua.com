"""
Email templates for BizCheck report delivery.

Bilingual HTML (UK/EN) with inline styles for maximum client compatibility
(Outlook, Gmail, Apple Mail, mobile). Design goal: light & airy — lots of
whitespace, ONE vivid accent (the score ring) and ONE primary action button.
No dense cards, no bullet lists, no button clutter.
"""
from html import escape
from urllib.parse import quote

# Brand palette — vivid where it matters, light everywhere else.
NAVY = "#082E5E"
GOLD = "#FDA100"
GOLD_DARK = "#C48A00"
INK = "#16203A"
MUTED = "#6B7280"
HAIR = "#ECEEF3"        # hairline divider
BG_PAGE = "#F4F6FB"     # soft page background


def _zone_color(score: int) -> str:
    if score >= 80: return "#16A34A"   # green
    if score >= 70: return "#EAB308"   # yellow
    if score >= 65: return "#F97316"   # orange
    return "#DC2626"                   # red


def _zone_tint(score: int) -> str:
    if score >= 80: return "#E9F8EF"
    if score >= 70: return "#FCF6DD"
    if score >= 65: return "#FDEFE2"
    return "#FCE9E9"


def _zone_label(score: int, lang: str) -> str:
    uk = ["Низький ризик", "Помірний ризик", "Підвищений ризик", "Критичний ризик"]
    en = ["Low risk", "Moderate risk", "Elevated risk", "Critical risk"]
    labels = uk if lang == "uk" else en
    if score >= 80: return labels[0]
    if score >= 70: return labels[1]
    if score >= 65: return labels[2]
    return labels[3]


def render(
    *,
    lang: str,
    first_name: str,
    test_name: str,
    date_str: str,
    score: int,
    logo_url: str,
    download_url: str | None = None,
    reply_to: str = "office@bizcheck.md",
    site_url: str = "https://crowe-tm.md",
    privacy_url: str = "https://bizcheck.md/confidentialitate",
    telegram_url: str = "https://t.me/CROWE_TM",
    telegram_handle: str = "@CROWE_TM",
    bizcheck_url: str = "https://bizcheck.md",
) -> tuple[str, str, str]:
    """Return (subject, html_body, text_body) for the given language.

    The text_body mirrors the HTML so the multipart/alternative has a real
    plain-text part (a thin text part next to rich HTML is a spam signal)."""
    lang = (lang or "uk").lower()
    if lang not in ("uk", "en"):
        lang = "uk"

    zone_col = _zone_color(score)
    zone_tint = _zone_tint(score)
    zone_lbl = _zone_label(score, lang)
    first = escape(first_name.strip()) if first_name else ("Клієнт" if lang == "uk" else "Client")
    test_clean = escape(test_name or ("Звіт Bizcheck.md" if lang == "uk" else "Bizcheck.md Report"))
    date_clean = escape(date_str or "")

    if lang == "uk":
        subject = f"Ваш звіт Bizcheck.md готовий · {test_clean}"
        eyebrow = "BIZCHECK.MD"
        title_line = "Ваш звіт готовий"
        greeting = f"Вітаємо, {first},"
        intro = ("Діагностику завершено. Натисніть кнопку нижче, щоб відкрити "
                 "повний звіт.")
        score_caption = "БАЛ"
        btn_open = "Відкрити звіт PDF" if download_url else None
        contact_intro = "Є запитання? Напишіть нам:"
        privacy_text = "Політика конфіденційності"
        no_link_note = "Звіт буде доступний найближчим часом."
        btn_contact = "Напишіть нам"
        contact_subject = "Запитання щодо звіту BizCheck"
    else:
        subject = f"Your Bizcheck.md report is ready · {test_clean}"
        eyebrow = "BIZCHECK.MD"
        title_line = "Your report is ready"
        greeting = f"Hello {first},"
        intro = ("The diagnostic is complete. Click the button below to open "
                 "your full report.")
        score_caption = "SCORE"
        btn_open = "Open PDF report" if download_url else None
        contact_intro = "Have questions? Write to us:"
        privacy_text = "Privacy Policy"
        no_link_note = "Your report will be available shortly."
        btn_contact = "Write to us"
        contact_subject = "Question about the BizCheck report"

    # Single primary action — the only vivid button.
    if btn_open:
        # Bulletproof button: VML round-rect for Outlook (keeps the pill shape),
        # a normal styled <a> for every other client. Outlook ignores border-radius,
        # so without the VML it would render as a square box.
        button_block = (
            '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:4px auto 0;"><tr><td align="center">'
            f'<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{download_url}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="{GOLD}"><w:anchorlock/><center style="color:{NAVY};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">{escape(btn_open)}</center></v:roundrect><![endif]-->'
            '<!--[if !mso]><!-->'
            f'<a href="{download_url}" target="_blank" style="display:inline-block;background:{GOLD};padding:15px 40px;font-size:15px;font-weight:800;'
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            f'color:{NAVY};text-decoration:none;border-radius:999px;letter-spacing:0.02em;">{escape(btn_open)}</a>'
            '<!--<![endif]-->'
            '</td></tr></table>'
        )
    else:
        button_block = (
            f'<p style="text-align:center;font-size:14px;color:{MUTED};margin:4px 0 0;">{no_link_note}</p>'
        )

    # Secondary action — reply to us. Outline pill (white bg, navy border) so it
    # stays visually below the single vivid primary button.
    contact_mailto = f"mailto:{reply_to}?subject={quote(contact_subject)}"
    contact_button = (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:14px auto 0;"><tr><td align="center">'
        f'<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{contact_mailto}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="50%" strokecolor="{NAVY}" strokeweight="1.5pt" fillcolor="#ffffff"><w:anchorlock/><center style="color:{NAVY};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">{escape(btn_contact)}</center></v:roundrect><![endif]-->'
        '<!--[if !mso]><!-->'
        f'<a href="{contact_mailto}" target="_blank" style="display:inline-block;background:#ffffff;border:2px solid {NAVY};padding:12px 34px;font-size:14px;font-weight:700;'
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
        f'color:{NAVY};text-decoration:none;border-radius:999px;letter-spacing:0.02em;">&#9993;&nbsp;&nbsp;{escape(btn_contact)}</a>'
        '<!--<![endif]-->'
        '</td></tr></table>'
    )

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{subject}</title>
<!--[if mso]>
<style>
  table, td {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
  img {{ -ms-interpolation-mode: bicubic; }}
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:{BG_PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:{INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BG_PAGE};padding:40px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 36px -18px rgba(8,46,94,0.22);">

          <!-- slim gold accent bar -->
          <tr><td style="height:5px;background:{GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- content -->
          <tr>
            <td style="padding:40px 44px 36px;text-align:center;">

              <img src="{logo_url}" alt="Crowe" width="172" height="auto" style="display:block;margin:0 auto 26px;max-width:200px;width:172px;height:auto;border:0;outline:none;text-decoration:none;">

              <div style="color:{GOLD_DARK};font-size:11px;font-weight:800;letter-spacing:3px;margin-bottom:10px;">{eyebrow}</div>
              <h1 style="color:{NAVY};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:25px;font-weight:700;line-height:1.3;margin:0 0 28px;">{title_line}</h1>

              <p style="font-size:16px;font-weight:600;color:{INK};margin:0 0 6px;text-align:left;">{greeting}</p>
              <p style="font-size:14.5px;line-height:1.65;color:{MUTED};margin:0 0 30px;text-align:left;">{intro}</p>

              <!-- vivid score ring (the single accent) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px;">
                <tr>
                  <td align="center" valign="middle" width="128" height="128"
                      style="width:128px;height:128px;background:{zone_tint};border:5px solid {zone_col};border-radius:64px;text-align:center;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:700;color:{zone_col};line-height:1;">{score}<span style="font-size:20px;">%</span></div>
                    <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;color:{MUTED};margin-top:3px;">{score_caption}</div>
                  </td>
                </tr>
              </table>
              <div style="display:inline-block;padding:5px 16px;background:{zone_tint};border-radius:999px;font-size:12.5px;font-weight:700;color:{zone_col};margin-bottom:8px;">{zone_lbl}</div>

              <!-- test · date, light single line -->
              <p style="font-size:13px;color:{MUTED};margin:6px 0 28px;">{test_clean} &nbsp;·&nbsp; {date_clean}</p>

              <!-- single primary button -->
              {button_block}

              <!-- secondary: write us back -->
              {contact_button}

            </td>
          </tr>

          <!-- light footer -->
          <tr>
            <td style="padding:22px 44px 30px;border-top:1px solid {HAIR};text-align:center;">
              <p style="font-size:12.5px;color:{MUTED};margin:0 0 8px;">{contact_intro}</p>
              <p style="font-size:13.5px;margin:0 0 14px;">
                <a href="mailto:{reply_to}" style="color:{NAVY};text-decoration:none;font-weight:700;">{reply_to}</a>
                &nbsp;·&nbsp;
                <a href="{telegram_url}" style="color:{NAVY};text-decoration:none;font-weight:700;">Telegram {telegram_handle}</a>
              </p>
              <p style="font-size:11px;color:#9AA1B0;margin:0;">
                <a href="{bizcheck_url}" style="color:#9AA1B0;text-decoration:none;">{bizcheck_url.replace('https://','').replace('http://','')}</a>
                &nbsp;·&nbsp;
                <a href="{privacy_url}" style="color:#9AA1B0;text-decoration:underline;">{privacy_text}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    # ── Plain-text alternative (mirrors the HTML; raw, unescaped values) ──
    first_plain = (first_name.strip() if first_name else ("Клієнт" if lang == "uk" else "Client"))
    test_plain = test_name or ("Звіт Bizcheck.md" if lang == "uk" else "Bizcheck.md Report")
    date_plain = date_str or ""

    text_lines = [
        title_line,
        "",
        greeting,
        intro,
        "",
        f"{score_caption}: {score}% — {zone_lbl}",
        f"{test_plain} · {date_plain}".strip(" ·"),
    ]
    if btn_open and download_url:
        text_lines += ["", f"{btn_open}: {download_url}"]
    else:
        text_lines += ["", no_link_note]
    text_lines += [
        "",
        contact_intro,
        f"{reply_to} · Telegram {telegram_handle}",
        bizcheck_url.replace("https://", "").replace("http://", ""),
    ]
    text = "\n".join(text_lines) + "\n"

    return subject, html, text
