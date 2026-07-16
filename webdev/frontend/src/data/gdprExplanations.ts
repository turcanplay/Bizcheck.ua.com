/**
 * GDPR report — per-question explanations (UK/EN).
 * Keyed by 1-based question order (1..10). Generated from the source
 * .docx files; for future edits prefer regenerating or moving to admin.
 * Each entry: a fixed explanation shown regardless of the given answer.
 */

export interface GdprExplanation {
  order: number;
  title: { uk: string; en: string };
  intro: { uk: string[]; en: string[] };
  risk: { uk: string[]; en: string[] };
  action: { uk: string[]; en: string[] };
}

export const GDPR_EXPLANATIONS: GdprExplanation[] = [
  {
    order: 1,
    title: {
      uk: "Загальні відомості про компанію",
      en: "General information about the company",
    },
    intro: {
      uk: [
        "Даний блок призначений для розуміння загального профілю компанії: сфери, в якій вона провадить діяльність, приблизного розміру команди, місць, де ведеться діяльність, а також основного типу клієнтів, з якими взаємодіє компанія.",
        "Ця інформація важлива, оскільки рівень підданості обов'язкам і ризикам GDPR відрізняється від однієї компанії до іншої. Невелика компанія, яка не провадить онлайн-діяльність і працює лише з юридичними особами, як правило, має нижчий рівень ризику, ніж компанія з кількома точками діяльності, великою кількістю співробітників, клієнтами — фізичними особами та діяльністю, що провадиться онлайн.",
        "Отже, перш ніж аналізувати внутрішні документи або застосовувані заходи захисту, необхідно чітко розуміти, як компанія функціонує на практиці та в яких зонах з'являються персональні дані.",
      ],
      en: [
        "This section is intended to help understand the company's general profile: the field in which it operates, the approximate size of the team, the locations where it carries out its activities, and the main type of clients the company interacts with.",
        "This information is important because the level of exposure to GDPR obligations and risks differs from one company to another. A small company that does not operate online and works only with legal entities generally has a lower risk level than a company with multiple locations, a large number of employees, individual clients, and activities carried out online.",
        "Therefore, before analysing internal documents or the protection measures in place, it is necessary to clearly understand how the company operates in practice and in which areas personal data appears.",
      ],
    },
    risk: {
      uk: [
        "Якщо відсутнє чітке уявлення про діяльність компанії, стає складно визначити, які персональні дані збираються, від кого надходять ці дані, з якою метою вони використовуються та хто має до них доступ.",
        "Наприклад, компанія, що має кілька офісів, магазинів, філій або співробітників, які працюють віддалено, може обробляти персональні дані в кількох місцях і через кілька каналів. За відсутності чіткого обліку дані можуть зберігатися неорганізовано, можуть бути доступні особам, яким вони не потрібні, або можуть передаватися без чітко встановлених внутрішніх правил.",
        "Додатковий ризик виникає, коли компанія працює безпосередньо з фізичними особами. У цьому випадку компанія може збирати імена, номери телефонів, адреси електронної пошти, дані доставки, платіжні дані, скарги або іншу персональну інформацію. Якщо такі дані не управляються належним чином, компанія може бути піддана скаргам, запитам з боку суб'єктів даних або перевіркам з боку компетентного органу.",
        "Також, якщо діяльність компанії провадиться онлайн або з використанням цифрових засобів, ризики зростають, оскільки дані можуть збиратися автоматично, зберігатися на зовнішніх платформах або бути одночасно доступними кільком особам.",
        "На практиці відсутність чіткого уявлення про компанію призводить до труднощів при підтвердженні відповідності вимогам GDPR. Навіть якщо певні заходи існують, компанія може бути не в змозі достатньо ясно пояснити, які дані вона обробляє, де вони знаходяться та яким чином захищаються.",
      ],
      en: [
        "If there is no clear picture of the company's activities, it becomes difficult to determine what personal data is collected, whom this data comes from, for what purposes it is used, and who has access to it.",
        "For example, a company with several offices, stores, branches, or employees working remotely may process personal data in multiple locations and through multiple channels. Without clear records, data may be stored in a disorganised way, may be accessible to people who do not need it, or may be transferred without clearly established internal rules.",
        "An additional risk arises when the company works directly with individuals. In this case, the company may collect names, phone numbers, email addresses, delivery details, payment details, complaints, or other personal information. If such data is not managed properly, the company may be exposed to complaints, requests from data subjects, or inspections by the competent authority.",
        "Also, if the company's activities are carried out online or using digital tools, the risks increase, because data may be collected automatically, stored on external platforms, or accessible to several people at the same time.",
        "In practice, the lack of a clear picture of the company leads to difficulties in demonstrating compliance with GDPR requirements. Even if certain measures exist, the company may be unable to explain clearly enough what data it processes, where it is located, and how it is protected.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна максимально чітко описати спосіб провадження своєї діяльності: основну сферу діяльності, приблизну кількість співробітників, точки провадження діяльності, наявність онлайн- або віддаленої діяльності, а також основний тип клієнтів.",
        "Такий опис не повинен бути складним, але він має відображати практичну реальність. Мета полягає в тому, щоб на підставі цієї інформації можна було визначити основні потоки персональних даних усередині компанії.",
        "Рекомендується періодично переглядати цю інформацію, особливо коли компанія розширює свою діяльність, відкриває нові точки діяльності, запускає сайт, починає збирати дані онлайн або наймає новий персонал.",
        "Простий і актуальний облік цих аспектів допомагає компанії зрозуміти, де виникають персональні дані та які заходи захисту необхідно застосовувати.",
      ],
      en: [
        "The company should describe as clearly as possible how it carries out its activities: its main field of activity, the approximate number of employees, its locations, the presence of online or remote activities, and the main type of clients.",
        "This description does not need to be complex, but it should reflect the practical reality. The goal is that, based on this information, it becomes possible to identify the main flows of personal data within the company.",
        "It is recommended to review this information periodically, especially when the company expands its activities, opens new locations, launches a website, starts collecting data online, or hires new staff.",
        "Simple and up-to-date records of these aspects help the company understand where personal data arises and what protection measures need to be applied.",
      ],
    },
  },
  {
    order: 2,
    title: {
      uk: "Організаційна структура компанії",
      en: "Organisational structure of the company",
    },
    intro: {
      uk: [
        "Даний блок показує, як компанія організована всередині та хто керує найважливішими зонами, в яких з'являються персональні дані: бухгалтерією, IT-системами та людськими ресурсами.",
        "Ці три зони є ключовими для дотримання вимог GDPR. Бухгалтерія керує фінансовими даними та підтвердними документами, людські ресурси — даними співробітників і кандидатів, а IT-напрям забезпечує інфраструктуру, через яку дані зберігаються, доступні та передаються.",
        "На практиці ці види діяльності можуть управлятися всередині компанії, її співробітниками, або передаватися на аутсорсинг таким постачальникам послуг, як бухгалтерські компанії, IT-компанії, HR-консультанти або інші спеціалізовані постачальники.",
      ],
      en: [
        "This section shows how the company is organised internally and who manages the most important areas in which personal data appears: accounting, IT systems, and human resources.",
        "These three areas are key to GDPR compliance. Accounting manages financial data and supporting documents, human resources manages the data of employees and candidates, and the IT function provides the infrastructure through which data is stored, accessed, and transferred.",
        "In practice, these activities may be managed internally, by the company's own employees, or outsourced to service providers such as accounting firms, IT companies, HR consultants, or other specialised providers.",
      ],
    },
    risk: {
      uk: [
        "Якщо неясно, хто керує кожною зоною, виникає ризик того, що обов'язки щодо персональних даних будуть розподілені нечітко або не будуть конкретно взяті на себе жодною особою.",
        "Наприклад, у випадку бухгалтерії компанія може передавати зовнішньому постачальнику дані про співробітників, заробітну плату, договори, посвідчення особи, банківські дані або інші фінансові документи. Навіть якщо ці дані обробляються бухгалтером, компанія залишається відповідальною за те, щоб їх передача та використання здійснювалися законно та в умовах безпеки.",
        "У IT-зоні ризики можуть бути ще вищими. IT-постачальник може мати доступ до електронної пошти, серверів, комп'ютерів, баз даних, резервних копій або внутрішніх облікових записів. Якщо доступ не врегульований і не контролюється, можуть виникнути ситуації, коли дані будуть доступні без чіткого обґрунтування або без достатніх заходів захисту.",
        "У HR-зоні компанія обробляє дані співробітників і кандидатів, включаючи документи про працевлаштування, контактні дані, інформацію про заробітну плату, відпустки, результати роботи, відсутності або, в окремих випадках, медичні дані. Ці дані повинні управлятися уважно, оскільки вони безпосередньо стосуються професійного та особистого життя осіб.",
        "Поширений ризик виникає тоді, коли компанія використовує зовнішніх постачальників, але не має договорів або положень про захист даних. У таких випадках компанія не може чітко довести, які обов'язки має постачальник, яким чином він повинен захищати дані, чи може він передавати їх далі та що відбувається з даними після припинення співпраці.",
        "За відсутності чітких правил можуть виникати несанкціоновані доступи, втрати даних, неконтрольовані передачі або неможливість коректно відповідати на запити суб'єктів даних.",
      ],
      en: [
        "If it is unclear who manages each area, there is a risk that responsibilities regarding personal data will be assigned unclearly or will not be specifically assumed by anyone.",
        "For example, in the case of accounting, the company may transfer to an external provider data on employees, salaries, contracts, identity documents, banking details, or other financial documents. Even if this data is processed by the accountant, the company remains responsible for ensuring that its transfer and use are carried out lawfully and securely.",
        "In the IT area, the risks may be even higher. An IT provider may have access to email, servers, computers, databases, backups, or internal accounts. If access is not regulated and controlled, situations may arise in which data is accessible without clear justification or without sufficient protection measures.",
        "In the HR area, the company processes the data of employees and candidates, including employment documents, contact details, salary information, leave, performance results, absences, or, in certain cases, medical data. This data must be managed carefully, as it directly concerns the professional and personal life of individuals.",
        "A common risk arises when the company uses external providers but has no contracts or data protection provisions. In such cases, the company cannot clearly demonstrate what obligations the provider has, how it must protect the data, whether it may transfer it further, and what happens to the data after the cooperation ends.",
        "In the absence of clear rules, unauthorised access, data loss, uncontrolled transfers, or the inability to respond correctly to data subject requests may occur.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна точно встановити, хто керує бухгалтерією, IT-системами та людськими ресурсами. По кожній з цих зон необхідно визначити, чи здійснюється діяльність усередині компанії, чи через аутсорсинг.",
        "Якщо діяльність управляється всередині компанії, рекомендується, щоб відповідальні особи знали мінімальні правила захисту даних і мали доступ лише до тієї інформації, яка необхідна для виконання їхніх обов'язків.",
        "Якщо діяльність передана на аутсорсинг, компанія повинна перевірити, чи існують письмові договори з постачальниками послуг і чи містять ці договори положення про захист персональних даних. Зокрема, необхідно уточнити, які дані отримує постачальник, з якою метою він їх використовує, хто має до них доступ, як довго він їх зберігає та які заходи безпеки застосовує.",
        "Рекомендується документувати всі відносини з постачальниками, які мають доступ до персональних даних. Навіть простий додаток про захист даних може знизити ризики та підтвердити, що компанія відповідально ставиться до цього питання.",
        "Також компанії слід призначити всередині відповідальну особу, яка знатиме основні потоки даних і зможе взаємодіяти як із зовнішніми постачальниками, так і зі співробітниками та керівництвом компанії. Така особа не обов'язково повинна мати формальний статус DPO, однак вона має бути здатною на практиці координувати базові питання, пов'язані із захистом даних.",
      ],
      en: [
        "The company must precisely establish who manages accounting, IT systems, and human resources. For each of these areas, it is necessary to determine whether the activity is carried out internally or through outsourcing.",
        "If the activity is managed internally, it is recommended that the responsible persons know the minimum data protection rules and have access only to the information necessary to perform their duties.",
        "If the activity is outsourced, the company must verify whether written contracts with service providers exist and whether these contracts contain provisions on the protection of personal data. In particular, it is necessary to clarify what data the provider receives, for what purpose it uses it, who has access to it, how long it retains it, and what security measures it applies.",
        "It is recommended to document all relationships with providers that have access to personal data. Even a simple data protection addendum can reduce risks and confirm that the company treats this matter responsibly.",
        "The company should also appoint an internal responsible person who will know the main data flows and be able to interact both with external providers and with the company's employees and management. This person does not necessarily need to hold the formal status of a DPO; however, they should be able, in practice, to coordinate the basic issues related to data protection.",
      ],
    },
  },
  {
    order: 3,
    title: {
      uk: "Веб-сайт та онлайн-діяльність",
      en: "Website and online activity",
    },
    intro: {
      uk: [
        "Даний блок показує, чи має компанія онлайн-присутність і чи збираються персональні дані за допомогою веб-сайту, форм, розсилок, онлайн-замовлень або інших цифрових інструментів.",
        "Онлайн-діяльність важлива з точки зору GDPR, оскільки персональні дані можуть збиратися швидко, автоматично та від великої кількості осіб. Навіть проста контактна форма може передбачати обробку таких даних, як ім'я, прізвище, адреса електронної пошти, номер телефону, надіслане повідомлення або інша інформація, введена користувачем.",
        "Якщо сайт використовується лише як презентаційна сторінка, ризики можуть бути нижчими. Однак якщо через сайт надходять запити, замовлення, підписки на розсилку або інша інформація від користувачів, компанія повинна застосовувати чіткі правила щодо інформування осіб, мети збору даних і порядку їх зберігання.",
      ],
      en: [
        "This section shows whether the company has an online presence and whether personal data is collected through a website, forms, newsletters, online orders, or other digital tools.",
        "Online activity is important from a GDPR perspective, because personal data can be collected quickly, automatically, and from a large number of people. Even a simple contact form may involve processing data such as first name, last name, email address, phone number, the message sent, or other information entered by the user.",
        "If the website is used only as a presentation page, the risks may be lower. However, if the site receives requests, orders, newsletter subscriptions, or other information from users, the company must apply clear rules regarding informing individuals, the purpose of collecting the data, and how it is stored.",
      ],
    },
    risk: {
      uk: [
        "Важливий ризик виникає тоді, коли компанія збирає дані через сайт без достатнього інформування суб'єктів даних. Користувач, який заповнює форму, повинен знати, хто збирає дані, з якою метою вони використовуються, чи передаються вони третім особам, як довго зберігаються та які права він має.",
        "За відсутності чіткої політики конфіденційності компанію можуть звинуватити в непрозорій обробці даних. Навіть якщо зібрані дані здаються простими, наприклад ім'я, телефон або адреса електронної пошти, вони залишаються персональними даними та повинні оброблятися належним чином.",
        "Додатковий ризик виникає у випадку розсилок або маркетингових кампаній. Якщо користувачі підписуються автоматично, без чіткої згоди, або якщо вони не мають реальної можливості відписатися, компанія може отримати скарги. На практиці небажані комерційні повідомлення є одним із найчастіших джерел невдоволення з боку клієнтів або користувачів.",
        "Також у випадку онлайн-замовлень ризики вищі, оскільки можуть збиратися кілька категорій даних: ім'я, адреса, телефон, електронна пошта, дані про замовлення, дані доставки, платіжні дані або історія взаємодії з клієнтом. Якщо ці дані зберігаються безконтрольно або передаються кур'єрам, платіжним платформам, IT-постачальникам або іншим постачальникам послуг без чітких правил, компанія може втратити контроль над потоком даних.",
        "Ще один ризик пов'язаний із технічними інструментами, що використовуються на сайті: аналітичними модулями, файлами cookie, онлайн-чатом, зовнішніми формами, інтеграціями із соціальними мережами або маркетинговими платформами. Іноді компанія не збирає дані безпосередньо, але дозволяє зовнішнім інструментам збирати їх через сайт. У таких ситуаціях компанія повинна розуміти, які дані збираються та на яких умовах.",
        "За відсутності чіткої оцінки онлайн-діяльності компанія може мати сайт, функціональний з комерційної точки зору, але вразливий з юридичної та операційної точки зору.",
      ],
      en: [
        "A significant risk arises when the company collects data through the website without sufficiently informing data subjects. A user who fills in a form should know who is collecting the data, for what purpose it is used, whether it is transferred to third parties, how long it is stored, and what rights they have.",
        "In the absence of a clear privacy policy, the company may be accused of non-transparent data processing. Even if the collected data seems simple, such as a name, phone number, or email address, it remains personal data and must be processed properly.",
        "An additional risk arises in the case of newsletters or marketing campaigns. If users are subscribed automatically, without clear consent, or if they have no real possibility to unsubscribe, the company may receive complaints. In practice, unwanted commercial messages are one of the most common sources of dissatisfaction among clients or users.",
        "Also, in the case of online orders, the risks are higher, because several categories of data may be collected: name, address, phone number, email, order details, delivery details, payment details, or the history of interaction with the customer. If this data is stored uncontrollably or transferred to couriers, payment platforms, IT providers, or other service providers without clear rules, the company may lose control over the flow of data.",
        "Another risk relates to the technical tools used on the website: analytics modules, cookies, online chat, external forms, integrations with social networks, or marketing platforms. Sometimes the company does not collect the data directly but allows external tools to collect it through the site. In such situations, the company must understand what data is collected and under what conditions.",
        "In the absence of a clear assessment of its online activity, the company may have a website that is functional from a commercial point of view but vulnerable from a legal and operational point of view.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна визначити всі способи, за допомогою яких вона збирає персональні дані онлайн. Це включає контактні форми, підписки на розсилку, онлайн-замовлення, облікові записи користувачів, онлайн-чат, запити комерційних пропозицій, записи на прийом, мобільні застосунки або інші цифрові інструменти.",
        "По кожному способу збору даних необхідно встановити, які дані збираються, з якою метою, на якій правовій підставі, де вони зберігаються та хто має до них доступ.",
        "Рекомендується, щоб сайт містив чітку політику конфіденційності, складену зрозумілою мовою. Вона повинна пояснювати, яким чином компанія обробляє дані користувачів і які права вони мають.",
        "У випадку розсилок компанія повинна переконатися, що підписка здійснюється чітко та документально підтверджувано, а користувачі мають можливість легко відписатися. Також не рекомендується використовувати дані, зібрані для однієї мети, з іншою метою без законного обґрунтування або без належного інформування суб'єкта даних.",
        "Якщо сайт використовує файли cookie або зовнішні інструменти аналітики та маркетингу, рекомендується перевірити їх і, за необхідності, впровадити політику використання файлів cookie та належний механізм отримання згоди.",
        "Періодична перевірка сайту та онлайн-інструментів допомагає компанії уникнути неконтрольованого збору даних і підтвердити, що її цифрова діяльність організована відповідно до вимог GDPR.",
      ],
      en: [
        "The company must identify all the ways in which it collects personal data online. This includes contact forms, newsletter subscriptions, online orders, user accounts, online chat, requests for commercial offers, appointment bookings, mobile applications, or other digital tools.",
        "For each method of collecting data, it is necessary to establish what data is collected, for what purpose, on what legal basis, where it is stored, and who has access to it.",
        "It is recommended that the website contain a clear privacy policy written in understandable language. It should explain how the company processes users' data and what rights they have.",
        "In the case of newsletters, the company must ensure that the subscription is carried out clearly and in a documented manner, and that users are able to unsubscribe easily. It is also not recommended to use data collected for one purpose for another purpose without a lawful basis or without properly informing the data subject.",
        "If the website uses cookies or external analytics and marketing tools, it is recommended to review them and, if necessary, implement a cookie policy and an appropriate consent mechanism.",
        "A periodic review of the website and online tools helps the company avoid uncontrolled data collection and confirm that its digital activity is organised in accordance with GDPR requirements.",
      ],
    },
  },
  {
    order: 4,
    title: {
      uk: "Категорії суб'єктів даних",
      en: "Categories of data subjects",
    },
    intro: {
      uk: [
        "Даний блок показує, від кого компанія збирає персональні дані. У діяльності компанії дані можуть надходити від співробітників, кандидатів на працевлаштування, клієнтів — фізичних осіб, представників партнерів або постачальників, відвідувачів, які перебувають під відеоспостереженням, або інших осіб, які взаємодіють з компанією.",
        "Визначення цих категорій є суттєвим, оскільки кожна категорія суб'єктів даних передбачає різні обов'язки. Не всі дані збираються з однією і тією ж метою, не всі дані повинні зберігатися однаковий період часу і не до всіх даних можуть мати доступ одні й ті самі особи всередині компанії.",
        "Отже, перш ніж аналізувати документи або заходи захисту, важливо, щоб компанія чітко розуміла, чиї саме дані вона обробляє.",
      ],
      en: [
        "This section shows from whom the company collects personal data. In the course of the company's activities, data may come from employees, job candidates, individual clients, representatives of partners or suppliers, visitors under video surveillance, or other people who interact with the company.",
        "Identifying these categories is essential, because each category of data subjects entails different obligations. Not all data is collected for the same purpose, not all data must be stored for the same period of time, and not all data can be accessed by the same people within the company.",
        "Therefore, before analysing documents or protection measures, it is important that the company clearly understands whose data it actually processes.",
      ],
    },
    risk: {
      uk: [
        "Якщо суб'єкти даних не визначені коректно, компанія може застосовувати загальні правила там, де повинні існувати окремі правила. Наприклад, дані співробітників обробляються в контексті трудових відносин, дані кандидатів — у процесі підбору персоналу, а дані клієнтів — у комерційному або договірному контексті.",
        "Поширений ризик виникає у випадку кандидатів на працевлаштування. Компанія може отримувати резюме, копії документів, інформацію про професійний досвід, контактні дані або іншу персональну інформацію. Якщо ці дані зберігаються протягом невизначеного строку або доступні більшій кількості осіб, ніж необхідно, компанія може порушити принцип обмеження строку зберігання та принцип обмеженого доступу.",
        "У випадку співробітників ризики вищі, оскільки компанія може обробляти значний обсяг даних: трудові договори, ідентифікаційні дані, банківські дані, інформацію про заробітну плату, відпустки, відсутності, професійні оцінки або медичні документи. Ці дані повинні ретельно захищатися, оскільки їх неналежне використання або розкриття може безпосередньо зачепити відповідну особу.",
        "У випадку клієнтів — фізичних осіб компанія повинна уважно ставитися до даних, що збираються для надання послуг, продажів, доставки, виставлення рахунків, комунікації або розгляду скарг. Якщо дані клієнтів згодом використовуються для маркетингу, аналізу або інших цілей, необхідно перевірити наявність належної правової підстави.",
        "Представники партнерів і постачальників іноді помилково сприймаються як «дані компанії», однак ім'я, посада, телефон, робоча адреса електронної пошти або підпис фізичної особи також є персональними даними. Отже, такі дані також повинні управлятися належним чином.",
        "У випадку відвідувачів, які перебувають під відеоспостереженням, ризик пов'язаний з відсутністю інформування, надто тривалим зберіганням зображень або неконтрольованим доступом до записів. Навіть якщо відеоспостереження використовується з метою безпеки, компанія повинна дотримуватися чітких правил прозорості та пропорційності.",
        "Якщо ці категорії не розділені, компанія може врешті зберігати непотрібні дані, неправильно інформувати суб'єктів даних або не мати можливості належним чином відповідати на їхні запити.",
      ],
      en: [
        "If data subjects are not correctly identified, the company may apply general rules where separate rules should exist. For example, employee data is processed in the context of employment relations, candidate data during the recruitment process, and client data in a commercial or contractual context.",
        "A common risk arises in the case of job candidates. The company may receive CVs, copies of documents, information about professional experience, contact details, or other personal information. If this data is stored for an indefinite period or is accessible to more people than necessary, the company may breach the storage limitation principle and the principle of restricted access.",
        "In the case of employees, the risks are higher, because the company may process a significant amount of data: employment contracts, identification data, banking details, salary information, leave, absences, performance evaluations, or medical documents. This data must be carefully protected, because its improper use or disclosure can directly affect the person concerned.",
        "In the case of individual clients, the company must pay careful attention to the data collected for providing services, sales, delivery, invoicing, communication, or handling complaints. If client data is subsequently used for marketing, analysis, or other purposes, it is necessary to verify the existence of an appropriate legal basis.",
        "Representatives of partners and suppliers are sometimes mistakenly perceived as \"company data\"; however, the name, position, phone number, work email address, or signature of an individual are also personal data. Therefore, such data must also be managed properly.",
        "In the case of visitors under video surveillance, the risk relates to the lack of information, overly long retention of images, or uncontrolled access to recordings. Even if video surveillance is used for security purposes, the company must comply with clear rules of transparency and proportionality.",
        "If these categories are not separated, the company may end up storing unnecessary data, incorrectly informing data subjects, or being unable to respond properly to their requests.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна визначити всі категорії осіб, чиї дані збираються або використовуються в її діяльності. По кожній категорії необхідно встановити, які дані обробляються, чому вони необхідні, хто має до них доступ і як довго вони зберігаються.",
        "Рекомендується проводити такий аналіз окремо для співробітників, кандидатів, клієнтів, представників партнерів, відвідувачів та інших релевантних осіб. Такий поділ допомагає застосовувати коректні правила для кожної ситуації.",
        "Щодо співробітників компанія повинна мати чіткі внутрішні документи про обробку даних у рамках трудових відносин. Щодо кандидатів необхідно встановити, як довго зберігаються резюме та хто має до них доступ. Щодо клієнтів необхідно уточнити комерційні, договірні та, за необхідності, маркетингові цілі. Щодо представників партнерів необхідно забезпечити належне інформування. Щодо відвідувачів необхідно проаналізувати правила відеоспостереження.",
        "Практичний підхід полягає у складанні простого переліку всіх категорій суб'єктів даних і ситуацій, у яких компанія збирає їхні дані. Такий перелік може слугувати основою для внутрішніх політик, інформаційних повідомлень і реєстрів обліку операцій з обробки даних.",
        "Періодичний перегляд цих категорій є важливим, оскільки діяльність компанії може змінюватися. Можуть з'являтися нові послуги, нові канали комунікації, нові постачальники послуг або нові точки діяльності, і все це може вводити нові категорії суб'єктів даних або нові потоки даних.",
      ],
      en: [
        "The company must identify all categories of people whose data is collected or used in its activities. For each category, it is necessary to establish what data is processed, why it is necessary, who has access to it, and how long it is stored.",
        "It is recommended to carry out this analysis separately for employees, candidates, clients, representatives of partners, visitors, and other relevant persons. Such a separation helps to apply the correct rules for each situation.",
        "Regarding employees, the company must have clear internal documents on the processing of data within the framework of employment relations. Regarding candidates, it is necessary to establish how long CVs are stored and who has access to them. Regarding clients, it is necessary to clarify the commercial, contractual and, where applicable, marketing purposes. Regarding representatives of partners, it is necessary to ensure proper information. Regarding visitors, it is necessary to analyse the video surveillance rules.",
        "A practical approach is to compile a simple list of all categories of data subjects and the situations in which the company collects their data. Such a list can serve as a basis for internal policies, information notices, and records of processing activities.",
        "A periodic review of these categories is important, because the company's activities may change. New services, new communication channels, new service providers, or new locations may appear, and all of this may introduce new categories of data subjects or new data flows.",
      ],
    },
  },
  {
    order: 5,
    title: {
      uk: "Типи даних, що збираються",
      en: "Types of data collected",
    },
    intro: {
      uk: [
        "Даний блок показує, які типи персональних даних компанія збирає, використовує або зберігає у своїй поточній діяльності. Не всі персональні дані мають однаковий рівень ризику. Одні дані є звичайними, наприклад ім'я, телефон або адреса електронної пошти, а інші можуть мати набагато більший вплив на особу, наприклад копії документів, що посвідчують особу, медичні дані, банківські дані або біометричні дані.",
        "Визначення типів даних важливе, оскільки компанія повинна знати не лише те, від кого вона збирає дані, але й які саме відомості вона збирає на практиці. Залежно від типу даних можуть знадобитися різні заходи захисту, різні строки зберігання та суворіші правила доступу.",
        "Наприклад, компанія може мати законний обов'язок зберігати певні дані співробітників для кадрового обліку або бухгалтерії. Водночас зберігання копій документів, що посвідчують особу, фотографій або окремих медичних даних повинно аналізуватися уважніше, щоб перевірити, чи це дійсно необхідно.",
      ],
      en: [
        "This section shows what types of personal data the company collects, uses, or stores in its current activities. Not all personal data carries the same level of risk. Some data is ordinary, such as a name, phone number, or email address, while other data may have a much greater impact on the individual, such as copies of identity documents, medical data, banking details, or biometric data.",
        "Identifying the types of data is important, because the company must know not only from whom it collects data, but also what specific information it collects in practice. Depending on the type of data, different protection measures, different retention periods, and stricter access rules may be required.",
        "For example, the company may have a legal obligation to keep certain employee data for HR or accounting records. At the same time, storing copies of identity documents, photographs, or certain medical data should be analysed more carefully, in order to verify whether it is really necessary.",
      ],
    },
    risk: {
      uk: [
        "Перший ризик виникає тоді, коли компанія збирає більше даних, ніж їй реально необхідно. На практиці іноді запитуються копії документів, банківські дані, фотографії або інша інформація «про всяк випадок», без чіткого пояснення їх необхідності. Такий підхід може порушувати принцип мінімізації даних, згідно з яким компанія повинна збирати лише ті дані, які необхідні для чітко визначеної мети.",
        "Копії документів, що посвідчують особу, становлять чутливу категорію з практичної точки зору, навіть якщо вони не завжди є спеціальними категоріями даних у строгому сенсі. Вони містять багато інформації в одному документі і, у випадку втрати або помилкової передачі, можуть бути використані неправомірно. Тому їх зберігання повинно бути обґрунтованим та обмеженим.",
        "Медичні дані або інформація про стан здоров'я передбачають високий рівень захисту. Вони можуть з'являтися у зв'язку з медичними відпустками, медичними довідками, висновками, придатністю до роботи або іншими аналогічними документами. Якщо такі дані доступні особам, яким вони не потрібні, або зберігаються без чітких правил, компанія піддається значним ризикам.",
        "Фінансові та банківські дані співробітників або клієнтів також повинні бути належним чином захищені. Вони можуть бути необхідні для платежів, виплати заробітної плати, відшкодувань або договірних відносин, однак доступ до них повинен бути обмежений особами, які мають прямі обов'язки в цій сфері.",
        "Особливий ризик виникає у випадку біометричних даних, таких як відбитки пальців, розпізнавання обличчя або голос, що використовується для ідентифікації. Ці дані є дуже чутливими, оскільки вони безпосередньо пов'язані з фізичною ідентичністю особи і не можуть бути легко змінені у випадку неправомірного використання. Їх використання повинно бути дуже ретельно обґрунтоване і, як правило, вимагає спеціальних заходів захисту.",
        "Фотографії осіб можуть здаватися нешкідливими, однак вони також є персональними даними, якщо дозволяють ідентифікувати особу. Вони можуть використовуватися для перепусток, внутрішніх профілів, просування, заходів або інших цілей. Якщо фотографії публікуються або використовуються без інформування чи без згоди, коли вона необхідна, можуть виникнути скарги з боку суб'єктів даних.",
        "За відсутності чіткого обліку типів даних, що збираються, компанія може врешті зберігати непотрібні дані, допускати необґрунтований доступ до чутливої інформації або не мати можливості довести, навіщо їй потрібні певні дані.",
      ],
      en: [
        "The first risk arises when the company collects more data than it actually needs. In practice, copies of documents, banking details, photographs, or other information are sometimes requested \"just in case\", without a clear explanation of their necessity. Such an approach may breach the data minimisation principle, according to which the company should collect only the data that is necessary for a clearly defined purpose.",
        "Copies of identity documents constitute a sensitive category from a practical point of view, even if they are not always special categories of data in the strict sense. They contain a lot of information in a single document and, in the event of loss or mistaken transfer, may be misused. Their storage must therefore be justified and limited.",
        "Medical data or health information requires a high level of protection. It may appear in connection with sick leave, medical certificates, opinions, fitness for work, or other similar documents. If such data is accessible to people who do not need it, or is stored without clear rules, the company is exposed to significant risks.",
        "Financial and banking data of employees or clients must also be properly protected. It may be necessary for payments, salary payments, reimbursements, or contractual relationships; however, access to it must be restricted to people who have direct duties in this area.",
        "A particular risk arises in the case of biometric data, such as fingerprints, facial recognition, or voice used for identification. This data is highly sensitive, because it is directly linked to the physical identity of the person and cannot be easily changed in the event of misuse. Its use must be very carefully justified and, as a rule, requires special protection measures.",
        "Photographs of individuals may seem harmless; however, they are also personal data if they allow a person to be identified. They may be used for access badges, internal profiles, promotion, events, or other purposes. If photographs are published or used without informing the person, or without consent where it is required, complaints from data subjects may arise.",
        "In the absence of a clear record of the types of data collected, the company may end up storing unnecessary data, allowing unjustified access to sensitive information, or being unable to demonstrate why it needs certain data.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна визначити всі категорії персональних даних, які вона збирає та зберігає. Такий аналіз повинен бути практичним, а не лише формальним: необхідно перевірити, які документи є у фізичних досьє, електронних системах, електронній пошті, CRM, бухгалтерії, HR та інших використовуваних платформах.",
        "По кожному типу даних необхідно встановити, навіщо він потрібен, на якій підставі обробляється, хто має до нього доступ і як довго він повинен зберігатися. Якщо певні дані не є необхідними, вони не повинні збиратися або повинні бути виключені з внутрішніх процесів.",
        "Рекомендується, щоб дані з високим рівнем ризику, такі як медичні дані, копії документів, що посвідчують особу, банківські дані або біометричні дані, оброблялися окремо та були доступні лише обмеженому колу осіб.",
        "Компанія повинна встановити чіткі правила зберігання документів, що містять персональні дані. Наприклад, не всі документи необхідно копіювати, не всі копії необхідно зберігати, а доступ до фізичних або електронних досьє повинен бути обмежений.",
        "Також корисно проводити періодичний перегляд даних, що збираються. Діяльність компанії може змінюватися, і деякі дані, які були необхідні в певний момент, згодом можуть стати непотрібними. Завдяки такому перегляду компанія знижує ризики та підтверджує, що управляє персональними даними відповідальним чином.",
      ],
      en: [
        "The company must identify all categories of personal data that it collects and stores. This analysis should be practical, not only formal: it is necessary to check what documents are held in physical files, electronic systems, email, CRM, accounting, HR, and other platforms used.",
        "For each type of data, it is necessary to establish why it is needed, on what basis it is processed, who has access to it, and how long it should be stored. If certain data is not necessary, it should not be collected or should be excluded from internal processes.",
        "It is recommended that high-risk data, such as medical data, copies of identity documents, banking details, or biometric data, be processed separately and be accessible only to a limited number of people.",
        "The company must establish clear rules for storing documents that contain personal data. For example, not all documents need to be copied, not all copies need to be stored, and access to physical or electronic files must be restricted.",
        "It is also useful to carry out a periodic review of the data collected. The company's activities may change, and some data that was necessary at a certain point may later become unnecessary. Through such a review, the company reduces risks and confirms that it manages personal data in a responsible manner.",
      ],
    },
  },
  {
    order: 6,
    title: {
      uk: "Управління даними через CRM, бази даних і системи зберігання",
      en: "Data management through CRM, databases, and storage systems",
    },
    intro: {
      uk: [
        "Даний блок показує, де зберігаються персональні дані та за допомогою яких інструментів вони управляються. Дані можуть зберігатися в CRM-системах, бухгалтерських програмах, файлах Excel, HR-платформах, внутрішніх серверах, комп'ютерах, електронній пошті, хмарних застосунках або інших базах даних.",
        "Цей розділ важливий, оскільки на практиці ризики виникають не лише через сам факт збору даних, але й через те, як вони зберігаються, використовуються, копіюються, передаються або видаляються. Компанія може мати коректні юридичні документи, однак якщо дані зберігаються хаотично в кількох місцях, відповідність вимогам GDPR стає важко довести.",
        "Отже, компанія повинна точно знати, де знаходяться персональні дані та хто має до них доступ.",
      ],
      en: [
        "This section shows where personal data is stored and by means of which tools it is managed. Data may be stored in CRM systems, accounting software, Excel files, HR platforms, internal servers, computers, email, cloud applications, or other databases.",
        "This section is important because, in practice, risks arise not only from the very fact of collecting data, but also from how it is stored, used, copied, transferred, or deleted. A company may have correct legal documents; however, if data is stored chaotically in several places, compliance with GDPR requirements becomes difficult to demonstrate.",
        "Therefore, the company must know exactly where personal data is located and who has access to it.",
      ],
    },
    risk: {
      uk: [
        "Поширений ризик виникає тоді, коли дані зберігаються в надто великій кількості місць без чіткого обліку. Наприклад, одні й ті самі дані клієнта можуть знаходитися в CRM, в електронній пошті, у файлі Excel, у рахунку, у спільній папці та у внутрішньому листуванні. Якщо відсутні чіткі правила, компанія фактично перестає контролювати, де знаходяться дані та хто може отримати до них доступ.",
        "У випадку файлів Excel або баз даних, що управляються вручну, ризики виникають через відсутність контролю над версіями, паролями та доступом. Файли можуть легко копіюватися, надсилатися електронною поштою, завантажуватися на особисті комп'ютери або змінюватися без чіткого обліку.",
        "У випадку CRM-систем або інших платформ управління основний ризик пов'язаний з правами доступу. Якщо всі співробітники можуть бачити всі дані без зв'язку з їхніми посадовими обов'язками, компанія може порушити принцип обмеженого доступу. Кожна особа повинна мати доступ лише до тих даних, які необхідні для її роботи.",
        "Локальне зберігання на внутрішніх серверах або комп'ютерах пов'язане з ризиками, що стосуються безпеки обладнання, резервних копій, паролів, фізичного доступу та захисту від втрати даних. Якщо комп'ютер виходить з ладу, губиться або до нього отримують несанкціонований доступ, компанія може втратити важливі дані або розкрити персональну інформацію.",
        "Зберігання в хмарі може бути ефективним і безпечним, однак воно повинно управлятися правильно. Компанія повинна знати, яку платформу вона використовує, де можуть зберігатися дані, хто є постачальником послуги, які заходи безпеки застосовуються та хто має право доступу. Використання особистих або неофіційних облікових записів для документів компанії може створювати додаткові ризики.",
        "Ще один важливий ризик — відсутність правил видалення даних. Якщо дані зберігаються в платформах, папках і резервних копіях без чітких строків, компанія може врешті зберігати інформацію значно довше, ніж це необхідно. Це може створити проблеми у випадку запитів на видалення, перевірок або інцидентів безпеки.",
        "За відсутності чіткої організації компанія може зіткнутися з труднощами, коли необхідно відповісти особі, яка запитує доступ до своїх даних, виправлення даних або їх видалення. Якщо дані розподілені по кількох системах, відповідь може бути неповною або затриманою.",
      ],
      en: [
        "A common risk arises when data is stored in too many places without clear records. For example, the same client data may be located in the CRM, in email, in an Excel file, in an invoice, in a shared folder, and in internal correspondence. If there are no clear rules, the company effectively loses control over where the data is and who can access it.",
        "In the case of Excel files or manually managed databases, risks arise from the lack of control over versions, passwords, and access. Files can easily be copied, sent by email, downloaded onto personal computers, or modified without clear records.",
        "In the case of CRM systems or other management platforms, the main risk relates to access rights. If all employees can see all data without any connection to their job duties, the company may breach the principle of restricted access. Each person should have access only to the data necessary for their work.",
        "Local storage on internal servers or computers involves risks relating to equipment security, backups, passwords, physical access, and protection against data loss. If a computer breaks down, is lost, or is accessed without authorisation, the company may lose important data or disclose personal information.",
        "Cloud storage can be efficient and secure; however, it must be managed correctly. The company must know which platform it uses, where the data may be stored, who the service provider is, what security measures are applied, and who has access rights. Using personal or unofficial accounts for company documents may create additional risks.",
        "Another important risk is the absence of data deletion rules. If data is stored in platforms, folders, and backups without clear time limits, the company may end up storing information much longer than necessary. This can create problems in the event of deletion requests, inspections, or security incidents.",
        "In the absence of clear organisation, the company may face difficulties when it needs to respond to a person requesting access to their data, correction of data, or its deletion. If the data is distributed across several systems, the response may be incomplete or delayed.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна визначити всі системи та місця, де зберігаються персональні дані. Така ідентифікація повинна включати як офіційні системи, так і інструменти, що фактично використовуються співробітниками: CRM, Excel, електронну пошту, хмару, внутрішні сервери, комп'ютери, комунікаційні застосунки, бухгалтерські або HR-платформи.",
        "По кожній системі необхідно встановити, які типи даних зберігаються, хто має доступ, хто адмініструє систему, чи існують резервні копії та чи можуть дані бути видалені або експортовані за необхідності.",
        "Рекомендується надавати доступ до даних залежно від ролі кожного співробітника. Не всі співробітники повинні бачити всі дані. Доступ повинен бути обмежений тим, що необхідно для виконання службових обов'язків.",
        "Компанія повинна встановити чіткі правила використання файлів Excel, спільних папок, електронної пошти та хмарних платформ. Документи, що містять персональні дані, не повинні зберігатися в особистих облікових записах, передаватися неконтрольовано або копіюватися без необхідності.",
        "Також необхідно перевірити мінімальні заходи безпеки: надійні паролі, індивідуальний доступ, додаткову автентифікацію там, де це можливо, резервні копії, антивірусний захист і правила використання службового обладнання.",
        "Корисно також встановити строки зберігання даних у кожній системі. Компанія повинна знати, коли певні дані необхідно архівувати, видалити або анонімізувати. Таке правило допомагає знизити ризики та підтримувати чистий і контрольований облік.",
        "Організоване управління системами та базами даних дозволяє компанії довести, що вона знає, де знаходяться персональні дані, хто їх використовує та яким чином вони захищаються.",
      ],
      en: [
        "The company must identify all systems and locations where personal data is stored. This identification should include both official systems and the tools actually used by employees: CRM, Excel, email, cloud, internal servers, computers, communication applications, accounting, or HR platforms.",
        "For each system, it is necessary to establish what types of data are stored, who has access, who administers the system, whether backups exist, and whether the data can be deleted or exported if necessary.",
        "It is recommended to grant access to data according to each employee's role. Not all employees should see all data. Access should be limited to what is necessary to perform job duties.",
        "The company must establish clear rules for the use of Excel files, shared folders, email, and cloud platforms. Documents containing personal data should not be stored in personal accounts, transferred in an uncontrolled manner, or copied unnecessarily.",
        "It is also necessary to check the minimum security measures: strong passwords, individual access, additional authentication where possible, backups, antivirus protection, and rules for the use of work equipment.",
        "It is also useful to establish data retention periods for each system. The company must know when certain data should be archived, deleted, or anonymised. Such a rule helps reduce risks and maintain clean and controlled records.",
        "Organised management of systems and databases allows the company to demonstrate that it knows where personal data is located, who uses it, and how it is protected.",
      ],
    },
  },
  {
    order: 7,
    title: {
      uk: "Передача даних і доступ до даних",
      en: "Data transfer and access to data",
    },
    intro: {
      uk: [
        "Даний блок показує, чи передаються персональні дані або чи стають вони доступними особам чи компаніям за межами компанії. На практиці майже будь-яка компанія співпрацює із зовнішніми постачальниками послуг, які можуть мати доступ до персональних даних: бухгалтерами, консультантами, IT-постачальниками, маркетинговими компаніями, кур'єрськими службами, постачальниками хмарних сервісів, адвокатами, аудиторами або іншими партнерами.",
        "Цей розділ важливий, оскільки GDPR стосується не лише даних, які зберігаються всередині компанії, але й даних, які передаються за межі компанії або стають доступними третім особам. Навіть якщо обробка здійснюється зовнішнім постачальником послуг, компанія повинна розуміти, які дані передаються, чому вони передаються та на яких умовах вони захищаються.",
        "Також важливо перевірити, чи потрапляють дані в інші країни, прямо або опосередковано. Наприклад, навіть якщо постачальник є місцевим, він може використовувати хмарні платформи, сервери, субпідрядників або технічні інструменти, які передбачають зберігання даних або доступ до них з-за меж країни.",
      ],
      en: [
        "This section shows whether personal data is transferred or made accessible to people or companies outside the company. In practice, almost every company cooperates with external service providers that may have access to personal data: accountants, consultants, IT providers, marketing companies, courier services, cloud service providers, lawyers, auditors, or other partners.",
        "This section is important because GDPR concerns not only the data stored within the company, but also the data transferred outside the company or made accessible to third parties. Even if the processing is carried out by an external service provider, the company must understand what data is transferred, why it is transferred, and under what conditions it is protected.",
        "It is also important to check whether data ends up in other countries, directly or indirectly. For example, even if the provider is local, it may use cloud platforms, servers, subcontractors, or technical tools that involve storing data or accessing it from outside the country.",
      ],
    },
    risk: {
      uk: [
        "Важливий ризик виникає тоді, коли дані передаються третім особам без чіткого обліку. У таких ситуаціях компанія може не знати точно, хто має доступ до даних, які дані використовуються, з якою метою та як довго вони зберігаються.",
        "Наприклад, бухгалтер може отримувати дані про співробітників, заробітну плату, договори, платежі та підтвердні документи. IT-постачальник може мати доступ до електронної пошти, серверів, комп'ютерів, резервних копій і баз даних. Консультант або адвокат може отримувати документи, що містять дані про співробітників, клієнтів, партнерів або інших осіб. Кожна з цих ситуацій передбачає потік даних, який повинен контролюватися.",
        "Якщо відсутні договори або положення про захист даних, компанія не може чітко довести, які обов'язки має постачальник послуг. За відсутності таких положень можуть виникати проблеми, пов'язані з конфіденційністю, безпекою даних, залученням субпідрядників, зберіганням документів або поверненням і видаленням даних після припинення співпраці.",
        "Додатковий ризик виникає тоді, коли зовнішні постачальники використовують власні системи, платформи або субпідрядників. Компанія може вважати, що дані управляються лише безпосереднім постачальником послуг, але насправді вони можуть потрапляти також до технічних постачальників, хмарних сервісів, маркетингових платформ, зовнішніх серверів або інших компаній, що беруть участь у наданні послуги.",
        "У випадку передачі даних компаніям з інших країн ризики є ще чутливішими. Міжнародні передачі даних повинні аналізуватися окремо, оскільки не всі країни забезпечують однаковий рівень захисту персональних даних. Якщо дані передаються без перевірки законних умов, компанія може бути піддана юридичним і репутаційним ризикам.",
        "Також відсутність чіткого обліку доступу до даних може створити труднощі у випадку інциденту. Якщо відбувається витік інформації або несанкціонований доступ, компанія повинна мати можливість швидко встановити, які дані були зачеплені, хто мав доступ і які заходи необхідно вжити.",
        "На практиці неконтрольована передача даних третім особам є однією з найбільш вразливих зон, оскільки компанія втрачає прямий контроль над даними, але залишається відповідальною за те, яким чином вони управляються.",
      ],
      en: [
        "A significant risk arises when data is transferred to third parties without clear records. In such situations, the company may not know exactly who has access to the data, what data is used, for what purpose, and how long it is stored.",
        "For example, an accountant may receive data on employees, salaries, contracts, payments, and supporting documents. An IT provider may have access to email, servers, computers, backups, and databases. A consultant or lawyer may receive documents containing data on employees, clients, partners, or other persons. Each of these situations involves a data flow that must be controlled.",
        "If there are no contracts or data protection provisions, the company cannot clearly demonstrate what obligations the service provider has. In the absence of such provisions, problems may arise related to confidentiality, data security, the use of subcontractors, document retention, or the return and deletion of data after the cooperation ends.",
        "An additional risk arises when external providers use their own systems, platforms, or subcontractors. The company may believe that the data is managed only by the direct service provider, but in reality it may also end up with technical providers, cloud services, marketing platforms, external servers, or other companies involved in providing the service.",
        "In the case of transferring data to companies in other countries, the risks are even more sensitive. International data transfers must be analysed separately, because not all countries provide the same level of personal data protection. If data is transferred without checking the lawful conditions, the company may be exposed to legal and reputational risks.",
        "Also, the absence of clear records of data access can create difficulties in the event of an incident. If information is leaked or accessed without authorisation, the company must be able to quickly determine what data was affected, who had access, and what measures need to be taken.",
        "In practice, the uncontrolled transfer of data to third parties is one of the most vulnerable areas, because the company loses direct control over the data but remains responsible for how it is managed.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна визначити всіх партнерів, постачальників і зовнішніх виконавців, які отримують персональні дані або мають до них доступ. Такий аналіз повинен включати як очевидні види співпраці, наприклад бухгалтерію та IT-послуги, так і менш помітні взаємодії, такі як хмарні платформи, маркетинг, послуги доставки, супровід програмного забезпечення або зовнішнє консультування.",
        "По кожному постачальнику послуг необхідно встановити, які дані він отримує, з якою метою, на підставі якого договору, хто має доступ до даних, чи може постачальник залучати субпідрядників і що відбувається з даними після припинення співпраці.",
        "Рекомендується, щоб відносини з постачальниками послуг, які обробляють персональні дані, регулювалися положеннями про захист даних або окремими угодами. Ці документи повинні передбачати обов'язки, пов'язані з конфіденційністю, безпекою, обмеженням використання даних, сприянням у випадку запитів суб'єктів даних та повідомленням про інциденти.",
        "Компанія повинна перевірити, чи передаються дані в інші країни або чи використовують постачальники зовнішні платформи, які можуть передбачати такі передачі. У подібних випадках необхідно проаналізувати застосовні законні умови та необхідні документи.",
        "Також корисно створити внутрішній облік постачальників послуг, які мають доступ до персональних даних. Такий облік може бути простим, але повинен оновлюватися при появі нового постачальника, зміні послуг або зміні типів даних, що передаються.",
        "Практичне правило полягає в тому, щоб дані передавалися лише тоді, коли це необхідно, лише уповноваженим особам або компаніям і лише на підставі чітких умов. Таким чином компанія зберігає контроль над даними та знижує ризик їх неналежного використання.",
      ],
      en: [
        "The company must identify all partners, suppliers, and external contractors that receive personal data or have access to it. This analysis should include both obvious types of cooperation, such as accounting and IT services, and less visible interactions, such as cloud platforms, marketing, delivery services, software maintenance, or external consulting.",
        "For each service provider, it is necessary to establish what data it receives, for what purpose, on the basis of which contract, who has access to the data, whether the provider may engage subcontractors, and what happens to the data after the cooperation ends.",
        "It is recommended that relationships with service providers that process personal data be governed by data protection provisions or separate agreements. These documents should provide for obligations relating to confidentiality, security, restriction on the use of data, assistance in the event of data subject requests, and notification of incidents.",
        "The company must check whether data is transferred to other countries or whether providers use external platforms that may involve such transfers. In such cases, it is necessary to analyse the applicable lawful conditions and the required documents.",
        "It is also useful to create an internal record of service providers that have access to personal data. Such a record can be simple, but it should be updated when a new provider appears, when services change, or when the types of data transferred change.",
        "A practical rule is that data should be transferred only when necessary, only to authorised persons or companies, and only on the basis of clear conditions. In this way, the company retains control over the data and reduces the risk of its improper use.",
      ],
    },
  },
  {
    order: 8,
    title: {
      uk: "Система відеоспостереження та GPS",
      en: "Video surveillance and GPS system",
    },
    intro: {
      uk: [
        "Даний блок показує, чи використовуються в компанії відеокамери або GPS-системи для моніторингу автомобілів. Ці інструменти можуть мати законну мету, наприклад забезпечення збереження майна, захист осіб, запобігання інцидентам або організацію професійної діяльності. Однак вони передбачають прямий або опосередкований моніторинг осіб і повинні управлятися уважно.",
        "Відеоспостереження може стосуватися співробітників, клієнтів, відвідувачів, постачальників або інших осіб, які входять до приміщень компанії. GPS-моніторинг може стосуватися співробітників, які використовують службові автомобілі, а в окремих випадках — автомобілі, що використовуються також в особистих цілях.",
        "З точки зору GDPR ці інструменти повинні аналізуватися не лише технічно, але й юридично. Компанія повинна бути здатною пояснити, чому вона використовує відеоспостереження або GPS, які дані збирає, хто має до них доступ і як довго вони зберігаються.",
      ],
      en: [
        "This section shows whether the company uses video cameras or GPS systems to monitor vehicles. These tools may have a legitimate purpose, such as protecting property, protecting people, preventing incidents, or organising professional activity. However, they involve direct or indirect monitoring of individuals and must be managed carefully.",
        "Video surveillance may concern employees, clients, visitors, suppliers, or other people who enter the company's premises. GPS monitoring may concern employees who use company vehicles and, in certain cases, vehicles that are also used for personal purposes.",
        "From a GDPR perspective, these tools must be analysed not only technically but also legally. The company must be able to explain why it uses video surveillance or GPS, what data it collects, who has access to it, and how long it is stored.",
      ],
    },
    risk: {
      uk: [
        "Важливий ризик виникає тоді, коли відеокамери встановлені без належного інформування. Особи, які входять до офісу, магазину, комерційного приміщення або виробничого простору, повинні знати, що зона перебуває під відеоспостереженням, хто керує системою та з якою метою використовуються зображення.",
        "Якщо відсутні видимі попереджувальні таблички або повне інформування, компанію можуть звинуватити в непрозорому моніторингу осіб. Цей ризик вищий у приміщеннях, де особи не очікують, що за ними буде здійснюватися спостереження, або де спостереження може вважатися надмірним.",
        "Ще один ризик пов'язаний з розміщенням камер. Камери повинні встановлюватися лише там, де існує обґрунтована мета. Постійне та непропорційне спостереження за співробітниками може створювати проблеми, особливо якщо реальною метою є не безпека, а надмірний контроль їхньої діяльності.",
        "Також необхідно уникати встановлення камер у зонах, де особи мають підвищене очікування приватності. Навіть коли компанія переслідує законну мету, використовувані засоби повинні бути пропорційними.",
        "У випадку GPS-систем ризики виникають насамперед тоді, коли автомобілі використовуються також в особистих цілях. Якщо моніторинг триває поза робочим часом або поза професійною метою, це може зачіпати приватне життя співробітників. У таких випадках компанія повинна встановити чіткі правила щодо того, коли і яким чином моніторинг є активним.",
        "Поширений ризик — відсутність внутрішньої політики щодо CCTV і GPS. Якщо відсутні письмові правила, співробітники можуть не знати, що саме відстежується, хто має доступ до даних, як довго зберігаються зображення або дані про місцезнаходження та в яких ситуаціях вони можуть використовуватися.",
        "Неконтрольований доступ до відеозаписів або GPS-даних є ще одним важливим ризиком. Якщо надто багато осіб можуть переглядати зображення або маршрути автомобілів, компанія може порушити принцип обмеженого доступу. Ці дані повинні бути доступні лише уповноваженим особам і лише за наявності конкретної підстави.",
        "Надмірне зберігання відеозаписів або GPS-даних може створювати додаткові проблеми. Якщо дані зберігаються довше, ніж необхідно, компанія без необхідності накопичує інформацію про осіб і збільшує ризик того, що вона буде доступна або використана неналежним чином.",
        "У випадку інциденту відсутність чітких правил може ускладнити обґрунтування використання записів. Наприклад, якщо відеозаписи використовуються в трудовому конфлікті або спорі з клієнтом, компанія повинна мати можливість довести, що система використовувалася законно та пропорційно.",
      ],
      en: [
        "A significant risk arises when video cameras are installed without proper information. People entering an office, store, commercial premises, or production area should know that the area is under video surveillance, who manages the system, and for what purpose the images are used.",
        "In the absence of visible warning signs or complete information, the company may be accused of non-transparent monitoring of individuals. This risk is higher in premises where people do not expect to be monitored, or where monitoring may be considered excessive.",
        "Another risk relates to the placement of cameras. Cameras should be installed only where there is a justified purpose. Constant and disproportionate monitoring of employees can create problems, especially if the real purpose is not security but excessive control of their activities.",
        "It is also necessary to avoid installing cameras in areas where people have a higher expectation of privacy. Even when the company pursues a legitimate purpose, the means used must be proportionate.",
        "In the case of GPS systems, risks arise primarily when vehicles are also used for personal purposes. If monitoring continues outside working hours or outside a professional purpose, it may affect employees' private life. In such cases, the company must establish clear rules regarding when and how monitoring is active.",
        "A common risk is the absence of an internal policy on CCTV and GPS. If there are no written rules, employees may not know what exactly is being tracked, who has access to the data, how long images or location data are stored, and in what situations they may be used.",
        "Uncontrolled access to video recordings or GPS data is another significant risk. If too many people can view images or vehicle routes, the company may breach the principle of restricted access. This data should be accessible only to authorised persons and only where there is a specific reason.",
        "Excessive storage of video recordings or GPS data can create additional problems. If data is stored longer than necessary, the company unnecessarily accumulates information about individuals and increases the risk that it will be accessed or used improperly.",
        "In the event of an incident, the absence of clear rules can make it difficult to justify the use of recordings. For example, if video recordings are used in an employment dispute or a dispute with a client, the company must be able to demonstrate that the system was used lawfully and proportionately.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна чітко встановити мету, для якої вона використовує відеокамери або GPS-системи. Ця мета повинна бути реальною, необхідною та пропорційною. Наприклад, безпека приміщень, захист майна, розслідування інцидентів або управління службовими автомобілями можуть бути обґрунтованими цілями, якщо вони належним чином задокументовані.",
        "У випадку відеоспостереження компанія повинна перевірити, де розміщені камери, які зони вони охоплюють, чи є видимі попереджувальні таблички та хто має доступ до записів. Рекомендується, щоб спостереження було обмежене необхідними зонами та не виходило за межі заявленої мети.",
        "Компанія повинна інформувати суб'єктів даних про використання відеокамер. Інформування може включати попереджувальні таблички біля входу та детальніше інформаційне повідомлення, доступне заінтересованим особам. Воно повинно пояснювати, хто адмініструє систему, мету спостереження, строк зберігання зображень і права суб'єктів даних.",
        "У випадку GPS компанія повинна встановити, чи використовуються автомобілі виключно в професійних цілях, чи також в особистих цілях. Якщо допускається особисте використання, необхідно проаналізувати додаткові заходи, щоб уникнути надмірного моніторингу поза робочим часом або поза професійною метою.",
        "Рекомендується прийняти внутрішню політику про використання систем CCTV і GPS. Вона повинна передбачати мету моніторингу, категорії суб'єктів даних, строк зберігання, осіб, які мають доступ, ситуації, в яких дані можуть бути перевірені, а також порядок управління запитами або інцидентами.",
        "Доступ до відеозаписів і GPS-даних повинен бути обмежений призначеними особами. Корисно вести облік доступів, особливо коли дані переглядаються для розслідування інциденту або вирішення конкретної ситуації.",
        "Компанія повинна встановити чіткі строки зберігання відеозаписів і GPS-даних. Вони не повинні зберігатися протягом невизначеного строку, а лише стільки, скільки необхідно для мети, для якої вони були зібрані.",
        "Коректне управління системами CCTV і GPS дозволяє компанії ефективно використовувати ці інструменти, не зачіпаючи необґрунтовано приватне життя співробітників, клієнтів або інших осіб.",
      ],
      en: [
        "The company must clearly establish the purpose for which it uses video cameras or GPS systems. This purpose must be real, necessary, and proportionate. For example, securing premises, protecting property, investigating incidents, or managing company vehicles may be justified purposes, provided they are properly documented.",
        "In the case of video surveillance, the company must check where the cameras are placed, which areas they cover, whether there are visible warning signs, and who has access to the recordings. It is recommended that surveillance be limited to the necessary areas and not go beyond the stated purpose.",
        "The company must inform data subjects about the use of video cameras. This information may include warning signs at the entrance and a more detailed information notice available to interested persons. It should explain who administers the system, the purpose of the surveillance, the retention period of the images, and the rights of data subjects.",
        "In the case of GPS, the company must establish whether the vehicles are used exclusively for professional purposes or also for personal purposes. If personal use is allowed, it is necessary to analyse additional measures to avoid excessive monitoring outside working hours or outside a professional purpose.",
        "It is recommended to adopt an internal policy on the use of CCTV and GPS systems. It should set out the purpose of the monitoring, the categories of data subjects, the retention period, the persons who have access, the situations in which the data may be reviewed, and the procedure for handling requests or incidents.",
        "Access to video recordings and GPS data must be restricted to designated persons. It is useful to keep a record of access, especially when data is reviewed to investigate an incident or resolve a specific situation.",
        "The company must establish clear retention periods for video recordings and GPS data. They should not be stored for an indefinite period, but only for as long as necessary for the purpose for which they were collected.",
        "Correct management of CCTV and GPS systems allows the company to use these tools effectively without unjustifiably affecting the private life of employees, clients, or other people.",
      ],
    },
  },
  {
    order: 9,
    title: {
      uk: "Особа, відповідальна за захист даних",
      en: "Person responsible for data protection",
    },
    intro: {
      uk: [
        "Даний блок показує, чи існує в компанії особа, відповідальна за захист персональних даних. Це може бути особа, офіційно призначена як DPO, або внутрішня відповідальна особа, яка, не маючи такого формального статусу, на практиці координує питання, пов'язані із захистом даних.",
        "Наявність відповідальної особи важлива, оскільки GDPR — це не лише документи, політики або форми, але й постійне управління тим, як персональні дані збираються, зберігаються, використовуються, передаються та видаляються.",
        "На практиці навіть компанії, які не мають законного обов'язку призначати DPO, потребують особи, яка знає внутрішні процеси та може координувати питання, пов'язані з персональними даними. Без такої особи відповідальність залишається розподіленою між кількома відділами, а проблеми, як правило, виявляються лише тоді, коли з'являється скарга, інцидент або терміновий запит.",
      ],
      en: [
        "This section shows whether the company has a person responsible for the protection of personal data. This may be a person officially appointed as a DPO, or an internal responsible person who, without such formal status, coordinates data protection matters in practice.",
        "Having a responsible person is important because GDPR is not only about documents, policies, or forms, but also about the ongoing management of how personal data is collected, stored, used, transferred, and deleted.",
        "In practice, even companies that are not legally required to appoint a DPO need a person who knows the internal processes and can coordinate matters related to personal data. Without such a person, responsibility remains distributed among several departments, and problems are usually identified only when a complaint, an incident, or an urgent request arises.",
      ],
    },
    risk: {
      uk: [
        "Перший ризик виникає тоді, коли ніхто чітко не відповідає за захист даних. У такій ситуації компанія може мати певні правила або документи, однак вони не застосовуються послідовно, не оновлюються та невідомі співробітникам.",
        "Наприклад, HR-відділ може керувати даними співробітників, бухгалтерія — фінансовими даними, IT-постачальник може мати доступ до систем, а маркетинг може працювати з даними клієнтів. Якщо відсутня особа, яка бачить загальну картину, кожна зона діє окремо, і компанія може втратити контроль над потоками даних.",
        "Важливий ризик виникає при отриманні запитів від суб'єктів даних: доступ до даних, виправлення, видалення, заперечення або інші аналогічні запити. Якщо неясно, хто повинен приймати та обробляти такі запити, відповіді можуть бути затриманими, неповними або неузгодженими.",
        "Також у випадку інциденту безпеки відсутність відповідальної особи може призвести до запізнілої реакції. Наприклад, якщо втрачено ноутбук, помилково надіслано електронний лист, дані були доступні без дозволу або відбувся витік інформації, компанія повинна мати можливість швидко відреагувати. Без чіткої координації інцидент може бути розглянутий неформально або проігнорований доти, доки не призведе до серйозніших наслідків.",
        "Ще один ризик пов'язаний з відносинами із зовнішніми постачальниками. Якщо ніхто не перевіряє договори, доступ до даних, положення про конфіденційність або обов'язки постачальників, компанія може передавати дані третім особам без достатніх гарантій. У випадку виникнення проблеми компанія повинна буде пояснити, чому вона допустила доступ до даних і які заходи контролю застосувала.",
        "За відсутності відповідальної особи компанія також може упустити зміни, що відбуваються в її діяльності. Наприклад, запуск нового сайту, впровадження CRM, введення відеоспостереження, використання GPS або передача даних новому постачальнику можуть створювати додаткові обов'язки. Якщо ці зміни не аналізуються з точки зору захисту даних, ризики поступово накопичуються.",
        "У довгостроковій перспективі відсутність чіткої відповідальності може створити враження, що захист даних є лише формальністю. Насправді відповідність GDPR передбачає періодичні перевірки, оновлення документів, навчання співробітників і правильну реакцію на конкретні ситуації.",
      ],
      en: [
        "The first risk arises when no one is clearly responsible for data protection. In such a situation, the company may have certain rules or documents; however, they are not applied consistently, are not updated, and are unknown to employees.",
        "For example, the HR department may manage employee data, accounting may manage financial data, an IT provider may have access to systems, and marketing may work with client data. If there is no person who sees the overall picture, each area operates separately, and the company may lose control over data flows.",
        "A significant risk arises when receiving requests from data subjects: access to data, correction, deletion, objection, or other similar requests. If it is unclear who should receive and handle such requests, the responses may be delayed, incomplete, or inconsistent.",
        "Also, in the event of a security incident, the absence of a responsible person can lead to a delayed reaction. For example, if a laptop is lost, an email is sent by mistake, data is accessed without permission, or information is leaked, the company must be able to react quickly. Without clear coordination, the incident may be handled informally or ignored until it leads to more serious consequences.",
        "Another risk relates to relationships with external providers. If no one checks contracts, access to data, confidentiality provisions, or the obligations of providers, the company may transfer data to third parties without sufficient guarantees. If a problem arises, the company will have to explain why it allowed access to the data and what control measures it applied.",
        "In the absence of a responsible person, the company may also miss changes occurring in its activities. For example, launching a new website, implementing a CRM, introducing video surveillance, using GPS, or transferring data to a new provider may create additional obligations. If these changes are not analysed from a data protection perspective, risks gradually accumulate.",
        "In the long term, the absence of clear responsibility may create the impression that data protection is merely a formality. In reality, GDPR compliance involves periodic reviews, updating documents, training employees, and reacting correctly to specific situations.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна встановити, чи зобов'язана вона призначити DPO, чи достатньо призначити внутрішню особу, відповідальну за захист даних. Такий аналіз повинен проводитися з урахуванням діяльності компанії, обсягу оброблюваних даних, типів даних і ступеня моніторингу осіб.",
        "Якщо призначається DPO, його роль повинна бути чіткою, задокументованою та доведеною до відома всередині компанії. Особи в компанії повинні знати, хто відповідає за захист даних і коли необхідно звертатися до цієї особи.",
        "Якщо призначення DPO не вимагається, компанія може призначити внутрішню відповідальну особу, яка координуватиме практичні питання. Ця особа може відстежувати внутрішні документи, централізувати питання, пов'язані з персональними даними, взаємодіяти із зовнішніми постачальниками та координувати відповіді на запити суб'єктів даних.",
        "Рекомендується оформити призначення відповідальної особи письмово, за допомогою внутрішнього рішення або аналогічного документа. У цьому документі можуть бути зазначені основні обов'язки: контроль дотримання внутрішніх правил, оновлення документів, облік інцидентів, координація інструктажів і комунікація з керівництвом компанії.",
        "Також відповідальна особа повинна залучатися, коли компанія впроваджує нові процеси, що передбачають обробку персональних даних. Наприклад, перед запуском нової онлайн-форми, впровадженням нової IT-системи, встановленням відеокамер або передачею даних новому постачальнику корисно, щоб ця особа перевірила дотримання мінімальних вимог із захисту даних.",
        "Компанія повинна уникати ситуації, коли відповідальність існує лише формально. Призначена особа повинна мати доступ до необхідної інформації, мати можливість взаємодіяти з відповідними відділами та повідомляти керівництву про виявлені ризики.",
        "Правильно обрана відповідальна особа допомагає компанії розглядати захист даних як організований процес, а не як ситуативну реакцію у випадку виникнення проблеми.",
      ],
      en: [
        "The company must establish whether it is required to appoint a DPO, or whether it is sufficient to appoint an internal person responsible for data protection. This analysis should take into account the company's activities, the volume of data processed, the types of data, and the degree of monitoring of individuals.",
        "If a DPO is appointed, their role must be clear, documented, and communicated within the company. People in the company must know who is responsible for data protection and when they should contact that person.",
        "If the appointment of a DPO is not required, the company may appoint an internal responsible person who will coordinate practical matters. This person can monitor internal documents, centralise matters related to personal data, interact with external providers, and coordinate responses to data subject requests.",
        "It is recommended to formalise the appointment of the responsible person in writing, by means of an internal decision or a similar document. This document may set out the main duties: monitoring compliance with internal rules, updating documents, keeping records of incidents, coordinating briefings, and communicating with the company's management.",
        "The responsible person should also be involved when the company introduces new processes that involve the processing of personal data. For example, before launching a new online form, implementing a new IT system, installing video cameras, or transferring data to a new provider, it is useful for this person to check compliance with the minimum data protection requirements.",
        "The company must avoid a situation in which responsibility exists only formally. The appointed person must have access to the necessary information, be able to interact with the relevant departments, and report identified risks to management.",
        "A well-chosen responsible person helps the company treat data protection as an organised process, rather than an ad hoc reaction when a problem arises.",
      ],
    },
  },
  {
    order: 10,
    title: {
      uk: "Інциденти та оцінка ризиків",
      en: "Incidents and risk assessment",
    },
    intro: {
      uk: [
        "Даний блок показує, чи існують у компанії внутрішні заходи із захисту даних і чи мали місце інциденти безпеки. Під інцидентами розуміються такі ситуації, як втрата ноутбука, помилкове надсилання електронного листа, несанкціонований доступ до даних, втрата документів, випадкове розкриття інформації або витік даних до неуповноважених осіб.",
        "Цей розділ важливий, оскільки захист даних передбачає не лише запобігання проблемам, але й здатність компанії правильно реагувати, коли проблема виникає. Навіть добре організовані компанії можуть стикатися з інцидентами. Різниця полягає в тому, як такі інциденти виявляються, документуються, аналізуються та усуваються.",
        "Також оцінка ризиків допомагає компанії зрозуміти, які зони є вразливими: доступ до даних, IT-безпека, навчання співробітників, передача даних постачальникам послуг, використання електронної пошти, зберігання документів або моніторинг через CCTV і GPS.",
      ],
      en: [
        "This section shows whether the company has internal data protection measures and whether any security incidents have occurred. Incidents include situations such as the loss of a laptop, sending an email by mistake, unauthorised access to data, loss of documents, accidental disclosure of information, or a leak of data to unauthorised persons.",
        "This section is important because data protection involves not only preventing problems, but also the company's ability to respond correctly when a problem occurs. Even well-organised companies may face incidents. The difference lies in how such incidents are identified, documented, analysed, and remedied.",
        "Risk assessment also helps the company understand which areas are vulnerable: access to data, IT security, employee training, transfer of data to service providers, use of email, document storage, or monitoring through CCTV and GPS.",
      ],
    },
    risk: {
      uk: [
        "Важливий ризик виникає тоді, коли у компанії відсутні чіткі внутрішні процедури із захисту даних. За відсутності таких правил кожен співробітник реагує виходячи з власного розуміння. Одні можуть повідомити про проблему, інші — проігнорувати її, а треті — спробувати вирішити її неформально, без документування інциденту.",
        "Наприклад, якщо електронний лист із персональними даними надіслано не тому адресату, компанія повинна зрозуміти, які дані були надіслані, кому вони були надіслані, чи отримав помилковий адресат до них доступ і які заходи необхідно вжити. Якщо процедури немає, інцидент може бути сприйнятий як проста адміністративна помилка, хоча він може мати юридичні наслідки.",
        "Ще один ризик виникає у випадку втрати або крадіжки пристрою. Якщо ноутбук, телефон або USB-накопичувач містить персональні дані та не захищений належним чином, компанія може втратити контроль над цими даними. У таких ситуаціях велике значення має те, чи були на пристрої пароль, шифрування, обмежений доступ або можливість віддаленого блокування.",
        "Відсутність навчання співробітників є однією з найчастіших причин інцидентів. Багато проблем виникають не через злий умисел, а через неуважність: надсилання документів неправильному адресату, використання слабких паролів, зберігання документів на робочому столі комп'ютера, використання особистих облікових записів, передача даних через небезпечні застосунки або доступ до даних без необхідності.",
        "Додатковий ризик виникає тоді, коли інциденти не обліковуються. Якщо відсутній внутрішній реєстр інцидентів, компанія не може довести, що вона проаналізувала ситуації, які виникли, і вжила заходів. У випадку перевірки або скарги відсутність документування може бути витлумачена як відсутність внутрішнього контролю.",
        "Також, якщо не проводиться періодична оцінка ризиків, компанія може не помітити вразливості вчасно. Наприклад, надто широкий доступ до CRM, відсутність резервних копій, відсутність внутрішніх політик, неповні договори з постачальниками послуг або надмірне зберігання даних можуть стати проблемами лише тоді, коли станеться інцидент.",
        "У випадку серйозніших інцидентів у компанії може виникнути обов'язок повідомити компетентний орган або навіть зачеплених осіб. Якщо відсутня чітка процедура, компанія може втратити важливий час і відреагувати надто пізно.",
        "Наслідки можуть бути як юридичними, так і репутаційними. Крім можливих санкцій, компанія може втратити довіру співробітників, клієнтів або партнерів, якщо не буде належним чином управляти персональними даними.",
      ],
      en: [
        "A significant risk arises when the company has no clear internal data protection procedures. In the absence of such rules, each employee reacts based on their own understanding. Some may report the problem, others may ignore it, and still others may try to resolve it informally, without documenting the incident.",
        "For example, if an email containing personal data is sent to the wrong recipient, the company must understand what data was sent, to whom it was sent, whether the wrong recipient accessed it, and what measures need to be taken. If there is no procedure, the incident may be perceived as a simple administrative error, even though it may have legal consequences.",
        "Another risk arises in the case of the loss or theft of a device. If a laptop, phone, or USB drive contains personal data and is not properly protected, the company may lose control over that data. In such situations, it matters greatly whether the device had a password, encryption, restricted access, or a remote lock capability.",
        "The lack of employee training is one of the most common causes of incidents. Many problems arise not from malicious intent but from carelessness: sending documents to the wrong recipient, using weak passwords, storing documents on the computer's desktop, using personal accounts, transferring data through insecure applications, or accessing data unnecessarily.",
        "An additional risk arises when incidents are not recorded. If there is no internal register of incidents, the company cannot demonstrate that it analysed the situations that arose and took measures. In the event of an inspection or complaint, the absence of documentation may be interpreted as a lack of internal control.",
        "Also, if a periodic risk assessment is not carried out, the company may fail to notice vulnerabilities in time. For example, overly broad access to the CRM, the absence of backups, the absence of internal policies, incomplete contracts with service providers, or excessive data storage may become problems only when an incident occurs.",
        "In the case of more serious incidents, the company may have an obligation to notify the competent authority or even the affected individuals. If there is no clear procedure, the company may lose valuable time and react too late.",
        "The consequences can be both legal and reputational. In addition to possible sanctions, the company may lose the trust of employees, clients, or partners if it does not manage personal data properly.",
      ],
    },
    action: {
      uk: [
        "Компанія повинна впровадити чіткі внутрішні заходи із захисту даних. Ці заходи можуть включати внутрішні політики, інструкції для співробітників, правила доступу до даних, правила використання електронної пошти, процедури реагування на інциденти та періодичне навчання.",
        "Рекомендується, щоб співробітники знали, що необхідно робити, коли вони помічають проблему. Наприклад, якщо вони надіслали лист неправильному адресату, втратили документ, помітили несанкціонований доступ або отримали запит, що стосується персональних даних, вони повинні знати, кому повідомляти про це та в який строк.",
        "Компанія повинна запровадити внутрішній реєстр інцидентів. Він не повинен бути складним, але повинен дозволяти документувати ситуацію: дату інциденту, опис проблеми, зачеплені дані, залучених осіб, вжиті заходи та підсумковий висновок.",
        "Також рекомендується періодично проводити оцінку ризиків. Вона може починатися з простих запитань: де знаходиться найбільший обсяг персональних даних, хто має до них доступ, які постачальники послуг їх отримують, які системи є вразливими, які дані є чутливими та що станеться, якщо вони будуть втрачені або розкриті.",
        "Компанія повинна перевірити мінімальні заходи безпеки: індивідуальні паролі, обмежений доступ, резервні копії, антивірусний захист, оновлення систем, блокування пристроїв, правила щодо фізичних документів і контроль доступу до цифрових платформ.",
        "Корисно також проводити періодичне навчання співробітників. Навчання не повинно бути складним, але повинно чітко пояснювати, що таке персональні дані, яких помилок необхідно уникати та як слід повідомляти про інциденти.",
        "У випадку виникнення інциденту компанія повинна швидко його проаналізувати та вирішити, чи потрібне повідомлення органу влади або зачеплених осіб. Це рішення повинно бути задокументоване, навіть якщо компанія доходить висновку, що повідомлення не потрібне.",
        "Компанія, яка має процедури, облік і навчених співробітників, може довести, що вона відповідально ставиться до захисту даних і готова організовано реагувати у випадку виникнення проблеми.",
      ],
      en: [
        "The company must implement clear internal data protection measures. These measures may include internal policies, instructions for employees, rules for accessing data, rules for using email, incident response procedures, and periodic training.",
        "It is recommended that employees know what to do when they notice a problem. For example, if they have sent an email to the wrong recipient, lost a document, noticed unauthorised access, or received a request concerning personal data, they should know whom to report it to and within what timeframe.",
        "The company must introduce an internal register of incidents. It does not need to be complex, but it should allow the situation to be documented: the date of the incident, a description of the problem, the data affected, the persons involved, the measures taken, and the final conclusion.",
        "It is also recommended to carry out a risk assessment periodically. It may start with simple questions: where is the largest volume of personal data located, who has access to it, which service providers receive it, which systems are vulnerable, which data is sensitive, and what would happen if it were lost or disclosed.",
        "The company must check the minimum security measures: individual passwords, restricted access, backups, antivirus protection, system updates, device locking, rules regarding physical documents, and control of access to digital platforms.",
        "It is also useful to conduct periodic employee training. The training does not need to be complex, but it should clearly explain what personal data is, what mistakes must be avoided, and how incidents should be reported.",
        "In the event of an incident, the company must analyse it quickly and decide whether notification of the authority or the affected individuals is required. This decision must be documented, even if the company concludes that notification is not required.",
        "A company that has procedures, records, and trained employees can demonstrate that it treats data protection responsibly and is ready to react in an organised manner if a problem arises.",
      ],
    },
  },
];

export function findGdprExplanation(order: number): GdprExplanation | null {
  return GDPR_EXPLANATIONS.find(e => e.order === order) ?? null;
}
