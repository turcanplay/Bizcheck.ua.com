export type Lang = 'uk' | 'en';

export const translations = {
  // Header
  headerRight: {
    uk: 'Оцінка ризиків · 2026',
    en: 'Risk assessment · 2026',
  },

  // Start page — Hero
  heroEyebrow: {
    uk: 'Інструмент самодіагностики',
    en: 'Self-assessment tool',
  },
  heroTitle1: {
    uk: 'Оцінка ризиків',
    en: 'Risk assessment',
  },
  heroTitle2: {
    uk: 'вашого бізнесу',
    en: 'for your business',
  },
  heroDesc: {
    uk: 'Професійна діагностика за методологією Crowe. Дайте відповіді на запитання за {blocks} ключовими блоками — отримайте детальний звіт про зони ризику та ефективності.',
    en: 'Professional diagnostics based on the Crowe methodology. Answer questions across {blocks} key blocks and get a detailed report on your risk and efficiency areas.',
  },
  metaBlocks: {
    uk: 'блоків аналізу',
    en: 'analysis blocks',
  },
  metaQuestions: {
    uk: 'запитань',
    en: 'questions',
  },
  metaMinutes: {
    uk: 'хвилин',
    en: 'minutes',
  },

  // Start page — Test selection (Step 0)
  step0: {
    uk: 'Крок 0',
    en: 'Step 0',
  },
  step0Title: {
    uk: 'Оберіть тип аудиту',
    en: 'Choose the type of audit',
  },
  step0Hint: {
    uk: 'Кожен аудит має свій набір запитань, адаптований під напрям.',
    en: 'Each audit has its own set of questions tailored to the area.',
  },
  formWarnTest: {
    uk: 'Будь ласка, оберіть аудит, щоб продовжити.',
    en: 'Please select an audit to continue.',
  },

  // Start page — Personal info (Step 1)
  step1: {
    uk: 'Крок 1',
    en: 'Step 1',
  },
  step1Title: {
    uk: 'Контактні дані для отримання первинної оцінки ризиків',
    en: 'Contact details to receive your initial risk assessment',
  },
  labelFirstName: {
    uk: 'Ім\'я',
    en: 'First name',
  },
  labelLastName: {
    uk: 'Прізвище',
    en: 'Last name',
  },
  labelFullName: {
    uk: 'Повне ім\'я',
    en: 'Full name',
  },
  placeholderFullName: {
    uk: 'Іван Іванов',
    en: 'John Smith',
  },
  labelEmail: {
    uk: 'Електронна пошта',
    en: 'Email',
  },
  labelPhone: {
    uk: 'Номер телефону',
    en: 'Phone number',
  },
  consentText: {
    uk: 'Я згоден на обробку своїх персональних даних',
    en: 'I agree to the processing of my personal data',
  },
  placeholderFirstName: {
    uk: 'Іван',
    en: 'John',
  },
  placeholderLastName: {
    uk: 'Іванов',
    en: 'Smith',
  },
  placeholderEmail: {
    uk: 'Office@bizcheck.md',
    en: 'Office@bizcheck.md',
  },
  placeholderPhone: {
    uk: '+373 XX XXX XXX',
    en: '+373 XX XXX XXX',
  },

  // Start page — Company info (Step 2)
  step2: {
    uk: 'Крок 2',
    en: 'Step 2',
  },
  step2Title: {
    uk: 'Інформація про компанію',
    en: 'Company information',
  },
  labelSector: {
    uk: 'Сфера діяльності',
    en: 'Field of activity',
  },
  labelSize: {
    uk: 'Кількість співробітників',
    en: 'Number of employees',
  },
  labelAge: {
    uk: 'Скільки років існує ваша компанія?',
    en: 'How many years has your company been operating?',
  },
  labelRevenue: {
    uk: 'Доходи від продажів',
    en: 'Sales revenue',
  },
  formWarnPersonal: {
    uk: 'Будь ласка, заповніть усі обов\'язкові поля та надайте згоду на обробку даних.',
    en: 'Please fill in all required fields and give your consent to data processing.',
  },
  formWarnEmail: {
    uk: 'Неправильна адреса електронної пошти.',
    en: 'Invalid email address.',
  },
  formWarnPhone: {
    uk: 'Неправильний номер телефону (мінімум 7 цифр).',
    en: 'Invalid phone number (minimum 7 digits).',
  },
  formWarnFullName: {
    uk: 'Будь ласка, заповніть.',
    en: 'Please fill this in.',
  },

  // CTA — delivery frames (per-method form)
  ctaFrameBack: {
    uk: '← Назад до варіантів',
    en: '← Back to options',
  },
  ctaFrameDownloadSub: {
    uk: 'Заповніть контактні дані, щоб завантажити звіт.',
    en: 'Fill in your contact details to download the report.',
  },
  ctaFrameEmailSub: {
    uk: 'Введіть адресу ел. пошти, куди надішлемо звіт.',
    en: 'Enter the email address where we should send the report.',
  },
  ctaFrameTelegramSub: {
    uk: 'Ми перенаправимо вас у Telegram для отримання звіту.',
    en: 'We will redirect you to Telegram to receive the report.',
  },
  ctaConsentPrefix: {
    uk: 'Я згоден(на) з',
    en: 'I agree to the',
  },
  ctaConsentLink: {
    uk: 'політикою конфіденційності, cookies та обробкою персональних даних',
    en: 'privacy policy, cookies and processing of personal data',
  },
  formWarnConsent: {
    uk: 'Підтвердьте згоду з політикою конфіденційності.',
    en: 'Please confirm your agreement with the privacy policy.',
  },
  formWarnServer: {
    uk: 'Помилка збереження даних. Перевірте email або телефон і спробуйте знову.',
    en: 'Error saving data. Check your email or phone and try again.',
  },
  formWarnCompany: {
    uk: 'Будь ласка, оберіть сферу діяльності, кількість співробітників та час існування компанії.',
    en: 'Please select the field of activity, number of employees and the company\'s age.',
  },
  btnNext: {
    uk: 'Далі',
    en: 'Next',
  },
  startBtn: {
    uk: 'Почати оцінку',
    en: 'Start assessment',
  },

  // Sectors
  sectors: {
    uk: ['Виробництво', 'Торгівля', 'Послуги / Консалтинг', 'HoReCa', 'IT / Цифрові сервіси', 'Сільське господарство', 'Транспорт і логістика', 'Медицина / Фармацевтика', 'Інша сфера'],
    en: ['Manufacturing', 'Trade', 'Services / Consulting', 'HoReCa', 'IT / Digital services', 'Agriculture', 'Transport and logistics', 'Healthcare / Pharmaceuticals', 'Other field'],
  },
  sizes: {
    uk: ['1–5', '6–10', '11–25', '26–50', '51–100', '101–250', '251–500', '500+'],
    en: ['1–5', '6–10', '11–25', '26–50', '51–100', '101–250', '251–500', '500+'],
  },
  ages: {
    uk: ['Менше 1 року', '1–2 роки', '3–5 років', '6–10 років', 'Понад 10 років'],
    en: ['Less than 1 year', '1–2 years', '3–5 years', '6–10 years', 'More than 10 years'],
  },
  revenues: {
    uk: ['До 50 млн', '50–100 млн', '100–150 млн', '150–200 млн', '200–500 млн', '500 млн і більше'],
    en: ['Up to 50M', '50–100M', '100–150M', '150–200M', '200–500M', '500M and above'],
  },

  // Quiz
  questionOf: {
    uk: 'Запитання {current} з {total}',
    en: 'Question {current} of {total}',
  },
  btnBack: {
    uk: 'Назад',
    en: 'Back',
  },
  btnGetReport: {
    uk: 'Отримати звіт',
    en: 'Get report',
  },
  progressQuestion: {
    uk: 'Запитання',
    en: 'Question',
  },

  // Quiz transition
  blockCompleted: {
    uk: 'Блок завершено!',
    en: 'Block completed!',
  },
  blockLabel: {
    uk: 'Блок',
    en: 'Block',
  },
  nextLabel: {
    uk: 'Наступний:',
    en: 'Next:',
  },
  btnContinue: {
    uk: 'Продовжити',
    en: 'Continue',
  },

  // Block detail page labels
  // Standard report — per-question checklist
  checklistTitle: {
    uk: 'Деталі за запитаннями',
    en: 'Details by question',
  },
  checklistSubtitle: {
    uk: 'Оцінка за кожним запитанням · Відповідає / Не відповідає нормі',
    en: 'Assessment for each question · Compliant / Non-compliant',
  },
  checklistPass: {
    uk: 'Відповідає нормі',
    en: 'Compliant',
  },
  checklistFail: {
    uk: 'Не відповідає нормі',
    en: 'Non-compliant',
  },
  checklistPartial: {
    uk: 'Частково',
    en: 'Partially',
  },
  checklistYourAnswer: {
    uk: 'Ваша відповідь',
    en: 'Your answer',
  },
  checklistNoAnswer: {
    uk: '(не показано — запитання пропущено)',
    en: '(not shown — question skipped)',
  },

  // GDPR report — per-question explanation page
  gdprQuestionLabel: {
    uk: 'Запитання',
    en: 'Question',
  },

  blockEssenceLabel: {
    uk: 'Суть',
    en: 'Essence',
  },
  blockRiskLabel: {
    uk: 'Ризик і наслідки',
    en: 'Risk and consequences',
  },
  blockActionLabel: {
    uk: 'Що робити',
    en: 'What to do',
  },
  blockRegulatoryLabel: {
    uk: 'Нормативна основа',
    en: 'Regulatory basis',
  },

  // Report
  reportTitle: {
    uk: 'Звіт Bizcheck.md',
    en: 'Bizcheck.md Report',
  },
  reportSubtitle: {
    uk: 'Аналіз за категоріями · Оцінка ризиків бізнесу',
    en: 'Analysis by category · Business risk assessment',
  },
  overallResult: {
    uk: 'Загальний результат',
    en: 'Overall result',
  },
  resultsByCategory: {
    uk: 'Результати за категоріями',
    en: 'Results by category',
  },
  conclusion: {
    uk: 'Висновок',
    en: 'Conclusion',
  },
  conclusionHigh: {
    uk: 'Ваш бізнес демонструє високий рівень зрілості. Продовжуйте підтримувати найкращі практики.',
    en: 'Your business demonstrates a high level of maturity. Keep maintaining these best practices.',
  },
  conclusionMid: {
    uk: 'Є зони для покращення. Рекомендуємо звернути увагу на блоки з низькими показниками.',
    en: 'There is room for improvement. We recommend paying attention to the blocks with low scores.',
  },
  conclusionWarning: {
    uk: 'Нестабільна ситуація із суттєвими вразливостями. Рекомендується детальний аналіз проблемних зон.',
    en: 'An unstable situation with significant vulnerabilities. A detailed analysis of the problem areas is recommended.',
  },
  conclusionLow: {
    uk: 'Виявлено критичні зони ризику. Рекомендується професійна консультація.',
    en: 'Critical risk areas have been identified. A professional consultation is recommended.',
  },
  onPathTo: {
    uk: 'Ви на {pct}% шляху до ідеального бізнесу.',
    en: 'You are {pct}% of the way to an ideal business.',
  },
  verdictHigh: {
    uk: 'Бізнес у хорошій формі.',
    en: 'The business is in good shape.',
  },
  verdictMid: {
    uk: 'Допустимий рівень, але потребує доопрацювання.',
    en: 'An acceptable level, but it needs some refinement.',
  },
  verdictWarning: {
    uk: 'Ситуація нестабільна. Суттєві вразливості.',
    en: 'The situation is unstable. Significant vulnerabilities.',
  },
  verdictLow: {
    uk: 'Критичні ризики. Потрібна консультація.',
    en: 'Critical risks. A consultation is needed.',
  },
  indicator: {
    uk: 'Показник:',
    en: 'Score:',
  },

  // Legend
  legendTitle: {
    uk: 'Легенда оцінки ризиків:',
    en: 'Risk assessment legend:',
  },
  legendGreen: {
    uk: '80% – 100%',
    en: '80% – 100%',
  },
  legendGreenDesc: {
    uk: 'Низький ризик. Стабільна зона, система працює коректно.',
    en: 'Low risk. A stable zone; the system is working correctly.',
  },
  legendYellow: {
    uk: '70% – 79%',
    en: '70% – 79%',
  },
  legendYellowDesc: {
    uk: 'Помірний ризик. Допустимий рівень, але потребує контролю та доопрацювання.',
    en: 'Moderate risk. An acceptable level, but it requires monitoring and refinement.',
  },
  legendOrange: {
    uk: '65% – 69%',
    en: '65% – 69%',
  },
  legendOrangeDesc: {
    uk: 'Небезпечний рівень ризику. Ситуація нестабільна, наявні суттєві вразливості.',
    en: 'A dangerous level of risk. The situation is unstable, with significant vulnerabilities present.',
  },
  legendRed: {
    uk: '0% – 64%',
    en: '0% – 64%',
  },
  legendRedDesc: {
    uk: 'Високий рівень ризику. Критична зона, потрібні увага та втручання.',
    en: 'A high level of risk. A critical zone that requires attention and intervention.',
  },

  // Zones
  zoneSafe: {
    uk: 'Низький ризик',
    en: 'Low risk',
  },
  zoneDeveloping: {
    uk: 'Помірний ризик',
    en: 'Moderate risk',
  },
  zoneWarning: {
    uk: 'Небезпечний рівень ризику',
    en: 'Dangerous level of risk',
  },
  zoneRisk: {
    uk: 'Високий рівень ризику',
    en: 'High level of risk',
  },
  zoneDescRisk: {
    uk: 'Критична зона, потрібні увага та втручання.',
    en: 'A critical zone that requires attention and intervention.',
  },
  zoneDescWarning: {
    uk: 'Ситуація нестабільна, наявні суттєві вразливості.',
    en: 'The situation is unstable, with significant vulnerabilities present.',
  },
  zoneDescDeveloping: {
    uk: 'Допустимий рівень, але потребує контролю та доопрацювання.',
    en: 'An acceptable level, but it requires monitoring and refinement.',
  },
  zoneDescSafe: {
    uk: 'Стабільна зона. Рекомендуємо підтримувати цей рівень.',
    en: 'A stable zone. We recommend maintaining this level.',
  },

  // CTA
  ctaTitle: {
    uk: 'Потрібна повна діагностика?',
    en: 'Need a full diagnostic?',
  },
  ctaSubtitle: {
    uk: 'Експерти Crowe допоможуть провести глибокий аналіз ризиків і розробити стратегію підвищення ефективності вашого бізнесу.',
    en: 'Crowe experts will help you carry out an in-depth risk analysis and develop a strategy to improve the efficiency of your business.',
  },
  ctaNote: {
    uk: 'Найближчим часом наші фахівці зв\'яжуться з вами для обговорення результатів і наступних кроків.',
    en: 'Our specialists will contact you shortly to discuss the results and the next steps.',
  },
  ctaBtn: {
    uk: 'Запросити консультацію',
    en: 'Request a consultation',
  },
  ctaRestart: {
    uk: 'Пройти заново',
    en: 'Start over',
  },
  ctaEmailLabel:    { uk: 'EMAIL',    en: 'EMAIL' },
  ctaTelegramLabel: { uk: 'TELEGRAM', en: 'TELEGRAM' },
  ctaWebLabel:      { uk: 'ВЕБ',      en: 'WEB' },
  ctaEmailValue:    { uk: 'office@bizcheck.md', en: 'office@bizcheck.md' },
  ctaTelegramValue: { uk: '@CROWE_TM', en: '@CROWE_TM' },
  ctaWebValue:      { uk: 'crowe-tm.md', en: 'crowe-tm.md' },
  ctaCrowe: { uk: 'Crowe Turcan Mikhailenko', en: 'Crowe Turcan Mikhailenko' },
  ctaDisclaimer: {
    uk: 'Звіт сформовано автоматично платформою Bizcheck.md і має винятково інформаційний характер. Він не є офіційним професійним, юридичним, фінансовим чи іншим висновком і не може вважатися оцінкою діяльності, рівня «здоров\'я» або компетенцій компанії.\n\nПлатформа не гарантує повноту й точність результатів. Для прийняття рішень рекомендується проведення окремого аналізу із залученням профільних фахівців.',
    en: 'This report is generated automatically by the Bizcheck.md platform and is for informational purposes only. It does not constitute an official professional, legal, financial or other opinion, and it cannot be treated as an assessment of a company\'s activity, "health" or competencies.\n\nThe platform does not guarantee the completeness and accuracy of the results. To make decisions, we recommend carrying out a separate analysis with the involvement of relevant specialists.',
  },

  // Loading / empty states
  loading: {
    uk: 'Завантаження...',
    en: 'Loading...',
  },
  noQuestions: {
    uk: 'Наразі запитання недоступні. Будь ласка, поверніться пізніше.',
    en: 'Questions are currently unavailable. Please come back later.',
  },

  // PDF download
  downloadPdf: {
    uk: 'Завантажити звіт PDF',
    en: 'Download PDF report',
  },
  telegramCta: {
    uk: 'Натисніть кнопку, відкрийте Telegram і натисніть START — PDF-звіт буде надіслано безпосередньо в чат.',
    en: 'Tap the button, open Telegram and press START — the PDF report will be sent directly to the chat.',
  },
  telegramBtn: {
    uk: 'Надіслати звіт у Telegram',
    en: 'Send report to Telegram',
  },
  telegramLoading: {
    uk: 'Підготовка...',
    en: 'Preparing...',
  },
  telegramError: {
    uk: 'Не вдалося підготувати посилання на бота. Спробуйте ще раз за кілька секунд.',
    en: 'Could not prepare the bot link. Please try again in a few seconds.',
  },
  telegramPdfPending: {
    uk: 'Звіт ще генерується. Зачекайте кілька секунд і натисніть кнопку ще раз.',
    en: 'The report is still being generated. Wait a few seconds and tap the button again.',
  },

  // CTA success page (after quiz, before bot)
  ctaSuccessTitle: {
    uk: 'Тест завершено!',
    en: 'Test completed!',
  },
  ctaSuccessSubtitle: {
    uk: 'Ваш детальний звіт готовий',
    en: 'Your detailed report is ready',
  },
  ctaSuccessName: {
    uk: 'Підготовлено для {name}',
    en: 'Prepared for {name}',
  },
  ctaStep1Label: {
    uk: 'Тест пройдено',
    en: 'Test completed',
  },
  ctaStep2Label: {
    uk: 'Відкрийте бота',
    en: 'Open the bot',
  },
  ctaStep3Label: {
    uk: 'Отримайте PDF',
    en: 'Get the PDF',
  },
  ctaInstruction: {
    uk: 'Натисніть кнопку нижче, відкрийте Telegram і натисніть START — PDF-звіт буде надіслано протягом кількох секунд.',
    en: 'Tap the button below, open Telegram and press START — the PDF report will be sent within a few seconds.',
  },
  ctaPdfPreparing: {
    uk: 'Звіт готується...',
    en: 'The report is being prepared...',
  },
  ctaPdfReady: {
    uk: 'Звіт готовий. Відкрийте бота, щоб його отримати.',
    en: 'The report is ready. Open the bot to receive it.',
  },
  ctaPdfError: {
    uk: 'Помилка генерації PDF.',
    en: 'PDF generation error.',
  },
  ctaPdfRetry: {
    uk: 'Спробувати знову',
    en: 'Try again',
  },
  // CTA — contact gate (shown before delivery options)
  ctaContactTitle: {
    uk: 'Останній крок — ваші контактні дані',
    en: 'Last step — your contact details',
  },
  ctaContactDesc: {
    uk: 'Залиште ім\'я та номер телефону, щоб ми могли зв\'язатися з вами й обговорити результати.',
    en: 'Leave your name and phone number so we can contact you and discuss the results.',
  },
  ctaContactSubmitBtn: {
    uk: 'Продовжити',
    en: 'Continue',
  },
  ctaContactWarn: {
    uk: 'Будь ласка, введіть ім\'я, номер телефону та надайте згоду на обробку даних.',
    en: 'Please enter your name and phone number and give your consent to data processing.',
  },
  ctaEmailPromptTitle: {
    uk: 'Введіть адресу електронної пошти',
    en: 'Enter your email address',
  },
  ctaEmailPromptDesc: {
    uk: 'Ми надішлемо звіт на цю адресу.',
    en: 'We will send the report to this address.',
  },

  ctaDeliveryTitle: {
    uk: 'Як ви хочете отримати звіт?',
    en: 'How would you like to receive the report?',
  },
  ctaDeliverySubtitle: {
    uk: 'Оберіть один із варіантів нижче.',
    en: 'Choose one of the options below.',
  },
  ctaDownloadTitle:    { uk: 'Завантажити PDF', en: 'Download PDF' },
  ctaDownloadDesc:     { uk: 'Зберегти звіт на пристрій',
                          en: 'Save the report to your device' },
  ctaDownloadBtn:      { uk: 'Завантажити', en: 'Download' },

  ctaEmailTitle:       { uk: 'Надіслати на email', en: 'Send to email' },
  ctaEmailDesc:        { uk: 'Отримайте звіт на свою електронну пошту',
                          en: 'Get the report to your email' },
  ctaEmailPlaceholder: { uk: 'адреса@email.com', en: 'address@email.com' },
  ctaEmailBtn:         { uk: 'Надіслати', en: 'Send' },
  ctaEmailSent:        { uk: 'Звіт уже в дорозі!',
                          en: 'The report is on its way!' },
  ctaEmailSentSub:     { uk: 'Через кілька секунд ви отримаєте лист на {email} з кнопкою для відкриття звіту Bizcheck.md (PDF). Перевірте також папку Спам.',
                          en: 'In a few seconds you will receive an email at {email} with a button to open your Bizcheck.md report (PDF). Also check your Spam folder.' },
  ctaEmailResend:      { uk: 'Надіслати ще раз', en: 'Send again' },
  ctaEmailResent:      { uk: 'Надіслано ще раз ✓', en: 'Sent again ✓' },
  ctaEmailComingSoon:  { uk: 'Незабаром', en: 'Coming soon' },
  ctaEmailSoonDesc:    { uk: 'Незабаром буде доступно й цим способом. Поки що використовуйте Telegram.',
                          en: 'This option will be available soon. For now, please use Telegram.' },

  // Save-gate — background verification that all answers reached the server.
  ctaSavingTitle:      { uk: 'Перепрошуємо — зберігаємо ваші відповіді.',
                          en: 'One moment — we are saving your answers.' },
  ctaSavingText:       { uk: 'Одну секунду, ми переконуємося, що всі відповіді збережено. Будь ласка, не закривайте сторінку.',
                          en: 'Just a second — we are making sure all your answers are saved. Please do not close the page.' },
  ctaSaveFailTitle:    { uk: 'Нестабільне з\'єднання',
                          en: 'Unstable connection' },
  ctaSaveFailText:     { uk: 'Деякі відповіді поки не вдалося підтвердити. Ми збережемо їх автоматично у фоні, щойно повернеться зв\'язок — не закривайте сторінку надто швидко.',
                          en: 'Some answers could not be confirmed yet. We will save them automatically in the background as soon as the connection returns — please do not close the page too quickly.' },

  // Prominent "check Spam" notice on the email-sent success screen.
  ctaSpamNoticeTitle:  { uk: 'Перевірте папку СПАМ',
                          en: 'Check your SPAM folder' },
  ctaSpamNoticeText:   { uk: 'Іноді лист потрапляє до Спаму або Промоакцій. Якщо не бачите звіт у «Вхідних» через кілька хвилин, пошукайте там лист від Bizcheck.md.',
                          en: 'Sometimes the email lands in Spam or Promotions. If you do not see the report in your Inbox after a few minutes, look there for an email from Bizcheck.md.' },

  // Download done state — shown after PDF saved + email dispatched
  ctaDownloadDoneTitle: {
    uk: 'Звіт завантажено!',
    en: 'Report downloaded!',
  },
  ctaDownloadDoneSub: {
    uk: 'Перевірте папку Завантажень і поштову скриньку {email} — ми також надіслали копію на email про всяк випадок.',
    en: 'Check your Downloads folder and your {email} inbox — we also sent a copy to your email just in case.',
  },

  ctaTelegramTitle:    { uk: 'Telegram', en: 'Telegram' },
  ctaTelegramDesc:     { uk: 'Відкрийте бота й отримайте звіт миттєво',
                          en: 'Open the bot and get the report instantly' },
  ctaTelegramBtn:      { uk: 'Відкрити Telegram', en: 'Open Telegram' },

  // PDF Footer
  pdfFooterTitle: {
    uk: 'Потрібна повна діагностика?',
    en: 'Need a full diagnostic?',
  },
  pdfFooterDesc: {
    uk: 'Експерти Crowe допоможуть провести глибокий аналіз ризиків і розробити стратегію підвищення ефективності вашого бізнесу.',
    en: 'Crowe experts will help you carry out an in-depth risk analysis and develop a strategy to improve the efficiency of your business.',
  },
  pdfFooterContact: {
    uk: 'Найближчим часом наші фахівці зв\'яжуться з вами для обговорення результатів і наступних кроків.',
    en: 'Our specialists will contact you shortly to discuss the results and the next steps.',
  },
  pdfFooterConfidential: {
    uk: 'Звіт сформовано автоматично платформою Bizcheck.md і має винятково ознайомлювальний характер. Він не є професійним, юридичним, фінансовим чи іншим висновком і не може розглядатися як оцінка діяльності, рівня «здоров\'я» або компетенцій компанії.',
    en: 'This report is generated automatically by the Bizcheck.md platform and is for reference purposes only. It does not constitute a professional, legal, financial or other opinion, and it cannot be regarded as an assessment of a company\'s activity, "health" or competencies.',
  },
  pdfFooterGenerated: {
    uk: 'Платформа не гарантує повноту й точність результатів. Для прийняття рішень рекомендується проведення окремого аналізу за участю профільних фахівців.',
    en: 'The platform does not guarantee the completeness and accuracy of the results. To make decisions, we recommend carrying out a separate analysis with the involvement of relevant specialists.',
  },

  // ============ LANDING PAGE ============

  // Hero
  heroNavLogin:  { uk: 'Увійти',  en: 'Log in' },
  heroNavSignup: { uk: 'Реєстрація', en: 'Sign up' },
  heroSearchPh:  { uk: 'Пошук тестів і шаблонів', en: 'Search tests and templates' },
  heroEyebrowLanding: { uk: 'ПЛАТФОРМА #1 У МОЛДОВІ', en: 'THE #1 PLATFORM IN MOLDOVA' },
  heroTitleLine1: { uk: 'Bizcheck.md', en: 'Bizcheck.md' },
  heroTitleLine2: { uk: 'Чек-ап бізнесу', en: 'Business check-up' },
  heroDescLanding: {
    uk: 'Професійні тести й шаблони для розвитку та відповідності вашого бізнесу.',
    en: 'Professional tests and templates for the growth and compliance of your business.',
  },
  heroCta:           { uk: 'Перевірте компанію зараз', en: 'Check your company now' },
  heroTrustTitle:    { uk: 'Понад 130+ компаній', en: 'Over 130+ companies' },
  heroTrustSub:      { uk: 'довіряють Crowe Turcan Mikhailenko', en: 'trust Crowe Turcan Mikhailenko' },
  heroRatingSub:     { uk: 'із 230+ відгуків', en: 'from 230+ reviews' },
  heroPurchasesSub:  { uk: 'активних компаній', en: 'active companies' },

  // About platform
  aboutTitle: { uk: 'Про платформу', en: 'About the platform' },
  aboutP1: {
    uk: 'Bizcheck — цифрова платформа для підприємців і компаній, які хочуть оптимізувати процеси та дотримуватися вимог законодавства.',
    en: 'Bizcheck is a digital platform for entrepreneurs and companies that want to optimize their processes and comply with legal requirements.',
  },
  aboutP2: {
    uk: 'Ми пропонуємо інтерактивні тести та професійні шаблони, створені для спрощення бізнес-процесів й економії часу.',
    en: 'We offer interactive tests and professional templates designed to simplify business processes and save time.',
  },
  aboutP3: {
    uk: 'Усі ресурси прості у використанні, редаговані та адаптовані до будь-якого типу компанії.',
    en: 'All resources are easy to use, editable and adaptable to any type of company.',
  },
  aboutCta: { uk: 'Перевірте компанію зараз', en: 'Check your company now' },
  aboutIllustrationAlt: {
    uk: 'Bizcheck на ноутбуці, планшеті й телефоні',
    en: 'Bizcheck on a laptop, tablet and phone',
  },

  // Why Bizcheck
  whyTitle:           { uk: 'Чому Bizcheck?',   en: 'Why Bizcheck?' },
  whyFastTitle:       { uk: 'Швидко й просто',   en: 'Fast and simple' },
  whyFastDesc:        {
    uk: 'Прості процеси, без складнощів і технічних знань.',
    en: 'Simple processes, with no complexity or technical knowledge required.',
  },
  whyDocsTitle:       { uk: 'Професійні документи', en: 'Professional documents' },
  whyDocsDesc:        {
    uk: 'Шаблони, створені відповідно до бізнес-стандартів.',
    en: 'Templates created in line with business standards.',
  },
  whyBusinessTitle:   { uk: 'Для будь-якого бізнесу', en: 'For any business' },
  whyBusinessDesc:    {
    uk: 'Рішення для стартапів, фрилансерів і будь-яких типів компаній.',
    en: 'Solutions for startups, freelancers and companies of every type.',
  },
  whyLegalTitle:      { uk: 'Відповідає законодавству', en: 'Legally compliant' },
  whyLegalDesc:       {
    uk: 'Документи, оновлені відповідно до чинних вимог.',
    en: 'Documents updated in accordance with current requirements.',
  },

  // Catalog
  catalogTitle:       { uk: 'Пройти Чек-ап бізнесу', en: 'Take the business check-up' },
  catalogSearchPh:    { uk: 'Пошук...', en: 'Search...' },
  catalogTabAll:      { uk: 'Усі',    en: 'All' },
  catalogTabTests:    { uk: 'Тести',    en: 'Tests' },
  catalogTabTemplates:{ uk: 'Шаблони', en: 'Templates' },
  catalogFiltersLbl:  { uk: 'Фільтри',       en: 'Filters' },
  catalogCategories:  { uk: 'Категорії',    en: 'Categories' },
  catalogType:        { uk: 'Тип',          en: 'Type' },
  catalogPrice:       { uk: 'Ціна',         en: 'Price' },
  catalogPriceFree:   { uk: 'Безкоштовно',      en: 'Free' },
  catalogPricePaid:   { uk: 'Платно',     en: 'Paid' },
  catalogBadgeBasic:  { uk: 'Basic',        en: 'Basic' },
  catalogBadgePremium:{ uk: 'Premium',      en: 'Premium' },
  catalogStartTest:   { uk: 'Почати тест', en: 'Start test' },
  catalogDownload:    { uk: 'Завантажити',     en: 'Download' },
  catalogViewDetails: { uk: 'Детальніше', en: 'View details' },
  catalogComingSoon:  { uk: 'Незабаром',    en: 'Coming soon' },
  catalogComingSoonBadge: { uk: 'Незабаром стане доступним', en: 'Available soon' },
  catalogEmpty:       { uk: 'Нічого не знайдено за обраними фільтрами.',
                        en: 'Nothing found for the selected filters.' },
  catalogSectionTests:     { uk: 'Тести',    en: 'Tests' },
  catalogSectionTemplates: { uk: 'Шаблони', en: 'Templates' },

  // Testimonials & FAQ
  testimonialsTitle: { uk: 'Що кажуть наші клієнти?', en: 'What do our clients say?' },
  faqTitle:          { uk: 'Часті запитання',      en: 'Frequently asked questions' },
  testimonialsEmpty: { uk: 'Поки що немає відгуків.', en: 'No reviews yet.' },
  faqEmpty:          { uk: 'Поки що немає запитань.',    en: 'No questions yet.' },

  // Public "leave a review" form
  reviewLeave:       { uk: 'Залишити відгук',            en: 'Leave a review' },
  reviewFormTitle:   { uk: 'Поділіться своїм досвідом', en: 'Share your experience' },
  reviewFormSubtitle:{ uk: 'Ваш відгук з\'явиться на сайті одразу.', en: 'Your review will appear on the site right away.' },
  reviewName:        { uk: 'Ваше ім\'я',                 en: 'Your name' },
  reviewNamePh:      { uk: 'Напр.: Влад Р.',                en: 'E.g.: Vlad R.' },
  reviewRole:        { uk: 'Посада / компанія (необов\'язково)',  en: 'Position / company (optional)' },
  reviewRolePh:      { uk: 'Напр.: CEO @ Фірма SRL',        en: 'E.g.: CEO @ Company SRL' },
  reviewRating:      { uk: 'Ваша оцінка',                    en: 'Your rating' },
  reviewText:        { uk: 'Ваш відгук',                en: 'Your review' },
  reviewTextPh:      { uk: 'Розкажіть про ваш досвід...', en: 'Tell us about your experience...' },
  reviewSubmit:      { uk: 'Надіслати відгук',           en: 'Submit review' },
  reviewSending:     { uk: 'Надсилання...',              en: 'Sending...' },
  reviewThanks:      { uk: 'Дякуємо! Ваш відгук опубліковано. 🎉', en: 'Thank you! Your review has been published. 🎉' },
  reviewErrName:     { uk: 'Вкажіть ваше ім\'я (мін. 2 символи).', en: 'Please enter your name (min. 2 characters).' },
  reviewErrText:     { uk: 'Відгук занадто короткий (мін. 3 символи).', en: 'The review is too short (min. 3 characters).' },
  reviewErrRate:     { uk: 'Забагато відгуків. Спробуйте пізніше.', en: 'Too many reviews. Please try again later.' },
  reviewErrGeneric:  { uk: 'Не вдалося надіслати відгук. Спробуйте знову.', en: 'Failed to submit the review. Please try again.' },

  // Final CTA band
  finalCtaTitle:    { uk: 'Почніть оптимізувати свій бізнес уже зараз',
                      en: 'Start optimizing your business right now' },
  finalCtaSubtitle: { uk: 'Інтерактивні тести. Професійні шаблони. Спрощені процеси.',
                      en: 'Interactive tests. Professional templates. Simplified processes.' },
  finalCtaButton:   { uk: 'Перевірте компанію зараз', en: 'Check your company now' },

  // Hero search & menu
  searchRecent:        { uk: 'Останні запити',     en: 'Recent searches' },
  searchSuggestions:   { uk: 'Підказки',            en: 'Suggestions' },
  searchNoResults:     { uk: 'Нічого не знайдено',         en: 'Nothing found' },
  searchSeeAll:        { uk: 'Показати всі результати', en: 'Show all results' },
  menuJumpAbout:       { uk: 'Про платформу',    en: 'About the platform' },
  menuJumpWhy:         { uk: 'Чому Bizcheck',      en: 'Why Bizcheck' },
  menuJumpCatalog:     { uk: 'Повний каталог',     en: 'Full catalog' },
  menuJumpTests:       { uk: 'Лише Тести',          en: 'Tests only' },
  menuJumpTemplates:   { uk: 'Лише Шаблони',       en: 'Templates only' },
  menuJumpTestimonials:{ uk: 'Відгуки',        en: 'Reviews' },
  menuJumpFaq:         { uk: 'Часті запитання', en: 'Frequently asked questions' },

  // Footer
  footerResources:     { uk: 'Ресурси',   en: 'Resources' },
  footerLinkTests:     { uk: 'Тести',     en: 'Tests' },
  footerLinkTemplates: { uk: 'Шаблони',  en: 'Templates' },
  footerLegal:         { uk: 'Правова інформація',     en: 'Legal information' },
  footerTerms:         { uk: 'Умови та положення',         en: 'Terms and conditions' },
  footerPrivacy:       { uk: 'Політика конфіденційності', en: 'Privacy policy' },
  footerCookies:       { uk: 'Політика cookies',            en: 'Cookie policy' },
  footerContacts:      { uk: 'Контакти',                    en: 'Contacts' },
  footerHours:         { uk: 'Пн-Пт: 9:00 - 18:00',           en: 'Mon-Fri: 9:00 - 18:00' },
  footerCopyright:     { uk: 'Усі права захищені',  en: 'All rights reserved' },
  footerOfficial:      { uk: 'Офіційні сайти',           en: 'Official websites' },
  footerLinkTurcan:    { uk: 'ЦУРКАН Іван',                 en: 'TURCAN Ivan' },
  footerLinkCrowe:     { uk: 'Crowe Turcan Mikhailenko',    en: 'Crowe Turcan Mikhailenko' },

  // Crowe / founder block (landing, after Hero)
  croweEyebrow: { uk: 'ХТО СТОЇТЬ ЗА BIZCHECK.MD', en: 'WHO IS BEHIND BIZCHECK.MD' },
  croweTitle:   { uk: 'Crowe Turcan Mikhailenko', en: 'Crowe Turcan Mikhailenko' },
  croweBody1: {
    uk: 'Crowe Turcan Mikhailenko є частиною міжнародної мережі Crowe Global — однієї з провідних світових мереж у сфері аудиту, консалтингу та корпоративних рішень.',
    en: 'Crowe Turcan Mikhailenko is part of the international Crowe Global network — one of the world\'s leading networks in audit, consulting and corporate solutions.',
  },
  croweBody2: {
    uk: 'Ми працюємо з місцевими та міжнародними компаніями, надаючи підтримку, адаптовану до юридичних, податкових і комерційних реалій Республіки Молдова.',
    en: 'We work with local and international companies, providing support tailored to the legal, tax and commercial realities of the Republic of Moldova.',
  },
  croweBody3: {
    uk: 'Ми орієнтовані на практичні, зрозумілі й застосовні рішення, щоб наші клієнти могли ухвалювати впевнені та обґрунтовані рішення.',
    en: 'We focus on practical, clear and applicable solutions so that our clients can make confident and well-founded decisions.',
  },
  croweName: { uk: 'ЦУРКАН ІВАН', en: 'IVAN TURCAN' },
  croweRole: { uk: 'Засновник · Crowe Turcan Mikhailenko', en: 'Founder · Crowe Turcan Mikhailenko' },
  croweBtnTurcan: { uk: 'Іван Цуркан', en: 'Ivan Turcan' },
  croweBtnCrowe:  { uk: 'Crowe Mikhailenko', en: 'Crowe Mikhailenko' },
  croweVisitHint: { uk: 'Перейти на офіційний сайт', en: 'Go to the official website' },
  croweCtaHint: {
    uk: 'Задля деталей відвідайте офіційні сайти та познайомтеся з нами:',
    en: 'For details, visit the official websites and get to know us:',
  },

  // Cookie banner
  cookieTitle: {
    uk: 'Цей сайт використовує cookie-файли',
    en: 'This website uses cookies',
  },
  cookieDesc: {
    uk: 'Ми використовуємо необхідні cookie-файли для роботи сайту та, за бажанням, файли аналітики й маркетингу для покращення досвіду. Ви можете прийняти всі, відмовитися від необов\'язкових або обрати індивідуально.',
    en: 'We use necessary cookies to run the site and, optionally, analytics and marketing cookies to improve your experience. You can accept all, reject the optional ones, or choose individually.',
  },
  cookieAcceptAll: { uk: 'Прийняти всі', en: 'Accept all' },
  cookieRejectAll: { uk: 'Відхилити необов\'язкові', en: 'Reject optional' },
  cookieCustomize: { uk: 'Налаштування', en: 'Settings' },
  cookieSave:      { uk: 'Зберегти налаштування', en: 'Save settings' },
  cookieBack:      { uk: 'Назад', en: 'Back' },
  cookiePolicyLink: { uk: 'Політика конфіденційності', en: 'Privacy policy' },

  cookieCatNecessaryTitle: { uk: 'Строго необхідні', en: 'Strictly necessary' },
  cookieCatNecessaryDesc: {
    uk: 'Необхідні для автентифікації, сесії тесту та безпеки. Не можуть бути вимкнені.',
    en: 'Required for authentication, the test session and security. These cannot be disabled.',
  },
  cookieCatAnalyticsTitle: { uk: 'Аналітика', en: 'Analytics' },
  cookieCatAnalyticsDesc: {
    uk: 'Анонімна статистика трафіку сайту — допомагає нам покращувати контент.',
    en: 'Anonymous site traffic statistics — they help us improve our content.',
  },
  cookieCatMarketingTitle: { uk: 'Маркетинг', en: 'Marketing' },
  cookieCatMarketingDesc: {
    uk: 'Дозволяють показувати релевантні пропозиції через зовнішніх партнерів (соцмережі, реклама).',
    en: 'Allow us to show relevant offers through external partners (social media, advertising).',
  },
  cookieAlwaysOn: { uk: 'Завжди увімкнено', en: 'Always on' },

  footerCookieSettings: { uk: 'Налаштування cookies', en: 'Cookie settings' },

  // Header quick-jump
  navTests: { uk: 'Тести', en: 'Tests' },

  // Company-data recovery — shown only when the save-gate failed to confirm.
  ctaRecoveryTitle: {
    uk: 'Підтвердьте дані компанії',
    en: 'Confirm your company details',
  },
  ctaRecoveryIntro: {
    uk: 'Перепрошуємо — можливо, дані про вашу компанію не збереглися. Будь ласка, підтвердьте їх нижче.',
    en: 'We apologize — your company details may not have been saved. Please confirm them below.',
  },
  ctaRecoverySave: {
    uk: 'Зберегти дані',
    en: 'Save details',
  },
  ctaRecoverySaving: {
    uk: 'Зберігаємо…',
    en: 'Saving…',
  },
  ctaRecoverySaved: {
    uk: 'Збережено ✓',
    en: 'Saved ✓',
  },
  ctaRecoverySupport: {
    uk: 'Якщо проблема зберігається, будь ласка, повідомте нам на',
    en: 'If the problem persists, please let us know at',
  },
} as const;

export type TranslationKey = keyof typeof translations;
