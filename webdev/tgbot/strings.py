"""
Bilingual bot copy (uk / en) and the translation helper.

All user-facing text lives here. `_t(lang, key, **kwargs)` returns the string
for the requested language, falling back to Ukrainian.
"""

_STRINGS = {
    "uk": {
        "welcome": (
            "Вітаємо! Ласкаво просимо до *Bizcheck.md* — інструмента діагностики "
            "від Crowe Turcan Mikhailenko.\n\n"
            "Щоб отримати звіт прямо тут, у Telegram:\n\n"
            "• Пройдіть тест на сайті Bizcheck.md\n"
            "• На останньому кроці оберіть *Надіслати в Telegram*\n"
            "• Поверніться сюди й натисніть *START* — звіт надійде автоматично\n\n"
            "З питань або для персональної пропозиції "
            "напишіть нам у будь-який час: *office@crowe-tm.md*."
        ),
        "preparing": "Готуємо ваш звіт, це займе кілька секунд…",
        "server_error": (
            "Зараз наш сервер не відповідає. Будь ласка, спробуйте ще раз за "
            "кілька секунд. Якщо проблема не зникає — напишіть нам на office@crowe-tm.md."
        ),
        "expired": (
            "Посилання застаріло або вже було використано.\n\n"
            "Поверніться на сторінку звіту й знову натисніть *Надіслати в Telegram*. "
            "Якщо виникнуть труднощі — ми допоможемо: office@crowe-tm.md."
        ),
        "server_fail": (
            "На жаль, сталася непередбачувана помилка. Спробуйте, будь ласка, "
            "ще раз. Для швидкої допомоги: office@crowe-tm.md."
        ),
        "report_header": "📊 *Звіт Bizcheck.md для {first_name} {last_name}*\n",
        "score_line": "Загальний бал: *{score}%*",
        "blocks_header": "*Оцінені блоки:*",
        "pdf_footer": "Нижче додаємо повний звіт у форматі PDF.",
        "pdf_caption": (
            "Звіт Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Наші фахівці зв'яжуться з вами найближчим часом для обговорення "
            "результатів. З додаткових питань або для персональної пропозиції — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "PDF-звіт ще формується на сайті. Будь ласка, поверніться на сторінку "
            "звіту й знову натисніть *Надіслати в Telegram* — це займає кілька "
            "секунд після завершення тесту.\n\n"
            "Підтримка: office@crowe-tm.md."
        ),
        "zone_high": "Низький ризик",
        "zone_mid":  "Помірний ризик",
        "zone_warn": "Підвищений ризик",
        "zone_low":  "Критичний ризик",
        "actions_msg": "Можете отримати звіт на пошту або залишити контакти для персональної пропозиції:",
        "email_button": "📧 Отримати звіт на пошту",
        "email_prompt": "Напишіть адресу ел. пошти, куди надіслати звіт:",
        "email_invalid": "Адреса ел. пошти виглядає неправильною. Спробуйте ще раз:",
        "email_sent": "✓ Звіт надіслано на {email}. Перевірте також папку Спам.",
        "email_pending": "Звіт ще готується. Поверніться за кілька секунд і натисніть кнопку знову.",
        "email_expired": "Посилання застаріло. Поверніться на сторінку звіту й знову надішліть у Telegram.",
        "email_error": "Не вдалося надіслати лист. Спробуйте пізніше або напишіть на office@bizcheck.md.",
        "lead_button": "📝 Залишити контакти",
        "lead_ask_email": "Напишіть вашу адресу ел. пошти:",
        "lead_ask_phone": "Тепер напишіть номер телефону (напр.: +373 60 123 456):",
        "lead_invalid_email": "Адреса ел. пошти виглядає неправильною. Спробуйте ще раз:",
        "lead_invalid_phone": "Номер телефону виглядає неправильним. Спробуйте ще раз (напр.: +373 60 123 456):",
        "lead_saved": "✓ Дякуємо! Ми зберегли дані та зв'яжемося з вами найближчим часом.",
        "lead_expired": "Посилання застаріло. Поверніться на сторінку звіту й знову надішліть у Telegram.",
        "lead_error": "Не вдалося зберегти дані. Спробуйте пізніше або напишіть на office@bizcheck.md.",
        "phone_intro": (
            "📱 Щоб ми могли зв'язатися з вами безпосередньо — навіть якщо у вас немає "
            "імені користувача в Telegram — поділіться номером телефону одним натисканням:"
        ),
        "phone_share_btn": "📱 Поділитися номером",
        "phone_later_btn": "Пізніше",
        "phone_saved": "✓ Дякуємо! Ми зберегли номер телефону та зв'яжемося з вами найближчим часом.",
        "phone_later_ack": "Гаразд. Ви можете залишити контакти будь-якої миті за допомогою кнопок вище.",
        "phone_error": "Не вдалося зберегти номер. Спробуйте пізніше або напишіть на office@bizcheck.md.",
    },
    "en": {
        "welcome": (
            "Hello! Welcome to *Bizcheck.md* — a diagnostics tool "
            "by Crowe Turcan Mikhailenko.\n\n"
            "To get your report right here in Telegram:\n\n"
            "• Take the test on the Bizcheck.md website\n"
            "• On the final step, choose *Send to Telegram*\n"
            "• Come back here and press *START* — your report will arrive automatically\n\n"
            "For any questions or a personalised offer, "
            "write to us anytime: *office@crowe-tm.md*."
        ),
        "preparing": "Preparing your report, this will take a few seconds…",
        "server_error": (
            "Our server isn't responding right now. Please try again in "
            "a few seconds. If the problem persists — write to us at office@crowe-tm.md."
        ),
        "expired": (
            "This link has expired or has already been used.\n\n"
            "Go back to the report page and press *Send to Telegram* again. "
            "If you run into any trouble — we're happy to help: office@crowe-tm.md."
        ),
        "server_fail": (
            "Unfortunately, an unexpected error occurred. Please try "
            "again. For quick assistance: office@crowe-tm.md."
        ),
        "report_header": "📊 *Bizcheck.md report for {first_name} {last_name}*\n",
        "score_line": "Overall score: *{score}%*",
        "blocks_header": "*Assessed blocks:*",
        "pdf_footer": "The full report in PDF format is attached below.",
        "pdf_caption": (
            "Bizcheck.md report · Crowe Turcan Mikhailenko\n\n"
            "Our specialists will contact you shortly to discuss "
            "the results. For any further questions or a personalised offer — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "The PDF report is still being generated on the website. Please go back to the "
            "report page and press *Send to Telegram* again — this takes a few "
            "seconds after you finish the test.\n\n"
            "Support: office@crowe-tm.md."
        ),
        "zone_high": "Low risk",
        "zone_mid":  "Moderate risk",
        "zone_warn": "Elevated risk",
        "zone_low":  "Critical risk",
        "actions_msg": "You can get the report by email or leave your contacts for a personalised offer:",
        "email_button": "📧 Get the report by email",
        "email_prompt": "Enter the email address where we should send the report:",
        "email_invalid": "That email address doesn't look right. Please try again:",
        "email_sent": "✓ The report has been sent to {email}. Please also check your Spam folder.",
        "email_pending": "The report is still being prepared. Come back in a few seconds and tap the button again.",
        "email_expired": "The link has expired. Go back to the report page and send it to Telegram again.",
        "email_error": "We couldn't send the email. Please try again later or write to office@bizcheck.md.",
        "lead_button": "📝 Leave your contacts",
        "lead_ask_email": "Enter your email address:",
        "lead_ask_phone": "Now enter your phone number (e.g.: +373 60 123 456):",
        "lead_invalid_email": "That email address doesn't look right. Please try again:",
        "lead_invalid_phone": "That phone number doesn't look right. Please try again (e.g.: +373 60 123 456):",
        "lead_saved": "✓ Thank you! We've saved your details and will get in touch with you shortly.",
        "lead_expired": "The link has expired. Go back to the report page and send it to Telegram again.",
        "lead_error": "We couldn't save your details. Please try again later or write to office@bizcheck.md.",
        "phone_intro": (
            "📱 So we can reach you directly — even if you don't have a Telegram "
            "username — share your phone number with a single tap:"
        ),
        "phone_share_btn": "📱 Share my number",
        "phone_later_btn": "Later",
        "phone_saved": "✓ Thank you! We've saved your phone number and will get in touch with you shortly.",
        "phone_later_ack": "No problem. You can leave your contacts anytime using the buttons above.",
        "phone_error": "We couldn't save your number. Please try again later or write to office@bizcheck.md.",
    },
}


def _t(lang: str, key: str, **kwargs) -> str:
    """Get a translated string, falling back to 'uk'."""
    s = _STRINGS.get(lang, _STRINGS["uk"]).get(key, _STRINGS["uk"].get(key, key))
    return s.format(**kwargs) if kwargs else s
