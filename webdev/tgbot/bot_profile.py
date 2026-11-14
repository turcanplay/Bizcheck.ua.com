"""Public bot identity. Edit this file and redeploy to change the profile.

No database, admin screen, environment variable or Telegram command can
override these values inside this application. Telegram/BotFather itself has
no immutable-profile setting; profile_guard restores the source values.
"""

from pathlib import Path

SITE_NAME = "Bizcheck.com.ua"
# Public contact confirmed by the owner; change through source and redeploy.
CONTACT_EMAIL = "office@crowe-tm.md"
BOT_NAME = "BIZCHECK"
# Never apply this Ukrainian profile to the separate Moldovan reference bot.
REFERENCE_BOT_USERNAME = "CROWE_BIZCHECK_bot"
DESCRIPTION = (
    "Bizcheck.com.ua — інструмент оцінювання бізнесу від Crowe Turcan Mikhailenko.\n\n"
    "Пройдіть опитування на bizcheck.com.ua, оберіть «Надіслати в Telegram» "
    "та отримайте звіт тут. Запитання: " + CONTACT_EMAIL
)
SHORT_DESCRIPTION = (
    "Звіти Bizcheck.com.ua від Crowe Turcan Mikhailenko. " + CONTACT_EMAIL
)
COMMANDS = (
    ("start", "Отримати звіт Bizcheck"),
    ("help", "Довідка та контакти"),
)
PHOTO_PATH = Path(__file__).resolve().parent / "assets" / "profile.jpg"

# Source-controlled intervals; the profile has no runtime editing switches.
# FAST: webhook, menu button, default admin rights, avatar (reads only unless
# drift is found). A foreign webhook steals every update until it is deleted.
FAST_CHECK_SECONDS = 15
# PROFILE: name/description/short description/commands for "", uk, en.
PROFILE_CHECK_SECONDS = 60
# FULL: every localized override; runs in its own task, never blocks FAST.
FULL_SWEEP_SECONDS = 6 * 3600
# Minimum gap between FAST checks, so forced checks (getUpdates conflicts)
# cannot hammer the Bot API.
FORCED_CHECK_MIN_GAP_SECONDS = 3
# Pause before the watchdog restarts a crashed guard tier.
GUARD_RESTART_SECONDS = 5

# These are cleanup targets, not supported bot UI languages. Clear old
# localized overrides so every Telegram client falls back to Ukrainian.
PROFILE_LANGUAGES = ("",) + tuple((
    "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr "
    "cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu "
    "gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk "
    "kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms "
    "mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro "
    "ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl "
    "tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu"
).split())
