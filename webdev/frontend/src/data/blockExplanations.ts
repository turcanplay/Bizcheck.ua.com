/**
 * Per-block explanations for the BizCheck report.
 * Keyed by block `order` (1..8). Each block has 4 sections in RO and RU.
 */

export interface BlockExplanation {
  order: number;
  title: { uk: string; en: string };
  essence: { uk: string; en: string };
  risk: { uk: string[]; en: string[] };      // paragraphs
  action: { uk: string[]; en: string[] };
  regulatory: {
    uk: { label: string; url: string };
    en: { label: string; url: string };
  };
}

export const BLOCK_EXPLANATIONS: BlockExplanation[] = [
  /* ──────────────────────────────────────────────────────
     BLOC 1 — Fondatori și management
  ────────────────────────────────────────────────────── */
  {
    order: 1,
    title: {
      uk: 'Blocul 1. Fondatori și management',
      en: 'Блок 1. Учредители и управление',
    },
    essence: {
      uk: 'Acest bloc arată cum este structurat managementul companiei dumneavoastră: câte persoane iau decizii, dacă există acorduri între ele și în ce măsură sunt înregistrate aceste acorduri.',
      en: 'Этот блок показывает, как у Вас устроено управление компанией: сколько человек принимают решения, есть ли между ними договорённости и насколько эти договорённости зафиксированы.',
    },
    risk: {
      uk: [
        'Când o companie are un singur fondator, totul funcționează simplu și rapid – deciziile se iau fără aprobare, dar, în același timp, toate riscurile sunt concentrate asupra unei singure persoane.',
        'Când există doi sau mai mulți fondatori, situația se schimbă. Afacerea începe să depindă nu doar de piață sau de clienți, ci și de relațiile dintre parteneri. Dacă regulile nu sunt bătute în cuie, atunci la prima neînțelegere serioasă, fiecare începe să înțeleagă „calea corectă" diferit. În acest moment, deciziile pot fi amânate, blocate sau deloc luate.',
        'În practică, acest lucru duce la conflicte, pierderea controlului asupra companiei, oprirea anumitor procese și uneori chiar la paralizarea efectivă a afacerii. Această problemă devine deosebit de acută în situațiile care implică bani, ieșirea unui asociat sau decizii strategice.',
        'Un risc separat apare atunci când deciziile fondatorilor nu sunt înregistrate în scris. În acest caz, este imposibil de verificat cine ce a aprobat, ceea ce face compania vulnerabilă atât la dispute interne, cât și externe.',
      ],
      en: [
        'Когда в компании один учредитель, всё работает просто и быстро – решения принимаются без согласований, но при этом все риски концентрируются на одном человеке.',
        'Когда учредителей двое или больше, ситуация меняется. Бизнес начинает зависеть не только от рынка или клиентов, а от отношений между партнёрами. Если правила не зафиксированы, то при первом серьёзном разногласии каждый начинает по-своему понимать, «как правильно». В этот момент решения могут затягиваться, блокироваться или вовсе не приниматься.',
        'На практике это приводит к конфликтам, потере контроля над компанией, остановке отдельных процессов, а иногда и к фактическому параличу бизнеса. Особенно остро это проявляется в ситуациях, связанных с деньгами, выходом одного из участников или стратегическими решениями.',
        'Отдельный риск возникает, если решения учредителей не фиксируются письменно. В этом случае невозможно подтвердить, кто и что согласовал, и компания становится уязвимой как внутри, так и во внешних спорах.',
      ],
    },
    action: {
      uk: [
        'Dacă aveți mai mulți fondatori, este important să stabiliți regulile de bază în scris: cine ia deciziile, cum este distribuit profitul, ce se întâmplă în caz de conflict și cum poate un participant să părăsească afacerea.',
        'Experiența arată că nu este necesară elaborarea imediată a unor documente complexe și costisitoare. Chiar și acorduri scurte și clare, consemnate în scris și revizuite cel puțin anual, cresc semnificativ reziliența afacerilor. Însuși procesul de revizuire periodică ajută la reamintirea reciprocă a acestor reguli, la alinierea așteptărilor și la reducerea riscului de conflict.',
      ],
      en: [
        'Если у Вас несколько учредителей, важно письменно зафиксировать базовые правила: кто принимает решения, как распределяется прибыль, что происходит при конфликте и как участник может выйти из бизнеса.',
        'При этом практика показывает, что не обязательно сразу делать сложные и дорогие документы. Даже короткие, понятные договорённости, зафиксированные на бумаге и пересматриваемые хотя бы раз в год, уже существенно повышают устойчивость бизнеса. Сам факт того, что Вы периодически возвращаетесь к этим правилам, помогает напомнить друг другу об этих правилах, синхронизировать ожидания и снизить риск конфликтов.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Legea nr. 135/2007 privind societățile cu răspundere limitată',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152601&lang=ro',
      },
      en: {
        label: 'Закон №135/2007 об обществах с ограниченной ответственностью',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152601&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 2 — Date personale și IT
  ────────────────────────────────────────────────────── */
  {
    order: 2,
    title: {
      uk: 'Blocul 2. Date cu caracter personal și IT',
      en: 'Блок 2. Персональные данные и IT',
    },
    essence: {
      uk: 'Acest bloc arată în ce măsură dețineți controlul asupra datelor cu care lucrează compania. Este vorba despre toate tipurile de date: supraveghere video, sisteme CRM, servicii cloud, baze de date de clienți, informații despre angajați – orice instrumente care conțin informații despre persoane. În esență, aceasta nu este o problemă de securitate IT și nici măcar una legată de faptul că înțelegeți sau nu ce date dețineți și ce se întâmplă cu ele, ci despre modul în care autoritățile statului interpretează acțiunile dumneavoastră în raport cu aceste date.',
      en: 'Этот блок показывает, насколько Вы контролируете данные, с которыми работает компания. Речь про всё: видеонаблюдение, CRM-системы, облачные сервисы, базы клиентов, информация о сотрудниках – любые инструменты, где есть информация о людях. По сути, это вопрос не про IT-безопасность, и даже не про то, понимаете ли Вы, какие данные у Вас есть и что с ними происходит, а про то, как государственные органы интерпретируют Ваши действия с этими данными.',
    },
    risk: {
      uk: [
        'Principalul risc aici este că firmele folosesc aproape întotdeauna astfel de instrumente, dar nu formalizează acest lucru din punct de vedere legal și nici măcar nu înțeleg pe deplin cum sunt prelucrate datele.',
        'De exemplu, supravegherea video este deja un proces de prelucrare a datelor cu caracter personal. Un sistem CRM implică stocarea și adesea transferul de date către terți. Serviciile cloud pot stoca informații în afara țării sau a UE, fără ca firma să știe măcar despre acest lucru. Practic, orice companie care are cel puțin un angajat efectuează, din punct de vedere legal, o prelucrare de date cu caracter personal.',
        'Prin urmare, compania încalcă formal legea, chiar dacă nu face nimic „greșit". Acest lucru poate duce la amenzi, inspecții, reclamații din partea clienților sau angajaților și, la fel de important, la pierderea încrederii.',
        'O problemă separată apare atunci când nu există documente în cadrul companiei care să înregistreze clar ce date colectați, unde se află acestea și cine este responsabil pentru ele. Simpla absență a unor astfel de documente ridică suspiciunile autorităților și face ca situația companiei să fie imprevizibilă din punct de vedere juridic. În această situație, devine extrem de dificil să dovedești că respecți cu adevărat legea.',
      ],
      en: [
        'Основной риск здесь в том, что бизнес почти всегда использует такие инструменты, но не оформляет это юридически и даже не до конца понимает, как именно устроена работа с данными.',
        'Например, видеонаблюдение – это уже обработка персональных данных. CRM-система – это хранение и часто передача данных третьим лицам. Облачные сервисы могут хранить информацию за пределами страны или ЕС, и компания об этом даже не знает. Фактически, любая компания, в которой есть хотя бы один сотрудник, с точки зрения закона осуществляет обработку персональных данных.',
        'В результате компания формально нарушает закон, даже если ничего «плохого» не делает. Это может привести к штрафам, проверкам, жалобам со стороны клиентов или сотрудников и, что не менее важно, к потере доверия.',
        'Отдельная проблема возникает, когда внутри компании отсутствуют документы, которые чётко фиксируют, какие данные Вы собираете, где они находятся и кто за них отвечает. Само отсутствие таких документов уже вызывает у государства подозрения и делает ситуацию для компании юридически непредсказуемой. В этой ситуации становится крайне сложно доказать, что Вы действительно соблюдаете требования закона.',
      ],
    },
    action: {
      uk: [
        'Important aici să nu complicăm lucrurile, ci să stabilim o ordine de bază.',
        'Trebuie să înțelegeți clar ce date personale colectați, unde sunt stocate și cine are acces la ele.',
        'Este deosebit de important să se verifice utilizarea supravegherii video: pe ce bază se realizează aceasta, dacă sunt amplasate pictograme care indică faptul că se utilizează supravegherea video și dacă sunt îndeplinite cerințele legale pentru stocarea și prelucrarea acestor date.',
        'Dacă lucrați cu CRM sau servicii cloud, este important să înțelegeți unde sunt amplasate fizic serverele și cine procesează exact datele. Dacă serverele sunt în UE, aveți noroc; dacă sunt în orice altă țară, acesta este un risc.',
        'Apoi, formalizați acest lucru într-o politică simplă, scrisă. Nu este nevoie de un document complex — o descriere clară, pe care o puteți explica singuri, va fi suficientă.',
        'Dacă în companie sunt procese mai sensibile (de exemplu, supraveghere video, prelucrarea datelor de contact sau biometrice), este esențial să se efectueze o evaluare a riscurilor, să se documenteze și să se pregătească un set complet de documente necesare. Acest lucru va permite remedierea timpurie a vulnerabilităților și evitarea consecințelor negative. În caz contrar, se vor aplica amenzi în conformitate cu Legea nr. 195 din 25 iulie 2024 – de până la 2.000.000 de lei sau de până la 2% din cifra de afaceri totală, oricare dintre acestea este mai mare.',
      ],
      en: [
        'Здесь важно не усложнять, а навести базовый порядок.',
        'Нужно для себя чётко понимать, какие персональные данные Вы собираете, где они хранятся и кто имеет к ним доступ.',
        'Отдельно важно проверить использование видеонаблюдения: на каком основании оно осуществляется, размещены ли таблички о том, что ведётся видеонаблюдение, и соблюдаются ли требования закона к хранению и обработке таких данных.',
        'Если Вы работаете с CRM или облачными сервисами, важно понимать, где физически расположены серверы и кто именно обрабатывает данные. Если серверы находятся в ЕС – Вам повезло, если в любой другой стране – это уже зона риска.',
        'Дальше – зафиксировать это в простой письменной политике. Не нужно делать сложный документ – достаточно понятного описания, которое Вы сами сможете объяснить.',
        'Если в компании есть более чувствительные процессы (например, видеонаблюдение, обработка контактных или биометрических данных), крайне важно провести оценку рисков, оформить её документально и подготовить полный комплект необходимых документов. Это позволит заранее закрыть уязвимости и избежать негативных последствий. В противном случае применяются штрафы согласно Закону № 195 от 25.07.2024 – до 2 000 000 леев или до 2% от общего оборота, применяется наибольшее значение.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Legea nr. 195/2024 privind protecția datelor cu caracter personal',
        url: 'https://www.legis.md/cautare/getResults?doc_id=144681&lang=ro',
      },
      en: {
        label: 'Закон №195/2024 о защите персональных данных',
        url: 'https://www.legis.md/cautare/getResults?doc_id=144681&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 3 — Fiabilitatea contractelor
  ────────────────────────────────────────────────────── */
  {
    order: 3,
    title: {
      uk: 'Blocul 3. Fiabilitatea contractelor',
      en: 'Блок 3. Надёжность договоров',
    },
    essence: {
      uk: 'Această secțiune demonstrează în ce măsură contractele companiei dumneavoastră protejează de fapt afacerea și nu creează, pur și simplu o senzație de siguranță. Este important nu doar să aveți un contract ca document, ci și să înțelegeți cum a fost creat, dacă ia în considerare specificul afacerii dumneavoastră, dacă a fost actualizat pe măsură ce afacerea se schimbă și dacă conține mecanisme clare de protecție.',
      en: 'Этот блок показывает, насколько договоры в Вашей компании реально защищают Ваш бизнес, а не просто создают ощущение безопасности. Важно не только наличие договора как документа, но и то, как он появился, учитывает ли он специфику Вашей деятельности, обновлялся ли он вместе с изменением бизнеса и содержит ли понятные механизмы защиты.',
    },
    risk: {
      uk: [
        'Dacă contractele sunt întocmite din șabloane aleatorii, copiate de la prieteni, descărcate de pe internet sau nu sunt folosite deloc, compania funcționează practic fără un sprijin juridic adecvat. Atât timp cât lucrurile sunt calme, această lipsă poate să nu fie percepută ca o problemă. Însă perioadele de liniște în afaceri creează adesea un fals sentiment de securitate.',
        'Acest lucru este evident în Moldova: trecem prin crize atât de des încât contractele pot fi considerate nu doar documente, ci instrumente de supraviețuire. Fiecare nouă perioadă stresantă dezvăluie rapid ce a oficializat de fapt o companie și ce s-a bazat pe încredere, acord verbal sau „vom rezolva mai târziu".',
        'Tocmai atunci când plățile sunt întârziate, obligațiile sunt refuzate, termenii sunt renegociați sau apar dispute privind calitatea, devine clară măsura în care un contract funcționează efectiv. Adesea devine clar că documentul fie nu protejează compania, fie nu oferă instrumentele necesare pentru presiune, negocieri și colectare a datoriilor.',
        'Este deosebit de important de luat în considerare faptul că acordul ar putea pur și simplu să nu fie valabil deoarece este învechit și nu ia în considerare normele juridice actuale, care se schimbă destul de frecvent în Moldova.',
        'O problemă deosebită în zilele noastre este că mulți oameni încep să redacteze contracte folosind ChatGPT. Este convenabil, rapid și uneori cu adevărat util ca schiță. Există însă un risc fundamental: ChatGPT nu numai că poate face greșeli, dar poate și inventa cu încredere lucruri care nici măcar nu există — construcții inexistente, referințe inexacte, logică juridică străină din alte jurisdicții, formulări slabe sau goale din punct de vedere juridic. Scrie convingător și tocmai de aceea riscul este deosebit de periculos: o persoană s-ar putea să nu observe unde textul a început deja să o inducă în eroare.',
        'Prin urmare, dacă folosiți contracte șablon sau încredințați pregătirea lor inteligenței artificiale fără o revizuire profesională, trebuie să vă întrebați sincer: sunteți dispus să vă încredințați riscurile afacerii unui instrument care poate halucina și inventa reglementări care nu există? Dacă da, trebuie să înțelegeți și că veți fi trași la răspundere pentru consecințe.',
        'Un risc suplimentar apare atunci când contractele au fost cândva elaborate, dar apoi nu au fost revizuite timp de ani de zile. Afacerile se schimbă, procesele devin mai complexe, legislația este actualizată, dar contractul rămâne învechit. Drept urmare, documentul nu mai reflectă modul în care compania operează în prezent.',
        'Dacă un contract nu conține reguli clare privind răspunderea, penalitățile, termenele limită, procedurile de acceptare, rezilierea și soluționarea litigiilor, devine mult mai dificil pentru companie să își protejeze fondurile, termenele limită și interesele într-o situație de conflict. În practică, acest lucru duce la pierderi, litigii prelungite, o poziție de negociere slabă și incapacitatea de a colecta rapid datoriile.',
      ],
      en: [
        'Если договоры собираются из случайных шаблонов, копируются у знакомых, скачиваются из интернета или вообще не используются, компания фактически работает без нормальной юридической опоры. Пока всё спокойно, это может долго не ощущаться как проблема. Но спокойный период в бизнесе часто создаёт ложное чувство безопасности.',
        'В молдавских реалиях это особенно заметно: у нас кризисы приходят так регулярно, что договоры можно считать не просто документами, а инструментом выживания. Каждый новый стрессовый период быстро показывает, что именно у компании оформлено по-настоящему, а что держалось «на доверии», «на словах» или «как-нибудь потом разберёмся».',
        'Именно в момент задержек оплат, отказов от обязательств, попыток пересмотра условий или споров по качеству становится понятно, насколько договор реально работает. Очень часто выясняется, что документ либо не защищает компанию, либо не даёт необходимых инструментов для давления, переговоров и взыскания задолженности.',
        'Особенно стоит учитывать, что договор может просто не работать, потому что устарел и не учитывает актуальные нормы права, которые в Молдове меняются достаточно часто.',
        'Отдельная проблема сегодня связана с тем, что многие начинают составлять договоры через ChatGPT. Это удобно, быстро и иногда действительно полезно как черновик. Но есть принципиальный риск: ChatGPT может не просто ошибаться, а уверенно придумывать то, чего вообще не существует – несуществующие конструкции, неточные ссылки, чужую логику из других стран, слабые или юридически пустые формулировки. Он пишет убедительно, и именно поэтому риск особенно опасен: человек может не заметить, где текст уже начал вводить его в заблуждение.',
        'Поэтому, если Вы берёте договоры из шаблонов или доверяете их подготовку искусственному интеллекту без профессиональной проверки, нужно честно ответить себе на вопрос: готовы ли Вы доверить риски своего бизнеса инструменту, который может галлюцинировать и придумывать нормы, которых в природе нет. Если да – значит, нужно так же честно понимать, что ответственность за последствия останется на Вас.',
        'Дополнительный риск возникает тогда, когда договоры когда-то были подготовлены, но потом годами не пересматривались. Бизнес меняется, процессы усложняются, законодательство обновляется, а договор остаётся старым. В результате документ перестаёт соответствовать тому, как компания реально работает сегодня.',
        'Если в договоре нет чётких правил об ответственности, штрафах, сроках, порядке приёмки, расторжения и разрешения споров, то в конфликтной ситуации компании становится намного сложнее защищать свои деньги, сроки и интересы. На практике это приводит к потерям, затяжным спорам, слабой позиции в переговорах и невозможности быстро взыскать задолженность.',
      ],
    },
    action: {
      uk: [
        'Este important să tratați contractele nu ca pe o formalitate, ci ca pe un instrument de protejare a afacerii dumneavoastră.',
        'Este mai bine ca, contractele să fie adaptate la modelul dvs. operațional real, decât să fie preluate din șabloane sau asamblate prin ChatGPT fără verificare. Astfel de texte pot părea convingătoare, dar pot conține erori sau construcții fictive pentru care sunteți în cele din urmă responsabil.',
        'Contractele trebuie revizuite periodic. Este suficient să vă întrebați cel puțin o dată pe an: reflectă acest document modul în care lucrăm de fapt astăzi?',
        'Un test simplu: dați contractul unei persoane din afară. Dacă îl interpretează diferit față de cum ați intenționat, înseamnă că există puncte slabe.',
        'Și verificați obligatoriu dacă contractul include mecanisme specifice de protecție: răspundere, penalități, procedura de plată, primire-predare, reziliere și soluționare a litigiilor. Dacă acestea nu sunt incluse, contractul nu vă protejează.',
        'Și vă rog, nu vă amăgiți. Dacă nu înțelegeţi ceva, probabil acest lucru va fi folosit împotriva dumneavoastră. Orice rămâne neclar este, în esență, un risc ascuns.',
      ],
      en: [
        'К договорам важно относиться не как к формальности, а как к инструменту защиты бизнеса.',
        'Лучше, когда договоры сделаны под Вашу реальную модель работы, а не взяты из шаблонов или собраны через ChatGPT без проверки. Такие тексты могут выглядеть убедительно, но содержать ошибки или вымышленные конструкции, за которые в итоге отвечаете Вы.',
        'Договоры нужно периодически пересматривать. Достаточно хотя бы раз в год задавать себе вопрос: этот документ соответствует тому, как мы реально работаем сегодня?',
        'Простой тест – дайте договор человеку «со стороны». Если он понимает его по-другому, чем Вы задумывали, значит, есть слабые места.',
        'И обязательно проверьте, есть ли в договоре конкретные механизмы защиты: ответственность, штрафы, порядок оплаты, приёмки, расторжения и рассмотрения споров. Если этого нет – договор Вас не защищает.',
        'И, пожалуйста, не стоит себя обманывать. Если Вы что-то не понимаете, то, скорее всего, это будет использовано против Вас. Всё, что остаётся непонятным, по сути является скрытым риском.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Codul Civil al Republicii Moldova',
        url: 'https://www.legis.md/cautare/getResults?doc_id=150498&lang=ro',
      },
      en: {
        label: 'Гражданский кодекс Республики Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=150498&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 4 — Riscuri financiare și fiscale
  ────────────────────────────────────────────────────── */
  {
    order: 4,
    title: {
      uk: 'Blocul 4. Riscuri financiare și fiscale',
      en: 'Блок 4. Финансы и налоговые риски',
    },
    essence: {
      uk: 'Această secțiune demonstrează cât de atent gestionează compania banii, impozitele și disciplina financiară. Aici se examinează dacă fondurile afacerii sunt separate de cheltuielile personale ale proprietarilor, cât de consecvent își îndeplinește compania obligațiile fiscale, cum gestionează numerarul și dacă își înțelege adevărata povară fiscală.',
      en: 'Этот блок показывает, насколько аккуратно в компании выстроены отношения с деньгами, налогами и финансовой дисциплиной. Здесь проверяется, отделены ли деньги бизнеса от личных расходов собственников, насколько стабильно компания исполняет налоговые обязательства, как работает с наличными и понимает ли вообще свою реальную налоговую нагрузку.',
    },
    risk: {
      uk: [
        'Atunci când fondurile companiei sunt utilizate pentru cheltuielile personale ale fondatorilor sau directorilor, granița dintre fondurile de afaceri și cele personale devine neclară.',
        'În acest moment, cel mai des întâlnit gând este: „Nu e mare lucru, oricum sunt banii mei". Logica este clară, dar din punct de vedere juridic, nu este adevărată. O companie este o entitate separată, iar banii ei nu sunt banii personali ai proprietarului.',
        'Și tocmai cu aceste acțiuni aparent inofensive încep adesea problemele reale: întrebări din partea băncii, evaluări fiscale suplimentare, amenzi și riscul ca, într-o situație dificilă, responsabilitatea să vă revină personal.',
        'Restanțele fiscale, chiar dacă nu sunt sistemice, indică slăbiciuni în disciplina financiară a unei companii. Iar dacă astfel de restanțe se repetă, este un semn că afacerea este supusă unei presiuni constante și s-ar putea confrunta cu sancțiuni, penalități, blocaje și control guvernamental suplimentar în orice moment.',
        'Un semnal de risc separat este operarea regulată cu numerarul. În realitatea noastră, acesta este aproape întotdeauna un domeniu sensibil, deoarece numerarul este cel mai probabil să ridice semne de întrebare din partea băncilor, a serviciului fiscal și a Serviciului Prevenirea și Combaterea Spălării Banilor. Dacă o companie retrage în mod regulat numerar, dar nu analizează de ce și cât, acest lucru creează impresia unui model financiar netransparent.',
        'O problemă suplimentară apare atunci când o afacere nu analizează ponderea din cifra sa de afaceri consumată de impozite. În acest caz, compania nu își gestionează povara fiscală, ci pur și simplu „plătește cât poate". Acest lucru orbește modelul financiar: proprietarul poate vedea veniturile, dar nu înțelege cât pierde de fapt afacerea din cauza impozitelor, erorilor și a unei structuri ineficiente.',
        'În cele din urmă, toate acestea pot duce la amenzi, penalități, deficit de numerar, blocări de tranzacții, reclamații din partea băncii și a autorităților fiscale, precum și la o pierdere generală a controlului financiar.',
      ],
      en: [
        'Когда деньги компании используются на личные расходы учредителей или директора, граница между бизнесом и личными средствами размывается.',
        'В этот момент чаще всего звучит простая мысль: «ничего страшного, это ведь и так мои деньги». Логика понятная, но с точки зрения закона это не так. Компания – это отдельная структура, и её деньги – это не личные деньги собственника.',
        'И именно с таких, на первый взгляд, безобидных действий чаще всего начинаются реальные проблемы: вопросы от банка, доначисления налогов, штрафы и риск того, что в сложной ситуации ответственность уже перейдёт на Вас лично.',
        'Просрочки по налогам, даже если они были не системными, показывают, что в компании есть слабые места в финансовой дисциплине. А если такие просрочки повторяются, это уже признак того, что бизнес живёт в режиме постоянного напряжения и может в любой момент столкнуться с санкциями, пенями, блокировками и дополнительным вниманием со стороны государства.',
        'Отдельный сигнал риска – регулярная работа с наличными. В наших реалиях это почти всегда чувствительная зона, потому что именно наличные чаще всего вызывают вопросы у банка, налоговой службы и Центра по борьбе с отмыванием денег. Если компания регулярно снимает деньги, но не анализирует, зачем и в каком объёме это происходит, это выглядит как непрозрачная финансовая модель.',
        'Дополнительная проблема возникает тогда, когда бизнес вообще не анализирует, какую долю оборота съедают налоги. В этом случае компания не управляет налоговой нагрузкой, а просто «платит как получается». Это делает финансовую модель слепой: собственник может видеть выручку, но не понимать, сколько бизнес реально теряет на налогах, ошибках и неэффективной структуре.',
        'В итоге всё это может привести к штрафам, пеням, кассовым разрывам, блокировкам операций, претензиям со стороны банка и налоговых органов, а также к общей потере управляемости финансами.',
      ],
    },
    action: {
      uk: [
        'Aici, este crucial să se separe în mod sincer fondurile companiei de cheltuielile personale. Dacă proprietarul sau directorul folosește fondurile companiei în scopuri personale, astfel de tranzacții trebuie fie oprite, fie documentate corespunzător; în acest caz, birocrația devine scutul dumneavoastră de încredere împotriva pretențiilor din partea organelor de stat.',
        'În continuare, merită să se analizeze conformitatea fiscală din ultimii ani și să se stabilească dacă întârzierile la plăți au fost o întâmplare sau un tipar. Gestionarea numerarului ar trebui examinată separat: cât de des se retrage numerar, de ce și dacă astfel de tranzacții pot fi reduse.',
        'În același timp, este esențial ca afacerile să înțeleagă trei lucruri de bază. În primul rând, cât câștigă compania de fapt – profitul net, adică banii care rămân după toate cheltuielile și impozitele. În al doilea rând, care este cifra sa de afaceri și cum se comportă dinamic. Și în al treilea rând, ce cotă din această cifră de afaceri plătește compania sub formă de impozite.',
        'Anume al treilea indicator mulți îl ignoră, însă pe nedrept. Acesta adesea conține o „bombă cu ceas": erorile, plățile insuficiente sau o structură fiscală ineficientă pot să nu iasă la suprafață pentru o lungă perioadă de timp, dar în timpul unui audit fiscal, acestea pot avea un impact puternic și semnificativ asupra afacerii.',
      ],
      en: [
        'Здесь прежде всего важно честно отделить деньги компании от личных расходов. Если собственник или директор использует средства бизнеса для себя, такие операции должны быть либо прекращены, либо правильно оформлены в этом случае бюрократия становится Вашим надёжным щитом от претензий со стороны государственных органов.',
        'Дальше стоит проверить налоговую дисциплину за последние годы и понять, были ли просрочки случайностью или уже системой. Отдельно нужно посмотреть на работу с наличными: как часто деньги снимаются, зачем именно и можно ли сократить такие операции.',
        'При этом для бизнеса критично понимать три базовые вещи. Во-первых, сколько компания реально зарабатывает – её чистую прибыль, то есть те деньги, которые остаются после всех расходов и налогов. Во-вторых, какой у неё оборот и как он ведёт себя в динамике. И, в-третьих, какую долю от этого оборота компания платит в виде налогов.',
        'Именно третий показатель многие игнорируют, а зря. В нём часто скрыта «мина замедленного действия»: ошибки, недоплаты или неэффективная налоговая структура могут долго не проявляться, но при проверке со стороны налоговой это может резко и существенно ударить по бизнесу.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Codul Fiscal al Republicii Moldova',
        url: 'https://www.legis.md/cautare/getResults?doc_id=138613&lang=ro',
      },
      en: {
        label: 'Налоговый кодекс Республики Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=138613&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 5 — Răspundere personală și faliment
  ────────────────────────────────────────────────────── */
  {
    order: 5,
    title: {
      uk: 'Blocul 5. Răspundere personală și faliment',
      en: 'Блок 5. Личная ответственность и банкротство',
    },
    essence: {
      uk: 'Această secțiune demonstrează cât de eficient se aplică principiul „companie separat, riscurile personale separat" afacerii dumneavoastră. Deși acest lucru este adevărat din punct de vedere tehnic, în unele situații această distincție poate deveni neclară.',
      en: 'Этот блок показывает, насколько в Вашем бизнесе реально работает принцип «компания отдельно – личные риски отдельно». Формально это так, но в ряде ситуаций эта граница может размываться.',
    },
    risk: {
      uk: [
        'Principala greșeală este să presupunem că existența unei companii protejează automat și complet bunurile personale de o posibilă confiscare. În practică, acest lucru nu este mereu așa.',
        'Există situații în care riscul se transferă asupra proprietarului sau directorului. Acestea implică cel mai adesea garanții personale, depășirea atribuțiilor sau acțiuni nereglementate în cadrul companiei.',
        'Garanțiile trebuie tratate cu o atenție deosebită. Deși sunt adesea percepute ca o formalitate în momentul semnării, ele reprezintă, în esență, o asumare voluntară a unui risc suplimentar. Dacă obligația nu este îndeplinită, pot fi formulate reclamații împotriva dumneavoastră personal, până la limitele garanției.',
        'Un risc deosebit apare atunci când contractele sau angajamentele sunt semnate fără aprobare sau în afara unei structuri decizionale clare. În condiții normale de muncă, acest lucru poate să nu reprezinte o problemă, dar într-un conflict sau o dispută, astfel de acțiuni pot fi contestate și pot duce la pierderi și pretenții.',
        'Este important să înțelegem că nu orice încălcare duce automat la răspundere personală, dar anumite acțiuni pot crește semnificativ acest risc și pot „depăși" apărarea companiei.',
      ],
      en: [
        'Основная ошибка – считать, что наличие компании автоматически полностью защищает личные активы от возможного взыскания. На практике это не всегда так.',
        'Есть ситуации, в которых риск переходит на уровень собственника или директора. Чаще всего это связано с личными поручительствами, превышением полномочий или действиями без должного оформления внутри компании.',
        'Особенно внимательно нужно относиться к поручительствам. В момент подписания они часто воспринимаются как формальность, но, по сути, это добровольное принятие на себя дополнительного риска. Если обязательство не исполняется, требования могут быть предъявлены уже к Вам лично – в пределах такого поручительства.',
        'Отдельная зона риска – когда договоры или обязательства подписываются без согласования или вне понятной структуры принятия решений. В обычной работе это может не создавать проблем, но в конфликте или споре такие действия могут быть оспорены и привести к убыткам и претензиям.',
        'Важно понимать: не каждое нарушение автоматически ведёт к личной ответственности, но определённые действия могут существенно повысить этот риск и «пробить» защиту компании.',
      ],
    },
    action: {
      uk: [
        'Cheia aici este conștientizarea și disciplina de bază.',
        'Este important să înțelegeți clar dacă ați semnat garanții personale și amploarea riscurilor pe care vi le-ați asumat deja. De acum înainte, astfel de decizii ar trebui luate în mod conștient, înțelegând și gestionând consecințele.',
        'Este important să se construiască un sistem simplu, dar clar: deciziile cheie sunt înregistrate, obligațiile semnificative sunt convenite și autoritatea nu este depășită.',
        'Și cel mai important, înțelegeți unde se află limitele responsabilității personale în situația dumneavoastră. Chiar și o înțelegere de bază a acestor reguli reduce semnificativ riscul de erori.',
      ],
      en: [
        'Здесь ключевое – осознанность и базовая дисциплина.',
        'Нужно чётко понимать, подписывались ли личные поручительства и в каких объёмах Вы уже приняли на себя риски. В дальнейшем такие решения стоит принимать только осознанно, понимая и управляя последствиями.',
        'Важно выстроить простую, но понятную систему: ключевые решения фиксируются, существенные обязательства согласуются, полномочия не выходят за рамки.',
        'И самое главное – понимать, где проходят границы личной ответственности в Вашей ситуации. Даже базовое понимание этих правил уже существенно снижает риск ошибок.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Legea privind insolvența (falimentul) Republicii Moldova',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152605&lang=ro',
      },
      en: {
        label: 'Закон о несостоятельности (банкротстве) Республики Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152605&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 6 — Contrapărți și activități reale
  ────────────────────────────────────────────────────── */
  {
    order: 6,
    title: {
      uk: 'Blocul 6. Contrapărți și activități reale',
      en: 'Блок 6. Контрагенты и реальная деятельность',
    },
    essence: {
      uk: 'Acest bloc arată cât de mult este compania cu adevărat operațională, nu doar „pe hârtie". Două lucruri foarte practice intră în joc aici. În primul rând, știți cum să verificați în avans cu cine începeți să lucrați și să eliminați companiile nesigure și potențialii escroci care v-ar putea crea probleme? În al doilea rând, puteți evalua dacă contrapartea își poate îndeplini obligațiile sau este în pragul falimentului? Cu alte cuvinte, este vorba despre a înțelege ce are de fapt compania, ce deține și ce obligații îi revin. În esență, aceasta este o întrebare nu doar despre documente, ci despre gestionabilitatea și predictibilitatea afacerii.',
      en: 'Этот блок показывает, насколько компания живёт в реальности, а не только «на бумаге». Здесь проявляются две очень практичные вещи. Во-первых, умеете ли Вы заранее проверять, с кем начинаете работать, и отсекать неблагонадёжные компании и потенциальных мошенников, которые могут создать Вам проблемы. Во-вторых, способны ли Вы оценить, действительно ли контрагент может выполнить свои обязательства или находится на грани банкротства. Иначе говоря, речь о том, понимаете ли Вы, что у компании реально есть, чем она владеет и какие обязательства на ней фактически лежат. По сути, это вопрос не только про документы, а про управляемость и предсказуемость бизнеса.',
    },
    risk: {
      uk: [
        'Dacă o companie nu are un proces clar de verificare a partenerilor contractuali, colaborarea începe adesea „pe bază de încredere", „prin recomandare" sau pur și simplu pentru că o tranzacție trebuie încheiată rapid. Într-o perioadă de liniște, acest lucru poate părea normal. Dar apoi se dovedește brusc că partenerul contractual este problematic, nu își îndeplinește obligațiile, are datorii, prezintă semnele unei firme-fantomă sau pur și simplu nu a fost un partener de încredere de la bun început.',
        'Într-o astfel de situație, o afacere pierde mai mult decât bani. De asemenea, pierde timp, atenție din partea conducerii, reputație și oportunitatea de a se apăra rapid. Și, în unele cazuri, pot apărea întrebări nu doar despre contraparte, ci și despre companie în sine: de ce ați început să lucrați cu ei și cât de amănunțit i-ați verificat înainte de tranzacție.',
        'Al doilea domeniu sensibil este inventarierea. Mulți o percep ca pe o sarcină contabilă plictisitoare care poate fi amânată. Dar, în practică, acesta demonstrează dacă imaginea de sine a unei companii corespunde cu activele sale reale.',
        'Dacă nu se ține un inventar, o afacere începe treptat să trăiască într-o iluzie. Pe hârtie, poate părea că există un singur activ, un singur bilanț și un singur pasiv, dar în realitate, imaginea este complet diferită. Și acest lucru iese de obicei la iveală în cel mai nepotrivit moment: înaintea vânzării unei afaceri, în timpul unui conflict între fondatori, în timpul unui audit, al unei schimbări de contabil, al unei dispute cu o contraparte sau al unui deficit de flux de numerar.',
        'Drept urmare, compania se poate confrunta cu pierderi, haos intern, dispute privind activele și datoriile, probleme de raportare și o poziție slabă în timpul auditurilor sau negocierilor.',
      ],
      en: [
        'Если в компании нет понятного порядка проверки контрагентов, сотрудничество часто начинается «на доверии», «по рекомендации» или просто потому, что нужно быстро закрыть сделку. В спокойный период это может казаться нормальным. Но потом внезапно выясняется, что контрагент проблемный, не исполняет обязательства, имеет долги, признаки фиктивности или просто изначально не был надёжным партнёром.',
        'В такой ситуации бизнес теряет не только деньги. Он теряет время, управленческое внимание, репутацию и возможность быстро защитить себя. А в некоторых случаях вопросы могут появиться уже не только к контрагенту, но и к самой компании: почему Вы вообще начали с ним работать и насколько добросовестно проверяли его до сделки.',
        'Вторая чувствительная зона – инвентаризация. Многие воспринимают её как скучную бухгалтерскую обязанность, которую можно отложить. Но на практике именно она показывает, совпадает ли то, что компания думает о себе, с тем, что у неё есть на самом деле.',
        'Если инвентаризация не проводится, бизнес постепенно начинает жить в иллюзии. На бумаге может быть одно имущество, одни остатки, одни обязательства, а в реальности – совсем другая картина. И обычно это выясняется в самый неподходящий момент: перед продажей бизнеса, в конфликте между учредителями, при проверке, смене бухгалтера, споре с контрагентом или кассовом разрыве.',
        'В результате компания может столкнуться с потерями, внутренним хаосом, спорами по активам и долгам, проблемами с отчётностью и слабой позицией при проверках или переговорах.',
      ],
    },
    action: {
      uk: [
        'Nu este nevoie să inventăm un sistem complex aici. O disciplină de bază este suficientă.',
        'Înainte de a începe lucrul cu o nouă contraparte, merită să efectuați cel puțin o verificare de bază: să înțelegeți cine este, dacă acționează în mod fiabil și dacă are probleme evidente.',
        'Este important să priviți inventarizarea nu ca pe o formalitate, ci ca pe o modalitate de a verifica periodic datele cu realitatea. Chiar dacă nu aveți resursele necesare pentru a efectua proceduri complexe, este suficient să vă revizuiți activele și pasivele cheie cel puțin o dată pe an.',
        'Per total, sarcina este simplă – să vezi cu cine lucrezi și ce ai.',
      ],
      en: [
        'Здесь не нужно изобретать сложную систему. Достаточно ввести базовую дисциплину.',
        'Перед началом работы с новым контрагентом стоит проводить хотя бы базовую проверку: понять, кто это, действует ли он реально и нет ли у него очевидных проблем.',
        'Инвентаризацию важно воспринимать не как формальность, а как способ периодически сверять данные с реальностью. Даже если нет ресурса делать сложные процедуры, достаточно хотя бы раз в год проверять основные активы и обязательства.',
        'В целом задача простая – видеть, с кем Вы работаете и что у Вас есть.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Legea privind contabilitatea și raportarea financiară a Republicii Moldova',
        url: 'https://www.legis.md/cautare/getResults?doc_id=140124&lang=ro',
      },
      en: {
        label: 'Закон о бухгалтерском учёте и финансовой отчётности Республики Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=140124&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 7 — Relații de muncă
  ────────────────────────────────────────────────────── */
  {
    order: 7,
    title: {
      uk: 'Blocul 7. Relații de muncă',
      en: 'Блок 7. Трудовые отношения',
    },
    essence: {
      uk: 'Această secțiune prezintă modul în care compania își protejează proactiv baza de clienți, informațiile interne și relațiile de muncă cheie.',
      en: 'Этот блок про то, насколько компания заранее защищает свою клиентскую базу, внутреннюю информацию и ключевые рабочие связи.',
    },
    risk: {
      uk: [
        'Una dintre cele mai neplăcute situații pentru un proprietar este atunci când un angajat pleacă nu singur, ci cu clienții, corespondența, contacte și o înțelegere a modului în care totul este organizat intern. Foarte des, acest lucru se întâmplă nu din cauza „intenției răuvoitoare", ci pur și simplu pentru că firma nu a reușit să stabilească limite în avans.',
        'Dacă nu se semnează un acord de confidențialitate și un acord de transfer de informații cu un angajat, devine dificil să se explice și să se dovedească ce anume a fost confidențial și ce anume a fost secret comercial. Iar dacă problema utilizării bazei de clienți după plecare nu este rezolvată cu angajații cheie, afacerea se poate confrunta cu o situație foarte neplăcută: ieri, cineva lucra pentru tine, iar mâine, scrie acelorași clienți în nume propriu sau în numele unui concurent.',
        'Pentru un antreprenor, acest lucru este aproape întotdeauna la fel de dureros: o bază de clienți aparent construită pe cheltuiala companiei, dar atunci când un angajat pleacă, aceasta devine bunul personal al angajatului. Atunci afacerea pierde nu doar venituri, ci și controlul.',
      ],
      en: [
        'Одна из самых неприятных ситуаций для собственника – когда сотрудник уходит не один, а вместе с клиентами, перепиской, контактами и пониманием, как у Вас всё устроено внутри. Очень часто это происходит не из-за «злого умысла», а просто потому, что компания заранее не выстроила границы.',
        'Если с сотрудником не подписано соглашение о конфиденциальности и акт передачи информации, потом становится трудно объяснить и доказать, что именно было конфиденциальной информацией и коммерческой тайно. А если с ключевыми людьми не урегулирован вопрос использования клиентской базы после ухода, бизнес может столкнуться с очень неприятной картиной: вчера человек работал у Вас, а завтра уже пишет тем же клиентам от своего имени или от имени конкурента.',
        'Для предпринимателя это почти всегда выглядит одинаково болезненно: клиентская база вроде бы создавалась за счёт компании, а в момент ухода превращается в личный актив сотрудника. И тогда бизнес теряет не только выручку, но и контроль.',
      ],
    },
    action: {
      uk: [
        'Cel mai bine este să păstrezi lucrurile simple și să acoperi elementele de bază de la început. Ar trebui semnate acorduri clare de confidențialitate cu angajații care au acces la clienți, prețuri, corespondență, dosare și informații interne. Iar cu angajații cheie, merită să conveniți separat asupra a ceea ce se întâmplă cu baza de clienți și informațiile comerciale după plecarea lor.',
        'Cu cât se face acest lucru mai repede, cu calm și normalitate, cu atât este mai puțin probabil să trebuiască să vă puneți din urmă cu clienții care au plecat deja și să vă dați seama cine „ce a însemnat" pentru cine.',
      ],
      en: [
        'Здесь лучше не усложнять, а заранее закрыть базовые вещи. С сотрудниками, у которых есть доступ к клиентам, ценам, переписке, файлам и внутренней информации, должны быть подписаны понятные соглашения о конфиденциальности. А с ключевыми людьми стоит отдельно урегулировать, что происходит с клиентской базой и коммерческой информацией после их ухода.',
        'Чем раньше это оформлено спокойно и нормально, тем меньше вероятность, что потом придётся догонять уже ушедших клиентов и разбираться, кто кому что «имел в виду».',
      ],
    },
    regulatory: {
      uk: {
        label: 'Codul Muncii al Republicii Moldova',
        url: 'https://www.legis.md/cautare/getResults?doc_id=151096&lang=ro',
      },
      en: {
        label: 'Трудовой кодекс Республики Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=151096&lang=ru',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 8 — Riscuri de piață
  ────────────────────────────────────────────────────── */
  {
    order: 8,
    title: {
      uk: 'Blocul 8. Riscuri de piață',
      en: 'Блок 8. Рыночные риски',
    },
    essence: {
      uk: 'Această secțiune discută modul în care o companie operează pe piață și dacă aceasta înțelege regulile jocului dintr-o perspectivă concurențială.',
      en: 'Этот блок про то, как компания ведёт себя на рынке и понимает ли правила игры с точки зрения конкуренции.',
    },
    risk: {
      uk: [
        'Există lucruri care sunt adesea considerate „normale" în lumea afacerilor — discuțiile despre prețuri cu colegii de pe piață, schimbul de planuri, ajungerea la acorduri „pentru ca toată lumea să se simtă confortabil". În realitate, astfel de acțiuni pot fi percepute ca o încălcare a regulilor de concurență.',
        'Problema aici este că nu pare nimic periculos. Oamenii comunică, se întâlnesc, se alătură asociațiilor și discută în chat-uri. Dar, la un moment dat, astfel de conversații ar putea deveni motive pentru pretenții serioase din partea autorităților de reglementare.',
        'În astfel de cazuri, companiile se pot confrunta cu amenzi, inspecții și restricții, iar acest lucru reprezintă un nivel de risc complet diferit — nu operațional, ci sistemic.',
        'Al doilea domeniu sensibil îl reprezintă tranzacțiile comerciale: achiziționarea unei companii, a unei participații sau o fuziune. Mulți le percep ca pe o tranzacție comercială standard, dar legea stabilește praguri clare dincolo de care se declanșează supravegherea obligatorie din partea Consiliului Concurenței.',
        'Dacă cifra de afaceri totală a părților la o tranzacție depășește 50.000.000 lei, iar cel puțin două părți au o cifră de afaceri în Republica Moldova de peste 20.000.000 lei fiecare, o astfel de tranzacție este supusă notificării obligatorii înainte de efectuarea ei.',
        'În acest caz, tranzacția în sine este apreciată nu doar prin prisma transferului afacerii, ci din momentul semnării unui acord, al anunțării unei oferte publice sau al dobândirii controlului.',
        'Dacă această cerință este ignorată, chiar și o tranzacție complet transparentă și solidă din punct de vedere economic poate crea probleme serioase: amenzi, intervenții de reglementare, necesitatea renegocierii termenilor sau revenirea la starea inițială. Aici se pune problema nu legată de „conținutul tranzacției", ci mai degrabă de faptul că aceasta a fost executată fără o procedură adecvată.',
      ],
      en: [
        'Есть вещи, которые в бизнес-среде часто считаются «нормальными» – обсудить цены с коллегами по рынку, обменяться планами, договориться «чтобы всем было комфортно». В реальности такие действия могут восприниматься как нарушение правил конкуренции.',
        'И проблема здесь в том, что это не выглядит как что-то опасное. Люди общаются, встречаются, состоят в ассоциациях, переписываются в чатах. Но в определённый момент такие разговоры могут стать основанием для серьёзных претензий со стороны регулирующих органов.',
        'В таких случаях бизнес может столкнуться со штрафами, проверками и ограничениями, и это уже совсем другой уровень риска – не операционный, а системный.',
        'Вторая чувствительная зона – сделки с бизнесом: покупка компании, долей или объединение. Многие воспринимают это как обычную коммерческую сделку, но закон устанавливает чёткие пороги, после которых включается обязательный контроль со стороны Совета по конкуренции.',
        'Если совокупный оборот участников сделки превышает 50 000 000 леев, и при этом как минимум два участника имеют оборот в Республике Молдова более 20 000 000 леев каждый, такая сделка подлежит обязательному уведомлению до её реализации.',
        'При этом под самой сделкой понимается уже не только факт передачи бизнеса, а момент подписания соглашения, объявления публичной оферты или приобретения контроля.',
        'Если это требование игнорируется, даже полностью «белая» и экономически логичная сделка может создать серьёзные проблемы: штрафы, вмешательство регулятора, необходимость пересмотра условий или возврата к исходному состоянию. И это тот случай, когда вопрос возникает не к «содержанию сделки», а к тому, что она была сделана без соблюдения процедуры.',
      ],
    },
    action: {
      uk: [
        'Este important să înțelegem pur și simplu limitele aici.',
        'Cel mai bine este să nu discutați prețuri, condiții de vânzare sau planuri cu concurenții — nici măcar în contexte informale. Ceea ce pare a fi o comunicare informală poate fi interpretată diferit în anumite circumstanțe.',
        'Atunci când se ia în considerare achiziționarea unei afaceri, a unor acțiuni sau fuziunea unei companii, este recomandat să verificați în prealabil dacă tranzacția se califică pentru notificare. Aceasta nu este o verificare complicată, dar poate economisi o mulțime de bani și stres.',
        'În general, logica este simplă: pe piață este important nu doar să faci bani, ci și să respecți regulile, chiar dacă acestea nu sunt întotdeauna evidente.',
      ],
      en: [
        'Здесь важно просто понимать границы.',
        'С конкурентами лучше не обсуждать цены, условия продаж или планы – даже в неформальной обстановке. То, что выглядит как обычное общение, в определённых условиях может быть интерпретировано иначе.',
        'Если речь идёт о покупке бизнеса, долей или объединении компаний, имеет смысл заранее проверить, попадает ли сделка под требования уведомления. Это не сложная проверка, но она может сэкономить много денег и нервов.',
        'В целом логика простая: на рынке важно не только зарабатывать, но и не нарушать правила, даже если они не всегда очевидны.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Legea concurenței nr. 183/2012',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152606&lang=ro',
      },
      en: {
        label: 'Закон о конкуренции №183/2012',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152606&lang=ru',
      },
    },
  },
];

export function findBlockExplanation(order: number | undefined): BlockExplanation | null {
  if (typeof order !== 'number') return null;
  return BLOCK_EXPLANATIONS.find(b => b.order === order) ?? null;
}
