// Privacy policy in Ukrainian and English, translated in full from the official
// Romanian source ('Politica de protecție a datelor website_MOD.docx').
// Legal text — translated faithfully; do not alter the meaning.
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
    uk: "«Персональні дані» — це будь-яка інформація стосовно ідентифікованої або такої, що може бути ідентифікована, фізичної особи (далі — суб'єкт даних), як це визначено в Законі № 195/2024 про захист персональних даних. Фізична особа вважається такою, що може бути ідентифікована, коли вона може бути прямо чи опосередковано впізнана, зокрема за посиланням на ідентифікатор, такий як ім'я, прізвище, IDNP (персональний ідентифікаційний номер), дані про поведінку та спосіб придбання/закупівлі, а також один або декілька специфічних елементів її фізичної, економічної, культурної чи соціальної ідентичності.",
    en: "“Personal data” means any information relating to an identified or identifiable natural person (hereinafter — the data subject), as defined in Law No. 195/2024 on the protection of personal data. A natural person is deemed identifiable where they can be identified, directly or indirectly, in particular by reference to an identifier such as first name, last name, IDNP (personal identification number), data concerning behaviour and manner of acquisition/purchase, as well as one or more specific elements of their physical, economic, cultural or social identity.",
  },
  {
    k: "p",
    uk: "«Обробка персональних даних» означає будь-яку операцію або сукупність операцій, які здійснюються з персональними даними, з використанням або без використання автоматизованих засобів, такі як: збирання, реєстрація, автоматизація, зберігання, збереження, відновлення, адаптація чи зміна, вилучення, ознайомлення, використання, розкриття шляхом передачі, поширення або будь-який інший спосіб надання доступу, поєднання чи комбінування, блокування, видалення або знищення.",
    en: "“Processing of personal data” means any operation or set of operations performed on personal data, whether or not by automated means, such as: collection, recording, automation, storage, preservation, retrieval, adaptation or alteration, extraction, consultation, use, disclosure by transmission, dissemination or any other means of making available, alignment or combination, blocking, erasure or destruction.",
  },
  {
    k: "p",
    uk: "«Система обліку персональних даних» — це будь-яка структурована сукупність персональних даних, доступних за визначеними критеріями, незалежно від того, чи є вона централізованою, децентралізованою або розподіленою за функціональними чи географічними критеріями.",
    en: "“Personal data filing system” means any structured set of personal data accessible according to specific criteria, whether centralised, decentralised or distributed on a functional or geographical basis.",
  },
  {
    k: "p",
    uk: "«Оператор», у розумінні цієї Політики, — це компанія „Crowe Țurcan Mikhailenko” S.R.L., яка визначає цілі та засоби обробки персональних даних.",
    en: "“Controller”, within the meaning of this Policy, means the company „Crowe Țurcan Mikhailenko” S.R.L., which determines the purposes and means of the processing of personal data.",
  },
  {
    k: "p",
    uk: "«Згода суб'єкта персональних даних» — це вільне, конкретне, поінформоване та однозначне волевиявлення суб'єкта даних, яким він приймає, шляхом заяви або недвозначної дії, обробку персональних даних, що його стосуються.",
    en: "“Consent of the data subject” means any freely given, specific, informed and unambiguous indication of the data subject’s wishes by which they accept, through a statement or a clear affirmative action, the processing of personal data relating to them.",
  },
  {
    k: "p",
    uk: "«Національний центр із захисту персональних даних (CNPDCP)» — це незалежний публічний орган, заснований у Республіці Молдова, компетентний у сфері моніторингу дотримання законодавства про захист персональних даних.",
    en: "“National Centre for Personal Data Protection (CNPDCP)” means the independent public authority established in the Republic of Moldova, competent to monitor compliance with the legislation on the protection of personal data.",
  },
  {
    k: "p",
    uk: "Поняття та терміни цієї Політики, які не були визначені вище, тлумачаться відповідно до Закону № 195/2024 про захист персональних даних, окрім випадків, коли їм надано інше значення.",
    en: "Concepts and terms in this Policy that have not been defined above shall be interpreted in accordance with Law No. 195/2024 on the protection of personal data, except where a different meaning is assigned to them.",
  },
  {
    k: "h2",
    uk: "Вступ",
    en: "Introduction",
  },
  {
    k: "p",
    uk: "Ця Політика захисту персональних даних встановлює правила, принципи та процедури, що застосовуються в межах компанії „Crowe Țurcan Mikhailenko” S.R.L., щодо збирання, використання, зберігання, передачі та захисту персональних даних клієнтів, потенційних клієнтів, працівників, партнерів та інших осіб, які взаємодіють з компанією та/або залучені до договірних відносин, відповідно до законодавства Республіки Молдова та відповідних міжнародних стандартів, включно з Регламентом ЄС 2016/679 (GDPR), у застосовній мірі.",
    en: "This Personal Data Protection Policy establishes the rules, principles and procedures applicable within the company „Crowe Țurcan Mikhailenko” S.R.L. regarding the collection, use, storage, transfer and protection of the personal data of clients, potential clients, employees, partners and other persons who interact with the company and/or are involved in contractual relationships, in accordance with the legislation of the Republic of Moldova and the relevant international standards, including EU Regulation 2016/679 (GDPR), to the extent applicable.",
  },
  {
    k: "h2",
    uk: "Цілі",
    en: "Objectives",
  },
  {
    k: "p",
    uk: "Встановлення єдиної та узгодженої системи обробки персональних даних в операційних процесах Оператора;",
    en: "Establishing a unified and consistent system for the processing of personal data within the Controller’s operational processes;",
  },
  {
    k: "p",
    uk: "Забезпечення відповідності застосовному законодавству про захист персональних даних, включно із Законом № 195/2024 та відповідними стандартами;",
    en: "Ensuring compliance with the applicable legislation on the protection of personal data, including Law No. 195/2024 and the relevant standards;",
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
    uk: "Ця Політика застосовується до всіх операцій з обробки персональних даних, що здійснюються Оператором, незалежно від форми чи середовища, у якому обробляються дані (в електронному вигляді, на паперовому носії, через інформаційні системи, за допомогою цифрових платформ тощо).",
    en: "This Policy applies to all personal data processing operations carried out by the Controller, irrespective of the form or medium in which the data are processed (in electronic form, on paper, through information systems, by means of digital platforms, etc.).",
  },
  {
    k: "p",
    uk: "Політика застосовується до всіх категорій суб'єктів даних, включно, але не обмежуючись: клієнтів, потенційних клієнтів, відвідувачів вебсайту та користувачів онлайн-платформ Оператора.",
    en: "The Policy applies to all categories of data subjects, including but not limited to: clients, potential clients, website visitors and users of the Controller’s online platforms.",
  },
  {
    k: "p",
    uk: "Положення Політики є обов'язковими для всіх суб'єктів даних, для співробітників Оператора, для уповноважених осіб, а також для будь-якої особи, яка має доступ до персональних даних у межах трудових, договірних або професійних відносин з Оператором.",
    en: "The provisions of the Policy are binding on all data subjects, on the Controller’s employees, on authorised persons, as well as on any person who has access to personal data within the framework of an employment, contractual or professional relationship with the Controller.",
  },
  {
    k: "p",
    uk: "Усі особи, які обробляють персональні дані від імені Оператора, зобов'язані дотримуватися цієї Політики та застосовувати передбачені нею технічні й організаційні заходи.",
    en: "All persons who process personal data on behalf of the Controller are required to comply with this Policy and to apply the technical and organisational measures provided for herein.",
  },
  {
    k: "h2",
    uk: "Принципи обробки персональних даних",
    en: "Principles of the processing of personal data",
  },
  {
    k: "p",
    uk: "Обробка даних у межах діяльності Оператора здійснюється відповідно до таких принципів:",
    en: "The processing of data within the Controller’s activity is carried out in accordance with the following principles:",
  },
  {
    k: "p",
    uk: "Законність, справедливість і прозорість. Оператор обробляє персональні дані законно, справедливо та прозоро щодо суб'єкта даних (суб'єкта персональних даних), відповідно до Закону № 195/2024. Усі операції з обробки ґрунтуються на належній правовій підставі та повідомляються суб'єктам даних у зрозумілий і доступний спосіб.",
    en: "Lawfulness, fairness and transparency. The Controller processes personal data lawfully, fairly and in a transparent manner in relation to the data subject (the subject of the personal data), in accordance with Law No. 195/2024. All processing operations are based on an appropriate legal basis and are communicated to data subjects in a clear and accessible manner.",
  },
  {
    k: "p",
    uk: "Обмеження мети. Дані збираються з визначеними, чіткими та законними цілями, специфічними для діяльності Оператора у сфері надання послуг консультування, впровадження та підтримки у сфері захисту персональних даних, і не обробляються надалі у спосіб, несумісний з цими цілями.",
    en: "Purpose limitation. Data are collected for specified, explicit and legitimate purposes, specific to the Controller’s activity of providing consultancy, implementation and support services in the field of personal data protection, and are not further processed in a manner incompatible with those purposes.",
  },
  {
    k: "p",
    uk: "Мінімізація зібраних даних. Оператор забезпечує, щоб зібрані дані були адекватними, релевантними та обмеженими тим, що необхідно стосовно цілей, задля яких вони обробляються. Оператор уникає надмірного та невиправданого збирання даних.",
    en: "Data minimisation. The Controller ensures that the data collected are adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed. The Controller avoids the excessive and unjustified collection of data.",
  },
  {
    k: "p",
    uk: "Точність даних. Оператор вживає всіх розумних заходів для забезпечення того, щоб персональні дані були точними, повними та актуальними. Суб'єкт даних має право вимагати виправлення неточних або неповних даних.",
    en: "Accuracy of data. The Controller takes all reasonable measures to ensure that personal data are accurate, complete and up to date. The data subject has the right to request the rectification of inaccurate or incomplete data.",
  },
  {
    k: "p",
    uk: "Право на видалення (право «бути забутим»). Суб'єкт даних має право вимагати видалення своїх персональних даних на умовах, передбачених законом, у тому числі коли дані більше не потрібні для цілей, задля яких вони були зібрані, або коли згода була відкликана. Оператор розгляне запит протягом 30 робочих днів і діятиме відповідно до своїх юридичних зобов'язань.",
    en: "Right to erasure (the “right to be forgotten”). The data subject has the right to request the erasure of their personal data under the conditions provided for by law, including where the data are no longer necessary for the purposes for which they were collected, or where consent has been withdrawn. The Controller will examine the request within 30 working days and will act in accordance with its legal obligations.",
  },
  {
    k: "p",
    uk: "Обмеження зберігання. Дані зберігаються у формі, яка дозволяє ідентифікацію суб'єктів даних, лише протягом періоду, що не перевищує час, необхідний для досягнення цілей, задля яких вони зібрані, з дотриманням законних строків, специфічних для діяльності Оператора (наприклад: бухгалтерський облік). Після закінчення застосовних строків дані видаляються.",
    en: "Storage limitation. Data are kept in a form which permits identification of data subjects only for a period not exceeding the time necessary to achieve the purposes for which they are collected, in compliance with the legal periods specific to the Controller’s activity (for example: accounting). Upon expiry of the applicable periods, the data are deleted.",
  },
  {
    k: "p",
    uk: "Цілісність і конфіденційність. Оператор обробляє дані у спосіб, що забезпечує їх належну безпеку, включно із захистом від несанкціонованої чи незаконної обробки, випадкової втрати, знищення або пошкодження, шляхом впровадження технічних та організаційних заходів, відповідних рівню ризику.",
    en: "Integrity and confidentiality. The Controller processes data in a manner that ensures their appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, by implementing technical and organisational measures appropriate to the level of risk.",
  },
  {
    k: "p",
    uk: "Відповідальність. Оператор несе відповідальність за дотримання принципів, викладених у цій Політиці, і зобов'язаний демонструвати відповідність їм, у тому числі шляхом документування внутрішніх процесів, навчання персоналу, періодичного перегляду політик та ведення реєстру операцій з обробки.",
    en: "Accountability. The Controller is responsible for compliance with the principles set out in this Policy and is required to demonstrate such compliance, including by documenting internal processes, training staff, periodically reviewing policies and maintaining a record of processing operations.",
  },
  {
    k: "p",
    uk: "Дотримання прав суб'єкта даних. Оператор застосовує всі необхідні заходи для забезпечення ефективного захисту прав суб'єктів даних відповідно до чинного законодавства, а також відповідно до GDPR, надаючи зрозумілі та ефективні варіанти й методи подання запитів.",
    en: "Observance of the rights of the data subject. The Controller applies all necessary measures to ensure the effective protection of the rights of data subjects in accordance with the legislation in force, as well as in accordance with the GDPR, by providing clear and effective options and methods for submitting requests.",
  },
  {
    k: "p",
    uk: "Зберігання даних з метою архівування та для співпраці з правоохоронними органами. Оператор може зберігати певні дані протягом більш тривалого строку, коли це необхідно:",
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
    uk: "Оператор обробляє дані клієнтів та/або потенційних клієнтів під час доступу до вебсайту Оператора, запиту інформації про послуги, подання заявки через онлайн-форми, звернення електронною поштою чи телефоном або при ініціюванні взаємодії з метою отримання пропозиції, надання послуг чи розвитку договірних відносин, зокрема:",
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
    uk: "Оператор обробляє дані щодо функціонування інформаційних систем та доступу користувачів:",
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
    uk: "Оператор використовує автоматизовані технології, за допомогою яких може обробляти:",
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
    uk: "Право доступу. Особа має право отримати підтвердження того, що її персональні дані обробляються Оператором, а також право отримати копію оброблюваних даних та інформацію щодо обробки. За першим запитом на доступ, поданим суб'єктом даних, Оператор надає інформацію та копію даних безкоштовно. За будь-яким наступним запитом, ідентичним чи подібним, Оператор має право стягувати розумну плату, розраховану залежно від адміністративних витрат.",
    en: "Right of access. The person has the right to obtain confirmation that their personal data are being processed by the Controller, as well as the right to obtain a copy of the data being processed and information about the processing. Upon the first access request submitted by the data subject, the Controller provides the information and a copy of the data free of charge. For any subsequent identical or similar request, the Controller is entitled to charge a reasonable fee calculated on the basis of administrative costs.",
  },
  {
    k: "p",
    uk: "Право на виправлення. Суб'єкт даних має право вимагати виправлення неточних персональних даних або доповнення неповних даних.",
    en: "Right to rectification. The data subject has the right to request the rectification of inaccurate personal data or the completion of incomplete data.",
  },
  {
    k: "p",
    uk: "Право на видалення («право бути забутим»). Суб'єкт даних має право вимагати видалення своїх персональних даних у передбачених законом ситуаціях, у тому числі коли:",
    en: "Right to erasure (the “right to be forgotten”). The data subject has the right to request the erasure of their personal data in the situations provided for by law, including where:",
  },
  {
    k: "p",
    uk: "дані більше не потрібні для цілей, задля яких вони були зібрані;",
    en: "the data are no longer necessary for the purposes for which they were collected;",
  },
  {
    k: "p",
    uk: "суб'єкт даних відкликає свою згоду і немає іншої правової підстави для обробки.",
    en: "the data subject withdraws their consent and there is no other legal basis for the processing.",
  },
  {
    k: "p",
    uk: "Право на заперечення. Суб'єкт даних має право в будь-який момент заперечувати проти обробки своїх персональних даних, у тому числі проти обробки, здійснюваної Оператором з метою прямого маркетингу.",
    en: "Right to object. The data subject has the right to object at any time to the processing of their personal data, including to processing carried out by the Controller for direct marketing purposes.",
  },
  {
    k: "p",
    uk: "Право на обмеження обробки. Суб'єкт даних має право вимагати обмеження обробки своїх персональних даних у передбачених законом випадках, у тому числі коли він оспорює точність даних або коли обробка оспорюється.",
    en: "Right to restriction of processing. The data subject has the right to request the restriction of the processing of their personal data in the cases provided for by law, including where they contest the accuracy of the data or where the processing is contested.",
  },
  {
    k: "p",
    uk: "Право на переносимість даних. Суб'єкт даних має право отримати свої персональні дані у структурованому форматі, а також вимагати їх передачі іншому Оператору, у межах, встановлених законом.",
    en: "Right to data portability. The data subject has the right to receive their personal data in a structured format and to request their transmission to another Controller, within the limits established by law.",
  },
  {
    k: "p",
    uk: "Право подати скаргу. Суб'єкт даних має право подати скаргу до компетентного органу, якщо вважає, що обробка його персональних даних порушує законодавство.",
    en: "Right to lodge a complaint. The data subject has the right to lodge a complaint with the competent authority if they consider that the processing of their personal data infringes the legislation.",
  },
  {
    k: "p",
    uk: "Право на інформування. Суб'єкт даних має право бути поінформованим у зрозумілий і доступний спосіб щодо обробки своїх персональних даних.",
    en: "Right to be informed. The data subject has the right to be informed, in a clear and accessible manner, about the processing of their personal data.",
  },
  {
    k: "p",
    uk: "З метою здійснення цих прав суб'єкти даних заповнюють спеціалізовану форму, розроблену Оператором і надану суб'єктам даних за запитом.",
    en: "In order to exercise these rights, data subjects complete a dedicated form developed by the Controller and made available to data subjects upon request.",
  },
  {
    k: "h2",
    uk: "Обов'язки.",
    en: "Obligations.",
  },
  {
    k: "p",
    uk: "Обов'язки Оператора. Оператор відповідає за впровадження та дотримання положень цієї Політики, за забезпечення відповідності процесів обробки персональних даних і за застосування належних технічних та організаційних заходів захисту даних.",
    en: "Obligations of the Controller. The Controller is responsible for implementing and complying with the provisions of this Policy, for ensuring the compliance of the personal data processing operations and for applying appropriate technical and organisational data protection measures.",
  },
  {
    k: "p",
    uk: "Обов'язки персоналу. Усі працівники Оператора, які під час виконання службових обов'язків отримують доступ до персональних даних, використовують або обробляють їх, зобов'язані дотримуватися положень цієї Політики, внутрішніх інструкцій, а також обов'язків щодо конфіденційності.",
    en: "Obligations of staff. All employees of the Controller who, in the performance of their duties, access, use or process personal data are required to comply with the provisions of this Policy, with internal instructions, and with confidentiality obligations.",
  },
  {
    k: "p",
    uk: "Авторизований доступ до даних. Доступ до персональних даних дозволений виключно призначеним та уповноваженим особам у межах їхніх функціональних повноважень. Будь-який несанкціонований доступ суворо заборонений і тягне за собою дисциплінарну і, за необхідності, юридичну відповідальність.",
    en: "Authorised access to data. Access to personal data is permitted exclusively to designated and authorised persons within the limits of their functional powers. Any unauthorised access is strictly prohibited and entails disciplinary and, where appropriate, legal liability.",
  },
  {
    k: "p",
    uk: "Особи, уповноважені Оператором, зобов'язані обробляти персональні дані виключно в межах отриманих інструкцій, застосовувати передбачені заходи безпеки та дотримуватися договірних зобов'язань щодо захисту даних.",
    en: "Persons authorised by the Controller are required to process personal data solely within the limits of the instructions received, to apply the prescribed security measures and to observe the contractual data protection obligations.",
  },
  {
    k: "p",
    uk: "Відповідальність за безпеку систем. Технічний відділ і компетентний персонал відповідають за адміністрування інформаційної інфраструктури, підтримання цілісності систем безпеки, застосування контролю доступу та впровадження технічних заходів безпеки.",
    en: "Responsibility for system security. The technical department and the competent staff are responsible for administering the IT infrastructure, maintaining the integrity of the security systems, applying access controls and implementing technical security measures.",
  },
  {
    k: "p",
    uk: "Відповідальність у разі інцидентів безпеки. Будь-який працівник, який виявляє або підозрює інцидент безпеки щодо персональних даних, зобов'язаний діяти відповідно до Плану реагування на інциденти безпеки, розробленого та затвердженого Оператором.",
    en: "Responsibility in the event of security incidents. Any employee who detects or suspects a security incident concerning personal data is required to act in accordance with the Security Incident Response Plan developed and approved by the Controller.",
  },
  {
    k: "p",
    uk: "Перевірка та моніторинг відповідності. Оператор може проводити періодичні внутрішні перевірки для контролю дотримання положень цієї Політики та законних зобов'язань щодо захисту персональних даних.",
    en: "Verification and monitoring of compliance. The Controller may carry out periodic internal checks to monitor compliance with the provisions of this Policy and with the legal obligations concerning the protection of personal data.",
  },
  {
    k: "h2",
    uk: "Правові підстави обробки персональних даних.",
    en: "Legal bases for the processing of personal data.",
  },
  {
    k: "p",
    uk: "Оператор обробляє персональні дані виключно на підставі однієї або декількох правових підстав, передбачених законодавством, а саме:",
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
    uk: "законний інтерес Оператора;",
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
    uk: "Оператор обробляє персональні дані виключно з визначеними, чіткими та законними цілями, а саме:",
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
    uk: "виконання законних зобов'язань Оператора;",
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
    uk: "Оператор встановлює такі періоди зберігання залежно від категорії даних і мети обробки:",
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
    uk: "Після закінчення застосовних строків зберігання дані підлягають процедурі видалення, анонімізації, знищення або, за необхідності, архівування, на умовах, встановлених Оператором.",
    en: "Upon expiry of the applicable retention periods, the data are subject to a procedure of deletion, anonymisation, destruction or, where necessary, archiving, under the conditions established by the Controller.",
  },
  {
    k: "p",
    uk: "Оператор веде внутрішній облік строків і процедур зберігання та видалення даних з метою забезпечення дотримання принципу обмеження зберігання.",
    en: "The Controller maintains internal records of the periods and procedures for the retention and deletion of data in order to ensure compliance with the storage limitation principle.",
  },
  {
    k: "h2",
    uk: "Транскордонна передача персональних даних.",
    en: "Cross-border transfer of personal data.",
  },
  {
    k: "p",
    uk: "Оператор може передавати персональні дані до держав — членів Європейського Союзу чи Європейського економічного простору, а також до інших юрисдикцій, які забезпечують належний рівень захисту, згідно з переліком, встановленим CNPDCP відповідно до законодавства Республіки Молдова.",
    en: "The Controller may transfer personal data to Member States of the European Union or of the European Economic Area, as well as to other jurisdictions which ensure an adequate level of protection, in accordance with the list established by the CNPDCP pursuant to the legislation of the Republic of Moldova.",
  },
  {
    k: "p",
    uk: "Передача даних до третьої держави або міжнародної організації здійснюється лише за умови наявності належних гарантій захисту даних, у тому числі, за необхідності:",
    en: "The transfer of data to a third country or an international organisation is carried out only where appropriate data protection safeguards are in place, including, where necessary:",
  },
  {
    k: "p",
    uk: "стандартних договірних умов, затверджених компетентними органами;",
    en: "standard contractual clauses approved by the competent authorities;",
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
    uk: "Оператор може здійснювати міжнародні передачі даних лише за умови, що вони необхідні для досягнення цілей обробки і що права суб'єкта даних належним чином захищені.",
    en: "The Controller may carry out international data transfers only on condition that they are necessary to achieve the purposes of the processing and that the rights of the data subject are duly protected.",
  },
  {
    k: "p",
    uk: "У ситуації, коли передача здійснюється до держав, які не забезпечують належного рівня захисту, Оператор впроваджує додаткові заходи безпеки, покликані забезпечити конфіденційність, цілісність і доступність даних під час передачі та подальшої обробки.",
    en: "In situations where the transfer is carried out to countries which do not ensure an adequate level of protection, the Controller implements additional security measures designed to ensure the confidentiality, integrity and availability of the data during transfer and subsequent processing.",
  },
  {
    k: "p",
    uk: "Оператор інформує суб'єкта даних про міжнародні передачі даних на умовах і засобами, передбаченими законом.",
    en: "The Controller informs the data subject about international data transfers under the conditions and by the means provided for by law.",
  },
  {
    k: "h2",
    uk: "Технічні та організаційні заходи безпеки.",
    en: "Technical and organisational security measures.",
  },
  {
    k: "p",
    uk: "Оператор впроваджує належні технічні та організаційні заходи для забезпечення рівня безпеки, відповідного ризикам, пов'язаним з обробкою персональних даних, згідно із законодавством і принципом відповідальності.",
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
    uk: "Оператор безперервно контролює рівень безпеки інформаційних систем і вживає заходів для запобігання та виявлення несанкціонованого доступу, спроб компрометації інфраструктури або будь-якого інциденту безпеки.",
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
    uk: "Доступ до персональних даних дозволений виключно особам, призначеним Оператором, у межах службових обов'язків і лише з цілями, передбаченими цією Політикою та застосовним законодавством.",
    en: "Access to personal data is permitted exclusively to persons designated by the Controller, within the limits of their job duties and only for the purposes provided for in this Policy and by the applicable legislation.",
  },
  {
    k: "p",
    uk: "Доступ надається на основі принципу «необхідності знати» залежно від службових обов'язків, таким чином, щоб уповноважені особи використовували лише дані, суворо необхідні для виконання функціональних обов'язків.",
    en: "Access is granted on the basis of the “need-to-know” principle according to job duties, so that authorised persons use only the data strictly necessary to perform their functional responsibilities.",
  },
  {
    k: "p",
    uk: "Оператор встановлює рівень доступу для кожної категорії персоналу залежно від ролі, відповідальності та характеру оброблюваних даних.",
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
    uk: "Оператор виявляє, оцінює та контролює ризики, пов'язані з обробкою персональних даних, ураховуючи характер даних, обсяг обробки, використовувані технології та потенційні загрози й ризики.",
    en: "The Controller identifies, assesses and manages the risks associated with the processing of personal data, taking into account the nature of the data, the scope of the processing, the technologies used and the potential threats and risks.",
  },
  {
    k: "p",
    uk: "Оператор впроваджує належні заходи для зменшення ризиків, включно з технічними засобами контролю, організаційними заходами та внутрішніми процедурами для запобігання інцидентам безпеки.",
    en: "The Controller implements appropriate measures to mitigate risks, including technical controls, organisational measures and internal procedures for preventing security incidents.",
  },
  {
    k: "p",
    uk: "У ситуаціях, коли обробка даних може створювати високі ризики для прав і свобод суб'єкта даних, Оператор проводить оцінювання впливу на захист даних (DPIA), відповідно до чинного законодавства.",
    en: "In situations where the processing of data may pose high risks to the rights and freedoms of the data subject, the Controller carries out a data protection impact assessment (DPIA), in accordance with the legislation in force.",
  },
  {
    k: "p",
    uk: "Персонал Оператора зобов'язаний негайно повідомляти про будь-яку ситуацію, яка може становити ризик, вразливість чи інцидент щодо захисту персональних даних.",
    en: "The Controller’s staff are required to report immediately any situation that may constitute a risk, vulnerability or incident concerning the protection of personal data.",
  },
  {
    k: "p",
    uk: "Оператор може проводити періодичні внутрішні перевірки та аудити для оцінювання ефективності впроваджених заходів і для їх оновлення залежно від технологічної та правової еволюції.",
    en: "The Controller may carry out periodic internal checks and audits to assess the effectiveness of the measures implemented and to update them according to technological and legal developments.",
  },
  {
    k: "h2",
    uk: "Обробка даних за допомогою файлів cookie",
    en: "Processing of data by means of cookies",
  },
  {
    k: "p",
    uk: "Оператор використовує файли cookie та подібні технології на своїх онлайн-платформах з метою забезпечення належного функціонування сайту, покращення користувацького досвіду, аналізу використання платформ і, за необхідності, надання персоналізованого контенту.",
    en: "The Controller uses cookies and similar technologies on its online platforms in order to ensure the proper functioning of the website, improve the user experience, analyse the use of the platforms and, where appropriate, provide personalised content.",
  },
  {
    k: "p",
    uk: "Оператор може використовувати такі категорії файлів cookie:",
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
    uk: "Файли cookie використовуються на підставі законного інтересу Оператора щодо забезпечення технічного функціонування платформи.",
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
    uk: "Оператор архівує персональні дані відповідно до законодавства, внутрішніх вимог і встановлених для кожної категорії даних строків зберігання.",
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
    uk: "Після закінчення строку зберігання або коли дані більше не потрібні для цілей, задля яких вони були зібрані, Оператор здійснює їх знищення або видалення, за необхідності — анонімізацію.",
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
    uk: "Видалення даних на електронному носії здійснюється за допомогою технічних процедур, які забезпечують повне та остаточне усунення інформації з інформаційних систем, включно з резервними копіями, у тій мірі, у якій це можливо та сумісно із законними зобов'язаннями Оператора.",
    en: "The deletion of data on an electronic medium is carried out by means of technical procedures that ensure the complete and definitive removal of the information from the information systems, including backups, to the extent that this is possible and compatible with the Controller’s legal obligations.",
  },
  {
    k: "p",
    uk: "Оператор може використовувати спеціалізовані послуги для знищення даних, з дотриманням договірних зобов'язань щодо конфіденційності та безпеки обробки.",
    en: "The Controller may use specialised services for the destruction of data, in compliance with contractual obligations concerning the confidentiality and security of the processing.",
  },
  {
    k: "p",
    uk: "Оператор веде внутрішній облік щодо архівування та знищення даних, включаючи дату операції, категорію даних, використаний метод і відповідальну особу.",
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
    uk: "Ця Політика підлягає періодичному перегляду, з інтервалами, встановленими Оператором, з метою підтримання відповідності застосовному законодавству, стандартам безпеки та внутрішнім процесам Оператора.",
    en: "This Policy is subject to periodic review, at intervals established by the Controller, in order to maintain compliance with the applicable legislation, security standards and the Controller’s internal processes.",
  },
  {
    k: "p",
    uk: "Перегляд Політики здійснюється також щоразу, коли з'являються релевантні зміни в законодавчій базі, в організаційній структурі, в інформаційних системах або в процесах обробки персональних даних.",
    en: "The Policy is also reviewed whenever relevant changes arise in the legislative framework, in the organisational structure, in the information systems or in the personal data processing operations.",
  },
  {
    k: "p",
    uk: "Перегляди документуються та затверджуються особами з обов'язками, призначеними Оператором.",
    en: "Reviews are documented and approved by the persons with responsibilities designated by the Controller.",
  },
  {
    k: "p",
    uk: "Оператор може змінювати цю Політику в будь-який момент, залежно від правових, операційних чи технічних потреб.",
    en: "The Controller may amend this Policy at any time, depending on legal, operational or technical needs.",
  },
  {
    k: "p",
    uk: "Будь-яка зміна набирає чинності з дати, зазначеної в акті затвердження.",
    en: "Any amendment takes effect from the date indicated in the approval act.",
  },
  {
    k: "p",
    uk: "Оператор забезпечує повідомлення персоналу про зміни, а також надає суб'єктам даних оновлену версію Політики належними засобами, встановленими Оператором.",
    en: "The Controller ensures that staff are notified of amendments and makes the updated version of the Policy available to data subjects by appropriate means established by the Controller.",
  },
  {
    k: "p",
    uk: "Оператор веде повний облік версій Політики, включно з датами змін та особами, які здійснили затвердження.",
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
    uk: "Ця Політика є обов'язковою для всіх осіб, які обробляють персональні дані в межах діяльності, здійснюваної Оператором, незалежно від посади, позиції чи договірних відносин.",
    en: "This Policy is binding on all persons who process personal data within the activity carried out by the Controller, irrespective of their office, position or contractual relationship.",
  },
  {
    k: "p",
    uk: "Недотримання положень Політики може призвести до дисциплінарних, цивільних, адміністративних чи кримінальних заходів, залежно від характеру та тяжкості порушення.",
    en: "Failure to comply with the provisions of the Policy may give rise to disciplinary, civil, administrative or criminal measures, depending on the nature and gravity of the infringement.",
  },
  {
    k: "p",
    uk: "Політика набирає чинності з дати офіційного затвердження Оператором.",
    en: "The Policy enters into force on the date of its official approval by the Controller.",
  },
  {
    k: "p",
    uk: "Після набрання чинності Політика застосовується повністю до всіх операцій з обробки персональних даних, здійснюваних Оператором.",
    en: "Once in force, the Policy applies in full to all personal data processing operations carried out by the Controller.",
  },
  {
    k: "p",
    uk: "Оператор відповідає за впровадження, моніторинг і застосування цієї Політики.",
    en: "The Controller is responsible for the implementation, monitoring and application of this Policy.",
  },
  {
    k: "p",
    uk: "Оператор співпрацює з компетентними органами у сфері захисту персональних даних і надає необхідну інформацію в межах та на умовах, передбачених законом.",
    en: "The Controller cooperates with the competent authorities in the field of personal data protection and provides the necessary information within the limits and under the conditions provided for by law.",
  },
  {
    k: "p",
    uk: "У разі виникнення неясностей щодо тлумачення чи застосування цієї Політики переважають положення законодавства, застосовного у сфері захисту персональних даних.",
    en: "In the event of any ambiguity regarding the interpretation or application of this Policy, the provisions of the legislation applicable in the field of personal data protection shall prevail.",
  },
  {
    k: "p",
    uk: "Оператор залишає за собою право видавати додаткові внутрішні інструкції для однакового застосування Політики.",
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
