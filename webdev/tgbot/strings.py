"""
Ukrainian bot copy and the translation helper.

All user-facing text lives here. The UA client bot always uses Ukrainian,
independently of the Telegram client or the language of the attached report.

Two placeholders are injected automatically into every string, so the brand and
the support address are never hardcoded in the copy:

    {site}     → config.SITE_NAME      (e.g. "Bizcheck.com.ua")
    {contact}  → config.CONTACT_EMAIL  (support / sales address)

`pick_lang()` retains its compatibility argument but always returns Ukrainian.
"""

from config import CONTACT_EMAIL, SITE_NAME

_STRINGS = {
    "uk": {
        "welcome": (
            "Вітаємо! Ласкаво просимо до *{site}* — інструмента діагностики "
            "від Crowe Turcan Mikhailenko.\n\n"
            "Щоб отримати звіт прямо тут, у Telegram:\n\n"
            "• Пройдіть тест на сайті {site}\n"
            "• На останньому кроці оберіть *Надіслати в Telegram*\n"
            "• Поверніться сюди й натисніть *START* — звіт надійде автоматично\n\n"
            "Команда /help — коротка довідка.\n\n"
            "З питань або для персональної пропозиції "
            "напишіть нам у будь-який час: *{contact}*."
        ),
        "help": (
            "*{site} — довідка*\n\n"
            "Доступні команди:\n"
            "/start — отримати звіт (працює автоматично за посиланням із сайту)\n"
            "/help — ця довідка\n\n"
            "Як отримати звіт:\n"
            "• Пройдіть тест на сайті {site}\n"
            "• На сторінці звіту натисніть *Надіслати в Telegram*\n"
            "• Поверніться сюди — звіт і PDF надійдуть автоматично\n\n"
            "Після звіту ви можете надіслати його собі на пошту або залишити "
            "контакти для персональної пропозиції.\n\n"
            "Підтримка: *{contact}*"
        ),
        "cmd_start_desc": "Отримати звіт Bizcheck",
        "cmd_help_desc": "Довідка та контакти",
        "feedback_ack": "Дякуємо за відповідь!",
        "phone_not_yours": "Будь ласка, поділіться власним номером за допомогою кнопки нижче.",
        "feedback_error": (
            "Не вдалося відкрити опитування. Будь ласка, натисніть посилання ще раз "
            "за кілька хвилин. Якщо проблема не зникає — напишіть нам на {contact}."
        ),
        "loading": "⏳ Хвилинку, перевіряємо ваше посилання…",
        "preparing": "Готуємо ваш звіт, це займе кілька секунд…",
        "server_error": (
            "Зараз наш сервер не відповідає. Будь ласка, спробуйте ще раз за "
            "кілька секунд. Якщо проблема не зникає — напишіть нам на {contact}."
        ),
        "expired": (
            "Посилання застаріло або вже було використано.\n\n"
            "Поверніться на сторінку звіту й знову натисніть *Надіслати в Telegram*. "
            "Якщо виникнуть труднощі — ми допоможемо: {contact}."
        ),
        "server_fail": (
            "На жаль, сталася непередбачувана помилка. Спробуйте, будь ласка, "
            "ще раз. Для швидкої допомоги: {contact}."
        ),
        "report_header": "📊 *Звіт {site} для {first_name} {last_name}*\n",
        "score_line": "Загальний бал: *{score}%*",
        "blocks_header": "*Оцінені блоки:*",
        "block_fallback": "Блок {order}",
        "pdf_footer": "Нижче додаємо повний звіт у форматі PDF.",
        "pdf_caption": (
            "Звіт {site} · Crowe Turcan Mikhailenko\n\n"
            "Наші фахівці зв'яжуться з вами найближчим часом для обговорення "
            "результатів. З додаткових питань або для персональної пропозиції — "
            "{contact}."
        ),
        "pdf_pending": (
            "PDF-звіт ще формується на сайті. Будь ласка, поверніться на сторінку "
            "звіту й знову натисніть *Надіслати в Telegram* — це займає кілька "
            "секунд після завершення тесту.\n\n"
            "Підтримка: {contact}."
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
        "email_error": "Не вдалося надіслати лист. Спробуйте пізніше або напишіть на {contact}.",
        "lead_button": "📝 Залишити контакти",
        "lead_ask_email": "Напишіть вашу адресу ел. пошти:",
        "lead_ask_phone": "Тепер напишіть номер телефону (напр.: +380 67 123 4567):",
        "lead_invalid_email": "Адреса ел. пошти виглядає неправильною. Спробуйте ще раз:",
        "lead_invalid_phone": "Номер телефону виглядає неправильним. Спробуйте ще раз (напр.: +380 67 123 4567):",
        "lead_saved": "✓ Дякуємо! Ми зберегли дані та зв'яжемося з вами найближчим часом.",
        "lead_expired": "Посилання застаріло. Поверніться на сторінку звіту й знову надішліть у Telegram.",
        "lead_error": "Не вдалося зберегти дані. Спробуйте пізніше або напишіть на {contact}.",
        "phone_intro": (
            "📱 Щоб ми могли зв'язатися з вами безпосередньо — навіть якщо у вас немає "
            "імені користувача в Telegram — поділіться номером телефону одним натисканням:"
        ),
        "phone_share_btn": "📱 Поділитися номером",
        "phone_later_btn": "Пізніше",
        "phone_saved": "✓ Дякуємо! Ми зберегли номер телефону та зв'яжемося з вами найближчим часом.",
        "phone_later_ack": "Гаразд. Ви можете залишити контакти будь-якої миті за допомогою кнопок вище.",
        "phone_error": "Не вдалося зберегти номер. Спробуйте пізніше або напишіть на {contact}.",
    },
}


class _SafeDict(dict):
    """format_map() helper: leave unknown placeholders untouched instead of
    raising, so a copy edit can never crash a handler mid-flow."""

    def __missing__(self, key):
        return "{" + key + "}"


def pick_lang(code=None) -> str:
    """The UA bot's interface is Ukrainian for every Telegram client."""
    return "uk"


def _t(lang: str, key: str, **kwargs) -> str:
    """Render source-controlled Ukrainian copy; ``lang`` is compatibility only.

    The attached report may still be English. Its language never changes the
    client bot's menus, prompts or status messages.
    """
    s = _STRINGS["uk"].get(key, key)
    return s.format_map(_SafeDict(site=SITE_NAME, contact=CONTACT_EMAIL, **kwargs))
