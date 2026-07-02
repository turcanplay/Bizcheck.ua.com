export type Lang = 'ro' | 'ru';

export const translations = {
  // Header
  headerRight: {
    ro: 'Evaluarea riscurilor · 2026',
    ru: 'Оценка рисков · 2026',
  },

  // Start page — Hero
  heroEyebrow: {
    ro: 'Instrument de autodiagnosticare',
    ru: 'Инструмент самодиагностики',
  },
  heroTitle1: {
    ro: 'Evaluarea riscurilor',
    ru: 'Оценка рисков',
  },
  heroTitle2: {
    ro: 'afacerii dumneavoastră',
    ru: 'вашего бизнеса',
  },
  heroDesc: {
    ro: 'Diagnostic profesional conform metodologiei Crowe. Răspundeți la întrebări pe {blocks} blocuri cheie — obțineți un raport detaliat privind zonele de risc și eficiență.',
    ru: 'Профессиональная диагностика по методологии Crowe. Ответьте на вопросы по {blocks} ключевым блокам — получите детальный отчёт о зонах риска и эффективности.',
  },
  metaBlocks: {
    ro: 'blocuri de analiză',
    ru: 'блоков анализа',
  },
  metaQuestions: {
    ro: 'întrebări',
    ru: 'вопросов',
  },
  metaMinutes: {
    ro: 'minute',
    ru: 'минут',
  },

  // Start page — Test selection (Step 0)
  step0: {
    ro: 'Pasul 0',
    ru: 'Шаг 0',
  },
  step0Title: {
    ro: 'Alegeți tipul auditului',
    ru: 'Выберите тип аудита',
  },
  step0Hint: {
    ro: 'Fiecare audit are propriul set de întrebări adaptat domeniului.',
    ru: 'У каждого аудита свой набор вопросов, адаптированный под направление.',
  },
  formWarnTest: {
    ro: 'Vă rugăm să selectați un audit pentru a continua.',
    ru: 'Пожалуйста, выберите аудит, чтобы продолжить.',
  },

  // Start page — Personal info (Step 1)
  step1: {
    ro: 'Pasul 1',
    ru: 'Шаг 1',
  },
  step1Title: {
    ro: 'Date de contact pentru obținerea unei evaluări preliminare a riscurilor',
    ru: 'Контактные данные для получения первичной оценки рисков',
  },
  labelFirstName: {
    ro: 'Prenume',
    ru: 'Имя',
  },
  labelLastName: {
    ro: 'Nume',
    ru: 'Фамилия',
  },
  labelFullName: {
    ro: 'Nume complet',
    ru: 'Полное имя',
  },
  placeholderFullName: {
    ro: 'Ivan Ivanov',
    ru: 'Иван Иванов',
  },
  labelEmail: {
    ro: 'Adresa electronică',
    ru: 'Электронная почта',
  },
  labelPhone: {
    ro: 'Număr de telefon',
    ru: 'Номер телефона',
  },
  consentText: {
    ro: 'Sunt de acord cu prelucrarea datelor mele personale',
    ru: 'Я согласен на обработку моих персональных данных',
  },
  placeholderFirstName: {
    ro: 'Ivan',
    ru: 'Иван',
  },
  placeholderLastName: {
    ro: 'Ivanov',
    ru: 'Иванов',
  },
  placeholderEmail: {
    ro: 'Office@bizcheck.md',
    ru: 'Office@bizcheck.md',
  },
  placeholderPhone: {
    ro: '+373 XX XXX XXX',
    ru: '+373 XX XXX XXX',
  },

  // Start page — Company info (Step 2)
  step2: {
    ro: 'Pasul 2',
    ru: 'Шаг 2',
  },
  step2Title: {
    ro: 'Informații despre companie',
    ru: 'Информация о компании',
  },
  labelSector: {
    ro: 'Domeniul de activitate',
    ru: 'Сфера деятельности',
  },
  labelSize: {
    ro: 'Numărul de angajați',
    ru: 'Количество сотрудников',
  },
  labelAge: {
    ro: 'De câți ani există compania dumneavoastră?',
    ru: 'Сколько лет существует ваша компания?',
  },
  labelRevenue: {
    ro: 'Veniturile din vânzări',
    ru: 'Доходы от продаж',
  },
  formWarnPersonal: {
    ro: 'Vă rugăm să completați toate câmpurile obligatorii și să acceptați procesarea datelor.',
    ru: 'Пожалуйста, заполните все обязательные поля и дайте согласие на обработку данных.',
  },
  formWarnEmail: {
    ro: 'Adresa de e-mail nu este validă.',
    ru: 'Неверный адрес электронной почты.',
  },
  formWarnPhone: {
    ro: 'Numărul de telefon nu este valid (minim 7 cifre).',
    ru: 'Неверный номер телефона (минимум 7 цифр).',
  },
  formWarnFullName: {
    ro: 'Vă rugăm să completați.',
    ru: 'Пожалуйста, заполните.',
  },

  // CTA — delivery frames (per-method form)
  ctaFrameBack: {
    ro: '← Înapoi la opțiuni',
    ru: '← Назад к вариантам',
  },
  ctaFrameDownloadSub: {
    ro: 'Completați datele de contact pentru a descărca raportul.',
    ru: 'Заполните контактные данные, чтобы скачать отчёт.',
  },
  ctaFrameEmailSub: {
    ro: 'Introduceți adresa de e-mail unde să vă trimitem raportul.',
    ru: 'Введите адрес эл. почты, куда отправим отчёт.',
  },
  ctaFrameTelegramSub: {
    ro: 'Vă vom redirecționa spre Telegram pentru a primi raportul.',
    ru: 'Мы перенаправим вас в Telegram для получения отчёта.',
  },
  ctaConsentPrefix: {
    ro: 'Sunt de acord cu',
    ru: 'Я согласен(на) с',
  },
  ctaConsentLink: {
    ro: 'politica de confidențialitate, cookies și procesarea datelor personale',
    ru: 'политикой конфиденциальности, cookies и обработкой персональных данных',
  },
  formWarnConsent: {
    ro: 'Bifați acordul cu politica de confidențialitate.',
    ru: 'Подтвердите согласие с политикой конфиденциальности.',
  },
  formWarnServer: {
    ro: 'Eroare la salvarea datelor. Verificați email-ul sau telefonul și încercați din nou.',
    ru: 'Ошибка сохранения данных. Проверьте email или телефон и попробуйте снова.',
  },
  formWarnCompany: {
    ro: 'Vă rugăm să selectați domeniul de activitate, numărul de angajați și vârsta companiei.',
    ru: 'Пожалуйста, выберите сферу деятельности, количество сотрудников и возраст компании.',
  },
  btnNext: {
    ro: 'Continuă',
    ru: 'Далее',
  },
  startBtn: {
    ro: 'Începe evaluarea',
    ru: 'Начать оценку',
  },

  // Sectors
  sectors: {
    ro: ['Producție', 'Comerț', 'Servicii / Consultanță', 'HoReCa', 'IT / Servicii digitale', 'Agricultură', 'Transport și logistică', 'Medicină / Farmacie', 'Alt domeniu'],
    ru: ['Производство', 'Торговля', 'Услуги / Консалтинг', 'HoReCa', 'IT / Цифровые сервисы', 'Сельское хозяйство', 'Транспорт и логистика', 'Медицина / Фармацевтика', 'Другая сфера'],
  },
  sizes: {
    ro: ['1–5', '6–10', '11–25', '26–50', '51–100', '101–250', '251–500', '500+'],
    ru: ['1–5', '6–10', '11–25', '26–50', '51–100', '101–250', '251–500', '500+'],
  },
  ages: {
    ro: ['Mai puțin de 1 an', '1–2 ani', '3–5 ani', '6–10 ani', 'Peste 10 ani'],
    ru: ['Менее 1 года', '1–2 года', '3–5 лет', '6–10 лет', 'Более 10 лет'],
  },
  revenues: {
    ro: ['Până la 50 mln', '50–100 mln', '100–150 mln', '150–200 mln', '200–500 mln', '500 mln și mai mult'],
    ru: ['До 50 млн', '50–100 млн', '100–150 млн', '150–200 млн', '200–500 млн', '500 млн и более'],
  },

  // Quiz
  questionOf: {
    ro: 'Întrebarea {current} din {total}',
    ru: 'Вопрос {current} из {total}',
  },
  btnBack: {
    ro: 'Înapoi',
    ru: 'Назад',
  },
  btnGetReport: {
    ro: 'Obține raportul',
    ru: 'Получить отчёт',
  },
  progressQuestion: {
    ro: 'Întrebarea',
    ru: 'Вопрос',
  },

  // Quiz transition
  blockCompleted: {
    ro: 'Bloc finalizat!',
    ru: 'Блок завершён!',
  },
  blockLabel: {
    ro: 'Bloc',
    ru: 'Блок',
  },
  nextLabel: {
    ro: 'Următorul:',
    ru: 'Следующий:',
  },
  btnContinue: {
    ro: 'Continuă',
    ru: 'Продолжить',
  },

  // Block detail page labels
  // Standard report — per-question checklist
  checklistTitle: {
    ro: 'Detalii per întrebare',
    ru: 'Детали по вопросам',
  },
  checklistSubtitle: {
    ro: 'Evaluarea fiecărei întrebări · Corespunde / Nu corespunde normei',
    ru: 'Оценка по каждому вопросу · Соответствует / Не соответствует норме',
  },
  checklistPass: {
    ro: 'Corespunde normei',
    ru: 'Соответствует норме',
  },
  checklistFail: {
    ro: 'Nu corespunde normei',
    ru: 'Не соответствует норме',
  },
  checklistPartial: {
    ro: 'Parțial',
    ru: 'Частично',
  },
  checklistYourAnswer: {
    ro: 'Răspunsul dumneavoastră',
    ru: 'Ваш ответ',
  },
  checklistNoAnswer: {
    ro: '(neafișată — întrebare săritată)',
    ru: '(не показана — вопрос пропущен)',
  },

  // GDPR report — per-question explanation page
  gdprQuestionLabel: {
    ro: 'Întrebarea',
    ru: 'Вопрос',
  },

  blockEssenceLabel: {
    ro: 'Esența',
    ru: 'Суть',
  },
  blockRiskLabel: {
    ro: 'Risc și consecințe',
    ru: 'Риск и последствия',
  },
  blockActionLabel: {
    ro: 'Ce trebuie de făcut',
    ru: 'Что делать',
  },
  blockRegulatoryLabel: {
    ro: 'Cadrul de reglementare',
    ru: 'Нормативная основа',
  },

  // Report
  reportTitle: {
    ro: 'Raport Bizcheck.md',
    ru: 'Отчёт Bizcheck.md',
  },
  reportSubtitle: {
    ro: 'Analiză pe categorii · Evaluarea riscurilor afacerii',
    ru: 'Анализ по категориям · Оценка рисков бизнеса',
  },
  overallResult: {
    ro: 'Rezultat general',
    ru: 'Общий результат',
  },
  resultsByCategory: {
    ro: 'Rezultate pe categorii',
    ru: 'Результаты по категориям',
  },
  conclusion: {
    ro: 'Concluzie',
    ru: 'Заключение',
  },
  conclusionHigh: {
    ro: 'Afacerea dumneavoastră demonstrează un nivel ridicat de maturitate. Continuați să mențineți cele mai bune practici.',
    ru: 'Ваш бизнес демонстрирует высокий уровень зрелости. Продолжайте поддерживать лучшие практики.',
  },
  conclusionMid: {
    ro: 'Există zone de îmbunătățire. Vă recomandăm să acordați atenție blocurilor cu indicatori scăzuți.',
    ru: 'Есть зоны для улучшения. Рекомендуем обратить внимание на блоки с низкими показателями.',
  },
  conclusionWarning: {
    ro: 'Situație instabilă cu vulnerabilități semnificative. Se recomandă analiza detaliată a zonelor problematice.',
    ru: 'Нестабильная ситуация с существенными уязвимостями. Рекомендуется детальный анализ проблемных зон.',
  },
  conclusionLow: {
    ro: 'Au fost identificate zone critice de risc. Se recomandă consultanță profesională.',
    ru: 'Выявлены критические зоны риска. Рекомендуется профессиональная консультация.',
  },
  onPathTo: {
    ro: 'Sunteți la {pct}% din drumul către afacerea ideală.',
    ru: 'Вы на {pct}% пути к идеальному бизнесу.',
  },
  verdictHigh: {
    ro: 'Afacerea este în formă bună.',
    ru: 'Бизнес в хорошей форме.',
  },
  verdictMid: {
    ro: 'Nivel acceptabil, dar necesită îmbunătățiri.',
    ru: 'Допустимый уровень, но требует доработки.',
  },
  verdictWarning: {
    ro: 'Situație instabilă. Vulnerabilități semnificative.',
    ru: 'Ситуация нестабильна. Существенные уязвимости.',
  },
  verdictLow: {
    ro: 'Riscuri critice. Este necesară consultanță.',
    ru: 'Критические риски. Требуется консультация.',
  },
  indicator: {
    ro: 'Indicator:',
    ru: 'Показатель:',
  },

  // Legend
  legendTitle: {
    ro: 'Legenda evaluării riscurilor:',
    ru: 'Легенда оценки рисков:',
  },
  legendGreen: {
    ro: '80% – 100%',
    ru: '80% – 100%',
  },
  legendGreenDesc: {
    ro: 'Risc scăzut. Zonă stabilă, sistemul funcționează corect.',
    ru: 'Низкий риск. Стабильная зона, система работает корректно.',
  },
  legendYellow: {
    ro: '70% – 79%',
    ru: '70% – 79%',
  },
  legendYellowDesc: {
    ro: 'Risc moderat. Nivel acceptabil, dar necesită control și îmbunătățiri.',
    ru: 'Умеренный риск. Допустимый уровень, но требует контроля и доработки.',
  },
  legendOrange: {
    ro: '65% – 69%',
    ru: '65% – 69%',
  },
  legendOrangeDesc: {
    ro: 'Risc ridicat. Situație instabilă, vulnerabilități semnificative.',
    ru: 'Опасный уровень риска. Ситуация нестабильна, присутствуют существенные уязвимости.',
  },
  legendRed: {
    ro: '0% – 64%',
    ru: '0% – 64%',
  },
  legendRedDesc: {
    ro: 'Risc critic. Zonă critică, necesită atenție și intervenție imediată.',
    ru: 'Высокий уровень риска. Критическая зона, требуется внимание и вмешательство.',
  },

  // Zones
  zoneSafe: {
    ro: 'Risc scăzut',
    ru: 'Низкий риск',
  },
  zoneDeveloping: {
    ro: 'Risc moderat',
    ru: 'Умеренный риск',
  },
  zoneWarning: {
    ro: 'Risc ridicat',
    ru: 'Опасный уровень риска',
  },
  zoneRisk: {
    ro: 'Risc critic',
    ru: 'Высокий уровень риска',
  },
  zoneDescRisk: {
    ro: 'Zonă critică, necesită atenție și intervenție imediată.',
    ru: 'Критическая зона, требуется внимание и вмешательство.',
  },
  zoneDescWarning: {
    ro: 'Situație instabilă, vulnerabilități semnificative.',
    ru: 'Ситуация нестабильна, присутствуют существенные уязвимости.',
  },
  zoneDescDeveloping: {
    ro: 'Nivel acceptabil, dar necesită control și îmbunătățiri.',
    ru: 'Допустимый уровень, но требует контроля и доработки.',
  },
  zoneDescSafe: {
    ro: 'Zonă stabilă. Recomandăm menținerea acestui nivel.',
    ru: 'Стабильная зона. Рекомендуем поддерживать этот уровень.',
  },

  // CTA
  ctaTitle: {
    ro: 'Aveți nevoie de un diagnostic complet?',
    ru: 'Нужна полная диагностика?',
  },
  ctaSubtitle: {
    ro: 'Experții Crowe vă vor ajuta să efectuați o analiză aprofundată a riscurilor și să elaborați o strategie de creștere a eficienței afacerii dumneavoastră.',
    ru: 'Эксперты Crowe помогут провести глубокий анализ рисков и разработать стратегию повышения эффективности вашего бизнеса.',
  },
  ctaNote: {
    ro: 'În cel mai scurt timp, specialiștii noștri vă vor contacta pentru a discuta rezultatele și pașii următori.',
    ru: 'В ближайшее время наши специалисты свяжутся с вами для обсуждения результатов и следующих шагов.',
  },
  ctaBtn: {
    ro: 'Solicită consultanță',
    ru: 'Запросить консультацию',
  },
  ctaRestart: {
    ro: 'Refă testul',
    ru: 'Пройти заново',
  },
  ctaEmailLabel:    { ro: 'EMAIL',    ru: 'EMAIL' },
  ctaTelegramLabel: { ro: 'TELEGRAM', ru: 'TELEGRAM' },
  ctaWebLabel:      { ro: 'WEB',      ru: 'ВЕБ' },
  ctaEmailValue:    { ro: 'office@bizcheck.md', ru: 'office@bizcheck.md' },
  ctaTelegramValue: { ro: '@CROWE_TM', ru: '@CROWE_TM' },
  ctaWebValue:      { ro: 'crowe-tm.md', ru: 'crowe-tm.md' },
  ctaCrowe: { ro: 'Crowe Turcan Mikhailenko', ru: 'Crowe Turcan Mikhailenko' },
  ctaDisclaimer: {
    ro: 'Raportul este generat automat de platforma Bizcheck.md și are un caracter exclusiv informativ. Acesta nu constituie o concluzie oficială profesională, juridică, financiară sau de alt tip și nu poate fi considerat o evaluare a activității, a nivelului de „sănătate" sau a competențelor companiei.\n\nPlatforma nu garantează exhaustivitatea și acuratețea rezultatelor. Pentru luarea deciziilor se recomandă efectuarea unei analize separate cu participarea specialiștilor de profil.',
    ru: 'Отчёт сформирован автоматически платформой Bizcheck.md и носит исключительно информационный характер. Он не является официальным профессиональным, юридическим, финансовым или иным заключением и не может считаться оценкой деятельности, уровня «здоровья» или компетенций компании.\n\nПлатформа не гарантирует полноту и точность результатов. Для принятия решений рекомендуется проведение отдельного анализа с привлечением профильных специалистов.',
  },

  // Loading / empty states
  loading: {
    ro: 'Se încarcă...',
    ru: 'Загрузка...',
  },
  noQuestions: {
    ro: 'Momentan nu sunt întrebări disponibile. Vă rugăm să reveniți mai târziu.',
    ru: 'В настоящее время вопросы недоступны. Пожалуйста, вернитесь позже.',
  },

  // PDF download
  downloadPdf: {
    ro: 'Descarcă raportul PDF',
    ru: 'Скачать отчёт PDF',
  },
  telegramCta: {
    ro: 'Apăsați butonul, deschideți Telegram și apăsați START — raportul PDF va fi trimis direct în chat.',
    ru: 'Нажмите кнопку, откройте Telegram и нажмите START — PDF-отчёт будет отправлен прямо в чат.',
  },
  telegramBtn: {
    ro: 'Trimite raportul în Telegram',
    ru: 'Отправить отчёт в Telegram',
  },
  telegramLoading: {
    ro: 'Se pregătește...',
    ru: 'Подготовка...',
  },
  telegramError: {
    ro: 'Eroare temporară. Deschis direct.',
    ru: 'Временная ошибка. Открыто напрямую.',
  },

  // CTA success page (after quiz, before bot)
  ctaSuccessTitle: {
    ro: 'Testul a fost finalizat!',
    ru: 'Тест завершён!',
  },
  ctaSuccessSubtitle: {
    ro: 'Raportul dvs. detaliat este pregătit',
    ru: 'Ваш детальный отчёт готов',
  },
  ctaSuccessName: {
    ro: 'Pregătit pentru {name}',
    ru: 'Подготовлено для {name}',
  },
  ctaStep1Label: {
    ro: 'Test completat',
    ru: 'Тест пройден',
  },
  ctaStep2Label: {
    ro: 'Deschideți botul',
    ru: 'Откройте бота',
  },
  ctaStep3Label: {
    ro: 'Primiți PDF',
    ru: 'Получите PDF',
  },
  ctaInstruction: {
    ro: 'Apăsați butonul de mai jos, deschideți Telegram și apăsați START — raportul PDF va fi trimis în câteva secunde.',
    ru: 'Нажмите кнопку ниже, откройте Telegram и нажмите START — PDF-отчёт будет отправлен в течение нескольких секунд.',
  },
  ctaPdfPreparing: {
    ro: 'Se pregătește raportul...',
    ru: 'Отчёт готовится...',
  },
  ctaPdfReady: {
    ro: 'Raportul este pregătit. Deschideți botul pentru a-l primi.',
    ru: 'Отчёт готов. Откройте бота, чтобы его получить.',
  },
  ctaPdfError: {
    ro: 'Eroare la generarea PDF-ului.',
    ru: 'Ошибка генерации PDF.',
  },
  ctaPdfRetry: {
    ro: 'Încercați din nou',
    ru: 'Попробовать снова',
  },
  // CTA — contact gate (shown before delivery options)
  ctaContactTitle: {
    ro: 'Ultimul pas — datele dvs. de contact',
    ru: 'Последний шаг — ваши контактные данные',
  },
  ctaContactDesc: {
    ro: 'Lăsați numele și numărul de telefon ca să putem să vă contactăm înapoi și să discutăm rezultatele.',
    ru: 'Оставьте имя и номер телефона, чтобы мы могли связаться с вами и обсудить результаты.',
  },
  ctaContactSubmitBtn: {
    ro: 'Continuă',
    ru: 'Продолжить',
  },
  ctaContactWarn: {
    ro: 'Vă rugăm să introduceți numele, numărul de telefon și să acceptați prelucrarea datelor.',
    ru: 'Пожалуйста, введите имя, номер телефона и дайте согласие на обработку данных.',
  },
  ctaEmailPromptTitle: {
    ro: 'Introduceți adresa de email',
    ru: 'Введите адрес электронной почты',
  },
  ctaEmailPromptDesc: {
    ro: 'Vom trimite raportul pe această adresă.',
    ru: 'Мы отправим отчёт на этот адрес.',
  },

  ctaDeliveryTitle: {
    ro: 'Cum doriți să primiți raportul?',
    ru: 'Как вы хотите получить отчёт?',
  },
  ctaDeliverySubtitle: {
    ro: 'Alegeți o opțiune mai jos.',
    ru: 'Выберите один из вариантов ниже.',
  },
  ctaDownloadTitle:    { ro: 'Descarcă PDF', ru: 'Скачать PDF' },
  ctaDownloadDesc:     { ro: 'Salvează raportul direct pe dispozitiv',
                          ru: 'Сохранить отчёт на устройство' },
  ctaDownloadBtn:      { ro: 'Descarcă acum', ru: 'Скачать' },

  ctaEmailTitle:       { ro: 'Trimite pe email', ru: 'Отправить на email' },
  ctaEmailDesc:        { ro: 'Primiți raportul în căsuța dvs. de email',
                          ru: 'Получите отчёт на свою электронную почту' },
  ctaEmailPlaceholder: { ro: 'adresa@email.com', ru: 'адрес@email.ru' },
  ctaEmailBtn:         { ro: 'Trimite pe email', ru: 'Отправить' },
  ctaEmailSent:        { ro: 'Raportul este pe drum!',
                          ru: 'Отчёт уже в пути!' },
  ctaEmailSentSub:     { ro: 'În câteva clipe veți primi un mesaj la {email} cu un buton pentru a deschide raportul Bizcheck.md (PDF). Verificați și folderul Spam.',
                          ru: 'Через несколько секунд вы получите письмо на {email} с кнопкой для открытия отчёта Bizcheck.md (PDF). Проверьте также папку Спам.' },
  ctaEmailResend:      { ro: 'Trimite din nou', ru: 'Отправить ещё раз' },
  ctaEmailResent:      { ro: 'Trimis din nou ✓', ru: 'Отправлено ещё раз ✓' },
  ctaEmailComingSoon:  { ro: 'În curând', ru: 'Скоро' },
  ctaEmailSoonDesc:    { ro: 'În curând va fi posibil și prin această metodă. Momentan folosiți Telegram.',
                          ru: 'Скоро будет доступно и этим способом. Пока используйте Telegram.' },

  // Save-gate — background verification that all answers reached the server.
  ctaSavingTitle:      { ro: 'Ne cerem scuze — salvăm răspunsurile dvs.',
                          ru: 'Приносим извинения — сохраняем ваши ответы.' },
  ctaSavingText:       { ro: 'Un moment, ne asigurăm că toate răspunsurile au fost salvate. Vă rugăm să nu închideți pagina.',
                          ru: 'Одну секунду, мы убеждаемся, что все ответы сохранены. Пожалуйста, не закрывайте страницу.' },
  ctaSaveFailTitle:    { ro: 'Conexiune instabilă',
                          ru: 'Нестабильное соединение' },
  ctaSaveFailText:     { ro: 'Unele răspunsuri nu s-au putut confirma încă. Le salvăm automat în fundal imediat ce revine conexiunea — nu închideți pagina prea repede.',
                          ru: 'Некоторые ответы пока не удалось подтвердить. Мы сохраним их автоматически в фоне, как только вернётся связь — не закрывайте страницу слишком быстро.' },

  // Prominent "check Spam" notice on the email-sent success screen.
  ctaSpamNoticeTitle:  { ro: 'Verificați folderul SPAM',
                          ru: 'Проверьте папку СПАМ' },
  ctaSpamNoticeText:   { ro: 'Uneori emailul ajunge în Spam sau Promoții. Dacă nu vedeți raportul în inbox în câteva minute, căutați acolo un mesaj de la Bizcheck.md.',
                          ru: 'Иногда письмо попадает в Спам или Промоакции. Если не видите отчёт во «Входящих» через несколько минут, поищите там письмо от Bizcheck.md.' },

  // Download done state — shown after PDF saved + email dispatched
  ctaDownloadDoneTitle: {
    ro: 'Raportul a fost descărcat!',
    ru: 'Отчёт скачан!',
  },
  ctaDownloadDoneSub: {
    ro: 'Verificați folderul Descărcări și inbox-ul {email} — vă trimitem o copie pe email pentru siguranță.',
    ru: 'Проверьте папку Загрузок и почтовый ящик {email} — мы также отправили копию на email на всякий случай.',
  },

  ctaTelegramTitle:    { ro: 'Telegram', ru: 'Telegram' },
  ctaTelegramDesc:     { ro: 'Deschideți botul și primiți raportul instant',
                          ru: 'Откройте бота и получите отчёт мгновенно' },
  ctaTelegramBtn:      { ro: 'Deschide Telegram', ru: 'Открыть Telegram' },

  // PDF Footer
  pdfFooterTitle: {
    ro: 'Aveți nevoie de un diagnostic complet?',
    ru: 'Нужна полная диагностика?',
  },
  pdfFooterDesc: {
    ro: 'Experții Crowe vă vor ajuta să efectuați o analiză aprofundată a riscurilor și să elaborați o strategie de creștere a eficienței afacerii dumneavoastră.',
    ru: 'Эксперты Crowe помогут провести глубокий анализ рисков и разработать стратегию повышения эффективности вашего бизнеса.',
  },
  pdfFooterContact: {
    ro: 'În cel mai scurt timp, specialiștii noștri vă vor contacta pentru a discuta rezultatele și pașii următori.',
    ru: 'В ближайшее время наши специалисты свяжутся с вами для обсуждения результатов и следующих шагов.',
  },
  pdfFooterConfidential: {
    ro: 'Raportul este generat automat de platforma Bizcheck.md și are un caracter exclusiv informativ. Acesta nu constituie o concluzie profesională, juridică, financiară sau de alt tip și nu poate fi considerat o evaluare a activității, a nivelului de „sănătate" sau a competențelor companiei.',
    ru: 'Отчёт сформирован автоматически платформой Bizcheck.md и носит исключительно ознакомительный характер. Он не является профессиональным, юридическим, финансовым или иным заключением и не может рассматриваться как оценка деятельности, уровня «здоровья» или компетенций компании.',
  },
  pdfFooterGenerated: {
    ro: 'Platforma nu garantează exhaustivitatea și acuratețea rezultatelor. Pentru luarea deciziilor se recomandă efectuarea unei analize separate cu participarea specialiștilor de profil.',
    ru: 'Платформа не гарантирует полноту и точность результатов. Для принятия решений рекомендуется проведение отдельного анализа с участием профильных специалистов.',
  },

  // ============ LANDING PAGE ============

  // Hero
  heroNavLogin:  { ro: 'Log in',  ru: 'Войти' },
  heroNavSignup: { ro: 'Sign up', ru: 'Регистрация' },
  heroSearchPh:  { ro: 'Caută teste sau șabloane', ru: 'Поиск тестов и шаблонов' },
  heroEyebrowLanding: { ro: 'PLATFORMA #1 ÎN MOLDOVA', ru: 'ПЛАТФОРМА #1 В МОЛДОВЕ' },
  heroTitleLine1: { ro: 'Bizcheck.md', ru: 'Bizcheck.md' },
  heroTitleLine2: { ro: 'Business Checkup', ru: 'Чек-ап бизнеса' },
  heroDescLanding: {
    ro: 'Teste și șabloane profesionale pentru dezvoltarea și conformitatea afacerii tale.',
    ru: 'Профессиональные тесты и шаблоны для развития и соответствия вашего бизнеса.',
  },
  heroCta:           { ro: 'Testează-ți compania acum', ru: 'Проверьте компанию сейчас' },
  heroTrustTitle:    { ro: 'Peste 130+ de companii', ru: 'Более 130+ компаний' },
  heroTrustSub:      { ro: 'au încredere în Crowe Turcan Mikhailenko', ru: 'доверяют Crowe Turcan Mikhailenko' },
  heroRatingSub:     { ro: 'din 230+ recenzii', ru: 'из 230+ отзывов' },
  heroPurchasesSub:  { ro: 'companii active', ru: 'активных компаний' },

  // About platform
  aboutTitle: { ro: 'Despre platformă', ru: 'О платформе' },
  aboutP1: {
    ro: 'Bizcheck este o platformă digitală pentru antreprenori și companii care doresc să își optimizeze procesele și să respecte cerințele legale.',
    ru: 'Bizcheck — цифровая платформа для предпринимателей и компаний, которые хотят оптимизировать процессы и соблюдать требования законодательства.',
  },
  aboutP2: {
    ro: 'Oferim teste interactive și șabloane profesionale, create pentru a simplifica activitățile de business și a economisi timp.',
    ru: 'Мы предлагаем интерактивные тесты и профессиональные шаблоны, созданные для упрощения бизнес-процессов и экономии времени.',
  },
  aboutP3: {
    ro: 'Toate resursele sunt ușor de utilizat, editabile și adaptabile oricărui tip de companie.',
    ru: 'Все ресурсы просты в использовании, редактируемы и адаптируемы к любому типу компании.',
  },
  aboutCta: { ro: 'Testează-ți compania acum', ru: 'Проверьте компанию сейчас' },
  aboutIllustrationAlt: {
    ro: 'Bizcheck pe laptop, tabletă și telefon',
    ru: 'Bizcheck на ноутбуке, планшете и телефоне',
  },

  // Why Bizcheck
  whyTitle:           { ro: 'De ce Bizcheck?',   ru: 'Почему Bizcheck?' },
  whyFastTitle:       { ro: 'Rapid și simplu',   ru: 'Быстро и просто' },
  whyFastDesc:        {
    ro: 'Procese simple, fără complicații sau cunoștințe tehnice.',
    ru: 'Простые процессы, без сложностей и технических знаний.',
  },
  whyDocsTitle:       { ro: 'Documente profesionale', ru: 'Профессиональные документы' },
  whyDocsDesc:        {
    ro: 'Șabloane create conform standardelor utilizate în business.',
    ru: 'Шаблоны, созданные в соответствии с бизнес-стандартами.',
  },
  whyBusinessTitle:   { ro: 'Pentru orice business', ru: 'Для любого бизнеса' },
  whyBusinessDesc:    {
    ro: 'Soluții adaptate pentru startup-uri, freelanceri și orice tipuri de companii.',
    ru: 'Решения для стартапов, фрилансеров и любых типов компаний.',
  },
  whyLegalTitle:      { ro: 'Conform legislației', ru: 'Соответствует законодательству' },
  whyLegalDesc:       {
    ro: 'Documente actualizate în funcție de cerințele legale în vigoare.',
    ru: 'Документы, обновлённые в соответствии с действующими требованиями.',
  },

  // Catalog
  catalogTitle:       { ro: 'Treci Checkup afacerii tale ', ru: 'Пройти Чек-ап бизнеса' },
  catalogSearchPh:    { ro: 'Caută...', ru: 'Поиск...' },
  catalogTabAll:      { ro: 'Toate',    ru: 'Все' },
  catalogTabTests:    { ro: 'Teste',    ru: 'Тесты' },
  catalogTabTemplates:{ ro: 'Șabloane', ru: 'Шаблоны' },
  catalogFiltersLbl:  { ro: 'Filtre',       ru: 'Фильтры' },
  catalogCategories:  { ro: 'Categorii',    ru: 'Категории' },
  catalogType:        { ro: 'Tip',          ru: 'Тип' },
  catalogPrice:       { ro: 'Preț',         ru: 'Цена' },
  catalogPriceFree:   { ro: 'Gratuit',      ru: 'Бесплатно' },
  catalogPricePaid:   { ro: 'Cu plată',     ru: 'Платно' },
  catalogBadgeBasic:  { ro: 'Basic',        ru: 'Basic' },
  catalogBadgePremium:{ ro: 'Premium',      ru: 'Premium' },
  catalogStartTest:   { ro: 'Începe testul', ru: 'Начать тест' },
  catalogDownload:    { ro: 'Descarcă',     ru: 'Скачать' },
  catalogViewDetails: { ro: 'Vezi detalii', ru: 'Подробнее' },
  catalogComingSoon:  { ro: 'În curând',    ru: 'Скоро' },
  catalogComingSoonBadge: { ro: 'În curând va fi disponibil', ru: 'Скоро станет доступным' },
  catalogEmpty:       { ro: 'Nu s-a găsit nimic pentru filtrele selectate.',
                        ru: 'Ничего не найдено по выбранным фильтрам.' },
  catalogSectionTests:     { ro: 'Teste',    ru: 'Тесты' },
  catalogSectionTemplates: { ro: 'Șabloane', ru: 'Шаблоны' },

  // Testimonials & FAQ
  testimonialsTitle: { ro: 'Ce spun clienții noștri?', ru: 'Что говорят наши клиенты?' },
  faqTitle:          { ro: 'Întrebări frecvente',      ru: 'Частые вопросы' },
  testimonialsEmpty: { ro: 'Nu există testimoniale încă.', ru: 'Пока нет отзывов.' },
  faqEmpty:          { ro: 'Nu există întrebări încă.',    ru: 'Пока нет вопросов.' },

  // Public "leave a review" form
  reviewLeave:       { ro: 'Lasă o recenzie',            ru: 'Оставить отзыв' },
  reviewFormTitle:   { ro: 'Împărtășește experiența ta', ru: 'Поделитесь своим опытом' },
  reviewFormSubtitle:{ ro: 'Recenzia ta apare imediat pe site.', ru: 'Ваш отзыв появится на сайте сразу.' },
  reviewName:        { ro: 'Numele tău',                 ru: 'Ваше имя' },
  reviewNamePh:      { ro: 'Ex: Vlad R.',                ru: 'Напр.: Влад Р.' },
  reviewRole:        { ro: 'Rol / companie (opțional)',  ru: 'Должность / компания (необязательно)' },
  reviewRolePh:      { ro: 'Ex: CEO @ Firma SRL',        ru: 'Напр.: CEO @ Фирма SRL' },
  reviewRating:      { ro: 'Nota ta',                    ru: 'Ваша оценка' },
  reviewText:        { ro: 'Recenzia ta',                ru: 'Ваш отзыв' },
  reviewTextPh:      { ro: 'Spune-ne cum a fost experiența ta...', ru: 'Расскажите о вашем опыте...' },
  reviewSubmit:      { ro: 'Trimite recenzia',           ru: 'Отправить отзыв' },
  reviewSending:     { ro: 'Se trimite...',              ru: 'Отправка...' },
  reviewThanks:      { ro: 'Mulțumim! Recenzia ta a fost publicată. 🎉', ru: 'Спасибо! Ваш отзыв опубликован. 🎉' },
  reviewErrName:     { ro: 'Introdu numele tău (min. 2 caractere).', ru: 'Укажите ваше имя (мин. 2 символа).' },
  reviewErrText:     { ro: 'Recenzia e prea scurtă (min. 3 caractere).', ru: 'Отзыв слишком короткий (мин. 3 символа).' },
  reviewErrRate:     { ro: 'Prea multe recenzii. Încearcă din nou mai târziu.', ru: 'Слишком много отзывов. Попробуйте позже.' },
  reviewErrGeneric:  { ro: 'Nu am putut trimite recenzia. Încearcă din nou.', ru: 'Не удалось отправить отзыв. Попробуйте снова.' },

  // Final CTA band
  finalCtaTitle:    { ro: 'Începe acum să-ți optimizezi afacerea',
                      ru: 'Начните оптимизировать свой бизнес уже сейчас' },
  finalCtaSubtitle: { ro: 'Teste interactive. Șabloane profesionale. Procese simplificate.',
                      ru: 'Интерактивные тесты. Профессиональные шаблоны. Упрощённые процессы.' },
  finalCtaButton:   { ro: 'Testează-ți compania acum', ru: 'Проверьте компанию сейчас' },

  // Hero search & menu
  searchRecent:        { ro: 'Căutări recente',     ru: 'Недавние запросы' },
  searchSuggestions:   { ro: 'Sugestii',            ru: 'Подсказки' },
  searchNoResults:     { ro: 'Nimic găsit',         ru: 'Ничего не найдено' },
  searchSeeAll:        { ro: 'Vezi toate rezultatele', ru: 'Показать все результаты' },
  menuJumpAbout:       { ro: 'Despre platformă',    ru: 'О платформе' },
  menuJumpWhy:         { ro: 'De ce Bizcheck',      ru: 'Почему Bizcheck' },
  menuJumpCatalog:     { ro: 'Catalog complet',     ru: 'Полный каталог' },
  menuJumpTests:       { ro: 'Doar Teste',          ru: 'Только Тесты' },
  menuJumpTemplates:   { ro: 'Doar Șabloane',       ru: 'Только Шаблоны' },
  menuJumpTestimonials:{ ro: 'Testimoniale',        ru: 'Отзывы' },
  menuJumpFaq:         { ro: 'Întrebări frecvente', ru: 'Частые вопросы' },

  // Footer
  footerResources:     { ro: 'Resurse',   ru: 'Ресурсы' },
  footerLinkTests:     { ro: 'Teste',     ru: 'Тесты' },
  footerLinkTemplates: { ro: 'Șabloane',  ru: 'Шаблоны' },
  footerLegal:         { ro: 'Legal',     ru: 'Правовая информация' },
  footerTerms:         { ro: 'Termeni și condiții',         ru: 'Условия и положения' },
  footerPrivacy:       { ro: 'Politica de confidențialitate', ru: 'Политика конфиденциальности' },
  footerCookies:       { ro: 'Politica cookies',            ru: 'Политика cookies' },
  footerContacts:      { ro: 'Contacte',                    ru: 'Контакты' },
  footerHours:         { ro: 'L-V: 9:00 - 18:00',           ru: 'Пн-Пт: 9:00 - 18:00' },
  footerCopyright:     { ro: 'Toate drepturile rezervate',  ru: 'Все права защищены' },
  footerOfficial:      { ro: 'Site-uri oficiale',           ru: 'Официальные сайты' },
  footerLinkTurcan:    { ro: 'ȚURCAN Ivan',                 ru: 'ЦУРКАН Иван' },
  footerLinkCrowe:     { ro: 'Crowe Turcan Mikhailenko',    ru: 'Crowe Turcan Mikhailenko' },

  // Crowe / founder block (landing, after Hero)
  croweEyebrow: { ro: 'ÎN SPATELE BIZCHECK.MD', ru: 'КТО СТОИТ ЗА BIZCHECK.MD' },
  croweTitle:   { ro: 'Crowe Turcan Mikhailenko', ru: 'Crowe Turcan Mikhailenko' },
  croweBody1: {
    ro: 'Crowe Turcan Mikhailenko face parte din rețeaua internațională Crowe Global, una dintre principalele rețele mondiale în domeniul auditului, consultanței și soluțiilor corporative.',
    ru: 'Crowe Turcan Mikhailenko является частью международной сети Crowe Global — одной из ведущих мировых сетей в области аудита, консалтинга и корпоративных решений.',
  },
  croweBody2: {
    ro: 'Lucrăm cu companii locale și internaționale, oferind suport adaptat realităților juridice, fiscale și comerciale ale Republicii Moldova.',
    ru: 'Мы работаем с местными и международными компаниями, предоставляя поддержку, адаптированную к юридическим, налоговым и коммерческим реалиям Республики Молдова.',
  },
  croweBody3: {
    ro: 'Ne concentrăm pe soluții practice, clare și aplicabile, astfel încât clienții noștri să poată lua decizii sigure și bine fundamentate.',
    ru: 'Мы ориентированы на практичные, понятные и применимые решения, чтобы наши клиенты могли принимать уверенные и обоснованные решения.',
  },
  croweName: { ro: 'ȚURCAN IVAN', ru: 'ЦУРКАН ИВАН' },
  croweRole: { ro: 'Fondator · Crowe Turcan Mikhailenko', ru: 'Основатель · Crowe Turcan Mikhailenko' },
  croweBtnTurcan: { ro: 'Ivan Țurcan', ru: 'Иван Цуркан' },
  croweBtnCrowe:  { ro: 'Crowe Mikhailenko', ru: 'Crowe Mikhailenko' },
  croweVisitHint: { ro: 'Vizitează site-ul oficial', ru: 'Перейти на официальный сайт' },
  croweCtaHint: {
    ro: 'Pentru mai multe detalii, vizitați site-urile oficiale și faceți cunoștință cu noi:',
    ru: 'Для подробностей посетите официальные сайты и познакомьтесь с нами:',
  },

  // Cookie banner
  cookieTitle: {
    ro: 'Acest site folosește cookie-uri',
    ru: 'Этот сайт использует cookie-файлы',
  },
  cookieDesc: {
    ro: 'Folosim cookie-uri esențiale pentru funcționarea site-ului și, opțional, cookie-uri de analiză și marketing pentru a îmbunătăți experiența. Puteți accepta toate, refuza opționalele sau alege individual.',
    ru: 'Мы используем необходимые cookie-файлы для работы сайта и, по желанию, файлы аналитики и маркетинга для улучшения опыта. Вы можете принять все, отказаться от необязательных или выбрать индивидуально.',
  },
  cookieAcceptAll: { ro: 'Acceptă toate', ru: 'Принять все' },
  cookieRejectAll: { ro: 'Respinge opționalele', ru: 'Отклонить необязательные' },
  cookieCustomize: { ro: 'Setări', ru: 'Настройки' },
  cookieSave:      { ro: 'Salvează preferințele', ru: 'Сохранить настройки' },
  cookieBack:      { ro: 'Înapoi', ru: 'Назад' },
  cookiePolicyLink: { ro: 'Politica de confidențialitate', ru: 'Политика конфиденциальности' },

  cookieCatNecessaryTitle: { ro: 'Strict necesare', ru: 'Строго необходимые' },
  cookieCatNecessaryDesc: {
    ro: 'Indispensabile pentru autentificare, sesiunea de quiz și securitate. Nu pot fi dezactivate.',
    ru: 'Необходимы для аутентификации, сессии теста и безопасности. Не могут быть отключены.',
  },
  cookieCatAnalyticsTitle: { ro: 'Analiză', ru: 'Аналитика' },
  cookieCatAnalyticsDesc: {
    ro: 'Statistici anonime despre traficul site-ului — ne ajută să îmbunătățim conținutul.',
    ru: 'Анонимная статистика трафика сайта — помогает нам улучшать контент.',
  },
  cookieCatMarketingTitle: { ro: 'Marketing', ru: 'Маркетинг' },
  cookieCatMarketingDesc: {
    ro: 'Permit afișarea de oferte relevante prin parteneri externi (rețele sociale, publicitate).',
    ru: 'Позволяют показывать релевантные предложения через внешних партнёров (соцсети, реклама).',
  },
  cookieAlwaysOn: { ro: 'Mereu activ', ru: 'Всегда включено' },

  footerCookieSettings: { ro: 'Setări cookies', ru: 'Настройки cookies' },

  // Header quick-jump
  navTests: { ro: 'Teste', ru: 'Тесты' },

  // Company-data recovery — shown only when the save-gate failed to confirm.
  ctaRecoveryTitle: {
    ro: 'Confirmați datele companiei',
    ru: 'Подтвердите данные компании',
  },
  ctaRecoveryIntro: {
    ro: 'Ne cerem scuze — este posibil ca datele despre compania dvs. să nu se fi salvat. Vă rugăm confirmați-le mai jos.',
    ru: 'Приносим извинения — возможно, данные о вашей компании не сохранились. Пожалуйста, подтвердите их ниже.',
  },
  ctaRecoverySave: {
    ro: 'Salvează datele',
    ru: 'Сохранить данные',
  },
  ctaRecoverySaving: {
    ro: 'Se salvează…',
    ru: 'Сохраняем…',
  },
  ctaRecoverySaved: {
    ro: 'Salvat ✓',
    ru: 'Сохранено ✓',
  },
  ctaRecoverySupport: {
    ro: 'Dacă problema persistă, vă rugăm să ne anunțați la',
    ru: 'Если проблема сохраняется, пожалуйста, сообщите нам на',
  },
} as const;

export type TranslationKey = keyof typeof translations;
