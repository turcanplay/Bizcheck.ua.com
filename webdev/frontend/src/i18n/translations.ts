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
    en: 'Self-diagnostic tool',
  },
  heroTitle1: {
    uk: 'Оцінка ризиків',
    en: 'Risk assessment',
  },
  heroTitle2: {
    uk: 'вашого бізнесу',
    en: 'of your business',
  },
  heroDesc: {
    uk: 'Професійна діагностика за методологією Crowe. Дайте відповіді на запитання за {blocks} ключовими блоками — отримайте детальний звіт про зони ризику та ефективності.',
    en: 'Professional diagnostics based on the Crowe methodology. Answer questions across {blocks} key blocks and get a detailed report on your risk and efficiency zones.',
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
    uk: 'Кожен аудит має власний набір запитань, адаптований до напряму діяльності.',
    en: 'Each audit has its own set of questions tailored to the field of activity.',
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
    uk: 'Контактні дані для отримання попередньої оцінки ризиків',
    en: 'Contact details to receive a preliminary risk assessment',
  },
  labelFirstName: {
    uk: 'Ім’я',
    en: 'First name',
  },
  labelLastName: {
    uk: 'Прізвище',
    en: 'Last name',
  },
  labelFullName: {
    uk: 'Повне ім’я',
    en: 'Full name',
  },
  placeholderFullName: {
    uk: 'Іван Іванов',
    en: 'John Smith',
  },
  labelEmail: {
    uk: 'Електронна пошта',
    en: 'Email address',
  },
  labelPhone: {
    uk: 'Номер телефону',
    en: 'Phone number',
  },
  consentText: {
    uk: 'Я погоджуюся на обробку моїх персональних даних',
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
    uk: 'Кількість працівників',
    en: 'Number of employees',
  },
  labelAge: {
    uk: 'Скільки років існує ваша компанія?',
    en: 'How many years has your company existed?',
  },
  labelRevenue: {
    uk: 'Дохід від продажів',
    en: 'Sales revenue',
  },
  formWarnPersonal: {
    uk: 'Будь ласка, заповніть усі обов’язкові поля та надайте згоду на обробку даних.',
    en: 'Please fill in all required fields and consent to data processing.',
  },
  formWarnEmail: {
    uk: 'Невірна адреса електронної пошти.',
    en: 'The email address is not valid.',
  },
  formWarnPhone: {
    uk: 'Невірний номер телефону (мінімум 7 цифр).',
    en: 'The phone number is not valid (at least 7 digits).',
  },
  formWarnFullName: {
    uk: 'Будь ласка, заповніть поле.',
    en: 'Please fill in this field.',
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
    uk: 'Введіть адресу електронної пошти, на яку надіслати звіт.',
    en: 'Enter the email address where we should send the report.',
  },
  ctaFrameTelegramSub: {
    uk: 'Ми перенаправимо вас до Telegram, щоб отримати звіт.',
    en: 'We will redirect you to Telegram to receive the report.',
  },
  ctaConsentPrefix: {
    uk: 'Я погоджуюся з',
    en: 'I agree to the',
  },
  ctaConsentLink: {
    uk: 'політикою конфіденційності, cookies та обробкою персональних даних',
    en: 'privacy policy, cookies and processing of personal data',
  },
  formWarnConsent: {
    uk: 'Підтвердіть згоду з політикою конфіденційності.',
    en: 'Please confirm your agreement with the privacy policy.',
  },
  formWarnServer: {
    uk: 'Помилка збереження даних. Перевірте email або телефон і спробуйте ще раз.',
    en: 'Error saving data. Check your email or phone and try again.',
  },
  formWarnCompany: {
    uk: 'Будь ласка, оберіть сферу діяльності, кількість працівників і вік компанії.',
    en: 'Please select the field of activity, number of employees and company age.',
  },
  btnNext: {
    uk: 'Далі',
    en: 'Continue',
  },
  startBtn: {
    uk: 'Почати оцінку',
    en: 'Start the assessment',
  },

  // Sectors
  sectors: {
    uk: ['Виробництво', 'Торгівля', 'Послуги / Консалтинг', 'HoReCa', 'IT / Цифрові сервіси', 'Сільське господарство', 'Транспорт і логістика', 'Медицина / Фармацевтика', 'Інша сфера'],
    en: ['Manufacturing', 'Trade', 'Services / Consulting', 'HoReCa', 'IT / Digital services', 'Agriculture', 'Transport and logistics', 'Medicine / Pharmaceuticals', 'Other field'],
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
    en: ['Up to 50M', '50–100M', '100–150M', '150–200M', '200–500M', '500M and more'],
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
    en: 'Get the report',
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
    en: 'Details per question',
  },
  checklistSubtitle: {
    uk: 'Оцінка за кожним запитанням · Відповідає / Не відповідає нормі',
    en: 'Evaluation of each question · Meets / Does not meet the standard',
  },
  checklistPass: {
    uk: 'Відповідає нормі',
    en: 'Meets the standard',
  },
  checklistFail: {
    uk: 'Не відповідає нормі',
    en: 'Does not meet the standard',
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
    en: 'Regulatory framework',
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
    en: 'Your business demonstrates a high level of maturity. Keep maintaining best practices.',
  },
  conclusionMid: {
    uk: 'Є зони для покращення. Рекомендуємо звернути увагу на блоки з низькими показниками.',
    en: 'There is room for improvement. We recommend paying attention to the blocks with low scores.',
  },
  conclusionWarning: {
    uk: 'Нестабільна ситуація зі значними вразливостями. Рекомендується детальний аналіз проблемних зон.',
    en: 'An unstable situation with significant vulnerabilities. A detailed analysis of the problem areas is recommended.',
  },
  conclusionLow: {
    uk: 'Виявлено критичні зони ризику. Рекомендується професійна консультація.',
    en: 'Critical risk areas have been identified. Professional consultation is recommended.',
  },
  onPathTo: {
    uk: 'Ви пройшли {pct}% шляху до ідеального бізнесу.',
    en: 'You are {pct}% of the way to the ideal business.',
  },
  verdictHigh: {
    uk: 'Бізнес у гарній формі.',
    en: 'The business is in good shape.',
  },
  verdictMid: {
    uk: 'Прийнятний рівень, але потребує доопрацювання.',
    en: 'An acceptable level, but it needs improvement.',
  },
  verdictWarning: {
    uk: 'Ситуація нестабільна. Значні вразливості.',
    en: 'The situation is unstable. Significant vulnerabilities.',
  },
  verdictLow: {
    uk: 'Критичні ризики. Потрібна консультація.',
    en: 'Critical risks. Consultation is required.',
  },
  indicator: {
    uk: 'Показник:',
    en: 'Indicator:',
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
    en: 'Low risk. A stable zone, the system works correctly.',
  },
  legendYellow: {
    uk: '70% – 79%',
    en: '70% – 79%',
  },
  legendYellowDesc: {
    uk: 'Помірний ризик. Прийнятний рівень, але потребує контролю та доопрацювання.',
    en: 'Moderate risk. An acceptable level, but it needs control and improvement.',
  },
  legendOrange: {
    uk: '65% – 69%',
    en: '65% – 69%',
  },
  legendOrangeDesc: {
    uk: 'Високий ризик. Нестабільна ситуація, значні вразливості.',
    en: 'High risk. An unstable situation with significant vulnerabilities.',
  },
  legendRed: {
    uk: '0% – 64%',
    en: '0% – 64%',
  },
  legendRedDesc: {
    uk: 'Критичний ризик. Критична зона, потребує уваги та негайного втручання.',
    en: 'Critical risk. A critical zone that requires attention and immediate intervention.',
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
    uk: 'Високий ризик',
    en: 'High risk',
  },
  zoneRisk: {
    uk: 'Критичний ризик',
    en: 'Critical risk',
  },
  zoneDescRisk: {
    uk: 'Критична зона, потребує уваги та негайного втручання.',
    en: 'A critical zone that requires attention and immediate intervention.',
  },
  zoneDescWarning: {
    uk: 'Нестабільна ситуація, значні вразливості.',
    en: 'An unstable situation with significant vulnerabilities.',
  },
  zoneDescDeveloping: {
    uk: 'Прийнятний рівень, але потребує контролю та доопрацювання.',
    en: 'An acceptable level, but it needs control and improvement.',
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
    en: 'Crowe experts will help you carry out an in-depth risk analysis and develop a strategy to improve your business efficiency.',
  },
  ctaNote: {
    uk: 'Найближчим часом наші фахівці зв’яжуться з вами, щоб обговорити результати та наступні кроки.',
    en: 'Our specialists will contact you shortly to discuss the results and the next steps.',
  },
  ctaBtn: {
    uk: 'Замовити консультацію',
    en: 'Request a consultation',
  },
  ctaRestart: {
    uk: 'Пройти знову',
    en: 'Retake the test',
  },
  ctaEmailLabel:    { uk: 'EMAIL',    en: 'EMAIL' },
  ctaTelegramLabel: { uk: 'TELEGRAM', en: 'TELEGRAM' },
  ctaWebLabel:      { uk: 'WEB',      en: 'WEB' },
  ctaEmailValue:    { uk: 'office@bizcheck.md', en: 'office@bizcheck.md' },
  ctaTelegramValue: { uk: '@CROWE_TM', en: '@CROWE_TM' },
  ctaWebValue:      { uk: 'crowe-tm.md', en: 'crowe-tm.md' },
  ctaCrowe: { uk: 'Crowe Turcan Mikhailenko', en: 'Crowe Turcan Mikhailenko' },
  ctaDisclaimer: {
    uk: 'Звіт сформовано автоматично платформою Bizcheck.md і має виключно інформаційний характер. Він не є офіційним професійним, юридичним, фінансовим чи іншим висновком і не може вважатися оцінкою діяльності, рівня «здоров’я» або компетенцій компанії.\n\nПлатформа не гарантує повноту й точність результатів. Для ухвалення рішень рекомендується проведення окремого аналізу за участю профільних фахівців.',
    en: 'This report is generated automatically by the Bizcheck.md platform and is for informational purposes only. It does not constitute an official professional, legal, financial or other opinion and cannot be considered an assessment of the company’s activity, level of "health" or competence.\n\nThe platform does not guarantee the completeness and accuracy of the results. For decision-making, a separate analysis involving relevant specialists is recommended.',
  },

  // Loading / empty states
  loading: {
    uk: 'Завантаження...',
    en: 'Loading...',
  },
  noQuestions: {
    uk: 'Наразі запитання недоступні. Будь ласка, поверніться пізніше.',
    en: 'No questions are available at the moment. Please come back later.',
  },

  // PDF download
  downloadPdf: {
    uk: 'Завантажити звіт PDF',
    en: 'Download the PDF report',
  },
  telegramCta: {
    uk: 'Натисніть кнопку, відкрийте Telegram і натисніть START — PDF-звіт буде надіслано прямо в чат.',
    en: 'Press the button, open Telegram and tap START — the PDF report will be sent straight to the chat.',
  },
  telegramBtn: {
    uk: 'Надіслати звіт у Telegram',
    en: 'Send the report to Telegram',
  },
  telegramLoading: {
    uk: 'Підготовка...',
    en: 'Preparing...',
  },
  telegramError: {
    uk: 'Тимчасова помилка. Відкрито напряму.',
    en: 'Temporary error. Opened directly.',
  },

  // CTA success page (after quiz, before bot)
  ctaSuccessTitle: {
    uk: 'Тест завершено!',
    en: 'The test is complete!',
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
    uk: 'Натисніть кнопку нижче, відкрийте Telegram і натисніть START — PDF-звіт буде надіслано за кілька секунд.',
    en: 'Press the button below, open Telegram and tap START — the PDF report will be sent within a few seconds.',
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
    en: 'Error generating the PDF.',
  },
  ctaPdfRetry: {
    uk: 'Спробувати ще раз',
    en: 'Try again',
  },
  // CTA — contact gate (shown before delivery options)
  ctaContactTitle: {
    uk: 'Останній крок — ваші контактні дані',
    en: 'Last step — your contact details',
  },
  ctaContactDesc: {
    uk: 'Залиште ім’я та номер телефону, щоб ми могли зв’язатися з вами та обговорити результати.',
    en: 'Leave your name and phone number so we can contact you and discuss the results.',
  },
  ctaContactSubmitBtn: {
    uk: 'Продовжити',
    en: 'Continue',
  },
  ctaContactWarn: {
    uk: 'Будь ласка, введіть ім’я, номер телефону та надайте згоду на обробку даних.',
    en: 'Please enter your name, phone number and consent to data processing.',
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
  ctaDownloadDesc:     { uk: 'Зберегти звіт прямо на пристрій',
                          en: 'Save the report directly to your device' },
  ctaDownloadBtn:      { uk: 'Завантажити зараз', en: 'Download now' },

  ctaEmailTitle:       { uk: 'Надіслати на email', en: 'Send to email' },
  ctaEmailDesc:        { uk: 'Отримайте звіт на свою електронну пошту',
                          en: 'Receive the report in your inbox' },
  ctaEmailPlaceholder: { uk: 'адреса@email.com', en: 'address@email.com' },
  ctaEmailBtn:         { uk: 'Надіслати на email', en: 'Send' },
  ctaEmailSent:        { uk: 'Звіт уже в дорозі!',
                          en: 'The report is on its way!' },
  ctaEmailSentSub:     { uk: 'За кілька секунд ви отримаєте лист на {email} з кнопкою для відкриття звіту Bizcheck.md (PDF). Перевірте також теку «Спам».',
                          en: 'In a few seconds you will receive an email at {email} with a button to open the Bizcheck.md report (PDF). Please also check your Spam folder.' },
  ctaEmailResend:      { uk: 'Надіслати ще раз', en: 'Resend' },
  ctaEmailResent:      { uk: 'Надіслано ще раз ✓', en: 'Resent ✓' },
  ctaEmailComingSoon:  { uk: 'Незабаром', en: 'Coming soon' },
  ctaEmailSoonDesc:    { uk: 'Незабаром буде доступно й цим способом. Поки що скористайтеся Telegram.',
                          en: 'This method will be available soon. For now, please use Telegram.' },

  // Download done state — shown after PDF saved + email dispatched
  ctaDownloadDoneTitle: {
    uk: 'Звіт завантажено!',
    en: 'The report has been downloaded!',
  },
  ctaDownloadDoneSub: {
    uk: 'Перевірте теку «Завантаження» та поштову скриньку {email} — ми також надіслали копію на email про всяк випадок.',
    en: 'Check your Downloads folder and the {email} inbox — we have also sent a copy to your email just in case.',
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
    en: 'Crowe experts will help you carry out an in-depth risk analysis and develop a strategy to improve your business efficiency.',
  },
  pdfFooterContact: {
    uk: 'Найближчим часом наші фахівці зв’яжуться з вами, щоб обговорити результати та наступні кроки.',
    en: 'Our specialists will contact you shortly to discuss the results and the next steps.',
  },
  pdfFooterConfidential: {
    uk: 'Звіт сформовано автоматично платформою Bizcheck.md і має виключно інформаційний характер. Він не є професійним, юридичним, фінансовим чи іншим висновком і не може вважатися оцінкою діяльності, рівня «здоров’я» або компетенцій компанії.',
    en: 'This report is generated automatically by the Bizcheck.md platform and is for informational purposes only. It does not constitute a professional, legal, financial or other opinion and cannot be considered an assessment of the company’s activity, level of "health" or competence.',
  },
  pdfFooterGenerated: {
    uk: 'Платформа не гарантує повноту й точність результатів. Для ухвалення рішень рекомендується проведення окремого аналізу за участю профільних фахівців.',
    en: 'The platform does not guarantee the completeness and accuracy of the results. For decision-making, a separate analysis involving relevant specialists is recommended.',
  },

  // ============ LANDING PAGE ============

  // Hero
  heroNavLogin:  { uk: 'Увійти',  en: 'Log in' },
  heroNavSignup: { uk: 'Реєстрація', en: 'Sign up' },
  heroSearchPh:  { uk: 'Пошук тестів і шаблонів', en: 'Search tests or templates' },
  heroEyebrowLanding: { uk: 'ПЛАТФОРМА №1 У МОЛДОВІ', en: '#1 PLATFORM IN MOLDOVA' },
  heroTitleLine1: { uk: 'Bizcheck.md', en: 'Bizcheck.md' },
  heroTitleLine2: { uk: 'Чек-ап бізнесу', en: 'Business Checkup' },
  heroDescLanding: {
    uk: 'Професійні тести та шаблони для розвитку й відповідності вашого бізнесу.',
    en: 'Professional tests and templates for your business growth and compliance.',
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
    uk: 'Ми пропонуємо інтерактивні тести та професійні шаблони, створені для спрощення бізнес-процесів і економії часу.',
    en: 'We offer interactive tests and professional templates designed to simplify business activities and save time.',
  },
  aboutP3: {
    uk: 'Усі ресурси прості у використанні, редаговані та адаптовані до будь-якого типу компанії.',
    en: 'All resources are easy to use, editable and adaptable to any type of company.',
  },
  aboutCta: { uk: 'Перевірте компанію зараз', en: 'Check your company now' },
  aboutIllustrationAlt: {
    uk: 'Bizcheck на ноутбуці, планшеті та телефоні',
    en: 'Bizcheck on a laptop, tablet and phone',
  },

  // Why Bizcheck
  whyTitle:           { uk: 'Чому Bizcheck?',   en: 'Why Bizcheck?' },
  whyFastTitle:       { uk: 'Швидко і просто',   en: 'Fast and simple' },
  whyFastDesc:        {
    uk: 'Прості процеси, без складнощів чи технічних знань.',
    en: 'Simple processes, without complications or technical knowledge.',
  },
  whyDocsTitle:       { uk: 'Професійні документи', en: 'Professional documents' },
  whyDocsDesc:        {
    uk: 'Шаблони, створені відповідно до стандартів, що використовуються в бізнесі.',
    en: 'Templates created according to the standards used in business.',
  },
  whyBusinessTitle:   { uk: 'Для будь-якого бізнесу', en: 'For any business' },
  whyBusinessDesc:    {
    uk: 'Рішення, адаптовані для стартапів, фрилансерів і будь-яких типів компаній.',
    en: 'Solutions tailored for startups, freelancers and any type of company.',
  },
  whyLegalTitle:      { uk: 'Відповідає законодавству', en: 'Compliant with the law' },
  whyLegalDesc:       {
    uk: 'Документи, оновлені відповідно до чинних правових вимог.',
    en: 'Documents updated in line with current legal requirements.',
  },

  // Catalog
  catalogTitle:       { uk: 'Пройдіть Чек-ап вашого бізнесу ', en: 'Run a Checkup of your business' },
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
  catalogStartTest:   { uk: 'Почати тест', en: 'Start the test' },
  catalogDownload:    { uk: 'Завантажити',     en: 'Download' },
  catalogViewDetails: { uk: 'Детальніше', en: 'View details' },
  catalogComingSoon:  { uk: 'Незабаром',    en: 'Coming soon' },
  catalogComingSoonBadge: { uk: 'Скоро стане доступним', en: 'Available soon' },
  catalogEmpty:       { uk: 'Нічого не знайдено за обраними фільтрами.',
                        en: 'Nothing found for the selected filters.' },
  catalogSectionTests:     { uk: 'Тести',    en: 'Tests' },
  catalogSectionTemplates: { uk: 'Шаблони', en: 'Templates' },

  // Testimonials & FAQ
  testimonialsTitle: { uk: 'Що кажуть наші клієнти?', en: 'What our clients say' },
  faqTitle:          { uk: 'Поширені запитання',      en: 'Frequently asked questions' },
  testimonialsEmpty: { uk: 'Відгуків поки немає.', en: 'No testimonials yet.' },
  faqEmpty:          { uk: 'Запитань поки немає.',    en: 'No questions yet.' },

  // Public "leave a review" form
  reviewLeave:       { uk: 'Залишити відгук',            en: 'Leave a review' },
  reviewFormTitle:   { uk: 'Поділіться своїм досвідом', en: 'Share your experience' },
  reviewFormSubtitle:{ uk: 'Ваш відгук з’являється на сайті одразу.', en: 'Your review appears on the site immediately.' },
  reviewName:        { uk: 'Ваше ім’я',                 en: 'Your name' },
  reviewNamePh:      { uk: 'Напр.: Влад Р.',                en: 'E.g.: Vlad R.' },
  reviewRole:        { uk: 'Посада / компанія (необов’язково)',  en: 'Role / company (optional)' },
  reviewRolePh:      { uk: 'Напр.: CEO @ Фірма SRL',        en: 'E.g.: CEO @ Company SRL' },
  reviewRating:      { uk: 'Ваша оцінка',                    en: 'Your rating' },
  reviewText:        { uk: 'Ваш відгук',                    en: 'Your review' },
  reviewTextPh:      { uk: 'Розкажіть про ваш досвід...', en: 'Tell us about your experience...' },
  reviewSubmit:      { uk: 'Надіслати відгук',           en: 'Submit review' },
  reviewSending:     { uk: 'Надсилання...',              en: 'Sending...' },
  reviewThanks:      { uk: 'Дякуємо! Ваш відгук опубліковано. 🎉', en: 'Thank you! Your review has been published. 🎉' },
  reviewErrName:     { uk: 'Вкажіть ваше ім’я (мін. 2 символи).', en: 'Enter your name (min. 2 characters).' },
  reviewErrText:     { uk: 'Відгук занадто короткий (мін. 3 символи).', en: 'The review is too short (min. 3 characters).' },
  reviewErrRate:     { uk: 'Забагато відгуків. Спробуйте пізніше.', en: 'Too many reviews. Try again later.' },
  reviewErrGeneric:  { uk: 'Не вдалося надіслати відгук. Спробуйте ще раз.', en: 'Could not submit the review. Please try again.' },

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
  searchSeeAll:        { uk: 'Показати всі результати', en: 'See all results' },
  menuJumpAbout:       { uk: 'Про платформу',    en: 'About the platform' },
  menuJumpWhy:         { uk: 'Чому Bizcheck',      en: 'Why Bizcheck' },
  menuJumpCatalog:     { uk: 'Повний каталог',     en: 'Full catalog' },
  menuJumpTests:       { uk: 'Лише Тести',          en: 'Tests only' },
  menuJumpTemplates:   { uk: 'Лише Шаблони',       en: 'Templates only' },
  menuJumpTestimonials:{ uk: 'Відгуки',        en: 'Testimonials' },
  menuJumpFaq:         { uk: 'Поширені запитання', en: 'FAQ' },

  // Footer
  footerResources:     { uk: 'Ресурси',   en: 'Resources' },
  footerLinkTests:     { uk: 'Тести',     en: 'Tests' },
  footerLinkTemplates: { uk: 'Шаблони',  en: 'Templates' },
  footerLegal:         { uk: 'Правова інформація',     en: 'Legal' },
  footerTerms:         { uk: 'Умови та положення',         en: 'Terms and conditions' },
  footerPrivacy:       { uk: 'Політика конфіденційності', en: 'Privacy policy' },
  footerCookies:       { uk: 'Політика cookies',            en: 'Cookie policy' },
  footerContacts:      { uk: 'Контакти',                    en: 'Contacts' },
  footerHours:         { uk: 'Пн-Пт: 9:00 - 18:00',           en: 'Mon-Fri: 9:00 - 18:00' },
  footerCopyright:     { uk: 'Усі права захищені',  en: 'All rights reserved' },

  // Cookie banner
  cookieTitle: {
    uk: 'Цей сайт використовує cookie-файли',
    en: 'This site uses cookies',
  },
  cookieDesc: {
    uk: 'Ми використовуємо необхідні cookie-файли для роботи сайту та, за бажанням, файли аналітики й маркетингу для покращення досвіду. Ви можете прийняти всі, відмовитися від необов’язкових або обрати індивідуально.',
    en: 'We use essential cookies for the site to function and, optionally, analytics and marketing cookies to improve your experience. You can accept all, reject the optional ones or choose individually.',
  },
  cookieAcceptAll: { uk: 'Прийняти всі', en: 'Accept all' },
  cookieRejectAll: { uk: 'Відхилити необов’язкові', en: 'Reject optional' },
  cookieCustomize: { uk: 'Налаштування', en: 'Settings' },
  cookieSave:      { uk: 'Зберегти налаштування', en: 'Save preferences' },
  cookieBack:      { uk: 'Назад', en: 'Back' },
  cookiePolicyLink: { uk: 'Політика конфіденційності', en: 'Privacy policy' },

  cookieCatNecessaryTitle: { uk: 'Строго необхідні', en: 'Strictly necessary' },
  cookieCatNecessaryDesc: {
    uk: 'Необхідні для автентифікації, сесії тесту та безпеки. Не можуть бути вимкнені.',
    en: 'Essential for authentication, the quiz session and security. They cannot be disabled.',
  },
  cookieCatAnalyticsTitle: { uk: 'Аналітика', en: 'Analytics' },
  cookieCatAnalyticsDesc: {
    uk: 'Анонімна статистика трафіку сайту — допомагає нам покращувати контент.',
    en: 'Anonymous statistics about site traffic — they help us improve the content.',
  },
  cookieCatMarketingTitle: { uk: 'Маркетинг', en: 'Marketing' },
  cookieCatMarketingDesc: {
    uk: 'Дозволяють показувати релевантні пропозиції через зовнішніх партнерів (соцмережі, реклама).',
    en: 'Allow relevant offers to be shown through external partners (social networks, advertising).',
  },
  cookieAlwaysOn: { uk: 'Завжди увімкнено', en: 'Always on' },

  footerCookieSettings: { uk: 'Налаштування cookies', en: 'Cookie settings' },

  // Header quick-jump
  navTests: { uk: 'Тести', en: 'Tests' },
} as const;

export type TranslationKey = keyof typeof translations;
