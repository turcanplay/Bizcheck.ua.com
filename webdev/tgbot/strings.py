"""
Bilingual bot copy (ro / ru) and the translation helper.

All user-facing text lives here. `_t(lang, key, **kwargs)` returns the string
for the requested language, falling back to Romanian.
"""

_STRINGS = {
    "ro": {
        "welcome": (
            "Bună ziua și bine ați venit la *Bizcheck.md* — instrumentul de evaluare "
            "al companiei Crowe Turcan Mikhailenko.\n\n"
            "Pentru a primi raportul dumneavoastră aici, în Telegram:\n\n"
            "• Completați chestionarul pe Bizcheck.md\n"
            "• La final, alegeți opțiunea *Trimite în Telegram*\n"
            "• Reveniți aici și apăsați *START* — raportul ajunge automat\n\n"
            "Pentru întrebări sau pentru o ofertă personalizată, "
            "ne puteți scrie oricând la *office@crowe-tm.md*."
        ),
        "preparing": "Pregătim raportul, durează câteva secunde…",
        "server_error": (
            "Momentan serverul nostru nu răspunde. Vă rugăm să încercați din nou peste "
            "câteva secunde. Dacă problema persistă, scrieți-ne la office@crowe-tm.md."
        ),
        "expired": (
            "Link-ul de acces a expirat sau a fost deja folosit.\n\n"
            "Reveniți la pagina raportului și apăsați din nou butonul *Trimite în Telegram*. "
            "Dacă întâmpinați probleme, vă putem ajuta la office@crowe-tm.md."
        ),
        "server_fail": (
            "Ne pare rău, a apărut o eroare neașteptată. Reîncercați în câteva clipe. "
            "Pentru asistență directă: office@crowe-tm.md."
        ),
        "report_header": "📊 *Raport Bizcheck.md pentru {first_name} {last_name}*\n",
        "score_line": "Scor general: *{score}%*",
        "blocks_header": "*Blocuri evaluate:*",
        "pdf_footer": "Atașăm mai jos raportul complet în format PDF.",
        "pdf_caption": (
            "Raport Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Specialiștii noștri vă vor contacta în cel mai scurt timp pentru a discuta "
            "rezultatele. Pentru întrebări suplimentare sau o ofertă personalizată — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "Raportul PDF se generează încă pe site. Vă rugăm să reveniți la pagina "
            "raportului și să apăsați din nou *Trimite în Telegram* — durează câteva "
            "secunde după finalizarea testului.\n\n"
            "Pentru asistență: office@crowe-tm.md."
        ),
        "zone_high": "Risc scăzut",
        "zone_mid":  "Risc moderat",
        "zone_warn": "Risc ridicat",
        "zone_low":  "Risc critic",
        "actions_msg": "Mai puteți primi raportul pe email sau lăsa datele pentru o ofertă personalizată:",
        "email_button": "📧 Primește raportul pe email",
        "email_prompt": "Scrieți adresa de email unde să trimitem raportul:",
        "email_invalid": "Adresa de email nu pare validă. Mai încercați o dată:",
        "email_sent": "✓ Am trimis raportul pe {email}. Verificați și folderul Spam.",
        "email_pending": "Raportul încă se pregătește. Reveniți peste câteva secunde și apăsați din nou butonul.",
        "email_expired": "Link-ul a expirat. Reveniți la pagina raportului și retrimiteți în Telegram.",
        "email_error": "Nu am putut trimite emailul acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
        "lead_button": "📝 Lasă datele de contact",
        "lead_ask_email": "Scrieți adresa dvs. de email:",
        "lead_ask_phone": "Acum scrieți numărul de telefon (ex: +373 60 123 456):",
        "lead_invalid_email": "Adresa de email nu pare validă. Mai încercați o dată:",
        "lead_invalid_phone": "Numărul de telefon nu pare valid. Mai încercați (ex: +373 60 123 456):",
        "lead_saved": "✓ Vă mulțumim! Am salvat datele, vă vom contacta în curând.",
        "lead_expired": "Link-ul a expirat. Reveniți la pagina raportului și retrimiteți în Telegram.",
        "lead_error": "Nu am putut salva datele acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
        "phone_intro": (
            "📱 Pentru a vă putea contacta direct — chiar dacă nu aveți un nume de utilizator "
            "Telegram — partajați numărul de telefon cu o singură atingere:"
        ),
        "phone_share_btn": "📱 Partajează numărul meu",
        "phone_later_btn": "Mai târziu",
        "phone_saved": "✓ Vă mulțumim! Am salvat numărul de telefon, vă vom contacta în curând.",
        "phone_later_ack": "Bine. Puteți lăsa datele oricând folosind butoanele de mai sus.",
        "phone_error": "Nu am putut salva numărul acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
    },
    "ru": {
        "welcome": (
            "Здравствуйте! Добро пожаловать на *Bizcheck.md* — инструмент диагностики "
            "от Crowe Turcan Mikhailenko.\n\n"
            "Чтобы получить отчёт прямо здесь, в Telegram:\n\n"
            "• Пройдите тест на сайте Bizcheck.md\n"
            "• На последнем шаге выберите *Отправить в Telegram*\n"
            "• Вернитесь сюда и нажмите *START* — отчёт придёт автоматически\n\n"
            "По вопросам или для персонального предложения "
            "напишите нам в любое время: *office@crowe-tm.md*."
        ),
        "preparing": "Готовим ваш отчёт, это займёт несколько секунд…",
        "server_error": (
            "Сейчас наш сервер не отвечает. Пожалуйста, попробуйте ещё раз через "
            "несколько секунд. Если проблема не уходит — напишите нам на office@crowe-tm.md."
        ),
        "expired": (
            "Ссылка устарела или уже была использована.\n\n"
            "Вернитесь на страницу отчёта и снова нажмите *Отправить в Telegram*. "
            "Если возникнут трудности — мы поможем: office@crowe-tm.md."
        ),
        "server_fail": (
            "К сожалению, произошла непредвиденная ошибка. Попробуйте, пожалуйста, "
            "ещё раз. Для быстрой помощи: office@crowe-tm.md."
        ),
        "report_header": "📊 *Отчёт Bizcheck.md для {first_name} {last_name}*\n",
        "score_line": "Общий балл: *{score}%*",
        "blocks_header": "*Оценённые блоки:*",
        "pdf_footer": "Ниже прилагаем полный отчёт в формате PDF.",
        "pdf_caption": (
            "Отчёт Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Наши специалисты свяжутся с вами в ближайшее время для обсуждения "
            "результатов. По дополнительным вопросам или для персонального предложения — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "PDF-отчёт ещё формируется на сайте. Пожалуйста, вернитесь на страницу "
            "отчёта и снова нажмите *Отправить в Telegram* — это занимает несколько "
            "секунд после завершения теста.\n\n"
            "Поддержка: office@crowe-tm.md."
        ),
        "zone_high": "Низкий риск",
        "zone_mid":  "Умеренный риск",
        "zone_warn": "Повышенный риск",
        "zone_low":  "Критический риск",
        "actions_msg": "Можете получить отчёт на почту или оставить контакты для персонального предложения:",
        "email_button": "📧 Получить отчёт на почту",
        "email_prompt": "Напишите адрес эл. почты, куда отправить отчёт:",
        "email_invalid": "Адрес эл. почты выглядит неверным. Попробуйте ещё раз:",
        "email_sent": "✓ Отчёт отправлен на {email}. Проверьте также папку Спам.",
        "email_pending": "Отчёт ещё готовится. Вернитесь через несколько секунд и нажмите кнопку снова.",
        "email_expired": "Ссылка устарела. Вернитесь на страницу отчёта и снова отправьте в Telegram.",
        "email_error": "Не удалось отправить письмо. Попробуйте позже или напишите на office@bizcheck.md.",
        "lead_button": "📝 Оставить контакты",
        "lead_ask_email": "Напишите ваш адрес эл. почты:",
        "lead_ask_phone": "Теперь напишите номер телефона (напр.: +373 60 123 456):",
        "lead_invalid_email": "Адрес эл. почты выглядит неверным. Попробуйте ещё раз:",
        "lead_invalid_phone": "Номер телефона выглядит неверным. Попробуйте ещё раз (напр.: +373 60 123 456):",
        "lead_saved": "✓ Спасибо! Мы сохранили данные и свяжемся с вами в ближайшее время.",
        "lead_expired": "Ссылка устарела. Вернитесь на страницу отчёта и снова отправьте в Telegram.",
        "lead_error": "Не удалось сохранить данные. Попробуйте позже или напишите на office@bizcheck.md.",
        "phone_intro": (
            "📱 Чтобы мы могли связаться с вами напрямую — даже если у вас нет имени "
            "пользователя в Telegram — поделитесь номером телефона одним нажатием:"
        ),
        "phone_share_btn": "📱 Поделиться номером",
        "phone_later_btn": "Позже",
        "phone_saved": "✓ Спасибо! Мы сохранили номер телефона и свяжемся с вами в ближайшее время.",
        "phone_later_ack": "Хорошо. Вы можете оставить контакты в любой момент с помощью кнопок выше.",
        "phone_error": "Не удалось сохранить номер. Попробуйте позже или напишите на office@bizcheck.md.",
    },
}


def _t(lang: str, key: str, **kwargs) -> str:
    """Get a translated string, falling back to 'ro'."""
    s = _STRINGS.get(lang, _STRINGS["ro"]).get(key, _STRINGS["ro"].get(key, key))
    return s.format(**kwargs) if kwargs else s
