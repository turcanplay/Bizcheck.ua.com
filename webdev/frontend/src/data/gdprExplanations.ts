/**
 * GDPR report — per-question explanations (RO/RU).
 * Keyed by 1-based question order (1..10). Generated from the source
 * .docx files; for future edits prefer regenerating or moving to admin.
 * Each entry: a fixed explanation shown regardless of the given answer.
 */

export interface GdprExplanation {
  order: number;
  title: { ro: string; ru: string };
  intro: { ro: string[]; ru: string[] };
  risk: { ro: string[]; ru: string[] };
  action: { ro: string[]; ru: string[] };
}

export const GDPR_EXPLANATIONS: GdprExplanation[] = [
  {
    order: 1,
    title: {
      ro: "Date generale despre companie",
      ru: "Общие сведения о компании",
    },
    intro: {
      ro: [
        "Acest bloc are rolul de a înțelege profilul general al companiei: domeniul în care activează, dimensiunea aproximativă a echipei, locurile în care se desfășoară activitatea și tipul principal de clienți cu care compania interacționează.",
        "Aceste informații sunt importante deoarece nivelul de expunere la obligațiile și riscurile GDPR diferă de la o companie la alta. O companie mică, fără activitate online și care lucrează doar cu persoane juridice, are de regulă un nivel de risc mai redus decât o companie cu mai multe puncte de lucru, numeroși angajați, clienți persoane fizice și activitate desfășurată online.",
        "Prin urmare, înainte de a analiza documentele interne sau măsurile de protecție aplicate, este necesar să fie clar cum funcționează compania în practică și în ce zone apar datele cu caracter personal.",
      ],
      ru: [
        "Данный блок предназначен для понимания общего профиля компании: сферы, в которой она осуществляет деятельность, приблизительного размера команды, мест, где ведется деятельность, а также основного типа клиентов, с которыми взаимодействует компания.",
        "Эта информация важна, поскольку уровень подверженности обязательствам и рискам GDPR отличается от одной компании к другой. Небольшая компания, не осуществляющая онлайн-деятельность и работающая только с юридическими лицами, как правило, имеет более низкий уровень риска, чем компания с несколькими точками деятельности, большим количеством сотрудников, клиентами — физическими лицами и деятельностью, осуществляемой онлайн.",
        "Следовательно, прежде чем анализировать внутренние документы или применяемые меры защиты, необходимо четко понимать, как компания функционирует на практике и в каких зонах появляются персональные данные.",
      ],
    },
    risk: {
      ro: [
        "Dacă nu există o imagine clară asupra activității companiei, devine dificil de identificat ce date personale sunt colectate, de la cine provin aceste date, în ce scop sunt utilizate și cine are acces la ele.",
        "De exemplu, o companie care are mai multe birouri, magazine, filiale sau angajați care lucrează remote poate prelucra date personale în mai multe locuri și prin mai multe canale. În lipsa unei evidențe clare, datele pot fi păstrate neorganizat, pot fi accesate de persoane care nu au nevoie de ele sau pot fi transmise fără reguli interne bine stabilite.",
        "Un risc suplimentar apare atunci când compania lucrează direct cu persoane fizice. În acest caz, compania poate colecta nume, numere de telefon, adrese de email, date de livrare, date de plată, reclamații sau alte informații personale. Dacă aceste date nu sunt gestionate corect, compania poate fi expusă la plângeri, solicitări din partea persoanelor vizate sau controale din partea autorității competente.",
        "De asemenea, dacă activitatea companiei se desfășoară online sau prin mijloace digitale, riscurile cresc, deoarece datele pot fi colectate automat, pot fi stocate în platforme externe sau pot fi accesate de mai multe persoane în același timp.",
        "În practică, lipsa unei imagini clare asupra companiei duce la dificultăți în demonstrarea conformității GDPR. Chiar dacă anumite măsuri există, compania poate să nu poată explica suficient de clar ce date prelucrează, unde se află acestea și cum sunt protejate.",
      ],
      ru: [
        "Если отсутствует четкое представление о деятельности компании, становится сложно определить, какие персональные данные собираются, от кого поступают эти данные, в каких целях они используются и кто имеет к ним доступ.",
        "Например, компания, имеющая несколько офисов, магазинов, филиалов или сотрудников, работающих удаленно, может обрабатывать персональные данные в нескольких местах и через несколько каналов. При отсутствии четкого учета данные могут храниться неорганизованно, могут быть доступны лицам, которым они не нужны, либо могут передаваться без четко установленных внутренних правил.",
        "Дополнительный риск возникает, когда компания работает напрямую с физическими лицами. В этом случае компания может собирать имена, номера телефонов, адреса электронной почты, данные доставки, платежные данные, жалобы или иную персональную информацию. Если такие данные не управляются надлежащим образом, компания может быть подвержена жалобам, запросам со стороны субъектов данных или проверкам со стороны компетентного органа.",
        "Также, если деятельность компании осуществляется онлайн или с использованием цифровых средств, риски возрастают, поскольку данные могут собираться автоматически, храниться на внешних платформах или быть одновременно доступными нескольким лицам.",
        "На практике отсутствие четкого представления о компании приводит к трудностям при подтверждении соответствия требованиям GDPR. Даже если определенные меры существуют, компания может быть не в состоянии достаточно ясно объяснить, какие данные она обрабатывает, где они находятся и каким образом защищаются.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să descrie cât mai clar modul în care își desfășoară activitatea: domeniul principal de activitate, numărul aproximativ de angajați, punctele de lucru, existența activității online sau remote și tipul principal de clienți.",
        "Această descriere nu trebuie să fie complicată, dar trebuie să reflecte realitatea practică. Scopul este ca, pe baza acestor informații, să poată fi identificate principalele fluxuri de date personale din companie.",
        "Este recomandat ca această informație să fie revizuită periodic, mai ales atunci când compania își extinde activitatea, deschide noi puncte de lucru, lansează un site, începe să colecteze date online sau angajează personal nou.",
        "O evidență simplă și actualizată a acestor aspecte ajută compania să înțeleagă unde apar datele personale și ce măsuri de protecție trebuie aplicate.",
      ],
      ru: [
        "Компания должна максимально четко описать способ осуществления своей деятельности: основную сферу деятельности, приблизительное количество сотрудников, точки осуществления деятельности, наличие онлайн- или удаленной деятельности, а также основной тип клиентов.",
        "Такое описание не должно быть сложным, но оно должно отражать практическую реальность. Цель состоит в том, чтобы на основании этой информации можно было определить основные потоки персональных данных внутри компании.",
        "Рекомендуется периодически пересматривать эту информацию, особенно когда компания расширяет свою деятельность, открывает новые точки деятельности, запускает сайт, начинает собирать данные онлайн или нанимает новый персонал.",
        "Простой и актуальный учет этих аспектов помогает компании понять, где возникают персональные данные и какие меры защиты необходимо применять.",
      ],
    },
  },
  {
    order: 2,
    title: {
      ro: "Structura organizațională a companiei",
      ru: "Организационная структура компании",
    },
    intro: {
      ro: [
        "Acest bloc arată cum este organizată compania din punct de vedere intern și cine gestionează cele mai importante zone în care apar date personale: contabilitatea, sistemele IT și resursele umane.",
        "Aceste trei zone sunt esențiale pentru conformitatea GDPR. Contabilitatea gestionează date financiare și documente justificative, resursele umane gestionează datele angajaților și candidaților, iar zona IT asigură infrastructura prin care datele sunt stocate, accesate și transmise.",
        "În practică, aceste activități pot fi gestionate intern, de angajații companiei, sau externalizat, prin prestatori precum firme de contabilitate, companii IT, consultanți HR sau alți furnizori specializați.",
      ],
      ru: [
        "Данный блок показывает, как компания организована внутри и кто управляет наиболее важными зонами, в которых появляются персональные данные: бухгалтерией, IT-системами и человеческими ресурсами.",
        "Эти три зоны являются ключевыми для соблюдения требований GDPR. Бухгалтерия управляет финансовыми данными и подтверждающими документами, человеческие ресурсы — данными сотрудников и кандидатов, а IT-направление обеспечивает инфраструктуру, через которую данные хранятся, доступны и передаются.",
        "На практике эти виды деятельности могут управляться внутри компании, ее сотрудниками, либо передаваться на аутсорсинг таким поставщикам услуг, как бухгалтерские компании, IT-компании, HR-консультанты или другие специализированные поставщики.",
      ],
    },
    risk: {
      ro: [
        "Dacă nu este clar cine gestionează fiecare zonă, apare riscul ca responsabilitățile privind datele personale să fie împărțite neclar sau să nu fie asumate de nimeni în mod concret.",
        "De exemplu, în cazul contabilității, compania poate transmite către un prestator extern date despre angajați, salarii, contracte, acte de identitate, date bancare sau alte documente financiare. Chiar dacă aceste date sunt prelucrate de contabil, compania rămâne responsabilă să se asigure că transmiterea și utilizarea lor se face legal și în condiții de securitate.",
        "În zona IT, riscurile pot fi și mai mari. Prestatorul IT poate avea acces la emailuri, servere, calculatoare, baze de date, copii de rezervă sau conturi interne. Dacă accesul nu este reglementat și monitorizat, pot apărea situații în care datele sunt accesate fără o justificare clară sau fără măsuri suficiente de protecție.",
        "În zona HR, compania prelucrează date ale angajaților și candidaților, inclusiv documente de angajare, date de contact, informații despre salarii, concedii, performanță, absențe sau, în unele cazuri, date medicale. Aceste date trebuie gestionate cu atenție, deoarece privesc direct viața profesională și personală a persoanelor.",
        "Un risc frecvent apare atunci când compania folosește prestatori externi, dar nu are contracte sau clauze privind protecția datelor. În asemenea cazuri, compania nu poate demonstra clar ce obligații are prestatorul, cum trebuie să protejeze datele, dacă le poate transmite mai departe și ce se întâmplă cu datele după încetarea colaborării.",
        "În lipsa unor reguli clare, pot apărea accesări neautorizate, pierderi de date, transmiteri necontrolate sau imposibilitatea de a răspunde corect la solicitările persoanelor vizate.",
      ],
      ru: [
        "Если неясно, кто управляет каждой зоной, возникает риск того, что обязанности в отношении персональных данных будут распределены нечетко либо не будут конкретно приняты на себя ни одним лицом.",
        "Например, в случае бухгалтерии компания может передавать внешнему поставщику данные о сотрудниках, заработной плате, договорах, удостоверениях личности, банковских данных или иных финансовых документах. Даже если эти данные обрабатываются бухгалтером, компания остается ответственной за то, чтобы их передача и использование осуществлялись законно и в условиях безопасности.",
        "В IT-зоне риски могут быть еще выше. IT-поставщик может иметь доступ к электронной почте, серверам, компьютерам, базам данных, резервным копиям или внутренним учетным записям. Если доступ не урегулирован и не контролируется, могут возникнуть ситуации, когда данные будут доступны без четкого обоснования или без достаточных мер защиты.",
        "В HR-зоне компания обрабатывает данные сотрудников и кандидатов, включая документы о трудоустройстве, контактные данные, информацию о заработной плате, отпусках, результатах работы, отсутствиях или, в отдельных случаях, медицинские данные. Эти данные должны управляться внимательно, поскольку они напрямую касаются профессиональной и личной жизни лиц.",
        "Распространенный риск возникает тогда, когда компания использует внешних поставщиков, но не имеет договоров или положений о защите данных. В таких случаях компания не может четко доказать, какие обязанности имеет поставщик, каким образом он должен защищать данные, может ли он передавать их далее и что происходит с данными после прекращения сотрудничества.",
        "При отсутствии четких правил могут возникать несанкционированные доступы, потери данных, неконтролируемые передачи или невозможность корректно отвечать на запросы субъектов данных.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să stabilească exact cine gestionează contabilitatea, sistemele IT și resursele umane. Pentru fiecare dintre aceste zone trebuie identificat dacă activitatea este realizată intern sau prin outsourcing.",
        "Dacă activitatea este gestionată intern, este recomandat ca persoanele responsabile să cunoască regulile minime privind protecția datelor și să aibă acces doar la informațiile necesare pentru îndeplinirea atribuțiilor lor.",
        "Dacă activitatea este externalizată, compania trebuie să verifice dacă există contracte scrise cu prestatorii și dacă aceste contracte conțin clauze privind protecția datelor personale. În special, trebuie clarificat ce date primește prestatorul, în ce scop le utilizează, cine are acces la ele, cât timp le păstrează și ce măsuri de securitate aplică.",
        "Este recomandat ca toate relațiile cu prestatorii care au acces la date personale să fie documentate. Chiar și o anexă simplă privind protecția datelor poate reduce riscurile și poate demonstra că compania tratează responsabil acest subiect.",
        "De asemenea, compania ar trebui să desemneze intern o persoană care să cunoască principalele fluxuri de date și să poată comunica atât cu prestatorii externi, cât și cu angajații și conducerea companiei. Această persoană nu trebuie neapărat să aibă titlul formal de DPO, dar trebuie să poată coordona în mod practic aspectele de bază privind protecția datelor.",
      ],
      ru: [
        "Компания должна точно установить, кто управляет бухгалтерией, IT-системами и человеческими ресурсами. По каждой из этих зон необходимо определить, осуществляется ли деятельность внутри компании или через аутсорсинг.",
        "Если деятельность управляется внутри компании, рекомендуется, чтобы ответственные лица знали минимальные правила защиты данных и имели доступ только к той информации, которая необходима для выполнения их обязанностей.",
        "Если деятельность передана на аутсорсинг, компания должна проверить, существуют ли письменные договоры с поставщиками услуг и содержат ли эти договоры положения о защите персональных данных. В частности, необходимо уточнить, какие данные получает поставщик, в каких целях он их использует, кто имеет к ним доступ, как долго он их хранит и какие меры безопасности применяет.",
        "Рекомендуется документировать все отношения с поставщиками, которые имеют доступ к персональным данным. Даже простое приложение о защите данных может снизить риски и подтвердить, что компания ответственно относится к этому вопросу.",
        "Также компании следует назначить внутри ответственное лицо, которое будет знать основные потоки данных и сможет взаимодействовать как с внешними поставщиками, так и с сотрудниками и руководством компании. Такое лицо не обязательно должно иметь формальный статус DPO, однако оно должно быть способно на практике координировать базовые вопросы, связанные с защитой данных.",
      ],
    },
  },
  {
    order: 3,
    title: {
      ro: "Website și activitate online",
      ru: "Веб-сайт и онлайн-деятельность",
    },
    intro: {
      ro: [
        "Acest bloc arată dacă compania are o prezență online și dacă prin intermediul site-ului, formularelor, newslettere-lor, comenzilor online sau altor instrumente digitale sunt colectate date cu caracter personal.",
        "Activitatea online este importantă din perspectiva GDPR deoarece datele personale pot fi colectate rapid, automat și de la un număr mare de persoane. Chiar și un simplu formular de contact poate implica prelucrarea unor date precum nume, prenume, email, număr de telefon, mesaj transmis sau alte informații introduse de utilizator.",
        "Dacă site-ul este utilizat doar ca pagină de prezentare, riscurile pot fi mai reduse. Însă dacă prin site se primesc solicitări, comenzi, abonări la newsletter sau alte informații de la utilizatori, compania trebuie să aplice reguli clare privind informarea persoanelor, scopul colectării datelor și modul în care acestea sunt păstrate.",
      ],
      ru: [
        "Данный блок показывает, имеет ли компания онлайн-присутствие и собираются ли персональные данные посредством веб-сайта, форм, рассылок, онлайн-заказов или других цифровых инструментов.",
        "Онлайн-деятельность важна с точки зрения GDPR, поскольку персональные данные могут собираться быстро, автоматически и от большого количества лиц. Даже простая контактная форма может предполагать обработку таких данных, как имя, фамилия, адрес электронной почты, номер телефона, переданное сообщение или иная информация, введенная пользователем.",
        "Если сайт используется только как презентационная страница, риски могут быть ниже. Однако если через сайт поступают запросы, заказы, подписки на рассылку или иная информация от пользователей, компания должна применять четкие правила в отношении информирования лиц, цели сбора данных и порядка их хранения.",
      ],
    },
    risk: {
      ro: [
        "Un risc important apare atunci când compania colectează date prin site fără să informeze suficient persoanele vizate. Utilizatorul care completează un formular trebuie să știe cine colectează datele, în ce scop sunt folosite, dacă sunt transmise către terți, cât timp sunt păstrate și ce drepturi are.",
        "În lipsa unei politici de confidențialitate clare, compania poate fi acuzată că prelucrează datele fără transparență. Chiar dacă datele colectate par simple, cum ar fi numele, telefonul sau adresa de email, acestea rămân date cu caracter personal și trebuie tratate corespunzător.",
        "Un risc suplimentar apare în cazul newsletterelor sau campaniilor de marketing. Dacă utilizatorii sunt abonați automat, fără consimțământ clar, sau dacă nu au posibilitatea reală de dezabonare, compania poate primi reclamații. În practică, comunicările comerciale nesolicitate sunt una dintre cele mai frecvente surse de nemulțumire din partea clienților sau utilizatorilor.",
        "De asemenea, în cazul comenzilor online, riscurile sunt mai mari deoarece pot fi colectate mai multe categorii de date: nume, adresă, telefon, email, date despre comandă, date de livrare, date de plată sau istoricul interacțiunilor cu clientul. Dacă aceste date sunt păstrate necontrolat sau transmise către curieri, platforme de plată, furnizori IT sau alți prestatori fără reguli clare, compania poate pierde controlul asupra fluxului de date.",
        "Un alt risc ține de instrumentele tehnice utilizate pe site: module de analiză, cookie-uri, chat online, formulare externe, integrări cu rețele sociale sau platforme de marketing. Uneori, compania nu colectează direct datele, dar permite unor instrumente externe să le colecteze prin intermediul site-ului. În asemenea situații, compania trebuie să înțeleagă ce date sunt colectate și în ce condiții.",
        "În lipsa unei evaluări clare a activității online, compania poate ajunge să aibă un site funcțional din punct de vedere comercial, dar vulnerabil din punct de vedere juridic și operațional.",
      ],
      ru: [
        "Важный риск возникает тогда, когда компания собирает данные через сайт без достаточного информирования субъектов данных. Пользователь, который заполняет форму, должен знать, кто собирает данные, в каких целях они используются, передаются ли они третьим лицам, как долго хранятся и какие права он имеет.",
        "При отсутствии четкой политики конфиденциальности компания может быть обвинена в непрозрачной обработке данных. Даже если собранные данные кажутся простыми, например имя, телефон или адрес электронной почты, они остаются персональными данными и должны обрабатываться надлежащим образом.",
        "Дополнительный риск возникает в случае рассылок или маркетинговых кампаний. Если пользователи подписываются автоматически, без четкого согласия, или если у них нет реальной возможности отписаться, компания может получить жалобы. На практике нежелательные коммерческие сообщения являются одним из наиболее частых источников недовольства со стороны клиентов или пользователей.",
        "Также в случае онлайн-заказов риски выше, поскольку могут собираться несколько категорий данных: имя, адрес, телефон, электронная почта, данные о заказе, данные доставки, платежные данные или история взаимодействия с клиентом. Если эти данные хранятся бесконтрольно или передаются курьерам, платежным платформам, IT-поставщикам или другим поставщикам услуг без четких правил, компания может потерять контроль над потоком данных.",
        "Еще один риск связан с техническими инструментами, используемыми на сайте: аналитическими модулями, cookie-файлами, онлайн-чатом, внешними формами, интеграциями с социальными сетями или маркетинговыми платформами. Иногда компания не собирает данные напрямую, но позволяет внешним инструментам собирать их через сайт. В таких ситуациях компания должна понимать, какие данные собираются и на каких условиях.",
        "При отсутствии четкой оценки онлайн-деятельности компания может иметь сайт, функциональный с коммерческой точки зрения, но уязвимый с юридической и операционной точки зрения.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să identifice toate modalitățile prin care colectează date personale online. Aceasta include formulare de contact, abonări la newsletter, comenzi online, conturi de utilizator, chat online, cereri de ofertă, programări, aplicații mobile sau alte instrumente digitale.",
        "Pentru fiecare metodă de colectare trebuie stabilit ce date sunt colectate, în ce scop, în baza cărui temei legal, unde sunt stocate și cine are acces la ele.",
        "Este recomandat ca site-ul să conțină o politică de confidențialitate clară, redactată într-un limbaj accesibil. Aceasta trebuie să explice modul în care compania prelucrează datele utilizatorilor și drepturile pe care aceștia le au.",
        "În cazul newsletterelor, compania trebuie să se asigure că abonarea are loc în mod clar și documentat, iar utilizatorii au posibilitatea de a se dezabona ușor. De asemenea, nu este recomandată utilizarea datelor colectate pentru un scop într-un alt scop, fără o justificare legală sau fără informarea corespunzătoare a persoanei vizate.",
        "Dacă site-ul utilizează cookie-uri sau instrumente externe de analiză și marketing, este recomandată verificarea acestora și, după caz, implementarea unei politici de cookie-uri și a unui mecanism adecvat de consimțământ.",
        "O verificare periodică a site-ului și a instrumentelor online ajută compania să evite colectarea necontrolată a datelor și să demonstreze că activitatea sa digitală este organizată în conformitate cu cerințele GDPR.",
      ],
      ru: [
        "Компания должна определить все способы, посредством которых она собирает персональные данные онлайн. Это включает контактные формы, подписки на рассылку, онлайн-заказы, учетные записи пользователей, онлайн-чат, запросы коммерческих предложений, записи на прием, мобильные приложения или другие цифровые инструменты.",
        "По каждому способу сбора данных необходимо установить, какие данные собираются, в каких целях, на каком правовом основании, где они хранятся и кто имеет к ним доступ.",
        "Рекомендуется, чтобы сайт содержал четкую политику конфиденциальности, составленную понятным языком. Она должна объяснять, каким образом компания обрабатывает данные пользователей и какие права они имеют.",
        "В случае рассылок компания должна убедиться, что подписка осуществляется четко и документально подтверждаемо, а пользователи имеют возможность легко отписаться. Также не рекомендуется использовать данные, собранные для одной цели, в другой цели без законного обоснования или без надлежащего информирования субъекта данных.",
        "Если сайт использует cookie-файлы или внешние инструменты аналитики и маркетинга, рекомендуется проверить их и, при необходимости, внедрить политику использования cookie-файлов и надлежащий механизм получения согласия.",
        "Периодическая проверка сайта и онлайн-инструментов помогает компании избежать неконтролируемого сбора данных и подтвердить, что ее цифровая деятельность организована в соответствии с требованиями GDPR.",
      ],
    },
  },
  {
    order: 4,
    title: {
      ro: "Categorii de persoane vizate",
      ru: "Категории субъектов данных",
    },
    intro: {
      ro: [
        "Acest bloc arată de la cine colectează compania date cu caracter personal. În activitatea unei companii, datele pot proveni de la angajați, candidați la angajare, clienți persoane fizice, reprezentanți ai partenerilor sau furnizorilor, vizitatori monitorizați prin camere video sau alte persoane care interacționează cu compania.",
        "Identificarea acestor categorii este esențială deoarece fiecare categorie de persoane vizate implică obligații diferite. Nu toate datele sunt colectate în același scop, nu toate trebuie păstrate aceeași perioadă și nu toate pot fi accesate de aceleași persoane din companie.",
        "Prin urmare, înainte de a analiza documentele sau măsurile de protecție, este important ca compania să înțeleagă clar cine sunt persoanele ale căror date le prelucrează.",
      ],
      ru: [
        "Данный блок показывает, от кого компания собирает персональные данные. В деятельности компании данные могут поступать от сотрудников, кандидатов на трудоустройство, клиентов — физических лиц, представителей партнеров или поставщиков, посетителей, находящихся под видеонаблюдением, или иных лиц, которые взаимодействуют с компанией.",
        "Определение этих категорий является существенным, поскольку каждая категория субъектов данных предполагает разные обязанности. Не все данные собираются с одной и той же целью, не все данные должны храниться одинаковый период времени и не ко всем данным могут иметь доступ одни и те же лица внутри компании.",
        "Следовательно, прежде чем анализировать документы или меры защиты, важно, чтобы компания четко понимала, чьи именно данные она обрабатывает.",
      ],
    },
    risk: {
      ro: [
        "Dacă persoanele vizate nu sunt identificate corect, compania poate aplica reguli generale acolo unde ar trebui să existe reguli separate. De exemplu, datele angajaților sunt prelucrate în contextul raporturilor de muncă, datele candidaților sunt prelucrate în procesul de recrutare, iar datele clienților sunt prelucrate în context comercial sau contractual.",
        "Un risc frecvent apare în cazul candidaților la angajare. Compania poate primi CV-uri, copii de acte, informații despre experiența profesională, date de contact sau alte informații personale. Dacă aceste date sunt păstrate pe termen nedeterminat sau sunt accesibile mai multor persoane decât este necesar, compania poate încălca principiul limitării stocării și principiul accesului limitat.",
        "În cazul angajaților, riscurile sunt mai mari deoarece compania poate prelucra un volum considerabil de date: contracte de muncă, date de identificare, date bancare, informații despre salarii, concedii, absențe, evaluări profesionale sau documente medicale. Aceste date trebuie protejate cu atenție, deoarece folosirea sau divulgarea lor necorespunzătoare poate afecta direct persoana.",
        "În cazul clienților persoane fizice, compania trebuie să fie atentă la datele colectate pentru prestarea serviciilor, vânzări, livrări, facturare, comunicare sau soluționarea reclamațiilor. Dacă datele clienților sunt utilizate ulterior pentru marketing, analiză sau alte scopuri, trebuie verificat dacă există o bază legală adecvată.",
        "Reprezentanții partenerilor și furnizorilor sunt uneori tratați greșit ca fiind „date ale companiei”, însă numele, funcția, telefonul, emailul profesional sau semnătura unei persoane fizice sunt tot date cu caracter personal. Prin urmare, și aceste date trebuie gestionate corespunzător.",
        "În cazul vizitatorilor monitorizați prin camere video, riscul este legat de lipsa informării, păstrarea imaginilor prea mult timp sau accesul necontrolat la înregistrări. Chiar dacă supravegherea video este folosită pentru securitate, compania trebuie să respecte reguli clare privind transparența și proporționalitatea.",
        "Dacă aceste categorii nu sunt separate, compania poate ajunge să păstreze date inutile, să nu informeze corect persoanele vizate sau să nu poată răspunde corespunzător la solicitările acestora.",
      ],
      ru: [
        "Если субъекты данных не определены корректно, компания может применять общие правила там, где должны существовать отдельные правила. Например, данные сотрудников обрабатываются в контексте трудовых отношений, данные кандидатов — в процессе подбора персонала, а данные клиентов — в коммерческом или договорном контексте.",
        "Распространенный риск возникает в случае кандидатов на трудоустройство. Компания может получать резюме, копии документов, информацию о профессиональном опыте, контактные данные или иную персональную информацию. Если эти данные хранятся в течение неопределенного срока или доступны большему числу лиц, чем необходимо, компания может нарушить принцип ограничения срока хранения и принцип ограниченного доступа.",
        "В случае сотрудников риски выше, поскольку компания может обрабатывать значительный объем данных: трудовые договоры, идентификационные данные, банковские данные, информацию о заработной плате, отпусках, отсутствиях, профессиональных оценках или медицинские документы. Эти данные должны тщательно защищаться, поскольку их ненадлежащее использование или раскрытие может напрямую затронуть соответствующее лицо.",
        "В случае клиентов — физических лиц компания должна внимательно относиться к данным, собираемым для оказания услуг, продаж, доставки, выставления счетов, коммуникации или рассмотрения жалоб. Если данные клиентов впоследствии используются для маркетинга, анализа или иных целей, необходимо проверить наличие надлежащего правового основания.",
        "Представители партнеров и поставщиков иногда ошибочно воспринимаются как «данные компании», однако имя, должность, телефон, рабочий адрес электронной почты или подпись физического лица также являются персональными данными. Следовательно, такие данные также должны управляться надлежащим образом.",
        "В случае посетителей, находящихся под видеонаблюдением, риск связан с отсутствием информирования, слишком длительным хранением изображений или неконтролируемым доступом к записям. Даже если видеонаблюдение используется в целях безопасности, компания должна соблюдать четкие правила прозрачности и пропорциональности.",
        "Если эти категории не разделены, компания может в итоге хранить ненужные данные, неправильно информировать субъектов данных или не иметь возможности надлежащим образом отвечать на их запросы.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să identifice toate categoriile de persoane ale căror date sunt colectate sau utilizate în activitatea sa. Pentru fiecare categorie trebuie stabilit ce date sunt prelucrate, de ce sunt necesare, cine are acces la ele și cât timp sunt păstrate.",
        "Este recomandat ca această analiză să fie făcută separat pentru angajați, candidați, clienți, reprezentanți ai partenerilor, vizitatori și alte persoane relevante. O astfel de separare ajută la aplicarea unor reguli corecte pentru fiecare situație.",
        "Pentru angajați, compania trebuie să aibă documente interne clare privind prelucrarea datelor în cadrul relațiilor de muncă. Pentru candidați, trebuie stabilit cât timp se păstrează CV-urile și cine are acces la ele. Pentru clienți, trebuie clarificate scopurile comerciale, contractuale și, după caz, de marketing. Pentru reprezentanții partenerilor, trebuie asigurată o informare corespunzătoare. Pentru vizitatori, trebuie analizate regulile privind supravegherea video.",
        "O abordare practică este întocmirea unei liste simple cu toate categoriile de persoane vizate și situațiile în care compania colectează datele acestora. Această listă poate sta la baza politicilor interne, notelor de informare și registrelor de evidență a prelucrărilor.",
        "Revizuirea periodică a acestor categorii este importantă, deoarece activitatea companiei se poate schimba. Pot apărea noi servicii, noi canale de comunicare, noi prestatori sau noi puncte de lucru, iar toate acestea pot introduce noi categorii de persoane vizate sau noi fluxuri de date.",
      ],
      ru: [
        "Компания должна определить все категории лиц, чьи данные собираются или используются в ее деятельности. По каждой категории необходимо установить, какие данные обрабатываются, почему они необходимы, кто имеет к ним доступ и как долго они хранятся.",
        "Рекомендуется проводить такой анализ отдельно для сотрудников, кандидатов, клиентов, представителей партнеров, посетителей и иных релевантных лиц. Такое разделение помогает применять корректные правила для каждой ситуации.",
        "В отношении сотрудников компания должна иметь четкие внутренние документы о обработке данных в рамках трудовых отношений. В отношении кандидатов необходимо установить, как долго хранятся резюме и кто имеет к ним доступ. В отношении клиентов необходимо уточнить коммерческие, договорные и, при необходимости, маркетинговые цели. В отношении представителей партнеров необходимо обеспечить надлежащее информирование. В отношении посетителей необходимо проанализировать правила видеонаблюдения.",
        "Практический подход заключается в составлении простого перечня всех категорий субъектов данных и ситуаций, в которых компания собирает их данные. Такой перечень может служить основой для внутренних политик, информационных уведомлений и реестров учета операций по обработке данных.",
        "Периодический пересмотр этих категорий является важным, поскольку деятельность компании может меняться. Могут появляться новые услуги, новые каналы коммуникации, новые поставщики услуг или новые точки деятельности, и все это может вводить новые категории субъектов данных или новые потоки данных.",
      ],
    },
  },
  {
    order: 5,
    title: {
      ro: "Tipuri de date colectate",
      ru: "Типы собираемых данных",
    },
    intro: {
      ro: [
        "Acest bloc arată ce tipuri de date cu caracter personal colectează, utilizează sau păstrează compania în activitatea sa curentă. Nu toate datele personale au același nivel de risc. Unele date sunt uzuale, cum ar fi numele, telefonul sau adresa de email, iar altele pot avea un impact mult mai mare asupra persoanei, cum ar fi copiile actelor de identitate, datele medicale, datele bancare sau datele biometrice.",
        "Identificarea tipurilor de date este importantă deoarece compania trebuie să știe nu doar de la cine colectează date, ci și ce fel de informații colectează concret. În funcție de tipul datelor, pot fi necesare măsuri diferite de protecție, termene diferite de păstrare și reguli mai stricte de acces.",
        "De exemplu, o companie poate avea o obligație legală să păstreze anumite date ale angajaților pentru evidența muncii sau pentru contabilitate. În schimb, păstrarea copiilor actelor de identitate, a fotografiilor sau a unor date medicale trebuie analizată cu mai multă atenție, pentru a verifica dacă este cu adevărat necesară.",
      ],
      ru: [
        "Данный блок показывает, какие типы персональных данных компания собирает, использует или хранит в своей текущей деятельности. Не все персональные данные имеют одинаковый уровень риска. Одни данные являются обычными, например имя, телефон или адрес электронной почты, а другие могут иметь гораздо большее влияние на лицо, например копии удостоверяющих личность документов, медицинские данные, банковские данные или биометрические данные.",
        "Определение типов данных важно, поскольку компания должна знать не только то, от кого она собирает данные, но и какие именно сведения она собирает на практике. В зависимости от типа данных могут потребоваться разные меры защиты, разные сроки хранения и более строгие правила доступа.",
        "Например, компания может иметь законную обязанность хранить определенные данные сотрудников для кадрового учета или бухгалтерии. В то же время хранение копий удостоверяющих личность документов, фотографий или отдельных медицинских данных должно анализироваться более внимательно, чтобы проверить, действительно ли это необходимо.",
      ],
    },
    risk: {
      ro: [
        "Un prim risc apare atunci când compania colectează mai multe date decât are nevoie în mod real. În practică, uneori se solicită copii de acte, date bancare, fotografii sau alte informații „pentru orice eventualitate”, fără ca necesitatea lor să fie clar explicată. Această abordare poate încălca principiul minimizării datelor, potrivit căruia compania trebuie să colecteze doar datele necesare pentru un scop clar.",
        "Copiile actelor de identitate reprezintă o categorie sensibilă din punct de vedere practic, chiar dacă nu sunt întotdeauna date speciale în sens strict. Acestea conțin multe informații într-un singur document și, dacă sunt pierdute sau transmise greșit, pot fi folosite în mod abuziv. De aceea, păstrarea lor trebuie justificată și limitată.",
        "Datele medicale sau informațiile despre sănătate implică un nivel ridicat de protecție. Acestea pot apărea în legătură cu concedii medicale, fișe medicale, certificate, aptitudinea de muncă sau alte documente similare. Dacă asemenea date sunt accesate de persoane care nu au nevoie de ele sau sunt păstrate fără reguli clare, compania se expune unor riscuri semnificative.",
        "Datele financiare și bancare ale angajaților sau clienților trebuie, de asemenea, protejate corespunzător. Acestea pot fi necesare pentru plăți, salarii, rambursări sau relații contractuale, însă accesul la ele trebuie să fie limitat la persoanele care au atribuții directe în acest sens.",
        "Un risc deosebit apare în cazul datelor biometrice, cum ar fi amprentele, recunoașterea facială sau vocea utilizată pentru identificare. Aceste date sunt foarte sensibile, deoarece sunt legate direct de identitatea fizică a persoanei și nu pot fi schimbate ușor în cazul unei utilizări abuzive. Utilizarea lor trebuie justificată foarte atent și, de regulă, necesită măsuri speciale de protecție.",
        "Fotografiile persoanelor pot părea inofensive, însă și ele reprezintă date personale atunci când permit identificarea unei persoane. Acestea pot fi folosite pentru legitimații, profiluri interne, promovare, evenimente sau alte scopuri. Dacă sunt publicate sau utilizate fără informare sau fără acord atunci când acesta este necesar, pot apărea reclamații din partea persoanelor vizate.",
        "În lipsa unei evidențe clare a tipurilor de date colectate, compania poate ajunge să păstreze date inutile, să permită accesul nejustificat la informații sensibile sau să nu poată demonstra de ce are nevoie de anumite date.",
      ],
      ru: [
        "Первый риск возникает тогда, когда компания собирает больше данных, чем ей реально необходимо. На практике иногда запрашиваются копии документов, банковские данные, фотографии или иная информация «на всякий случай», без четкого объяснения их необходимости. Такой подход может нарушать принцип минимизации данных, согласно которому компания должна собирать только те данные, которые необходимы для четко определенной цели.",
        "Копии удостоверяющих личность документов представляют собой чувствительную категорию с практической точки зрения, даже если они не всегда являются специальными категориями данных в строгом смысле. Они содержат много информации в одном документе и, в случае утраты или ошибочной передачи, могут быть использованы неправомерно. Поэтому их хранение должно быть обоснованным и ограниченным.",
        "Медицинские данные или информация о состоянии здоровья предполагают высокий уровень защиты. Они могут появляться в связи с медицинскими отпусками, медицинскими справками, заключениями, пригодностью к работе или другими аналогичными документами. Если такие данные доступны лицам, которым они не нужны, или хранятся без четких правил, компания подвергается значительным рискам.",
        "Финансовые и банковские данные сотрудников или клиентов также должны быть надлежащим образом защищены. Они могут быть необходимы для платежей, выплаты заработной платы, возмещений или договорных отношений, однако доступ к ним должен быть ограничен лицами, которые имеют прямые обязанности в этой сфере.",
        "Особый риск возникает в случае биометрических данных, таких как отпечатки пальцев, распознавание лица или голос, используемый для идентификации. Эти данные являются очень чувствительными, поскольку они напрямую связаны с физической идентичностью лица и не могут быть легко изменены в случае неправомерного использования. Их использование должно быть очень тщательно обосновано и, как правило, требует специальных мер защиты.",
        "Фотографии лиц могут казаться безобидными, однако они также являются персональными данными, если позволяют идентифицировать лицо. Они могут использоваться для пропусков, внутренних профилей, продвижения, мероприятий или иных целей. Если фотографии публикуются или используются без информирования либо без согласия, когда оно необходимо, могут возникнуть жалобы со стороны субъектов данных.",
        "При отсутствии четкого учета типов собираемых данных компания может в итоге хранить ненужные данные, допускать необоснованный доступ к чувствительной информации или не иметь возможности доказать, зачем ей нужны определенные данные.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să identifice toate categoriile de date personale pe care le colectează și le păstrează. Această analiză trebuie făcută practic, nu doar formal: trebuie verificat ce documente există în dosarele fizice, în sistemele electronice, în emailuri, în CRM, în contabilitate, în HR și în alte platforme utilizate.",
        "Pentru fiecare tip de date trebuie stabilit de ce este necesar, în baza cărui temei este prelucrat, cine are acces la el și cât timp trebuie păstrat. Dacă anumite date nu sunt necesare, acestea nu trebuie colectate sau trebuie eliminate din procesele interne.",
        "Este recomandat ca datele cu risc ridicat, cum ar fi datele medicale, copiile actelor de identitate, datele bancare sau datele biometrice, să fie tratate separat și să fie accesibile doar unui număr restrâns de persoane.",
        "Compania trebuie să stabilească reguli clare privind păstrarea documentelor care conțin date personale. De exemplu, nu toate documentele trebuie copiate, nu toate copiile trebuie păstrate, iar accesul la dosarele fizice sau electronice trebuie limitat.",
        "De asemenea, este utilă o revizuire periodică a datelor colectate. Activitatea companiei se poate schimba, iar unele date care erau necesare la un moment dat pot deveni inutile ulterior. Prin această revizuire, compania reduce riscurile și demonstrează că gestionează datele personale într-un mod responsabil.",
      ],
      ru: [
        "Компания должна определить все категории персональных данных, которые она собирает и хранит. Такой анализ должен быть практическим, а не только формальным: необходимо проверить, какие документы имеются в физических досье, электронных системах, электронной почте, CRM, бухгалтерии, HR и других используемых платформах.",
        "По каждому типу данных необходимо установить, зачем он нужен, на каком основании обрабатывается, кто имеет к нему доступ и как долго он должен храниться. Если определенные данные не являются необходимыми, они не должны собираться либо должны быть исключены из внутренних процессов.",
        "Рекомендуется, чтобы данные с высоким уровнем риска, такие как медицинские данные, копии удостоверяющих личность документов, банковские данные или биометрические данные, обрабатывались отдельно и были доступны только ограниченному кругу лиц.",
        "Компания должна установить четкие правила хранения документов, содержащих персональные данные. Например, не все документы необходимо копировать, не все копии необходимо хранить, а доступ к физическим или электронным досье должен быть ограничен.",
        "Также полезно проводить периодический пересмотр собираемых данных. Деятельность компании может меняться, и некоторые данные, которые были необходимы в определенный момент, впоследствии могут стать ненужными. Благодаря такому пересмотру компания снижает риски и подтверждает, что управляет персональными данными ответственным образом.",
      ],
    },
  },
  {
    order: 6,
    title: {
      ro: "Gestionarea datelor prin CRM, baze de date și stocare",
      ru: "Управление данными через CRM, базы данных и системы хранения",
    },
    intro: {
      ro: [
        "Acest bloc arată unde sunt păstrate datele personale și prin ce instrumente sunt gestionate. Datele pot fi stocate în sisteme CRM, programe de contabilitate, fișiere Excel, platforme de HR, servere interne, calculatoare, emailuri, aplicații cloud sau alte baze de date.",
        "Această secțiune este importantă deoarece, în practică, riscurile nu apar doar din faptul că datele sunt colectate, ci și din modul în care acestea sunt păstrate, accesate, copiate, transmise sau șterse. O companie poate avea documente juridice corecte, dar dacă datele sunt păstrate haotic în mai multe locuri, conformitatea GDPR devine greu de demonstrat.",
        "Prin urmare, compania trebuie să cunoască exact unde se află datele personale și cine are acces la ele.",
      ],
      ru: [
        "Данный блок показывает, где хранятся персональные данные и посредством каких инструментов они управляются. Данные могут храниться в CRM-системах, бухгалтерских программах, Excel-файлах, HR-платформах, внутренних серверах, компьютерах, электронной почте, облачных приложениях или иных базах данных.",
        "Этот раздел важен, поскольку на практике риски возникают не только из-за самого факта сбора данных, но и из-за того, как они хранятся, используются, копируются, передаются или удаляются. Компания может иметь корректные юридические документы, однако если данные хранятся хаотично в нескольких местах, соответствие требованиям GDPR становится трудно доказать.",
        "Следовательно, компания должна точно знать, где находятся персональные данные и кто имеет к ним доступ.",
      ],
    },
    risk: {
      ro: [
        "Un risc frecvent apare atunci când datele sunt păstrate în prea multe locuri, fără o evidență clară. De exemplu, aceleași date ale unui client pot exista în CRM, în email, într-un fișier Excel, într-o factură, într-un folder partajat și într-o conversație internă. Dacă nu există reguli clare, compania nu mai controlează efectiv unde se află datele și cine le poate accesa.",
        "În cazul fișierelor Excel sau al bazelor de date gestionate manual, riscurile apar din lipsa controlului asupra versiunilor, parolelor și accesului. Fișierele pot fi copiate ușor, trimise prin email, descărcate pe calculatoare personale sau modificate fără o evidență clară.",
        "În cazul sistemelor CRM sau al altor platforme de gestiune, riscul principal ține de drepturile de acces. Dacă toți angajații pot vedea toate datele, fără legătură cu atribuțiile lor, compania poate încălca principiul accesului limitat. Fiecare persoană trebuie să aibă acces doar la datele necesare pentru activitatea sa.",
        "Stocarea locală, pe servere interne sau calculatoare, implică riscuri legate de securitatea echipamentelor, backupuri, parole, acces fizic și protecție împotriva pierderii datelor. Dacă un calculator se defectează, se pierde sau este accesat neautorizat, compania poate pierde date importante sau poate expune informații personale.",
        "Stocarea în cloud poate fi eficientă și sigură, dar trebuie gestionată corect. Compania trebuie să știe ce platformă folosește, unde pot fi stocate datele, cine este furnizorul serviciului, ce măsuri de securitate există și cine are drept de acces. Utilizarea unor conturi personale sau neoficiale pentru documentele companiei poate crea riscuri suplimentare.",
        "Un alt risc important este lipsa regulilor de ștergere. Dacă datele sunt păstrate în platforme, foldere și backupuri fără termene clare, compania poate ajunge să păstreze informații mult mai mult decât este necesar. Acest lucru poate crea probleme în cazul solicitărilor de ștergere, controalelor sau incidentelor de securitate.",
        "În lipsa unei organizări clare, compania poate întâmpina dificultăți atunci când trebuie să răspundă unei persoane care solicită acces la datele sale, rectificarea datelor sau ștergerea acestora. Dacă datele sunt răspândite în mai multe sisteme, răspunsul poate fi incomplet sau întârziat.",
      ],
      ru: [
        "Распространенный риск возникает тогда, когда данные хранятся в слишком большом количестве мест без четкого учета. Например, одни и те же данные клиента могут находиться в CRM, в электронной почте, в Excel-файле, в счете, в общей папке и во внутренней переписке. Если отсутствуют четкие правила, компания фактически перестает контролировать, где находятся данные и кто может получить к ним доступ.",
        "В случае Excel-файлов или баз данных, управляемых вручную, риски возникают из-за отсутствия контроля над версиями, паролями и доступом. Файлы могут легко копироваться, отправляться по электронной почте, загружаться на личные компьютеры или изменяться без четкого учета.",
        "В случае CRM-систем или других платформ управления основной риск связан с правами доступа. Если все сотрудники могут видеть все данные без связи с их должностными обязанностями, компания может нарушить принцип ограниченного доступа. Каждое лицо должно иметь доступ только к тем данным, которые необходимы для его работы.",
        "Локальное хранение на внутренних серверах или компьютерах связано с рисками, касающимися безопасности оборудования, резервных копий, паролей, физического доступа и защиты от потери данных. Если компьютер выходит из строя, теряется или к нему получают несанкционированный доступ, компания может потерять важные данные или раскрыть персональную информацию.",
        "Хранение в облаке может быть эффективным и безопасным, однако оно должно управляться правильно. Компания должна знать, какую платформу она использует, где могут храниться данные, кто является поставщиком услуги, какие меры безопасности применяются и кто имеет право доступа. Использование личных или неофициальных учетных записей для документов компании может создавать дополнительные риски.",
        "Еще один важный риск — отсутствие правил удаления данных. Если данные хранятся в платформах, папках и резервных копиях без четких сроков, компания может в итоге хранить информацию значительно дольше, чем это необходимо. Это может создать проблемы в случае запросов на удаление, проверок или инцидентов безопасности.",
        "При отсутствии четкой организации компания может столкнуться с трудностями, когда необходимо ответить лицу, запрашивающему доступ к своим данным, исправление данных или их удаление. Если данные распределены по нескольким системам, ответ может быть неполным или задержанным.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să identifice toate sistemele și locurile în care sunt păstrate datele personale. Această identificare trebuie să includă atât sistemele oficiale, cât și instrumentele folosite practic de angajați: CRM, Excel, email, cloud, servere interne, calculatoare, aplicații de comunicare, platforme de contabilitate sau HR.",
        "Pentru fiecare sistem trebuie stabilit ce tipuri de date sunt păstrate, cine are acces, cine administrează sistemul, dacă există backupuri și dacă datele pot fi șterse sau exportate atunci când este necesar.",
        "Este recomandat ca accesul la date să fie acordat în funcție de rolul fiecărui angajat. Nu toți angajații trebuie să vadă toate datele. Accesul trebuie limitat la ceea ce este necesar pentru îndeplinirea atribuțiilor de serviciu.",
        "Compania trebuie să stabilească reguli clare privind utilizarea fișierelor Excel, folderelor partajate, emailului și platformelor cloud. Documentele care conțin date personale nu trebuie păstrate în conturi personale, transmise necontrolat sau copiate fără necesitate.",
        "De asemenea, trebuie verificate măsurile minime de securitate: parole puternice, acces individual, autentificare suplimentară acolo unde este posibil, copii de rezervă, protecție antivirus și reguli privind utilizarea echipamentelor de serviciu.",
        "Este utilă și stabilirea unor termene de păstrare pentru datele din fiecare sistem. Compania trebuie să știe când anumite date trebuie arhivate, șterse sau anonimizate. Această regulă ajută la reducerea riscurilor și la menținerea unei evidențe curate și controlate.",
        "O gestionare organizată a sistemelor și bazelor de date permite companiei să demonstreze că știe unde se află datele personale, cine le folosește și cum sunt protejate.",
      ],
      ru: [
        "Компания должна определить все системы и места, где хранятся персональные данные. Такая идентификация должна включать как официальные системы, так и инструменты, фактически используемые сотрудниками: CRM, Excel, электронную почту, облако, внутренние серверы, компьютеры, коммуникационные приложения, бухгалтерские или HR-платформы.",
        "По каждой системе необходимо установить, какие типы данных хранятся, кто имеет доступ, кто администрирует систему, существуют ли резервные копии и могут ли данные быть удалены или экспортированы при необходимости.",
        "Рекомендуется предоставлять доступ к данным в зависимости от роли каждого сотрудника. Не все сотрудники должны видеть все данные. Доступ должен быть ограничен тем, что необходимо для выполнения служебных обязанностей.",
        "Компания должна установить четкие правила использования Excel-файлов, общих папок, электронной почты и облачных платформ. Документы, содержащие персональные данные, не должны храниться в личных учетных записях, передаваться неконтролируемо или копироваться без необходимости.",
        "Также необходимо проверить минимальные меры безопасности: надежные пароли, индивидуальный доступ, дополнительную аутентификацию там, где это возможно, резервные копии, антивирусную защиту и правила использования служебного оборудования.",
        "Полезно также установить сроки хранения данных в каждой системе. Компания должна знать, когда определенные данные необходимо архивировать, удалить или анонимизировать. Такое правило помогает снизить риски и поддерживать чистый и контролируемый учет.",
        "Организованное управление системами и базами данных позволяет компании доказать, что она знает, где находятся персональные данные, кто их использует и каким образом они защищаются.",
      ],
    },
  },
  {
    order: 7,
    title: {
      ro: "Transmitere și acces la date",
      ru: "Передача данных и доступ к данным",
    },
    intro: {
      ro: [
        "Acest bloc arată dacă datele cu caracter personal sunt transmise sau devin accesibile unor persoane ori companii din afara companiei. În practică, aproape orice companie colaborează cu prestatori externi care pot avea acces la date personale: contabili, consultanți, prestatori IT, firme de marketing, curieri, furnizori de servicii cloud, avocați, auditori sau alți parteneri.",
        "Această secțiune este importantă deoarece GDPR nu privește doar datele păstrate intern, ci și datele care sunt transmise în afara companiei sau accesate de terți. Chiar dacă prelucrarea este efectuată de un prestator extern, compania trebuie să înțeleagă ce date sunt transmise, de ce sunt transmise și în ce condiții sunt protejate.",
        "De asemenea, este important de verificat dacă datele ajung în alte țări, direct sau indirect. De exemplu, chiar dacă prestatorul este local, acesta poate utiliza platforme cloud, servere, subcontractori sau instrumente tehnice care presupun stocarea ori accesarea datelor din afara țării.",
      ],
      ru: [
        "Данный блок показывает, передаются ли персональные данные или становятся ли они доступными лицам либо компаниям за пределами компании. На практике почти любая компания сотрудничает с внешними поставщиками услуг, которые могут иметь доступ к персональным данным: бухгалтерами, консультантами, IT-поставщиками, маркетинговыми компаниями, курьерскими службами, поставщиками облачных сервисов, адвокатами, аудиторами или другими партнерами.",
        "Этот раздел важен, поскольку GDPR касается не только данных, которые хранятся внутри компании, но и данных, которые передаются за пределы компании или становятся доступными третьим лицам. Даже если обработка осуществляется внешним поставщиком услуг, компания должна понимать, какие данные передаются, почему они передаются и на каких условиях они защищаются.",
        "Также важно проверить, попадают ли данные в другие страны, прямо или косвенно. Например, даже если поставщик является местным, он может использовать облачные платформы, серверы, субподрядчиков или технические инструменты, которые предполагают хранение данных либо доступ к ним из-за пределов страны.",
      ],
    },
    risk: {
      ro: [
        "Un risc important apare atunci când datele sunt transmise către terți fără o evidență clară. În asemenea situații, compania poate să nu știe exact cine are acces la date, ce date sunt utilizate, în ce scop și cât timp sunt păstrate.",
        "De exemplu, contabilul poate primi date despre angajați, salarii, contracte, plăți și acte justificative. Prestatorul IT poate avea acces la emailuri, servere, calculatoare, copii de rezervă și baze de date. Consultantul sau avocatul poate primi documente care conțin date despre angajați, clienți, parteneri sau alte persoane. Fiecare dintre aceste situații presupune un flux de date care trebuie controlat.",
        "Dacă nu există contracte sau clauze privind protecția datelor, compania nu poate demonstra clar care sunt obligațiile prestatorului. În lipsa acestor prevederi, pot apărea probleme privind confidențialitatea, securitatea datelor, subcontractarea, păstrarea documentelor sau returnarea și ștergerea datelor după încetarea colaborării.",
        "Un risc suplimentar apare atunci când prestatorii externi folosesc propriile sisteme, platforme sau subcontractori. Compania poate crede că datele sunt gestionate doar de prestatorul direct, dar în realitate acestea pot ajunge și la furnizori tehnici, servicii cloud, platforme de marketing, servere externe sau alte companii implicate în prestarea serviciului.",
        "În cazul transmiterii datelor către companii din alte țări, riscurile sunt și mai sensibile. Transferurile internaționale de date trebuie analizate separat, deoarece nu toate țările oferă același nivel de protecție a datelor personale. Dacă datele sunt transmise fără verificarea condițiilor legale, compania poate fi expusă la riscuri juridice și reputaționale.",
        "De asemenea, lipsa unei evidențe clare a accesului la date poate crea dificultăți în cazul unui incident. Dacă are loc o scurgere de informații sau un acces neautorizat, compania trebuie să poată stabili rapid ce date au fost afectate, cine a avut acces și ce măsuri trebuie luate.",
        "În practică, transmiterea necontrolată a datelor către terți este una dintre cele mai vulnerabile zone, deoarece compania pierde controlul direct asupra datelor, dar rămâne responsabilă pentru modul în care acestea sunt gestionate.",
      ],
      ru: [
        "Важный риск возникает тогда, когда данные передаются третьим лицам без четкого учета. В таких ситуациях компания может не знать точно, кто имеет доступ к данным, какие данные используются, в каких целях и как долго они хранятся.",
        "Например, бухгалтер может получать данные о сотрудниках, заработной плате, договорах, платежах и подтверждающих документах. IT-поставщик может иметь доступ к электронной почте, серверам, компьютерам, резервным копиям и базам данных. Консультант или адвокат может получать документы, содержащие данные о сотрудниках, клиентах, партнерах или других лицах. Каждая из этих ситуаций предполагает поток данных, который должен контролироваться.",
        "Если отсутствуют договоры или положения о защите данных, компания не может четко доказать, какие обязанности имеет поставщик услуг. При отсутствии таких положений могут возникать проблемы, связанные с конфиденциальностью, безопасностью данных, привлечением субподрядчиков, хранением документов либо возвратом и удалением данных после прекращения сотрудничества.",
        "Дополнительный риск возникает тогда, когда внешние поставщики используют собственные системы, платформы или субподрядчиков. Компания может полагать, что данные управляются только непосредственным поставщиком услуг, но в действительности они могут попадать также к техническим поставщикам, облачным сервисам, маркетинговым платформам, внешним серверам или другим компаниям, участвующим в оказании услуги.",
        "В случае передачи данных компаниям из других стран риски являются еще более чувствительными. Международные передачи данных должны анализироваться отдельно, поскольку не все страны обеспечивают одинаковый уровень защиты персональных данных. Если данные передаются без проверки законных условий, компания может быть подвержена юридическим и репутационным рискам.",
        "Также отсутствие четкого учета доступа к данным может создать трудности в случае инцидента. Если происходит утечка информации или несанкционированный доступ, компания должна иметь возможность быстро установить, какие данные были затронуты, кто имел доступ и какие меры необходимо принять.",
        "На практике неконтролируемая передача данных третьим лицам является одной из наиболее уязвимых зон, поскольку компания теряет прямой контроль над данными, но остается ответственной за то, каким образом они управляются.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să identifice toți partenerii, furnizorii și prestatorii externi care primesc date personale sau au acces la acestea. Această analiză trebuie să includă atât colaborările evidente, cum ar fi contabilitatea și serviciile IT, cât și colaborările mai puțin vizibile, cum ar fi platformele cloud, marketingul, serviciile de livrare, mentenanța software sau consultanța externă.",
        "Pentru fiecare prestator trebuie stabilit ce date primește, în ce scop, în baza cărui contract, cine are acces la date, dacă prestatorul poate implica subcontractori și ce se întâmplă cu datele după încetarea colaborării.",
        "Este recomandat ca relațiile cu prestatorii care prelucrează date personale să fie reglementate prin clauze privind protecția datelor sau prin acorduri separate. Aceste documente trebuie să prevadă obligații privind confidențialitatea, securitatea, limitarea utilizării datelor, asistența în cazul solicitărilor persoanelor vizate și notificarea incidentelor.",
        "Compania trebuie să verifice dacă datele sunt transmise în alte țări sau dacă prestatorii folosesc platforme externe care pot implica asemenea transferuri. În astfel de cazuri, trebuie analizate condițiile legale aplicabile și documentele necesare.",
        "De asemenea, este utilă crearea unei evidențe interne a prestatorilor care au acces la date personale. Această evidență poate fi simplă, dar trebuie actualizată atunci când apare un nou prestator, se schimbă serviciile sau se modifică tipurile de date transmise.",
        "O regulă practică este ca datele să fie transmise doar atunci când este necesar, doar către persoane sau companii autorizate și doar în baza unor condiții clare. Astfel, compania își păstrează controlul asupra datelor și reduce riscul utilizării necorespunzătoare a acestora.",
      ],
      ru: [
        "Компания должна определить всех партнеров, поставщиков и внешних исполнителей, которые получают персональные данные или имеют к ним доступ. Такой анализ должен включать как очевидные виды сотрудничества, например бухгалтерию и IT-услуги, так и менее заметные взаимодействия, такие как облачные платформы, маркетинг, услуги доставки, сопровождение программного обеспечения или внешнее консультирование.",
        "По каждому поставщику услуг необходимо установить, какие данные он получает, в каких целях, на основании какого договора, кто имеет доступ к данным, может ли поставщик привлекать субподрядчиков и что происходит с данными после прекращения сотрудничества.",
        "Рекомендуется, чтобы отношения с поставщиками услуг, которые обрабатывают персональные данные, регулировались положениями о защите данных или отдельными соглашениями. Эти документы должны предусматривать обязанности, связанные с конфиденциальностью, безопасностью, ограничением использования данных, содействием в случае запросов субъектов данных и уведомлением об инцидентах.",
        "Компания должна проверить, передаются ли данные в другие страны или используют ли поставщики внешние платформы, которые могут предполагать такие передачи. В подобных случаях необходимо проанализировать применимые законные условия и необходимые документы.",
        "Также полезно создать внутренний учет поставщиков услуг, которые имеют доступ к персональным данным. Такой учет может быть простым, но должен обновляться при появлении нового поставщика, изменении услуг или изменении типов передаваемых данных.",
        "Практическое правило состоит в том, чтобы данные передавались только тогда, когда это необходимо, только уполномоченным лицам или компаниям и только на основании четких условий. Таким образом компания сохраняет контроль над данными и снижает риск их ненадлежащего использования.",
      ],
    },
  },
  {
    order: 8,
    title: {
      ro: "Sistem de supraveghere video și GPS",
      ru: "Система видеонаблюдения и GPS",
    },
    intro: {
      ro: [
        "Acest bloc arată dacă în cadrul companiei sunt utilizate camere video sau sisteme GPS pentru monitorizarea automobilelor. Aceste instrumente pot avea un scop legitim, cum ar fi securitatea bunurilor, protecția persoanelor, prevenirea incidentelor sau organizarea activității profesionale. Totuși, ele implică monitorizarea directă sau indirectă a persoanelor și trebuie gestionate cu atenție.",
        "Supravegherea video poate viza angajați, clienți, vizitatori, furnizori sau alte persoane care intră în spațiile companiei. Monitorizarea GPS poate viza angajații care folosesc automobile de serviciu sau, în anumite cazuri, automobile utilizate și în scop personal.",
        "Din perspectiva GDPR, aceste instrumente trebuie analizate nu doar tehnic, ci și juridic. Compania trebuie să poată explica de ce folosește supravegherea video sau GPS, ce date colectează, cine are acces la ele și cât timp sunt păstrate.",
      ],
      ru: [
        "Данный блок показывает, используются ли в компании видеокамеры или GPS-системы для мониторинга автомобилей. Эти инструменты могут иметь законную цель, например обеспечение сохранности имущества, защиту лиц, предотвращение инцидентов или организацию профессиональной деятельности. Однако они предполагают прямой или косвенный мониторинг лиц и должны управляться внимательно.",
        "Видеонаблюдение может касаться сотрудников, клиентов, посетителей, поставщиков или иных лиц, которые входят в помещения компании. GPS-мониторинг может касаться сотрудников, использующих служебные автомобили, а в отдельных случаях — автомобили, используемые также в личных целях.",
        "С точки зрения GDPR эти инструменты должны анализироваться не только технически, но и юридически. Компания должна быть способна объяснить, почему она использует видеонаблюдение или GPS, какие данные собирает, кто имеет к ним доступ и как долго они хранятся.",
      ],
    },
    risk: {
      ro: [
        "Un risc important apare atunci când camerele video sunt instalate fără o informare corespunzătoare. Persoanele care intră într-un birou, magazin, spațiu comercial sau spațiu de producție trebuie să știe că zona este supravegheată video, cine operează sistemul și în ce scop sunt utilizate imaginile.",
        "Dacă nu există indicatoare vizibile sau o informare completă, compania poate fi acuzată că monitorizează persoanele fără transparență. Acest risc este mai mare în spațiile unde persoanele nu se așteaptă să fie supravegheate sau unde supravegherea poate fi considerată excesivă.",
        "Un alt risc ține de amplasarea camerelor. Camerele trebuie instalate doar acolo unde există un scop justificat. Supravegherea permanentă și disproporționată a angajaților poate crea probleme, mai ales dacă scopul real nu este securitatea, ci controlul excesiv al activității acestora.",
        "De asemenea, trebuie evitată instalarea camerelor în zone în care persoanele au o așteptare ridicată de intimitate. Chiar și atunci când compania urmărește un scop legitim, mijloacele folosite trebuie să fie proporționale.",
        "În cazul sistemelor GPS, riscurile apar mai ales atunci când automobilele sunt utilizate și în scop personal. Dacă monitorizarea continuă și în afara programului de lucru sau în afara scopului profesional, aceasta poate afecta viața privată a angajaților. În asemenea cazuri, compania trebuie să stabilească reguli clare privind când și cum este activă monitorizarea.",
        "Un risc frecvent este lipsa unei politici interne privind CCTV și GPS. Dacă nu există reguli scrise, angajații pot să nu știe ce se monitorizează, cine are acces la date, cât timp sunt păstrate imaginile sau informațiile de localizare și în ce situații pot fi utilizate.",
        "Accesul necontrolat la înregistrările video sau la datele GPS este un alt risc important. Dacă prea multe persoane pot vedea imaginile sau traseele automobilelor, compania poate încălca principiul accesului limitat. Aceste date trebuie accesate doar de persoane autorizate și doar atunci când există un motiv concret.",
        "Păstrarea excesivă a imaginilor video sau a datelor GPS poate crea probleme suplimentare. Dacă datele sunt păstrate mai mult decât este necesar, compania acumulează inutil informații despre persoane și crește riscul ca acestea să fie accesate sau folosite necorespunzător.",
        "În cazul unui incident, lipsa regulilor clare poate face dificilă justificarea utilizării înregistrărilor. De exemplu, dacă imaginile video sunt folosite într-un conflict de muncă sau într-o dispută cu un client, compania trebuie să poată demonstra că sistemul a fost folosit legal și proporțional.",
      ],
      ru: [
        "Важный риск возникает тогда, когда видеокамеры установлены без надлежащего информирования. Лица, входящие в офис, магазин, коммерческое помещение или производственное пространство, должны знать, что зона находится под видеонаблюдением, кто управляет системой и в каких целях используются изображения.",
        "Если отсутствуют видимые предупреждающие таблички или полное информирование, компания может быть обвинена в непрозрачном мониторинге лиц. Этот риск выше в помещениях, где лица не ожидают, что за ними будет осуществляться наблюдение, или где наблюдение может считаться чрезмерным.",
        "Еще один риск связан с размещением камер. Камеры должны устанавливаться только там, где существует обоснованная цель. Постоянное и несоразмерное наблюдение за сотрудниками может создавать проблемы, особенно если реальной целью является не безопасность, а чрезмерный контроль их деятельности.",
        "Также необходимо избегать установки камер в зонах, где лица имеют повышенное ожидание приватности. Даже когда компания преследует законную цель, используемые средства должны быть соразмерными.",
        "В случае GPS-систем риски возникают прежде всего тогда, когда автомобили используются также в личных целях. Если мониторинг продолжается вне рабочего времени или вне профессиональной цели, это может затрагивать частную жизнь сотрудников. В таких случаях компания должна установить четкие правила относительно того, когда и каким образом мониторинг является активным.",
        "Распространенный риск — отсутствие внутренней политики в отношении CCTV и GPS. Если отсутствуют письменные правила, сотрудники могут не знать, что именно отслеживается, кто имеет доступ к данным, как долго хранятся изображения или данные о местоположении и в каких ситуациях они могут использоваться.",
        "Неконтролируемый доступ к видеозаписям или GPS-данным является еще одним важным риском. Если слишком много лиц могут просматривать изображения или маршруты автомобилей, компания может нарушить принцип ограниченного доступа. Эти данные должны быть доступны только уполномоченным лицам и только при наличии конкретного основания.",
        "Чрезмерное хранение видеозаписей или GPS-данных может создавать дополнительные проблемы. Если данные хранятся дольше, чем необходимо, компания без необходимости накапливает информацию о лицах и увеличивает риск того, что она будет доступна или использована ненадлежащим образом.",
        "В случае инцидента отсутствие четких правил может затруднить обоснование использования записей. Например, если видеозаписи используются в трудовом конфликте или споре с клиентом, компания должна иметь возможность доказать, что система использовалась законно и соразмерно.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să stabilească în mod clar scopul pentru care folosește camere video sau sisteme GPS. Acest scop trebuie să fie real, necesar și proporțional. De exemplu, securitatea spațiilor, protecția bunurilor, investigarea incidentelor sau gestionarea automobilelor de serviciu pot fi scopuri justificate, dacă sunt documentate corespunzător.",
        "În cazul supravegherii video, compania trebuie să verifice unde sunt amplasate camerele, ce zone acoperă, dacă există indicatoare vizibile și cine are acces la înregistrări. Este recomandat ca supravegherea să fie limitată la zonele necesare și să nu depășească scopul declarat.",
        "Compania trebuie să informeze persoanele vizate despre utilizarea camerelor video. Informarea poate include indicatoare la intrare și o notă de informare mai detaliată, disponibilă pentru persoanele interesate. Aceasta trebuie să explice cine administrează sistemul, scopul supravegherii, durata de păstrare a imaginilor și drepturile persoanelor vizate.",
        "În cazul GPS, compania trebuie să stabilească dacă automobilele sunt folosite exclusiv în scop profesional sau și în scop personal. Dacă există utilizare personală, trebuie analizate măsuri suplimentare pentru a evita monitorizarea excesivă în afara programului sau în afara scopului profesional.",
        "Este recomandată adoptarea unei politici interne privind utilizarea sistemelor CCTV și GPS. Aceasta trebuie să prevadă scopul monitorizării, categoriile de persoane vizate, durata de păstrare, persoanele care au acces, situațiile în care datele pot fi verificate și modul de gestionare a solicitărilor sau incidentelor.",
        "Accesul la imaginile video și la datele GPS trebuie limitat la persoane desemnate. Este utilă ținerea unei evidențe a accesărilor, mai ales atunci când datele sunt consultate pentru investigarea unui incident sau pentru soluționarea unei situații concrete.",
        "Compania trebuie să stabilească termene clare de păstrare pentru înregistrările video și datele GPS. Acestea nu trebuie păstrate pe termen nedeterminat, ci doar atât timp cât este necesar pentru scopul pentru care au fost colectate.",
        "O gestionare corectă a sistemelor CCTV și GPS permite companiei să folosească aceste instrumente în mod eficient, dar fără a afecta nejustificat viața privată a angajaților, clienților sau altor persoane.",
      ],
      ru: [
        "Компания должна четко установить цель, для которой она использует видеокамеры или GPS-системы. Эта цель должна быть реальной, необходимой и соразмерной. Например, безопасность помещений, защита имущества, расследование инцидентов или управление служебными автомобилями могут быть обоснованными целями, если они надлежащим образом документированы.",
        "В случае видеонаблюдения компания должна проверить, где размещены камеры, какие зоны они охватывают, имеются ли видимые предупреждающие таблички и кто имеет доступ к записям. Рекомендуется, чтобы наблюдение было ограничено необходимыми зонами и не выходило за пределы заявленной цели.",
        "Компания должна информировать субъектов данных об использовании видеокамер. Информирование может включать предупреждающие таблички у входа и более подробное информационное уведомление, доступное заинтересованным лицам. Оно должно объяснять, кто администрирует систему, цель наблюдения, срок хранения изображений и права субъектов данных.",
        "В случае GPS компания должна установить, используются ли автомобили исключительно в профессиональных целях или также в личных целях. Если допускается личное использование, необходимо проанализировать дополнительные меры, чтобы избежать чрезмерного мониторинга вне рабочего времени или вне профессиональной цели.",
        "Рекомендуется принять внутреннюю политику об использовании систем CCTV и GPS. Она должна предусматривать цель мониторинга, категории субъектов данных, срок хранения, лиц, имеющих доступ, ситуации, в которых данные могут быть проверены, а также порядок управления запросами или инцидентами.",
        "Доступ к видеозаписям и GPS-данным должен быть ограничен назначенными лицами. Полезно вести учет доступов, особенно когда данные просматриваются для расследования инцидента или разрешения конкретной ситуации.",
        "Компания должна установить четкие сроки хранения видеозаписей и GPS-данных. Они не должны храниться в течение неопределенного срока, а только столько, сколько необходимо для цели, для которой они были собраны.",
        "Корректное управление системами CCTV и GPS позволяет компании эффективно использовать эти инструменты, не затрагивая необоснованно частную жизнь сотрудников, клиентов или иных лиц.",
      ],
    },
  },
  {
    order: 9,
    title: {
      ro: "Persoană responsabilă pentru protecția datelor",
      ru: "Лицо, ответственное за защиту данных",
    },
    intro: {
      ro: [
        "Acest bloc arată dacă în cadrul companiei există o persoană responsabilă pentru protecția datelor cu caracter personal. Aceasta poate fi o persoană desemnată oficial cu titlu de DPO sau o persoană internă care, fără a avea acest titlu, coordonează practic aspectele legate de protecția datelor.",
        "Existența unei persoane responsabile este importantă deoarece GDPR nu înseamnă doar documente, politici sau formulare, ci și o gestionare continuă a modului în care datele personale sunt colectate, păstrate, utilizate, transmise și șterse.",
        "În practică, chiar și companiile care nu au obligația legală de a desemna un DPO au nevoie de o persoană care să cunoască procesele interne și să poată coordona subiectele legate de datele personale. Fără o asemenea persoană, responsabilitatea rămâne dispersată între mai multe departamente, iar problemele sunt observate, de regulă, doar atunci când apare o plângere, un incident sau o solicitare urgentă.",
      ],
      ru: [
        "Данный блок показывает, существует ли в компании лицо, ответственное за защиту персональных данных. Это может быть лицо, официально назначенное в качестве DPO, либо внутреннее ответственное лицо, которое, не имея такого формального статуса, на практике координирует вопросы, связанные с защитой данных.",
        "Наличие ответственного лица важно, поскольку GDPR — это не только документы, политики или формы, но и постоянное управление тем, как персональные данные собираются, хранятся, используются, передаются и удаляются.",
        "На практике даже компании, которые не имеют законной обязанности назначать DPO, нуждаются в лице, которое знает внутренние процессы и может координировать вопросы, связанные с персональными данными. Без такого лица ответственность остается распределенной между несколькими отделами, а проблемы, как правило, выявляются только тогда, когда появляется жалоба, инцидент или срочный запрос.",
      ],
    },
    risk: {
      ro: [
        "Un prim risc apare atunci când nimeni nu este responsabil în mod clar de protecția datelor. În această situație, compania poate avea anumite reguli sau documente, dar acestea nu sunt aplicate consecvent, nu sunt actualizate și nu sunt cunoscute de angajați.",
        "De exemplu, departamentul HR poate gestiona datele angajaților, contabilitatea poate gestiona date financiare, prestatorul IT poate avea acces la sisteme, iar marketingul poate lucra cu datele clienților. Dacă nu există o persoană care să vadă imaginea de ansamblu, fiecare zonă acționează separat, iar compania poate pierde controlul asupra fluxurilor de date.",
        "Un risc important apare atunci când se primesc solicitări din partea persoanelor vizate: acces la date, rectificare, ștergere, opoziție sau alte cereri similare. Dacă nu este clar cine trebuie să primească și să gestioneze aceste solicitări, răspunsurile pot fi întârziate, incomplete sau neunitare.",
        "De asemenea, în cazul unui incident de securitate, lipsa unei persoane responsabile poate duce la reacții întârziate. De exemplu, dacă se pierde un laptop, se transmite un email greșit, se accesează date fără autorizație sau apare o scurgere de informații, compania trebuie să poată reacționa rapid. Fără o coordonare clară, incidentul poate fi tratat informal sau poate fi ignorat până când produce consecințe mai grave.",
        "Un alt risc ține de relația cu prestatorii externi. Dacă nimeni nu verifică contractele, accesul la date, clauzele de confidențialitate sau obligațiile prestatorilor, compania poate transmite date către terți fără garanții suficiente. În cazul unei probleme, compania va trebui să explice de ce a permis accesul la date și ce măsuri de control a aplicat.",
        "În lipsa unei persoane responsabile, compania poate rata și schimbările care apar în activitatea sa. De exemplu, lansarea unui nou site, implementarea unui CRM, introducerea supravegherii video, utilizarea GPS sau transmiterea datelor către un nou prestator pot crea obligații suplimentare. Dacă aceste schimbări nu sunt analizate din perspectiva protecției datelor, riscurile se acumulează treptat.",
        "Pe termen lung, absența unei responsabilități clare poate crea impresia că protecția datelor este doar o formalitate. În realitate, conformitatea GDPR presupune verificări periodice, actualizarea documentelor, instruirea angajaților și reacții corecte la situațiile concrete.",
      ],
      ru: [
        "Первый риск возникает тогда, когда никто четко не отвечает за защиту данных. В такой ситуации у компании могут быть определенные правила или документы, однако они не применяются последовательно, не обновляются и неизвестны сотрудникам.",
        "Например, HR-отдел может управлять данными сотрудников, бухгалтерия — финансовыми данными, IT-поставщик может иметь доступ к системам, а маркетинг может работать с данными клиентов. Если отсутствует лицо, которое видит общую картину, каждая зона действует отдельно, и компания может потерять контроль над потоками данных.",
        "Важный риск возникает при получении запросов от субъектов данных: доступ к данным, исправление, удаление, возражение или другие аналогичные запросы. Если неясно, кто должен принимать и обрабатывать такие запросы, ответы могут быть задержанными, неполными или несогласованными.",
        "Также в случае инцидента безопасности отсутствие ответственного лица может привести к запоздалой реакции. Например, если потерян ноутбук, ошибочно отправлено электронное письмо, данные были доступны без разрешения или произошла утечка информации, компания должна иметь возможность быстро отреагировать. Без четкой координации инцидент может быть рассмотрен неформально или проигнорирован до тех пор, пока не приведет к более серьезным последствиям.",
        "Еще один риск связан с отношениями с внешними поставщиками. Если никто не проверяет договоры, доступ к данным, положения о конфиденциальности или обязанности поставщиков, компания может передавать данные третьим лицам без достаточных гарантий. В случае возникновения проблемы компания должна будет объяснить, почему она допустила доступ к данным и какие меры контроля применила.",
        "При отсутствии ответственного лица компания также может упустить изменения, происходящие в ее деятельности. Например, запуск нового сайта, внедрение CRM, введение видеонаблюдения, использование GPS или передача данных новому поставщику могут создавать дополнительные обязанности. Если эти изменения не анализируются с точки зрения защиты данных, риски постепенно накапливаются.",
        "В долгосрочной перспективе отсутствие четкой ответственности может создать впечатление, что защита данных является лишь формальностью. В действительности соответствие GDPR предполагает периодические проверки, обновление документов, обучение сотрудников и правильную реакцию на конкретные ситуации.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să stabilească dacă are obligația de a desemna un DPO sau dacă este suficientă desemnarea unei persoane responsabile intern pentru protecția datelor. Această analiză trebuie făcută în funcție de activitatea companiei, volumul datelor prelucrate, tipurile de date și gradul de monitorizare a persoanelor.",
        "Dacă este desemnat un DPO, rolul acestuia trebuie să fie clar, documentat și comunicat în interiorul companiei. Persoanele din companie trebuie să știe cine este responsabil de protecția datelor și când trebuie să se adreseze acestei persoane.",
        "Dacă nu este necesară desemnarea unui DPO, compania poate desemna un responsabil intern care să coordoneze aspectele practice. Această persoană poate urmări documentele interne, poate centraliza întrebările legate de datele personale, poate comunica cu prestatorii externi și poate coordona răspunsurile la solicitările persoanelor vizate.",
        "Este recomandat ca desemnarea persoanei responsabile să fie făcută în scris, printr-o decizie internă sau printr-un document similar. În acest document pot fi indicate atribuțiile de bază: monitorizarea respectării regulilor interne, actualizarea documentelor, evidența incidentelor, coordonarea instruirilor și comunicarea cu conducerea companiei.",
        "De asemenea, persoana responsabilă trebuie să fie implicată atunci când compania introduce procese noi care presupun prelucrarea datelor personale. De exemplu, înainte de lansarea unui nou formular online, implementarea unui nou sistem IT, instalarea camerelor video sau transmiterea datelor către un nou prestator, este util ca această persoană să verifice dacă sunt respectate cerințele minime de protecție a datelor.",
        "Compania trebuie să evite situația în care responsabilitatea există doar formal. Persoana desemnată trebuie să aibă acces la informațiile necesare, să poată comunica cu departamentele relevante și să poată semnala conducerii riscurile identificate.",
        "O persoană responsabilă bine aleasă ajută compania să trateze protecția datelor ca pe un proces organizat, nu ca pe o reacție de moment în caz de problemă.",
      ],
      ru: [
        "Компания должна установить, обязана ли она назначить DPO или достаточно назначить внутреннее лицо, ответственное за защиту данных. Такой анализ должен проводиться с учетом деятельности компании, объема обрабатываемых данных, типов данных и степени мониторинга лиц.",
        "Если назначается DPO, его роль должна быть четкой, документированной и доведенной до сведения внутри компании. Лица в компании должны знать, кто отвечает за защиту данных и когда необходимо обращаться к этому лицу.",
        "Если назначение DPO не требуется, компания может назначить внутреннее ответственное лицо, которое будет координировать практические вопросы. Это лицо может отслеживать внутренние документы, централизовать вопросы, связанные с персональными данными, взаимодействовать с внешними поставщиками и координировать ответы на запросы субъектов данных.",
        "Рекомендуется оформить назначение ответственного лица письменно, посредством внутреннего решения или аналогичного документа. В этом документе могут быть указаны основные обязанности: контроль соблюдения внутренних правил, обновление документов, учет инцидентов, координация инструктажей и коммуникация с руководством компании.",
        "Также ответственное лицо должно привлекаться, когда компания внедряет новые процессы, предполагающие обработку персональных данных. Например, перед запуском новой онлайн-формы, внедрением новой IT-системы, установкой видеокамер или передачей данных новому поставщику полезно, чтобы это лицо проверило соблюдение минимальных требований по защите данных.",
        "Компания должна избегать ситуации, когда ответственность существует только формально. Назначенное лицо должно иметь доступ к необходимой информации, иметь возможность взаимодействовать с соответствующими отделами и сообщать руководству о выявленных рисках.",
        "Правильно выбранное ответственное лицо помогает компании рассматривать защиту данных как организованный процесс, а не как ситуативную реакцию в случае возникновения проблемы.",
      ],
    },
  },
  {
    order: 10,
    title: {
      ro: "Incidente și evaluări de risc",
      ru: "Инциденты и оценка рисков",
    },
    intro: {
      ro: [
        "Acest bloc arată dacă în companie există măsuri interne pentru protecția datelor și dacă au existat incidente de securitate. Prin incidente se înțeleg situații precum pierderea unui laptop, transmiterea greșită a unui email, accesul neautorizat la date, pierderea unor documente, divulgarea accidentală a informațiilor sau scurgerea unor date către persoane neautorizate.",
        "Această secțiune este importantă deoarece protecția datelor nu presupune doar prevenirea problemelor, ci și capacitatea companiei de a reacționa corect atunci când o problemă apare. Chiar și companiile bine organizate pot avea incidente. Diferența apare în modul în care acestea sunt identificate, documentate, analizate și soluționate.",
        "De asemenea, evaluarea riscurilor ajută compania să înțeleagă care sunt zonele vulnerabile: accesul la date, securitatea IT, instruirea angajaților, transmiterea datelor către prestatori, utilizarea emailului, păstrarea documentelor sau monitorizarea prin CCTV și GPS.",
      ],
      ru: [
        "Данный блок показывает, существуют ли в компании внутренние меры по защите данных и имели ли место инциденты безопасности. Под инцидентами понимаются такие ситуации, как потеря ноутбука, ошибочная отправка электронного письма, несанкционированный доступ к данным, потеря документов, случайное раскрытие информации или утечка данных к неуполномоченным лицам.",
        "Этот раздел важен, поскольку защита данных предполагает не только предотвращение проблем, но и способность компании правильно реагировать, когда проблема возникает. Даже хорошо организованные компании могут сталкиваться с инцидентами. Разница заключается в том, как такие инциденты выявляются, документируются, анализируются и устраняются.",
        "Также оценка рисков помогает компании понять, какие зоны являются уязвимыми: доступ к данным, IT-безопасность, обучение сотрудников, передача данных поставщикам услуг, использование электронной почты, хранение документов или мониторинг через CCTV и GPS.",
      ],
    },
    risk: {
      ro: [
        "Un risc important apare atunci când compania nu are proceduri interne clare privind protecția datelor. În lipsa acestor reguli, fiecare angajat reacționează după propria înțelegere. Unii pot raporta o problemă, alții o pot ignora, iar alții pot încerca să o rezolve informal, fără ca incidentul să fie documentat.",
        "De exemplu, dacă un email cu date personale este transmis unei persoane greșite, compania trebuie să înțeleagă ce date au fost trimise, cui au fost trimise, dacă persoana greșită le-a accesat și ce măsuri trebuie luate. Dacă nu există o procedură, incidentul poate fi tratat ca o simplă greșeală administrativă, deși poate avea consecințe juridice.",
        "Un alt risc apare în cazul pierderii sau furtului unui dispozitiv. Dacă un laptop, telefon sau stick USB conține date personale și nu este protejat corespunzător, compania poate pierde controlul asupra acestor date. În asemenea situații, contează foarte mult dacă dispozitivul avea parolă, criptare, acces limitat sau posibilitate de blocare la distanță.",
        "Lipsa instruirii angajaților este una dintre cele mai frecvente cauze ale incidentelor. Multe probleme nu apar din intenție rea, ci din neatenție: trimiterea documentelor către destinatar greșit, utilizarea parolelor slabe, păstrarea documentelor pe desktop, folosirea conturilor personale, transmiterea datelor prin aplicații nesecurizate sau accesarea datelor fără necesitate.",
        "Un risc suplimentar apare atunci când incidentele nu sunt evidențiate. Dacă nu există un registru intern al incidentelor, compania nu poate demonstra că a analizat situațiile apărute și că a luat măsuri. În cazul unui control sau al unei plângeri, lipsa documentării poate fi interpretată ca lipsă de control intern.",
        "De asemenea, dacă nu se face o evaluare periodică a riscurilor, compania poate să nu observe vulnerabilitățile din timp. De exemplu, accesul prea larg la CRM, lipsa backupurilor, lipsa politicilor interne, contractele incomplete cu prestatorii sau păstrarea excesivă a datelor pot deveni probleme doar atunci când apare un incident.",
        "În cazul unor incidente mai grave, compania poate avea obligația de a notifica autoritatea competentă sau chiar persoanele afectate. Dacă nu există o procedură clară, compania poate pierde timp important și poate reacționa prea târziu.",
        "Consecințele pot fi atât juridice, cât și reputaționa le. Pe lângă eventuale sancțiuni, compania poate pierde încrederea angajaților, clienților sau partenerilor dacă nu gestionează corect datele personale.",
      ],
      ru: [
        "Важный риск возникает тогда, когда у компании отсутствуют четкие внутренние процедуры по защите данных. При отсутствии таких правил каждый сотрудник реагирует исходя из собственного понимания. Одни могут сообщить о проблеме, другие — проигнорировать ее, а третьи — попытаться решить ее неформально, без документирования инцидента.",
        "Например, если электронное письмо с персональными данными отправлено не тому адресату, компания должна понять, какие данные были отправлены, кому они были отправлены, получил ли ошибочный адресат к ним доступ и какие меры необходимо принять. Если процедуры нет, инцидент может быть воспринят как простая административная ошибка, хотя он может иметь юридические последствия.",
        "Еще один риск возникает в случае потери или кражи устройства. Если ноутбук, телефон или USB-накопитель содержит персональные данные и не защищен надлежащим образом, компания может потерять контроль над этими данными. В таких ситуациях большое значение имеет то, были ли на устройстве пароль, шифрование, ограниченный доступ или возможность удаленной блокировки.",
        "Отсутствие обучения сотрудников является одной из наиболее частых причин инцидентов. Многие проблемы возникают не из злого умысла, а по невнимательности: отправка документов неправильному адресату, использование слабых паролей, хранение документов на рабочем столе компьютера, использование личных учетных записей, передача данных через небезопасные приложения или доступ к данным без необходимости.",
        "Дополнительный риск возникает тогда, когда инциденты не учитываются. Если отсутствует внутренний реестр инцидентов, компания не может доказать, что она проанализировала возникшие ситуации и приняла меры. В случае проверки или жалобы отсутствие документирования может быть истолковано как отсутствие внутреннего контроля.",
        "Также, если не проводится периодическая оценка рисков, компания может не заметить уязвимости вовремя. Например, слишком широкий доступ к CRM, отсутствие резервных копий, отсутствие внутренних политик, неполные договоры с поставщиками услуг или чрезмерное хранение данных могут стать проблемами только тогда, когда произойдет инцидент.",
        "В случае более серьезных инцидентов у компании может возникнуть обязанность уведомить компетентный орган или даже затронутых лиц. Если отсутствует четкая процедура, компания может потерять важное время и отреагировать слишком поздно.",
        "Последствия могут быть как юридическими, так и репутационными. Помимо возможных санкций, компания может потерять доверие сотрудников, клиентов или партнеров, если не будет надлежащим образом управлять персональными данными.",
      ],
    },
    action: {
      ro: [
        "Compania trebuie să implementeze măsuri interne clare privind protecția datelor. Aceste măsuri pot include politici interne, instrucțiuni pentru angajați, reguli privind accesul la date, reguli privind utilizarea emailului, proceduri pentru incidente și instruiri periodice.",
        "Este recomandat ca angajații să știe ce trebuie să facă atunci când observă o problemă. De exemplu, dacă trimit un email greșit, pierd un document, observă acces neautorizat sau primesc o solicitare privind datele personale, trebuie să știe cui raportează și în ce termen.",
        "Compania trebuie să instituie un registru intern al incidentelor. Acesta nu trebuie să fie complicat, dar trebuie să permită documentarea situației: data incidentului, descrierea problemei, datele afectate, persoanele implicate, măsurile luate și concluzia finală.",
        "De asemenea, este recomandată realizarea periodică a unei evaluări de risc. Aceasta poate porni de la întrebări simple: unde sunt cele mai multe date personale, cine are acces la ele, ce prestatori le primesc, ce sisteme sunt vulnerabile, ce date sunt sensibile și ce s-ar întâmpla dacă acestea ar fi pierdute sau divulgate.",
        "Compania trebuie să verifice măsurile minime de securitate: parole individuale, acces limitat, backupuri, protecție antivirus, actualizarea sistemelor, blocarea dispozitivelor, reguli privind documentele fizice și controlul accesului la platformele digitale.",
        "Este utilă și instruirea periodică a angajaților. Instruirea nu trebuie să fie complicată, dar trebuie să explice clar ce sunt datele personale, ce greșeli trebuie evitate și cum trebuie raportate incidentele.",
        "În cazul în care apare un incident, compania trebuie să îl analizeze rapid și să decidă dacă este necesară notificarea autorității sau a persoanelor afectate. Această decizie trebuie documentată, chiar și atunci când se concluzionează că notificarea nu este necesară.",
        "O companie care are proceduri, evidențe și angajați instruiți poate demonstra că tratează protecția datelor în mod responsabil și că este pregătită să reacționeze organizat în cazul unei probleme.",
      ],
      ru: [
        "Компания должна внедрить четкие внутренние меры по защите данных. Эти меры могут включать внутренние политики, инструкции для сотрудников, правила доступа к данным, правила использования электронной почты, процедуры реагирования на инциденты и периодическое обучение.",
        "Рекомендуется, чтобы сотрудники знали, что необходимо делать, когда они замечают проблему. Например, если они отправили письмо неправильному адресату, потеряли документ, заметили несанкционированный доступ или получили запрос, касающийся персональных данных, они должны знать, кому сообщать об этом и в какой срок.",
        "Компания должна ввести внутренний реестр инцидентов. Он не должен быть сложным, но должен позволять документировать ситуацию: дату инцидента, описание проблемы, затронутые данные, вовлеченных лиц, принятые меры и итоговый вывод.",
        "Также рекомендуется периодически проводить оценку рисков. Она может начинаться с простых вопросов: где находится наибольший объем персональных данных, кто имеет к ним доступ, какие поставщики услуг их получают, какие системы являются уязвимыми, какие данные являются чувствительными и что произойдет, если они будут утрачены или раскрыты.",
        "Компания должна проверить минимальные меры безопасности: индивидуальные пароли, ограниченный доступ, резервные копии, антивирусную защиту, обновление систем, блокировку устройств, правила в отношении физических документов и контроль доступа к цифровым платформам.",
        "Полезно также проводить периодическое обучение сотрудников. Обучение не должно быть сложным, но должно четко объяснять, что такое персональные данные, каких ошибок необходимо избегать и как следует сообщать об инцидентах.",
        "В случае возникновения инцидента компания должна быстро его проанализировать и решить, требуется ли уведомление органа власти или затронутых лиц. Это решение должно быть документировано, даже если компания приходит к выводу, что уведомление не требуется.",
        "Компания, у которой есть процедуры, учет и обученные сотрудники, может доказать, что она ответственно относится к защите данных и готова организованно реагировать в случае возникновения проблемы.",
      ],
    },
  },
];

export function findGdprExplanation(order: number): GdprExplanation | null {
  return GDPR_EXPLANATIONS.find(e => e.order === order) ?? null;
}
