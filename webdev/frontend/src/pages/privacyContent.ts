// Privacy policy in Ukrainian and English, translated in full from the official
// Romanian source ('Politica de protecție a datelor website_MOD.docx') and then
// adapted to Ukrainian law for the bizcheck.com.ua launch: references to Moldovan
// Law No. 195/2024, to the CNPDCP and to IDNP were replaced with the Law of Ukraine
// "On Personal Data Protection" No. 2297-VI of 01.06.2010, the Ukrainian Parliament
// Commissioner for Human Rights (Ombudsman) and RNOKPP/UNZR respectively.
// Second pass (legal accuracy against 2297-VI): the defined term "Оператор" was replaced
// throughout by the statutory term "Володілець (персональних даних)" (EN: "Controller");
// the rights section was rebuilt on art. 8(2) with the GDPR-only rights (portability,
// restriction of processing, general right to be forgotten) moved into an explicit
// "voluntary safeguards" section; the response deadline was corrected to 30 CALENDAR days
// (art. 8(2)(4) and art. 16); the access fee was removed (art. 16 — access is free of
// charge); sections on notifying the Commissioner about "особливий ризик" processing
// (art. 9 + Commissioner's Order No. 1/02-14) and on the responsible person (art. 24(2))
// were added; DPIA and "standard contractual clauses" were re-labelled as voluntary
// (neither exists in Ukrainian law).
// Legal text — translated faithfully; do not alter the meaning.
// Any further legal change must be reviewed by a Ukrainian-qualified lawyer.
// `k`: 'title' | 'h2' (section heading) | 'p' (paragraph / list line).
export interface PrivacyBlock { k: 'title' | 'h2' | 'p'; uk: string; en: string; }

export const PRIVACY_BLOCKS: PrivacyBlock[] = [
  {
    k: "title",
    uk: "Політика захисту персональних даних",
    en: "Personal Data Protection Policy",
  },
  {
    k: "h2",
    uk: "Визначення та терміни",
    en: "Definitions and terms",
  },
  {
    k: "p",
    uk: "«Персональні дані» — це відомості чи сукупність відомостей про фізичну особу, яка ідентифікована або може бути конкретно ідентифікована (далі — суб'єкт даних), як це визначено в Законі України «Про захист персональних даних» № 2297-VI від 01.06.2010. Фізична особа вважається такою, що може бути ідентифікована, коли вона може бути прямо чи опосередковано впізнана, зокрема за посиланням на ідентифікатор, такий як ім'я, прізвище, реєстраційний номер облікової картки платника податків (РНОКПП) або унікальний номер запису в Єдиному державному демографічному реєстрі (УНЗР), дані про поведінку та спосіб придбання/закупівлі, а також один або декілька специфічних елементів її фізичної, економічної, культурної чи соціальної ідентичності.",
    en: "“Personal data” means information or a set of information about a natural person who is identified or can be specifically identified (hereinafter — the data subject), as defined in the Law of Ukraine “On Personal Data Protection” No. 2297-VI of 1 June 2010. A natural person is deemed identifiable where they can be identified, directly or indirectly, in particular by reference to an identifier such as first name, last name, the registration number of the taxpayer’s registration card (RNOKPP) or the unique record number in the Unified State Demographic Register (UNZR), data concerning behaviour and manner of acquisition/purchase, as well as one or more specific elements of their physical, economic, cultural or social identity.",
  },
  {
    k: "p",
    uk: "«Обробка персональних даних» означає будь-яку операцію або сукупність операцій, які здійснюються з персональними даними, з використанням або без використання автоматизованих засобів, такі як: збирання, реєстрація, автоматизація, зберігання, збереження, відновлення, адаптація чи зміна, вилучення, ознайомлення, використання, розкриття шляхом передачі, поширення або будь-який інший спосіб надання доступу, поєднання чи комбінування, блокування, видалення або знищення.",
    en: "“Processing of personal data” means any operation or set of operations performed on personal data, whether or not by automated means, such as: collection, recording, automation, storage, preservation, retrieval, adaptation or alteration, extraction, consultation, use, disclosure by transmission, dissemination or any other means of making available, alignment or combination, blocking, erasure or destruction.",
  },
  {
    k: "p",
    uk: "«Система обліку персональних даних» (у термінології Закону України «Про захист персональних даних» — база персональних даних, у тому числі у формі картотек) — це будь-яка структурована сукупність персональних даних, доступних за визначеними критеріями, незалежно від того, чи є вона централізованою, децентралізованою або розподіленою за функціональними чи географічними критеріями.",
    en: "“Personal data filing system” (in the terminology of the Law of Ukraine “On Personal Data Protection” — a personal data database, including in the form of card indexes) means any structured set of personal data accessible according to specific criteria, whether centralised, decentralised or distributed on a functional or geographical basis.",
  },
  {
    k: "p",
    uk: "«Володілець персональних даних» (далі — Володілець) — це фізична або юридична особа, яка визначає мету обробки персональних даних, встановлює склад цих даних та процедури їх обробки, якщо інше не визначено законом. У розумінні цієї Політики Володільцем є компанія „Crowe Țurcan Mikhailenko” S.R.L.",
    en: "“Owner of personal data” (hereinafter — the Controller) means a natural or legal person who determines the purpose of the processing of personal data, establishes the composition of those data and the procedures for their processing, unless otherwise provided by law. Within the meaning of this Policy, the Controller is the company „Crowe Țurcan Mikhailenko” S.R.L. The English term “Controller” is used throughout this Policy for the Ukrainian statutory term “володілець персональних даних”.",
  },
  {
    k: "p",
    uk: "«Розпорядник персональних даних» — це фізична або юридична особа, якій Володілець або закон надає право обробляти персональні дані від імені Володільця. Розпорядник обробляє дані виключно з метою і в обсязі, визначених Володільцем у договорі або в письмовому дорученні.",
    en: "“Administrator (processor) of personal data” means a natural or legal person to whom the Controller or the law grants the right to process personal data on the Controller’s behalf. The processor processes data solely for the purpose and to the extent determined by the Controller in a contract or in a written instruction.",
  },
  {
    k: "p",
    uk: "«Згода суб'єкта персональних даних» — це вільне, конкретне, поінформоване та однозначне волевиявлення суб'єкта даних, яким він приймає, шляхом заяви або недвозначної дії, обробку персональних даних, що його стосуються.",
    en: "“Consent of the data subject” means any freely given, specific, informed and unambiguous indication of the data subject’s wishes by which they accept, through a statement or a clear affirmative action, the processing of personal data relating to them.",
  },
  {
    k: "p",
    uk: "«Уповноважений Верховної Ради України з прав людини» (далі — Уповноважений) — це посадова особа, яка відповідно до Закону України «Про захист персональних даних» здійснює контроль за додержанням законодавства про захист персональних даних. В Україні не створено окремого спеціалізованого органу із захисту персональних даних: ці функції покладено на Уповноваженого та його Секретаріат. Контроль за додержанням законодавства про захист персональних даних здійснюють також суди.",
    en: "“Ukrainian Parliament Commissioner for Human Rights” (hereinafter — the Commissioner, also known as the Ombudsman) means the official who, pursuant to the Law of Ukraine “On Personal Data Protection”, exercises control over compliance with the legislation on the protection of personal data. Ukraine has not established a separate specialised data protection agency: these functions are vested in the Commissioner and their Secretariat. Control over compliance with personal data protection legislation is also exercised by the courts.",
  },
  {
    k: "p",
    uk: "Поняття та терміни цієї Політики, які не були визначені вище, тлумачаться відповідно до Закону України «Про захист персональних даних» № 2297-VI від 01.06.2010 та інших актів законодавства України у цій сфері, окрім випадків, коли їм надано інше значення.",
    en: "Concepts and terms in this Policy that have not been defined above shall be interpreted in accordance with the Law of Ukraine “On Personal Data Protection” No. 2297-VI of 1 June 2010 and other acts of Ukrainian legislation in this field, except where a different meaning is assigned to them.",
  },
  {
    k: "h2",
    uk: "Вступ",
    en: "Introduction",
  },
  {
    k: "p",
    uk: "Ця Політика захисту персональних даних встановлює правила, принципи та процедури, що застосовуються в межах компанії „Crowe Țurcan Mikhailenko” S.R.L., щодо збирання, використання, зберігання, передачі та захисту персональних даних клієнтів, потенційних клієнтів, працівників, партнерів та інших осіб, які взаємодіють з компанією та/або залучені до договірних відносин, відповідно до законодавства України, зокрема Закону України «Про захист персональних даних» № 2297-VI від 01.06.2010, міжнародних договорів України у цій сфері, у тому числі Конвенції Ради Європи про захист осіб у зв'язку з автоматизованою обробкою персональних даних (ETS № 108), ратифікованої Україною, а також відповідних міжнародних стандартів, включно з Регламентом ЄС 2016/679 (GDPR) — у тій мірі, у якій він є застосовним. Україна не є державою — членом Європейського Союзу, і GDPR не є частиною національного законодавства України; він застосовується до Володільця лише у випадках, прямо передбачених його статтею 3 (зокрема при обробці даних осіб, які перебувають у Європейському Союзі).",
    en: "This Personal Data Protection Policy establishes the rules, principles and procedures applicable within the company „Crowe Țurcan Mikhailenko” S.R.L. regarding the collection, use, storage, transfer and protection of the personal data of clients, potential clients, employees, partners and other persons who interact with the company and/or are involved in contractual relationships, in accordance with the legislation of Ukraine, in particular the Law of Ukraine “On Personal Data Protection” No. 2297-VI of 1 June 2010, the international treaties of Ukraine in this field, including the Council of Europe Convention for the Protection of Individuals with regard to Automatic Processing of Personal Data (ETS No. 108), ratified by Ukraine, as well as the relevant international standards, including EU Regulation 2016/679 (GDPR) — to the extent applicable. Ukraine is not a Member State of the European Union and the GDPR does not form part of Ukrainian national law; it applies to the Controller only in the cases expressly provided for by its Article 3 (in particular, when processing the data of persons who are in the European Union).",
  },
  {
    k: "h2",
    uk: "Цілі",
    en: "Objectives",
  },
  {
    k: "p",
    uk: "Встановлення єдиної та узгодженої системи обробки персональних даних в операційних процесах Володільця;",
    en: "Establishing a unified and consistent system for the processing of personal data within the Controller’s operational processes;",
  },
  {
    k: "p",
    uk: "Забезпечення відповідності застосовному законодавству про захист персональних даних, включно із Законом України «Про захист персональних даних» № 2297-VI та відповідними стандартами;",
    en: "Ensuring compliance with the applicable legislation on the protection of personal data, including the Law of Ukraine “On Personal Data Protection” No. 2297-VI and the relevant standards;",
  },
  {
    k: "p",
    uk: "Захист прав суб'єктів даних (клієнтів, відвідувачів вебсайту, партнерів тощо), а також конфіденційності, цілісності та доступності персональних даних;",
    en: "Protecting the rights of data subjects (clients, website visitors, partners, etc.), as well as the confidentiality, integrity and availability of personal data;",
  },
  {
    k: "p",
    uk: "Запобігання та захист від ризиків, пов'язаних з обробкою персональних даних.",
    en: "Preventing and protecting against the risks associated with the processing of personal data.",
  },
  {
    k: "h2",
    uk: "Сфера застосування",
    en: "Scope of application",
  },
  {
    k: "p",
    uk: "Ця Політика застосовується до всіх операцій з обробки персональних даних, що здійснюються Володільцем, незалежно від форми чи середовища, у якому обробляються дані (в електронному вигляді, на паперовому носії, через інформаційні системи, за допомогою цифрових платформ тощо).",
    en: "This Policy applies to all personal data processing operations carried out by the Controller, irrespective of the form or medium in which the data are processed (in electronic form, on paper, through information systems, by means of digital platforms, etc.).",
  },
  {
    k: "p",
    uk: "Політика застосовується до всіх категорій суб'єктів даних, включно, але не обмежуючись: клієнтів, потенційних клієнтів, відвідувачів вебсайту та користувачів онлайн-платформ Володільця.",
    en: "The Policy applies to all categories of data subjects, including but not limited to: clients, potential clients, website visitors and users of the Controller’s online platforms.",
  },
  {
    k: "p",
    uk: "Положення Політики є обов'язковими для всіх суб'єктів даних, для співробітників Володільця, для уповноважених осіб, а також для будь-якої особи, яка має доступ до персональних даних у межах трудових, договірних або професійних відносин з Володільцем.",
    en: "The provisions of the Policy are binding on all data subjects, on the Controller’s employees, on authorised persons, as well as on any person who has access to personal data within the framework of an employment, contractual or professional relationship with the Controller.",
  },
  {
    k: "p",
    uk: "Усі особи, які обробляють персональні дані від імені Володільця, зобов'язані дотримуватися цієї Політики та застосовувати передбачені нею технічні й організаційні заходи.",
    en: "All persons who process personal data on behalf of the Controller are required to comply with this Policy and to apply the technical and organisational measures provided for herein.",
  },
  {
    k: "h2",
    uk: "Принципи обробки персональних даних",
    en: "Principles of the processing of personal data",
  },
  {
    k: "p",
    uk: "Обробка даних у межах діяльності Володільця здійснюється відповідно до таких принципів:",
    en: "The processing of data within the Controller’s activity is carried out in accordance with the following principles:",
  },
  {
    k: "p",
    uk: "Законність, справедливість і прозорість. Володілець обробляє персональні дані законно, справедливо та прозоро щодо суб'єкта даних (суб'єкта персональних даних), відповідно до Закону України «Про захист персональних даних» № 2297-VI. Усі операції з обробки ґрунтуються на належній правовій підставі та повідомляються суб'єктам даних у зрозумілий і доступний спосіб.",
    en: "Lawfulness, fairness and transparency. The Controller processes personal data lawfully, fairly and in a transparent manner in relation to the data subject (the subject of the personal data), in accordance with the Law of Ukraine “On Personal Data Protection” No. 2297-VI. All processing operations are based on an appropriate legal basis and are communicated to data subjects in a clear and accessible manner.",
  },
  {
    k: "p",
    uk: "Обмеження мети. Дані збираються з визначеними, чіткими та законними цілями, специфічними для діяльності Володільця у сфері надання послуг консультування, впровадження та підтримки у сфері захисту персональних даних, і не обробляються надалі у спосіб, несумісний з цими цілями.",
    en: "Purpose limitation. Data are collected for specified, explicit and legitimate purposes, specific to the Controller’s activity of providing consultancy, implementation and support services in the field of personal data protection, and are not further processed in a manner incompatible with those purposes.",
  },
  {
    k: "p",
    uk: "Мінімізація зібраних даних. Володілець забезпечує, щоб зібрані дані були адекватними, релевантними та обмеженими тим, що необхідно стосовно цілей, задля яких вони обробляються. Володілець уникає надмірного та невиправданого збирання даних.",
    en: "Data minimisation. The Controller ensures that the data collected are adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed. The Controller avoids the excessive and unjustified collection of data.",
  },
  {
    k: "p",
    uk: "Точність даних. Володілець вживає всіх розумних заходів для забезпечення того, щоб персональні дані були точними, повними та актуальними. Суб'єкт даних має право вимагати виправлення неточних або неповних даних.",
    en: "Accuracy of data. The Controller takes all reasonable measures to ensure that personal data are accurate, complete and up to date. The data subject has the right to request the rectification of inaccurate or incomplete data.",
  },
  {
    k: "p",
    uk: "Актуальність і знищення даних. Відповідно до статті 8 Закону України «Про захист персональних даних» суб'єкт даних має право пред'явити вмотивовану вимогу щодо зміни або знищення своїх персональних даних, якщо ці дані обробляються незаконно чи є недостовірними. Володілець розглядає таку вимогу та надає відповідь у строк, що не перевищує тридцяти календарних днів з дня її надходження, і діє відповідно до своїх юридичних зобов'язань. Понад цей законодавчий мінімум Володілець добровільно зобов'язується знищувати дані також тоді, коли вони більше не потрібні для цілей, задля яких були зібрані, або коли згоду відкликано і відсутня інша правова підстава для обробки.",
    en: "Accuracy and destruction of data. Under Article 8 of the Law of Ukraine “On Personal Data Protection”, the data subject has the right to submit a reasoned demand for the modification or destruction of their personal data where those data are processed unlawfully or are inaccurate. The Controller examines such a demand and provides a reply within a period not exceeding thirty calendar days from the date of its receipt, and acts in accordance with its legal obligations. Over and above this statutory minimum, the Controller voluntarily undertakes to destroy data also where they are no longer necessary for the purposes for which they were collected, or where consent has been withdrawn and there is no other legal basis for the processing.",
  },
  {
    k: "p",
    uk: "Обмеження зберігання. Дані зберігаються у формі, яка дозволяє ідентифікацію суб'єктів даних, лише протягом періоду, що не перевищує час, необхідний для досягнення цілей, задля яких вони зібрані, з дотриманням законних строків, специфічних для діяльності Володільця (наприклад: бухгалтерський облік). Після закінчення застосовних строків дані видаляються.",
    en: "Storage limitation. Data are kept in a form which permits identification of data subjects only for a period not exceeding the time necessary to achieve the purposes for which they are collected, in compliance with the legal periods specific to the Controller’s activity (for example: accounting). Upon expiry of the applicable periods, the data are deleted.",
  },
  {
    k: "p",
    uk: "Цілісність і конфіденційність. Володілець обробляє дані у спосіб, що забезпечує їх належну безпеку, включно із захистом від несанкціонованої чи незаконної обробки, випадкової втрати, знищення або пошкодження, шляхом впровадження технічних та організаційних заходів, відповідних рівню ризику.",
    en: "Integrity and confidentiality. The Controller processes data in a manner that ensures their appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, by implementing technical and organisational measures appropriate to the level of risk.",
  },
  {
    k: "p",
    uk: "Відповідальність. Володілець несе відповідальність за дотримання принципів, викладених у цій Політиці, і зобов'язаний демонструвати відповідність їм, у тому числі шляхом документування внутрішніх процесів, навчання персоналу, періодичного перегляду політик та ведення реєстру операцій з обробки.",
    en: "Accountability. The Controller is responsible for compliance with the principles set out in this Policy and is required to demonstrate such compliance, including by documenting internal processes, training staff, periodically reviewing policies and maintaining a record of processing operations.",
  },
  {
    k: "p",
    uk: "Дотримання прав суб'єкта даних. Володілець застосовує всі необхідні заходи для забезпечення ефективного захисту прав суб'єктів даних відповідно до чинного законодавства України, а також відповідно до GDPR — у тій мірі, у якій він є застосовним, надаючи зрозумілі та ефективні варіанти й методи подання запитів.",
    en: "Observance of the rights of the data subject. The Controller applies all necessary measures to ensure the effective protection of the rights of data subjects in accordance with the legislation of Ukraine in force, as well as in accordance with the GDPR — to the extent applicable, by providing clear and effective options and methods for submitting requests.",
  },
  {
    k: "p",
    uk: "Зберігання даних з метою архівування та для співпраці з правоохоронними органами. Володілець може зберігати певні дані протягом більш тривалого строку, коли це необхідно:",
    en: "Retention of data for the purpose of archiving and for cooperation with law enforcement authorities. The Controller may retain certain data for a longer period where this is necessary:",
  },
  {
    k: "p",
    uk: "для виконання законних зобов'язань щодо архівування;",
    en: "to fulfil legal archiving obligations;",
  },
  {
    k: "p",
    uk: "для доведення та здійснення прав і законних інтересів у можливих спорах;",
    en: "to establish and exercise rights and legitimate interests in possible disputes;",
  },
  {
    k: "p",
    uk: "для співпраці з правоохоронними органами, публічними органами влади або судовими інстанціями, коли вони запитують дані на законних підставах.",
    en: "to cooperate with law enforcement authorities, public authorities or judicial bodies when they lawfully request the data.",
  },
  {
    k: "p",
    uk: "Ця дія зі зберігання здійснюється суворо в межах, передбачених законодавством, лише протягом необхідного періоду.",
    en: "This retention is carried out strictly within the limits provided for by law and only for the necessary period.",
  },
  {
    k: "h2",
    uk: "Категорії персональних даних, що обробляються.",
    en: "Categories of personal data processed.",
  },
  {
    k: "p",
    uk: "Володілець обробляє дані клієнтів та/або потенційних клієнтів під час доступу до вебсайту Володільця, запиту інформації про послуги, подання заявки через онлайн-форми, звернення електронною поштою чи телефоном або при ініціюванні взаємодії з метою отримання пропозиції, надання послуг чи розвитку договірних відносин, зокрема:",
    en: "The Controller processes the data of clients and/or potential clients when they access the Controller’s website, request information about services, submit an application through online forms, make contact by email or telephone, or initiate an interaction for the purpose of obtaining an offer, providing services or developing contractual relationships, in particular:",
  },
  {
    k: "p",
    uk: "ідентифікаційні дані, електронна пошта та контактні дані;",
    en: "identification data, email address and contact details;",
  },
  {
    k: "p",
    uk: "дані, що використовуються з маркетинговою метою;",
    en: "data used for marketing purposes;",
  },
  {
    k: "p",
    uk: "дані, згенеровані через використання цифрових каналів: онлайн-ідентифікатори, IP-адреси, файли cookie, уподобання;",
    en: "data generated through the use of digital channels: online identifiers, IP addresses, cookies, preferences;",
  },
  {
    k: "p",
    uk: "Володілець обробляє дані щодо функціонування інформаційних систем та доступу користувачів:",
    en: "The Controller processes data concerning the operation of information systems and user access:",
  },
  {
    k: "p",
    uk: "Журнали (логи) та історія дій в авторизованих системах;",
    en: "Logs and the history of actions in authorised systems;",
  },
  {
    k: "p",
    uk: "Технічні дані пристроїв, що використовуються;",
    en: "Technical data of the devices used;",
  },
  {
    k: "p",
    uk: "Дані, отримані внаслідок внутрішніх процедур моніторингу безпеки.",
    en: "Data obtained as a result of internal security monitoring procedures.",
  },
  {
    k: "p",
    uk: "Володілець використовує автоматизовані технології, за допомогою яких може обробляти:",
    en: "The Controller uses automated technologies by means of which it may process:",
  },
  {
    k: "p",
    uk: "ідентифікатори cookie;",
    en: "cookie identifiers;",
  },
  {
    k: "p",
    uk: "технічні параметри навігації вебсайтом;",
    en: "technical parameters of navigation on the website;",
  },
  {
    k: "p",
    uk: "дані, необхідні для оптимізації функціонування цифрових платформ.",
    en: "data necessary for optimising the operation of the digital platforms.",
  },
  {
    k: "h2",
    uk: "Права суб'єкта даних:",
    en: "Rights of the data subject:",
  },
  {
    k: "p",
    uk: "Права, наведені в цьому розділі, встановлені частиною другою статті 8 Закону України «Про захист персональних даних» № 2297-VI. Це вичерпний перелік прав, які надає суб'єкту даних законодавство України.",
    en: "The rights set out in this section are established by Article 8(2) of the Law of Ukraine “On Personal Data Protection” No. 2297-VI. This is the exhaustive list of the rights which the legislation of Ukraine confers on the data subject.",
  },
  {
    k: "p",
    uk: "Право знати про обробку. Суб'єкт даних має право знати про джерела збирання, місцезнаходження своїх персональних даних, мету їх обробки, а також отримувати інформацію про умови надання доступу до персональних даних (пункти 1 і 2 частини другої статті 8 Закону).",
    en: "Right to know about the processing. The data subject has the right to know the sources of collection and the location of their personal data and the purpose of the processing thereof, and to receive information about the conditions of granting access to personal data (Article 8(2), points 1 and 2, of the Law).",
  },
  {
    k: "p",
    uk: "Право на доступ. Суб'єкт даних має право на доступ до своїх персональних даних і право отримати не пізніш як за тридцять календарних днів з дня надходження запиту, крім випадків, передбачених законом, відповідь про те, чи обробляються його персональні дані, а також зміст таких даних (пункти 3 і 4 частини другої статті 8 Закону). Відповідно до статті 16 Закону доступ суб'єкта персональних даних до даних про себе здійснюється безоплатно. Володілець не стягує жодної плати за такий доступ — ані за перший, ані за будь-який наступний запит.",
    en: "Right of access. The data subject has the right of access to their personal data and the right to receive, not later than thirty calendar days from the date of receipt of the request, save in the cases provided for by law, a reply as to whether their personal data are being processed, together with the content of such data (Article 8(2), points 3 and 4, of the Law). Under Article 16 of the Law, access by a data subject to data concerning themselves is provided free of charge. The Controller charges no fee whatsoever for such access — neither for the first nor for any subsequent request.",
  },
  {
    k: "p",
    uk: "Право заперечувати проти обробки. Суб'єкт даних має право пред'являти вмотивовану вимогу Володільцю із запереченням проти обробки своїх персональних даних (пункт 5 частини другої статті 8 Закону), у тому числі проти обробки, здійснюваної з метою прямого маркетингу.",
    en: "Right to object to the processing. The data subject has the right to submit a reasoned demand to the Controller objecting to the processing of their personal data (Article 8(2), point 5, of the Law), including processing carried out for direct marketing purposes.",
  },
  {
    k: "p",
    uk: "Право вимагати зміни або знищення даних. Суб'єкт даних має право пред'являти вмотивовану вимогу щодо зміни або знищення своїх персональних даних будь-яким володільцем та розпорядником персональних даних, якщо ці дані обробляються незаконно чи є недостовірними (пункт 6 частини другої статті 8 Закону). Законодавство України не передбачає загального «права бути забутим» у розумінні статті 17 Регламенту ЄС 2016/679: обов'язок знищити дані виникає саме за наведених вище умов.",
    en: "Right to demand modification or destruction of the data. The data subject has the right to submit a reasoned demand for the modification or destruction of their personal data by any owner or administrator of personal data, where those data are processed unlawfully or are inaccurate (Article 8(2), point 6, of the Law). Ukrainian legislation does not provide for a general “right to be forgotten” within the meaning of Article 17 of EU Regulation 2016/679: the obligation to destroy the data arises precisely on the conditions set out above.",
  },
  {
    k: "p",
    uk: "Право на захист даних. Суб'єкт даних має право на захист своїх персональних даних від незаконної обробки (пункт 7 частини другої статті 8 Закону).",
    en: "Right to protection of the data. The data subject has the right to the protection of their personal data against unlawful processing (Article 8(2), point 7, of the Law).",
  },
  {
    k: "p",
    uk: "Право на скаргу та засоби правового захисту. Суб'єкт даних має право звертатися із скаргами на обробку своїх персональних даних до Уповноваженого Верховної Ради України з прав людини або до суду, а також застосовувати засоби правового захисту в разі порушення законодавства про захист персональних даних (пункти 8 і 9 частини другої статті 8 Закону).",
    en: "Right to lodge a complaint and to legal remedies. The data subject has the right to lodge complaints about the processing of their personal data with the Ukrainian Parliament Commissioner for Human Rights (the Ombudsman) or with a court, and to apply legal remedies in the event of a breach of the legislation on the protection of personal data (Article 8(2), points 8 and 9, of the Law).",
  },
  {
    k: "p",
    uk: "Право вносити застереження під час надання згоди. Суб'єкт даних має право вносити застереження стосовно обмеження права на обробку своїх персональних даних під час надання згоди (пункт 10 частини другої статті 8 Закону). Це право реалізується в момент надання згоди і не є тотожним «праву на обмеження обробки» за статтею 18 Регламенту ЄС 2016/679, якого законодавство України не передбачає.",
    en: "Right to enter reservations when giving consent. The data subject has the right to enter reservations restricting the right to process their personal data at the time of giving consent (Article 8(2), point 10, of the Law). This right is exercised at the moment consent is given and is not the same as the “right to restriction of processing” under Article 18 of EU Regulation 2016/679, which Ukrainian legislation does not provide for.",
  },
  {
    k: "p",
    uk: "Право відкликати згоду. Суб'єкт даних має право відкликати згоду на обробку персональних даних (пункт 11 частини другої статті 8 Закону). Відкликання згоди не впливає на законність обробки, здійсненої до відкликання.",
    en: "Right to withdraw consent. The data subject has the right to withdraw consent to the processing of personal data (Article 8(2), point 11, of the Law). The withdrawal of consent does not affect the lawfulness of the processing carried out prior to the withdrawal.",
  },
  {
    k: "p",
    uk: "Права щодо автоматизованої обробки. Суб'єкт даних має право знати механізм автоматичної обробки персональних даних, а також право на захист від автоматизованого рішення (пункти 12 і 13 частини другої статті 8 Закону).",
    en: "Rights concerning automated processing. The data subject has the right to know the mechanism of the automatic processing of personal data, and the right to protection against an automated decision (Article 8(2), points 12 and 13, of the Law).",
  },
  {
    k: "h2",
    uk: "Додаткові гарантії, які Володілець надає добровільно",
    en: "Additional safeguards granted voluntarily by the Controller",
  },
  {
    k: "p",
    uk: "Можливості, наведені в цьому розділі, не є правами, передбаченими Законом України «Про захист персональних даних». Володілець надає їх з власної ініціативи, як добровільне зобов'язання перед суб'єктами даних. Вони не встановлені законодавством України і не розширюють обсягу законних прав суб'єкта даних; Володілець може змінити їх обсяг у наступних редакціях цієї Політики.",
    en: "The options set out in this section are not rights provided for by the Law of Ukraine “On Personal Data Protection”. The Controller grants them on its own initiative, as a voluntary undertaking towards data subjects. They are not established by Ukrainian legislation and do not extend the scope of the data subject’s statutory rights; the Controller may change their scope in subsequent versions of this Policy.",
  },
  {
    k: "p",
    uk: "Копія даних і переносимість. На запит суб'єкта даних Володілець надає копію оброблюваних даних у структурованому, широковживаному та машинозчитуваному форматі і, за технічної можливості, передає її іншому володільцю, вказаному суб'єктом даних. Права на переносимість даних законодавство України не передбачає — це добровільне зобов'язання Володільця.",
    en: "Copy of the data and portability. At the data subject’s request, the Controller provides a copy of the data being processed in a structured, commonly used and machine-readable format and, where technically feasible, transmits it to another owner of personal data designated by the data subject. Ukrainian legislation does not provide for a right to data portability — this is a voluntary undertaking of the Controller.",
  },
  {
    k: "p",
    uk: "Тимчасове призупинення обробки. Якщо суб'єкт даних оспорює достовірність своїх даних або правомірність їх обробки, Володілець на час розгляду вимоги призупиняє використання спірних даних, зберігаючи їх. Це внутрішня процедура Володільця, а не окреме право, встановлене Законом.",
    en: "Temporary suspension of processing. Where the data subject contests the accuracy of their data or the lawfulness of the processing, the Controller suspends the use of the contested data while the demand is being examined, while retaining them. This is an internal procedure of the Controller, not a separate right established by the Law.",
  },
  {
    k: "p",
    uk: "Виправлення та доповнення даних за запитом. Володілець виправляє неточні та доповнює неповні дані на просте звернення суб'єкта даних, навіть якщо умови для вмотивованої вимоги за пунктом 6 частини другої статті 8 Закону не настали.",
    en: "Rectification and completion of data upon request. The Controller rectifies inaccurate data and completes incomplete data upon a simple request from the data subject, even where the conditions for a reasoned demand under Article 8(2), point 6, of the Law are not met.",
  },
  {
    k: "p",
    uk: "Розширене інформування. Володілець інформує суб'єктів даних про обробку в зрозумілий і доступний спосіб, у тому числі шляхом оприлюднення цієї Політики та надання пояснень за окремим зверненням.",
    en: "Enhanced information. The Controller informs data subjects about the processing in a clear and accessible manner, including by publishing this Policy and by providing explanations upon individual request.",
  },
  {
    k: "p",
    uk: "З метою здійснення як законних прав, так і додаткових гарантій, наведених вище, суб'єкти даних заповнюють спеціалізовану форму, розроблену Володільцем і надану суб'єктам даних за запитом. Заповнення форми не є обов'язковою умовою — звернення, подане в довільній формі, розглядається на тих самих умовах.",
    en: "In order to exercise both the statutory rights and the additional safeguards set out above, data subjects complete a dedicated form developed by the Controller and made available to data subjects upon request. Completing the form is not a mandatory condition — a request submitted in free form is examined on the same terms.",
  },
  {
    k: "h2",
    uk: "Обов'язки.",
    en: "Obligations.",
  },
  {
    k: "p",
    uk: "Обов'язки Володільця. Володілець відповідає за впровадження та дотримання положень цієї Політики, за забезпечення відповідності процесів обробки персональних даних і за застосування належних технічних та організаційних заходів захисту даних.",
    en: "Obligations of the Controller. The Controller is responsible for implementing and complying with the provisions of this Policy, for ensuring the compliance of the personal data processing operations and for applying appropriate technical and organisational data protection measures.",
  },
  {
    k: "p",
    uk: "Обов'язки персоналу. Усі працівники Володільця, які під час виконання службових обов'язків отримують доступ до персональних даних, використовують або обробляють їх, зобов'язані дотримуватися положень цієї Політики, внутрішніх інструкцій, а також обов'язків щодо конфіденційності.",
    en: "Obligations of staff. All employees of the Controller who, in the performance of their duties, access, use or process personal data are required to comply with the provisions of this Policy, with internal instructions, and with confidentiality obligations.",
  },
  {
    k: "p",
    uk: "Авторизований доступ до даних. Доступ до персональних даних дозволений виключно призначеним та уповноваженим особам у межах їхніх функціональних повноважень. Будь-який несанкціонований доступ суворо заборонений і тягне за собою дисциплінарну і, за необхідності, юридичну відповідальність.",
    en: "Authorised access to data. Access to personal data is permitted exclusively to designated and authorised persons within the limits of their functional powers. Any unauthorised access is strictly prohibited and entails disciplinary and, where appropriate, legal liability.",
  },
  {
    k: "p",
    uk: "Особи, уповноважені Володільцем, зобов'язані обробляти персональні дані виключно в межах отриманих інструкцій, застосовувати передбачені заходи безпеки та дотримуватися договірних зобов'язань щодо захисту даних.",
    en: "Persons authorised by the Controller are required to process personal data solely within the limits of the instructions received, to apply the prescribed security measures and to observe the contractual data protection obligations.",
  },
  {
    k: "p",
    uk: "Відповідальність за безпеку систем. Технічний відділ і компетентний персонал відповідають за адміністрування інформаційної інфраструктури, підтримання цілісності систем безпеки, застосування контролю доступу та впровадження технічних заходів безпеки.",
    en: "Responsibility for system security. The technical department and the competent staff are responsible for administering the IT infrastructure, maintaining the integrity of the security systems, applying access controls and implementing technical security measures.",
  },
  {
    k: "p",
    uk: "Відповідальність у разі інцидентів безпеки. Будь-який працівник, який виявляє або підозрює інцидент безпеки щодо персональних даних, зобов'язаний діяти відповідно до Плану реагування на інциденти безпеки, розробленого та затвердженого Володільцем.",
    en: "Responsibility in the event of security incidents. Any employee who detects or suspects a security incident concerning personal data is required to act in accordance with the Security Incident Response Plan developed and approved by the Controller.",
  },
  {
    k: "p",
    uk: "Перевірка та моніторинг відповідності. Володілець може проводити періодичні внутрішні перевірки для контролю дотримання положень цієї Політики та законних зобов'язань щодо захисту персональних даних.",
    en: "Verification and monitoring of compliance. The Controller may carry out periodic internal checks to monitor compliance with the provisions of this Policy and with the legal obligations concerning the protection of personal data.",
  },
  {
    k: "h2",
    uk: "Правові підстави обробки персональних даних.",
    en: "Legal bases for the processing of personal data.",
  },
  {
    k: "p",
    uk: "Володілець обробляє персональні дані виключно на підставі однієї або декількох правових підстав, передбачених законодавством, а саме:",
    en: "The Controller processes personal data solely on the basis of one or more of the legal bases provided for by law, namely:",
  },
  {
    k: "p",
    uk: "виконання договору або здійснення переддоговірних дій;",
    en: "performance of a contract or carrying out pre-contractual steps;",
  },
  {
    k: "p",
    uk: "виконання законного обов'язку;",
    en: "compliance with a legal obligation;",
  },
  {
    k: "p",
    uk: "згода суб'єкта даних;",
    en: "consent of the data subject;",
  },
  {
    k: "p",
    uk: "законний інтерес Володільця;",
    en: "the legitimate interest of the Controller;",
  },
  {
    k: "p",
    uk: "захист інтересів суб'єкта даних або іншої фізичної особи;",
    en: "protection of the interests of the data subject or of another natural person;",
  },
  {
    k: "h2",
    uk: "Цілі обробки персональних даних.",
    en: "Purposes of the processing of personal data.",
  },
  {
    k: "p",
    uk: "Володілець обробляє персональні дані виключно з визначеними, чіткими та законними цілями, а саме:",
    en: "The Controller processes personal data solely for specified, explicit and legitimate purposes, namely:",
  },
  {
    k: "p",
    uk: "виконання договірних відносин з клієнтами та/або потенційними клієнтами;",
    en: "performance of contractual relationships with clients and/or potential clients;",
  },
  {
    k: "p",
    uk: "комунікація з клієнтами та/або потенційними клієнтами та функціонування каналів підтримки;",
    en: "communication with clients and/or potential clients and the operation of support channels;",
  },
  {
    k: "p",
    uk: "безпека інформаційних систем і контроль доступу;",
    en: "security of information systems and access control;",
  },
  {
    k: "p",
    uk: "маркетинг та комерційні комунікації;",
    en: "marketing and commercial communications;",
  },
  {
    k: "p",
    uk: "виконання законних зобов'язань Володільця;",
    en: "compliance with the legal obligations of the Controller;",
  },
  {
    k: "p",
    uk: "запобігання, виявлення та управління інцидентами;",
    en: "prevention, detection and management of incidents;",
  },
  {
    k: "p",
    uk: "управління відносинами з постачальниками та договірними партнерами;",
    en: "management of relationships with suppliers and contractual partners;",
  },
  {
    k: "p",
    uk: "захист інтересів суб'єкта даних.",
    en: "protection of the interests of the data subject.",
  },
  {
    k: "h2",
    uk: "Період зберігання персональних даних.",
    en: "Retention period of personal data.",
  },
  {
    k: "p",
    uk: "Персональні дані зберігаються лише протягом періоду, необхідного для досягнення цілей, задля яких вони були зібрані.",
    en: "Personal data are retained only for the period necessary to achieve the purposes for which they were collected.",
  },
  {
    k: "p",
    uk: "Володілець встановлює такі періоди зберігання залежно від категорії даних і мети обробки:",
    en: "The Controller establishes the following retention periods depending on the category of data and the purpose of processing:",
  },
  {
    k: "p",
    uk: "дані працівників — на час трудових відносин, а також стажування, і надалі — для архівування;",
    en: "employee data — for the duration of the employment relationship, as well as the internship, and thereafter — for archiving;",
  },
  {
    k: "p",
    uk: "дані клієнтів — 5 років з моменту останньої взаємодії чи активності, і надалі — для архівування;",
    en: "client data — 5 years from the last interaction or activity, and thereafter — for archiving;",
  },
  {
    k: "p",
    uk: "бухгалтерські та податкові дані — відповідно до обов'язкових строків, передбачених податковим і бухгалтерським законодавством;",
    en: "accounting and tax data — in accordance with the mandatory periods provided for by tax and accounting legislation;",
  },
  {
    k: "p",
    uk: "технічні дані та журнали (логи) — протягом строку, необхідного для забезпечення функціонування та безпеки інформаційних систем, з дотриманням мінімальних і максимальних строків, передбачених застосовними нормами;",
    en: "technical data and logs — for the period necessary to ensure the operation and security of the information systems, in compliance with the minimum and maximum periods provided for by the applicable rules;",
  },
  {
    k: "p",
    uk: "дані, оброблювані з маркетинговою метою — до відкликання згоди або до здійснення права на заперечення.",
    en: "data processed for marketing purposes — until consent is withdrawn or until the right to object is exercised.",
  },
  {
    k: "p",
    uk: "Після закінчення застосовних строків зберігання дані підлягають процедурі видалення, анонімізації, знищення або, за необхідності, архівування, на умовах, встановлених Володільцем.",
    en: "Upon expiry of the applicable retention periods, the data are subject to a procedure of deletion, anonymisation, destruction or, where necessary, archiving, under the conditions established by the Controller.",
  },
  {
    k: "p",
    uk: "Володілець веде внутрішній облік строків і процедур зберігання та видалення даних з метою забезпечення дотримання принципу обмеження зберігання.",
    en: "The Controller maintains internal records of the periods and procedures for the retention and deletion of data in order to ensure compliance with the storage limitation principle.",
  },
  {
    k: "h2",
    uk: "Транскордонна передача персональних даних.",
    en: "Cross-border transfer of personal data.",
  },
  {
    k: "p",
    uk: "Володілець може передавати персональні дані іноземним суб'єктам відносин, пов'язаних з персональними даними, лише за умови забезпечення відповідною державою належного захисту персональних даних. Відповідно до Закону України «Про захист персональних даних» такими, що забезпечують належний захист персональних даних, визнаються держави — учасниці Європейського економічного простору, а також держави, які підписали Конвенцію Ради Європи про захист осіб у зв'язку з автоматизованою обробкою персональних даних; перелік інших держав, які забезпечують належний захист персональних даних, визначає Кабінет Міністрів України.",
    en: "The Controller may transfer personal data to foreign parties to relations involving personal data only where the state concerned ensures an adequate level of protection of personal data. Under the Law of Ukraine “On Personal Data Protection”, the States parties to the European Economic Area, as well as the States which have signed the Council of Europe Convention for the Protection of Individuals with regard to Automatic Processing of Personal Data, are recognised as ensuring an adequate level of protection of personal data; the list of other States which ensure an adequate level of protection of personal data is determined by the Cabinet of Ministers of Ukraine.",
  },
  {
    k: "p",
    uk: "Передача даних до третьої держави або міжнародної організації здійснюється лише за умови наявності належних гарантій захисту даних, у тому числі, за необхідності:",
    en: "The transfer of data to a third country or an international organisation is carried out only where appropriate data protection safeguards are in place, including, where necessary:",
  },
  {
    k: "p",
    uk: "типових договірних застережень про захист даних, які Володілець включає до договорів з контрагентами за власною ініціативою. Законодавство України не передбачає інституту «стандартних договірних умов», затверджених компетентним органом, тому такі застереження є добровільною договірною гарантією Володільця, а не самостійною законною підставою для транскордонної передачі;",
    en: "standard data protection clauses which the Controller includes in contracts with counterparties on its own initiative. Ukrainian legislation does not provide for an institution of “standard contractual clauses” approved by a competent authority, so such clauses are a voluntary contractual safeguard of the Controller and not an independent statutory ground for a cross-border transfer;",
  },
  {
    k: "p",
    uk: "угод або еквівалентних правових механізмів, що забезпечують належний захист даних;",
    en: "agreements or equivalent legal mechanisms ensuring an adequate level of data protection;",
  },
  {
    k: "p",
    uk: "інших гарантій, прямо дозволених законом.",
    en: "other safeguards expressly permitted by law.",
  },
  {
    k: "p",
    uk: "Володілець може здійснювати міжнародні передачі даних лише за умови, що вони необхідні для досягнення цілей обробки і що права суб'єкта даних належним чином захищені.",
    en: "The Controller may carry out international data transfers only on condition that they are necessary to achieve the purposes of the processing and that the rights of the data subject are duly protected.",
  },
  {
    k: "p",
    uk: "У ситуації, коли передача здійснюється до держав, які не забезпечують належного рівня захисту, Володілець здійснює таку передачу лише у випадках, прямо передбачених Законом України «Про захист персональних даних», зокрема за наявності однозначної згоди суб'єкта даних, у разі необхідності укладення чи виконання правочину в інтересах суб'єкта даних, необхідності захисту життєво важливих інтересів суб'єкта даних, необхідності захисту суспільного інтересу або за умови надання Володільцем відповідних гарантій щодо невтручання в особисте і сімейне життя суб'єкта даних. У таких випадках Володілець додатково впроваджує заходи безпеки, покликані забезпечити конфіденційність, цілісність і доступність даних під час передачі та подальшої обробки.",
    en: "In situations where the transfer is carried out to countries which do not ensure an adequate level of protection, the Controller carries out such a transfer only in the cases expressly provided for by the Law of Ukraine “On Personal Data Protection”, in particular where the data subject has given unambiguous consent, where it is necessary for the conclusion or performance of a transaction in the interests of the data subject, where it is necessary to protect the vital interests of the data subject, where it is necessary to protect the public interest, or where the Controller provides appropriate safeguards regarding non-interference with the private and family life of the data subject. In such cases the Controller additionally implements security measures designed to ensure the confidentiality, integrity and availability of the data during transfer and subsequent processing.",
  },
  {
    k: "p",
    uk: "Володілець інформує суб'єкта даних про міжнародні передачі даних на умовах і засобами, передбаченими законом.",
    en: "The Controller informs the data subject about international data transfers under the conditions and by the means provided for by law.",
  },
  {
    k: "h2",
    uk: "Технічні та організаційні заходи безпеки.",
    en: "Technical and organisational security measures.",
  },
  {
    k: "p",
    uk: "Володілець впроваджує належні технічні та організаційні заходи для забезпечення рівня безпеки, відповідного ризикам, пов'язаним з обробкою персональних даних, згідно із законодавством і принципом відповідальності.",
    en: "The Controller implements appropriate technical and organisational measures to ensure a level of security appropriate to the risks associated with the processing of personal data, in accordance with the legislation and the accountability principle.",
  },
  {
    k: "p",
    uk: "Заходи безпеки включають, без обмеження:",
    en: "The security measures include, without limitation:",
  },
  {
    k: "p",
    uk: "використання систем безпечної автентифікації, складних паролів і, за необхідності, двофакторної автентифікації (2FA);",
    en: "the use of secure authentication systems, complex passwords and, where necessary, two-factor authentication (2FA);",
  },
  {
    k: "p",
    uk: "управління доступом до даних на основі принципу «необхідності знати», залежно від службових обов'язків;",
    en: "management of access to data based on the “need-to-know” principle, according to job duties;",
  },
  {
    k: "p",
    uk: "обмеження фізичного доступу до приміщень, у яких обробляються або зберігаються персональні дані;",
    en: "restriction of physical access to the premises in which personal data are processed or stored;",
  },
  {
    k: "p",
    uk: "захист обладнання, інформаційних систем та засобів зберігання від несанкціонованого доступу, пошкодження, втрати чи крадіжки;",
    en: "protection of equipment, information systems and storage media against unauthorised access, damage, loss or theft;",
  },
  {
    k: "p",
    uk: "впровадження та підтримання механізмів журналювання (логування) доступу до інформаційних систем і дій, виконаних у них, за необхідності, де це технічно можливо;",
    en: "implementation and maintenance of mechanisms for logging access to information systems and the actions performed within them, where necessary and technically possible;",
  },
  {
    k: "p",
    uk: "використання рішень з інформаційної безпеки, таких як антивірусні системи та інші відповідні технології;",
    en: "the use of information security solutions, such as antivirus systems and other appropriate technologies;",
  },
  {
    k: "p",
    uk: "виконання резервного копіювання (backup) і забезпечення відновлення даних у разі інцидентів, відповідно до внутрішніх процедур;",
    en: "performing backups and ensuring the recovery of data in the event of incidents, in accordance with internal procedures;",
  },
  {
    k: "p",
    uk: "шифрування даних, коли це необхідно та доцільно для обробки;",
    en: "encryption of data where necessary and appropriate for the processing;",
  },
  {
    k: "p",
    uk: "забезпечення контрольованого та незворотного знищення даних після закінчення строків зберігання або за необхідності.",
    en: "ensuring the controlled and irreversible destruction of data upon expiry of the retention periods or where necessary.",
  },
  {
    k: "p",
    uk: "Володілець безперервно контролює рівень безпеки інформаційних систем і вживає заходів для запобігання та виявлення несанкціонованого доступу, спроб компрометації інфраструктури або будь-якого інциденту безпеки.",
    en: "The Controller continuously monitors the security level of the information systems and takes measures to prevent and detect unauthorised access, attempts to compromise the infrastructure or any security incident.",
  },
  {
    k: "p",
    uk: "Особи, які мають доступ до персональних даних, періодично проходять інструктаж щодо правил безпеки, обов'язків конфіденційності та процедур, застосовних у разі інцидентів.",
    en: "Persons who have access to personal data are periodically instructed on the security rules, confidentiality obligations and procedures applicable in the event of incidents.",
  },
  {
    k: "p",
    uk: "Технічні та організаційні заходи періодично переглядаються та оновлюються за необхідності, щоразу, коли це потрібно, щоб відображати еволюцію ризиків, технологій та правових вимог.",
    en: "The technical and organisational measures are periodically reviewed and updated as necessary, whenever required, in order to reflect the evolution of risks, technologies and legal requirements.",
  },
  {
    k: "h2",
    uk: "Доступ до даних та управління ризиками",
    en: "Access to data and risk management",
  },
  {
    k: "p",
    uk: "Доступ до персональних даних дозволений виключно особам, призначеним Володільцем, у межах службових обов'язків і лише з цілями, передбаченими цією Політикою та застосовним законодавством.",
    en: "Access to personal data is permitted exclusively to persons designated by the Controller, within the limits of their job duties and only for the purposes provided for in this Policy and by the applicable legislation.",
  },
  {
    k: "p",
    uk: "Доступ надається на основі принципу «необхідності знати» залежно від службових обов'язків, таким чином, щоб уповноважені особи використовували лише дані, суворо необхідні для виконання функціональних обов'язків.",
    en: "Access is granted on the basis of the “need-to-know” principle according to job duties, so that authorised persons use only the data strictly necessary to perform their functional responsibilities.",
  },
  {
    k: "p",
    uk: "Володілець встановлює рівень доступу для кожної категорії персоналу залежно від ролі, відповідальності та характеру оброблюваних даних.",
    en: "The Controller establishes the level of access for each category of staff according to their role, responsibilities and the nature of the data processed.",
  },
  {
    k: "p",
    uk: "Будь-який доступ до інформаційних систем, що містять персональні дані, підлягає попередній автентифікації та контролюється за допомогою механізмів журналювання.",
    en: "Any access to the information systems containing personal data is subject to prior authentication and is monitored by means of logging mechanisms.",
  },
  {
    k: "p",
    uk: "Особи, які мають доступ до персональних даних, зобов'язані дотримуватися їх конфіденційності та використовувати дані виключно з цілями, задля яких було надано доступ.",
    en: "Persons who have access to personal data are required to maintain their confidentiality and to use the data solely for the purposes for which access was granted.",
  },
  {
    k: "p",
    uk: "Володілець виявляє, оцінює та контролює ризики, пов'язані з обробкою персональних даних, ураховуючи характер даних, обсяг обробки, використовувані технології та потенційні загрози й ризики.",
    en: "The Controller identifies, assesses and manages the risks associated with the processing of personal data, taking into account the nature of the data, the scope of the processing, the technologies used and the potential threats and risks.",
  },
  {
    k: "p",
    uk: "Володілець впроваджує належні заходи для зменшення ризиків, включно з технічними засобами контролю, організаційними заходами та внутрішніми процедурами для запобігання інцидентам безпеки.",
    en: "The Controller implements appropriate measures to mitigate risks, including technical controls, organisational measures and internal procedures for preventing security incidents.",
  },
  {
    k: "p",
    uk: "У ситуаціях, коли обробка даних може створювати високі ризики для прав і свобод суб'єкта даних, Володілець проводить внутрішнє оцінювання впливу на захист даних (DPIA). Законодавство України не вимагає проведення такого оцінювання: Володілець здійснює його добровільно, як елемент власної системи управління ризиками та на виконання загального обов'язку із забезпечення захисту даних за статтею 24 Закону України «Про захист персональних даних».",
    en: "In situations where the processing of data may pose high risks to the rights and freedoms of the data subject, the Controller carries out an internal data protection impact assessment (DPIA). Ukrainian legislation does not require such an assessment: the Controller carries it out voluntarily, as an element of its own risk management system and in fulfilment of the general obligation to ensure the protection of data under Article 24 of the Law of Ukraine “On Personal Data Protection”.",
  },
  {
    k: "p",
    uk: "Персонал Володільця зобов'язаний негайно повідомляти про будь-яку ситуацію, яка може становити ризик, вразливість чи інцидент щодо захисту персональних даних.",
    en: "The Controller’s staff are required to report immediately any situation that may constitute a risk, vulnerability or incident concerning the protection of personal data.",
  },
  {
    k: "p",
    uk: "Володілець може проводити періодичні внутрішні перевірки та аудити для оцінювання ефективності впроваджених заходів і для їх оновлення залежно від технологічної та правової еволюції.",
    en: "The Controller may carry out periodic internal checks and audits to assess the effectiveness of the measures implemented and to update them according to technological and legal developments.",
  },
  {
    k: "h2",
    uk: "Повідомлення Уповноваженого про обробку, що становить особливий ризик",
    en: "Notification of the Commissioner about processing constituting a special risk",
  },
  {
    k: "p",
    uk: "Відповідно до статті 9 Закону України «Про захист персональних даних» володілець персональних даних зобов'язаний повідомити Уповноваженого Верховної Ради України з прав людини про обробку персональних даних, яка становить особливий ризик для прав і свобод суб'єктів персональних даних, упродовж тридцяти робочих днів з дня початку такої обробки.",
    en: "Under Article 9 of the Law of Ukraine “On Personal Data Protection”, the owner of personal data is obliged to notify the Ukrainian Parliament Commissioner for Human Rights of any processing of personal data which constitutes a special risk to the rights and freedoms of data subjects, within thirty working days from the day such processing begins.",
  },
  {
    k: "p",
    uk: "Види обробки, що становлять особливий ризик, та категорії суб'єктів, на яких поширюється вимога щодо повідомлення, визначаються Уповноваженим. Згідно з Порядком, затвердженим наказом Уповноваженого від 08.01.2014 № 1/02-14, до такої обробки належить, зокрема, обробка даних про: расове, етнічне та національне походження; політичні, релігійні або світоглядні переконання; членство в політичних партіях та/або організаціях, професійних спілках, релігійних організаціях чи в громадських організаціях світоглядної спрямованості; стан здоров'я; статеве життя; біометричні дані; генетичні дані; притягнення до адміністративної чи кримінальної відповідальності; вжиття щодо особи заходів у межах досудового розслідування; вжиття щодо особи заходів у межах контррозвідувальної діяльності; вчинення щодо особи насильства; місцеперебування та/або шляхи пересування особи.",
    en: "The types of processing that constitute a special risk, and the categories of entities to which the notification requirement applies, are determined by the Commissioner. Under the Procedure approved by Order of the Commissioner No. 1/02-14 of 8 January 2014, such processing includes, in particular, the processing of data concerning: racial, ethnic and national origin; political, religious or ideological beliefs; membership of political parties and/or organisations, trade unions, religious organisations or civic organisations of an ideological orientation; state of health; sexual life; biometric data; genetic data; being held administratively or criminally liable; measures taken in respect of a person within a pre-trial investigation; measures taken in respect of a person within counter-intelligence activity; violence committed against a person; a person’s location and/or routes of movement.",
  },
  {
    k: "p",
    uk: "Про зміну відомостей, що підлягають повідомленню, володілець повідомляє Уповноваженого упродовж десяти робочих днів з дня настання такої зміни.",
    en: "The owner notifies the Commissioner of any change in the information subject to notification within ten working days from the day the change occurs.",
  },
  {
    k: "p",
    uk: "Володілець перевіряє свої операції з обробки на наявність ознак особливого ризику і, у разі їх виявлення, подає відповідне повідомлення Уповноваженому у строк, встановлений статтею 9 Закону.",
    en: "The Controller reviews its processing operations for indications of a special risk and, where such indications are identified, submits the corresponding notification to the Commissioner within the period established by Article 9 of the Law.",
  },
  {
    k: "h2",
    uk: "Відповідальна особа з питань захисту персональних даних",
    en: "Person responsible for personal data protection",
  },
  {
    k: "p",
    uk: "Відповідно до частини другої статті 24 Закону України «Про захист персональних даних» в органах державної влади, органах місцевого самоврядування, а також у володільцях чи розпорядниках персональних даних, що здійснюють обробку персональних даних, яка підлягає повідомленню Уповноваженому, створюється (визначається) структурний підрозділ або відповідальна особа, що організовує роботу, пов'язану із захистом персональних даних під час їх обробки. Інформація про такий структурний підрозділ або відповідальну особу повідомляється Уповноваженому.",
    en: "Under Article 24(2) of the Law of Ukraine “On Personal Data Protection”, in bodies of state power, bodies of local self-government, and in owners or administrators of personal data that carry out processing of personal data subject to notification of the Commissioner, a structural unit is created (or a responsible person is designated) to organise the work relating to the protection of personal data during their processing. Information about that structural unit or responsible person is notified to the Commissioner.",
  },
  {
    k: "p",
    uk: "Таким чином, законодавчий обов'язок призначити відповідальну особу виникає лише тоді, коли обробка підлягає повідомленню відповідно до статті 9 Закону. Незалежно від наявності цього обов'язку Володілець визначає зі складу свого персоналу особу, відповідальну за організацію роботи із захисту персональних даних, ведення обліку операцій з обробки, розгляд звернень суб'єктів даних та комунікацію з Уповноваженим.",
    en: "Accordingly, the statutory obligation to designate a responsible person arises only where the processing is subject to notification under Article 9 of the Law. Irrespective of whether that obligation applies, the Controller designates from among its staff a person responsible for organising the work relating to personal data protection, maintaining records of processing operations, examining requests from data subjects and communicating with the Commissioner.",
  },
  {
    k: "p",
    uk: "Контактні дані відповідальної особи надаються суб'єктам даних за запитом.",
    en: "The contact details of the responsible person are provided to data subjects upon request.",
  },
  {
    k: "h2",
    uk: "Обробка даних за допомогою файлів cookie",
    en: "Processing of data by means of cookies",
  },
  {
    k: "p",
    uk: "Володілець використовує файли cookie та подібні технології на своїх онлайн-платформах з метою забезпечення належного функціонування сайту, покращення користувацького досвіду, аналізу використання платформ і, за необхідності, надання персоналізованого контенту.",
    en: "The Controller uses cookies and similar technologies on its online platforms in order to ensure the proper functioning of the website, improve the user experience, analyse the use of the platforms and, where appropriate, provide personalised content.",
  },
  {
    k: "p",
    uk: "Володілець може використовувати такі категорії файлів cookie:",
    en: "The Controller may use the following categories of cookies:",
  },
  {
    k: "p",
    uk: "Строго необхідні файли cookie, незамінні для технічного функціонування платформи, які уможливлюють навігацію та використання базового функціоналу і які не потребують згоди користувача.",
    en: "Strictly necessary cookies, indispensable for the technical functioning of the platform, which enable navigation and the use of basic functionality and which do not require the user’s consent.",
  },
  {
    k: "p",
    uk: "Функціональні файли cookie, які використовуються для персоналізації користувацького досвіду та для запам'ятовування його уподобань.",
    en: "Functional cookies, which are used to personalise the user experience and to remember the user’s preferences.",
  },
  {
    k: "p",
    uk: "Файли cookie аналітики та продуктивності, які використовуються для отримання анонімізованих статистичних даних щодо способу використання платформи, переглянутих сторінок, тривалості сесій та іншої інформації, релевантної для оптимізації функціонування послуг;",
    en: "Analytics and performance cookies, which are used to obtain anonymised statistical data on the way the platform is used, the pages viewed, the duration of sessions and other information relevant to optimising the functioning of the services;",
  },
  {
    k: "p",
    uk: "Файли cookie маркетингу та реклами, які використовуються для персоналізації рекламного контенту та для аналізу ефективності кампаній, використовуються лише на підставі згоди користувача.",
    en: "Marketing and advertising cookies, which are used to personalise advertising content and to analyse the effectiveness of campaigns, are used only on the basis of the user’s consent.",
  },
  {
    k: "p",
    uk: "Файли cookie використовуються на підставі законного інтересу Володільця щодо забезпечення технічного функціонування платформи.",
    en: "Cookies are used on the basis of the Controller’s legitimate interest in ensuring the technical functioning of the platform.",
  },
  {
    k: "p",
    uk: "Функціональні файли cookie, файли аналітики продуктивності та маркетингу використовуються виключно на підставі згоди користувача, вираженої за допомогою механізмів на платформі.",
    en: "Functional cookies, performance analytics cookies and marketing cookies are used exclusively on the basis of the user’s consent, expressed by means of the mechanisms available on the platform.",
  },
  {
    k: "p",
    uk: "Користувач може прийняти або відхилити використання опціональних файлів cookie за допомогою банера згоди, розміщеного на платформі, або через налаштування браузера.",
    en: "The user may accept or reject the use of optional cookies by means of the consent banner displayed on the platform, or through the browser settings.",
  },
  {
    k: "p",
    uk: "Відкликання згоди не впливає на законність обробки, здійсненої до відкликання.",
    en: "The withdrawal of consent does not affect the lawfulness of the processing carried out prior to the withdrawal.",
  },
  {
    k: "p",
    uk: "Тривалість зберігання файлів cookie залежить від їх типу і визначається технічними налаштуваннями платформи.",
    en: "The retention period of cookies depends on their type and is determined by the technical settings of the platform.",
  },
  {
    k: "p",
    uk: "Дані, зібрані за допомогою файлів cookie, можуть включати онлайн-ідентифікатори, IP-адреси, уподобання щодо використання, дії на платформі, відвідані сторінки та іншу подібну технічну інформацію.",
    en: "The data collected by means of cookies may include online identifiers, IP addresses, usage preferences, actions on the platform, pages visited and other similar technical information.",
  },
  {
    k: "p",
    uk: "Ці дані обробляються виключно з цілями, задля яких було впроваджено файли cookie, і в межах згоди, вираженої користувачем.",
    en: "These data are processed exclusively for the purposes for which the cookies were implemented and within the limits of the consent expressed by the user.",
  },
  {
    k: "h2",
    uk: "Архівування та знищення даних",
    en: "Archiving and destruction of data",
  },
  {
    k: "p",
    uk: "Володілець архівує персональні дані відповідно до законодавства, внутрішніх вимог і встановлених для кожної категорії даних строків зберігання.",
    en: "The Controller archives personal data in accordance with the legislation, internal requirements and the retention periods established for each category of data.",
  },
  {
    k: "p",
    uk: "Архівовані дані зберігаються в умовах, які забезпечують їх цілісність, конфіденційність і доступність, шляхом застосування належних технічних та організаційних заходів.",
    en: "Archived data are kept under conditions that ensure their integrity, confidentiality and availability, by applying appropriate technical and organisational measures.",
  },
  {
    k: "p",
    uk: "Доступ до архівованих даних обмежений і дозволений виключно уповноваженим особам на основі функціональних повноважень і специфічних обов'язків.",
    en: "Access to archived data is restricted and permitted exclusively to authorised persons on the basis of their functional powers and specific responsibilities.",
  },
  {
    k: "p",
    uk: "Архівування здійснюється фізичними або цифровими засобами, з дотриманням норм безпеки, застосовних до кожного типу носія.",
    en: "Archiving is carried out by physical or digital means, in compliance with the security rules applicable to each type of medium.",
  },
  {
    k: "p",
    uk: "Після закінчення строку зберігання або коли дані більше не потрібні для цілей, задля яких вони були зібрані, Володілець здійснює їх знищення або видалення, за необхідності — анонімізацію.",
    en: "Upon expiry of the retention period or where the data are no longer necessary for the purposes for which they were collected, the Controller carries out their destruction or deletion and, where necessary, their anonymisation.",
  },
  {
    k: "p",
    uk: "Знищення даних здійснюється таким чином, щоб запобігти будь-якій можливості відновлення, використання чи несанкціонованого доступу.",
    en: "The destruction of data is carried out in such a way as to prevent any possibility of recovery, use or unauthorised access.",
  },
  {
    k: "p",
    uk: "Знищення даних на фізичному носії здійснюється належними механічними засобами, які гарантують незворотність процесу.",
    en: "The destruction of data on a physical medium is carried out by appropriate mechanical means that guarantee the irreversibility of the process.",
  },
  {
    k: "p",
    uk: "Видалення даних на електронному носії здійснюється за допомогою технічних процедур, які забезпечують повне та остаточне усунення інформації з інформаційних систем, включно з резервними копіями, у тій мірі, у якій це можливо та сумісно із законними зобов'язаннями Володільця.",
    en: "The deletion of data on an electronic medium is carried out by means of technical procedures that ensure the complete and definitive removal of the information from the information systems, including backups, to the extent that this is possible and compatible with the Controller’s legal obligations.",
  },
  {
    k: "p",
    uk: "Володілець може використовувати спеціалізовані послуги для знищення даних, з дотриманням договірних зобов'язань щодо конфіденційності та безпеки обробки.",
    en: "The Controller may use specialised services for the destruction of data, in compliance with contractual obligations concerning the confidentiality and security of the processing.",
  },
  {
    k: "p",
    uk: "Володілець веде внутрішній облік щодо архівування та знищення даних, включаючи дату операції, категорію даних, використаний метод і відповідальну особу.",
    en: "The Controller maintains internal records of the archiving and destruction of data, including the date of the operation, the category of data, the method used and the responsible person.",
  },
  {
    k: "p",
    uk: "Облікові записи зберігаються відповідно до законних і внутрішніх вимог щодо відповідальності та аудиту процесів обробки.",
    en: "These records are kept in accordance with the legal and internal requirements concerning accountability and the audit of processing operations.",
  },
  {
    k: "h2",
    uk: "Перегляд та зміна Політики",
    en: "Review and amendment of the Policy",
  },
  {
    k: "p",
    uk: "Ця Політика підлягає періодичному перегляду, з інтервалами, встановленими Володільцем, з метою підтримання відповідності застосовному законодавству, стандартам безпеки та внутрішнім процесам Володільця.",
    en: "This Policy is subject to periodic review, at intervals established by the Controller, in order to maintain compliance with the applicable legislation, security standards and the Controller’s internal processes.",
  },
  {
    k: "p",
    uk: "Перегляд Політики здійснюється також щоразу, коли з'являються релевантні зміни в законодавчій базі, в організаційній структурі, в інформаційних системах або в процесах обробки персональних даних.",
    en: "The Policy is also reviewed whenever relevant changes arise in the legislative framework, in the organisational structure, in the information systems or in the personal data processing operations.",
  },
  {
    k: "p",
    uk: "Перегляди документуються та затверджуються особами з обов'язками, призначеними Володільцем.",
    en: "Reviews are documented and approved by the persons with responsibilities designated by the Controller.",
  },
  {
    k: "p",
    uk: "Володілець може змінювати цю Політику в будь-який момент, залежно від правових, операційних чи технічних потреб.",
    en: "The Controller may amend this Policy at any time, depending on legal, operational or technical needs.",
  },
  {
    k: "p",
    uk: "Будь-яка зміна набирає чинності з дати, зазначеної в акті затвердження.",
    en: "Any amendment takes effect from the date indicated in the approval act.",
  },
  {
    k: "p",
    uk: "Володілець забезпечує повідомлення персоналу про зміни, а також надає суб'єктам даних оновлену версію Політики належними засобами, встановленими Володільцем.",
    en: "The Controller ensures that staff are notified of amendments and makes the updated version of the Policy available to data subjects by appropriate means established by the Controller.",
  },
  {
    k: "p",
    uk: "Володілець веде повний облік версій Політики, включно з датами змін та особами, які здійснили затвердження.",
    en: "The Controller maintains a complete record of the versions of the Policy, including the dates of amendments and the persons who carried out the approvals.",
  },
  {
    k: "p",
    uk: "Лише затверджена та оновлена версія Політики є застосовною й обов'язковою для всіх осіб, охоплених сферою її застосування.",
    en: "Only the approved and updated version of the Policy is applicable and binding on all persons covered by its scope of application.",
  },
  {
    k: "h2",
    uk: "Прикінцеві положення",
    en: "Final provisions",
  },
  {
    k: "p",
    uk: "Ця Політика є обов'язковою для всіх осіб, які обробляють персональні дані в межах діяльності, здійснюваної Володільцем, незалежно від посади, позиції чи договірних відносин.",
    en: "This Policy is binding on all persons who process personal data within the activity carried out by the Controller, irrespective of their office, position or contractual relationship.",
  },
  {
    k: "p",
    uk: "Недотримання положень Політики може призвести до дисциплінарних, цивільних, адміністративних чи кримінальних заходів, залежно від характеру та тяжкості порушення.",
    en: "Failure to comply with the provisions of the Policy may give rise to disciplinary, civil, administrative or criminal measures, depending on the nature and gravity of the infringement.",
  },
  {
    k: "p",
    uk: "Політика набирає чинності з дати офіційного затвердження Володільцем.",
    en: "The Policy enters into force on the date of its official approval by the Controller.",
  },
  {
    k: "p",
    uk: "Після набрання чинності Політика застосовується повністю до всіх операцій з обробки персональних даних, здійснюваних Володільцем.",
    en: "Once in force, the Policy applies in full to all personal data processing operations carried out by the Controller.",
  },
  {
    k: "p",
    uk: "Володілець відповідає за впровадження, моніторинг і застосування цієї Політики.",
    en: "The Controller is responsible for the implementation, monitoring and application of this Policy.",
  },
  {
    k: "p",
    uk: "Володілець співпрацює з компетентними органами у сфері захисту персональних даних, зокрема з Уповноваженим Верховної Ради України з прав людини, і надає необхідну інформацію в межах та на умовах, передбачених законодавством України.",
    en: "The Controller cooperates with the competent authorities in the field of personal data protection, in particular with the Ukrainian Parliament Commissioner for Human Rights (the Ombudsman), and provides the necessary information within the limits and under the conditions provided for by the legislation of Ukraine.",
  },
  {
    k: "p",
    uk: "У разі виникнення неясностей щодо тлумачення чи застосування цієї Політики переважають положення законодавства України, застосовного у сфері захисту персональних даних.",
    en: "In the event of any ambiguity regarding the interpretation or application of this Policy, the provisions of the legislation of Ukraine applicable in the field of personal data protection shall prevail.",
  },
  {
    k: "p",
    uk: "Володілець залишає за собою право видавати додаткові внутрішні інструкції для однакового застосування Політики.",
    en: "The Controller reserves the right to issue additional internal instructions for the uniform application of the Policy.",
  },
  {
    k: "p",
    uk: "Țurcan Ivan                                                                            (підпис) ___________________",
    en: "Țurcan Ivan                                                                            (signature) ___________________",
  },
  {
    k: "p",
    uk: "Адміністратор „Crowe Țurcan Mikhailenko” S.R.L.",
    en: "Administrator of „Crowe Țurcan Mikhailenko” S.R.L.",
  },
  {
    k: "p",
    uk: "Дата: 05.03.2026",
    en: "Date: 05.03.2026",
  },
];
