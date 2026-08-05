/**
 * Per-block explanations for the BizCheck report.
 * Keyed by block `order` (1..8). Each block has 4 sections in UK and EN.
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
      uk: 'Блок 1. Засновники та управління',
      en: 'Block 1. Founders and management',
    },
    essence: {
      uk: 'Цей блок показує, як у Вас організовано управління компанією: скільки людей ухвалюють рішення, чи є між ними домовленості й наскільки ці домовленості зафіксовані.',
      en: 'This block shows how management is organised in your company: how many people take decisions, whether there are agreements between them, and how far those agreements are documented.',
    },
    risk: {
      uk: [
        'Коли в компанії один засновник, усе працює просто і швидко – рішення ухвалюються без погоджень, але при цьому всі ризики концентруються на одній людині.',
        'Коли засновників двоє або більше, ситуація змінюється. Бізнес починає залежати не лише від ринку чи клієнтів, а й від стосунків між партнерами. Якщо правила не зафіксовані, то за першої серйозної розбіжності кожен починає по-своєму розуміти, «як правильно». У цей момент рішення можуть затягуватися, блокуватися або взагалі не ухвалюватися.',
        'На практиці це призводить до конфліктів, втрати контролю над компанією, зупинки окремих процесів, а іноді й до фактичного паралічу бізнесу. Особливо гостро це проявляється в ситуаціях, пов’язаних із грошима, виходом одного з учасників або стратегічними рішеннями.',
        'Окремий ризик виникає, якщо рішення засновників не фіксуються письмово. У такому разі неможливо підтвердити, хто і що погодив, і компанія стає вразливою як усередині, так і в зовнішніх спорах.',
      ],
      en: [
        'When a company has a single founder, everything works simply and quickly – decisions are taken without approvals, but at the same time all the risk is concentrated in one person.',
        'When there are two or more founders, the situation changes. The business starts to depend not only on the market or on clients, but also on the relationship between the partners. If the rules are not written down, then at the first serious disagreement each of them begins to interpret "the right way" differently. At that point decisions can drag on, be blocked, or not be taken at all.',
        'In practice this leads to conflicts, loss of control over the company, individual processes grinding to a halt, and sometimes even the effective paralysis of the business. It shows up especially sharply in situations involving money, the exit of one of the participants, or strategic decisions.',
        'A separate risk arises if the founders’ decisions are not recorded in writing. In that case it is impossible to confirm who agreed to what, and the company becomes vulnerable both internally and in external disputes.',
      ],
    },
    action: {
      uk: [
        'Якщо у Вас кілька засновників, важливо письмово зафіксувати базові правила: хто ухвалює рішення, як розподіляється прибуток, що відбувається при конфлікті та як учасник може вийти з бізнесу.',
        'В Україні для цього є прямий інструмент – корпоративний договір (стаття 7 Закону про ТОВ). Він укладається письмово, може бути конфіденційним і дозволяє заздалегідь домовитися про голосування, вихід, продаж часток і дії у «глухих кутах» – саме про те, на чому найчастіше «ламаються» партнерства.',
        'При цьому практика показує, що не обов’язково одразу робити складні й дорогі документи. Навіть короткі, зрозумілі домовленості, зафіксовані на папері та переглянуті хоча б раз на рік, уже суттєво підвищують стійкість бізнесу. Сам факт того, що Ви періодично повертаєтеся до цих правил, допомагає нагадати одне одному про них, синхронізувати очікування та знизити ризик конфліктів.',
      ],
      en: [
        'If you have several founders, it is important to set the basic rules down in writing: who takes decisions, how profit is distributed, what happens in the event of a conflict, and how a participant can exit the business.',
        'In Ukraine there is a direct instrument for this – the corporate (shareholders’) agreement (Article 7 of the Law on Limited Liability Companies). It is concluded in writing, may be kept confidential, and allows the partners to agree in advance on voting, exit, the sale of participatory interests, and how to act in deadlock situations – precisely the points on which partnerships most often break down.',
        'At the same time, practice shows that you do not need to produce complex and expensive documents straight away. Even short, clear arrangements put down on paper and revisited at least once a year already make the business substantially more resilient. The very fact that you return to these rules periodically helps the partners remind one another of them, align expectations, and reduce the risk of conflict.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон України «Про товариства з обмеженою та додатковою відповідальністю» № 2275-VIII',
        url: 'https://zakon.rada.gov.ua/laws/show/2275-19',
      },
      en: {
        label: 'Law of Ukraine "On Limited and Additional Liability Companies" No. 2275-VIII',
        url: 'https://zakon.rada.gov.ua/laws/show/2275-19',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 2 — Date personale și IT
  ────────────────────────────────────────────────────── */
  {
    order: 2,
    title: {
      uk: 'Блок 2. Персональні дані та IT',
      en: 'Block 2. Personal data and IT',
    },
    essence: {
      uk: 'Цей блок показує, наскільки Ви контролюєте процеси обробки даних, з якими працює компанія. Йдеться про все: відеоспостереження, CRM-системи, хмарні сервіси, бази клієнтів, інформація про працівників – будь-які інструменти, де є інформація про людей. По суті, це питання не про IT-безпеку і навіть не про те, чи розумієте Ви, які дані у Вас є і що з ними відбувається, а про те, як державні органи інтерпретують Ваші дії щодо обробки таких даних.',
      en: 'This block shows how far you control the data-processing operations your company carries out. It covers everything: video surveillance, CRM systems, cloud services, client databases, employee records – any tool that holds information about people. In essence, this is not a question of IT security, nor even of whether you understand what data you hold and what happens to it, but of how the state authorities will interpret the way you handle that data.',
    },
    risk: {
      uk: [
        'Основний ризик тут у тому, що бізнес майже завжди використовує такі інструменти, але не оформлює це юридично і навіть не до кінця розуміє, як саме влаштована робота з даними.',
        'Наприклад, відеоспостереження – це вже обробка персональних даних. CRM-система – це зберігання і часто передача даних третім особам. Хмарні сервіси можуть зберігати інформацію за межами України чи ЄС, і компанія про це навіть не знає. Фактично будь-яка компанія, у якій є хоча б один працівник, з точки зору законодавства здійснює обробку персональних даних.',
        'В Україні діє Закон «Про захист персональних даних» від 01.06.2010 р. № 2297-VI. Штрафи, передбачені за його порушення, поки що адміністративні й невеликі – до кількох десятків тисяч гривень. Саме це багатьох розслаблює. Але картина ширша. По-перше, скарги працівників чи клієнтів Уповноваженому з прав людини та перевірки – цілком реальний сценарій, а за незаконне збирання чи поширення інформації про особу передбачена вже кримінальна відповідальність. По-друге, Україна рухається до стандартів ЄС: нова редакція закону (законопроєкт № 8153) уже ухвалена в першому читанні й передбачає штрафи до 150 млн грн або до 8% річного обороту. По-третє, якщо серед Ваших клієнтів є громадяни ЄС, європейський GDPR може застосовуватися до Вас уже сьогодні.',
        'Окрема проблема виникає, коли всередині компанії відсутні документи, які чітко фіксують, які дані Ви збираєте, де вони знаходяться і хто за них відповідає. Сама відсутність таких документів уже викликає в державних органів підозри й робить ситуацію для компанії юридично непередбачуваною і ризикованою. У такій ситуації стає вкрай складно довести, що Ви дійсно дотримуєтеся вимог закону.',
      ],
      en: [
        'The main risk here is that a business almost always uses such tools but does not formalise this legally and does not even fully understand how its handling of data actually works.',
        'For example, video surveillance is already the processing of personal data. A CRM system means storing and often transferring data to third parties. Cloud services may hold information outside Ukraine or the EU without the company even being aware of it. In fact, any company with even a single employee is, as a matter of law, processing personal data.',
        'Ukraine applies the Law "On Personal Data Protection" of 1 June 2010, No. 2297-VI. The penalties for breaching it are so far administrative and modest – up to a few tens of thousands of hryvnias. That is precisely what puts many people at ease. But the picture is broader. First, complaints by employees or clients to the Human Rights Commissioner, and the inspections that follow, are an entirely realistic scenario, while the unlawful collection or dissemination of information about an individual already carries criminal liability. Second, Ukraine is moving towards EU standards: a new version of the law (draft law No. 8153) has already passed its first reading and provides for fines of up to UAH 150 million or up to 8% of annual turnover. Third, if your clients include EU citizens, the European GDPR may already apply to you today.',
        'A separate problem arises when the company has no internal documents clearly recording what data you collect, where it is held, and who is responsible for it. The mere absence of such documents already arouses suspicion on the part of the state authorities and leaves the company in a legally unpredictable and risky position. In that situation it becomes extremely difficult to prove that you genuinely comply with the requirements of the law.',
      ],
    },
    action: {
      uk: [
        'Тут важливо не ускладнювати, а навести базовий порядок.',
        'Потрібно для себе чітко розуміти, які персональні дані Ви збираєте, де вони зберігаються і хто має до них доступ, чи передаються вони третім особам.',
        'Окремо важливо перевірити використання відеоспостереження: на якій підставі воно здійснюється, чи розміщені таблички про те, що ведеться відеоспостереження, які строки зберігання записів. Про обробку даних, що становить особливий ризик (наприклад, відеоспостереження чи біометрія), закон вимагає повідомляти Уповноваженого Верховної Ради України з прав людини.',
        'Якщо Ви працюєте з CRM або хмарними сервісами, важливо розуміти, де фізично розташовані сервери і хто саме обробляє дані. Якщо сервери в ЄС – Вам пощастило; якщо в будь-якій іншій країні – передача даних за кордон має свої умови, і це вже зона, яку треба перевіряти.',
        'Далі – зафіксувати це в простій письмовій політиці. Не потрібно робити складний документ – достатньо зрозумілого опису, який Ви самі зможете пояснити.',
        'Якщо в компанії є більш чутливі процеси (наприклад, відеоспостереження, обробка контактних або біометричних даних), вкрай важливо провести оцінку ризиків, оформити її документально й підготувати повний комплект необхідних документів. Ті, хто наведе лад зараз, пройдуть майбутню GDPR-реформу спокійно; іншим доведеться перебудовуватися в пожежному режимі та вже під загрозою зовсім інших штрафів.',
      ],
      en: [
        'Here the point is not to overcomplicate things, but to put basic order in place.',
        'You need to be clear for yourself about what personal data you collect, where it is stored, who has access to it, and whether it is passed on to third parties.',
        'It is worth separately reviewing your use of video surveillance: on what legal basis it is carried out, whether notices are displayed stating that video surveillance is in operation, and how long the recordings are kept. Where processing poses a particular risk (for example, video surveillance or biometrics), the law requires that the Ukrainian Parliament Commissioner for Human Rights be notified.',
        'If you work with a CRM or cloud services, it is important to know where the servers are physically located and who exactly processes the data. If the servers are in the EU – you are in luck; if they are in any other country, transferring data abroad comes with its own conditions, and that is already an area you need to check.',
        'Next – record all of this in a simple written policy. There is no need for a complicated document – a clear description that you can explain yourself is enough.',
        'If the company runs more sensitive processes (for example, video surveillance or the processing of contact or biometric data), it is vital to carry out a risk assessment, document it, and prepare a complete set of the necessary paperwork. Those who put things in order now will get through the coming GDPR-style reform calmly; the rest will have to rebuild in emergency mode, and by then under the threat of penalties of an entirely different order.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон України «Про захист персональних даних» № 2297-VI',
        url: 'https://zakon.rada.gov.ua/laws/show/2297-17',
      },
      en: {
        label: 'Law of Ukraine "On Personal Data Protection" No. 2297-VI',
        url: 'https://zakon.rada.gov.ua/laws/show/2297-17',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 3 — Fiabilitatea contractelor
  ────────────────────────────────────────────────────── */
  {
    order: 3,
    title: {
      uk: 'Блок 3. Надійність договорів',
      en: 'Block 3. Reliability of contracts',
    },
    essence: {
      uk: 'Цей блок показує, наскільки договори у Вашій компанії реально захищають Ваш бізнес, а не просто створюють відчуття безпеки. Важлива не лише наявність договору як документа, а й те, як він з’явився, чи враховує він специфіку Вашої діяльності, чи оновлювався він разом зі змінами бізнесу і чи містить зрозумілі механізми захисту.',
      en: 'This block shows how far the contracts in your company genuinely protect your business rather than merely creating a sense of security. What matters is not only that a contract exists as a document, but how it came about, whether it takes account of the specifics of your activity, whether it was updated as the business changed, and whether it contains clear protection mechanisms.',
    },
    risk: {
      uk: [
        'Якщо договори збираються з випадкових шаблонів, копіюються у знайомих, завантажуються з інтернету або взагалі не використовуються, компанія фактично працює без нормальної юридичної опори. Поки все спокійно, це може довго не відчуватися як проблема. Але спокійний період у бізнесі часто створює хибне відчуття безпеки.',
        'В українських реаліях це особливо помітно: останні роки стали для бізнесу суцільною перевіркою на міцність, і договори тут можна вважати не просто документами, а інструментом виживання. Кожен новий стресовий період швидко показує, що саме в компанії оформлено по-справжньому, а що трималося «на довірі», «на словах» або «якось потім розберемося».',
        'Саме в момент затримок оплат, відмов від зобов’язань, спроб перегляду умов або спорів щодо якості стає зрозуміло, наскільки договір реально працює. Дуже часто з’ясовується, що документ або не захищає компанію, або не дає необхідних інструментів для тиску, переговорів і стягнення заборгованості.',
        'Особливо варто враховувати, що договір може просто не працювати, бо застарів і не враховує актуальні норми права. Показовий приклад: Господарський кодекс, на який роками посилалися тисячі українських договорів, із 28 серпня 2025 року втратив чинність. Якщо Ваші документи досі містять посилання на нього, це вже формальна ознака того, що їх давно ніхто не переглядав.',
        'Окрема проблема сьогодні пов’язана з тим, що багато хто починає складати договори через ChatGPT. Це зручно, швидко й іноді справді корисно як чернетка. Але є принциповий ризик: ChatGPT може не просто помилятися, а впевнено вигадувати те, чого взагалі не існує – неіснуючі конструкції, неточні посилання, чужу логіку з інших країн, слабкі або юридично порожні формулювання. Він пише переконливо, і саме тому ризик особливо небезпечний: людина може не помітити, де текст уже почав вводити її в оману.',
        'Тому, якщо Ви берете договори з шаблонів або довіряєте їх підготовку штучному інтелекту без професійної перевірки, потрібно чесно відповісти собі на запитання: чи готові Ви довірити ризики свого бізнесу інструменту, який може галюцинувати й вигадувати норми, яких у природі немає. Якщо так – значить, потрібно так само чесно розуміти, що відповідальність за наслідки залишиться на Вас.',
        'Додатковий ризик виникає тоді, коли договори колись були підготовлені, але потім роками не переглядалися. Бізнес змінюється, процеси ускладнюються, законодавство оновлюється, а договір залишається старим. У результаті документ перестає відповідати тому, як компанія реально працює сьогодні.',
        'Якщо в договорі немає чітких правил про відповідальність, штрафи, строки, порядок приймання, розірвання та вирішення спорів, то в конфліктній ситуації компанії стає набагато складніше захищати свої гроші, строки та інтереси. На практиці це призводить до втрат, затяжних спорів, слабкої позиції в переговорах і неможливості швидко стягнути заборгованість.',
      ],
      en: [
        'If contracts are pieced together from random templates, copied from acquaintances, downloaded from the internet, or not used at all, the company is effectively operating without a proper legal foundation. While everything is calm, this may not feel like a problem for a long time. But a calm period in business often creates a false sense of security.',
        'In Ukrainian conditions this is especially apparent: recent years have been one continuous stress test for business, and contracts here can be regarded not merely as documents but as an instrument of survival. Each new period of stress quickly reveals what the company has genuinely put in order and what was being held together "on trust", "on someone’s word", or "we’ll sort it out somehow later".',
        'It is precisely at the moment of payment delays, refusals to honour obligations, attempts to renegotiate terms, or disputes over quality that it becomes clear how well a contract actually works. Very often it emerges that the document either fails to protect the company or gives it none of the tools it needs for leverage, negotiation, and debt recovery.',
        'It is particularly worth bearing in mind that a contract may simply fail to work because it has become outdated and no longer reflects the law in force. A telling example: the Commercial Code, cited for years in thousands of Ukrainian contracts, ceased to have effect on 28 August 2025. If your documents still refer to it, that alone is a formal sign that no one has reviewed them for a long time.',
        'A separate problem today stems from the fact that many people have started drafting contracts with ChatGPT. It is convenient, fast, and sometimes genuinely useful as a first draft. But there is a fundamental risk: ChatGPT can not merely make mistakes but confidently invent things that do not exist at all – non-existent legal constructs, inaccurate references, logic borrowed from other jurisdictions, and weak or legally empty wording. It writes persuasively, and that is exactly why the risk is so dangerous: a person may not notice the point at which the text has already begun to mislead them.',
        'So if you take contracts from templates or entrust their drafting to artificial intelligence without professional review, you need to answer one question honestly: are you prepared to entrust the risks of your business to a tool that can hallucinate and invent rules that do not exist in nature. If you are – then you must be equally honest in accepting that responsibility for the consequences will remain with you.',
        'A further risk arises where contracts were prepared at some point but then went unreviewed for years. The business changes, processes become more complex, legislation is updated – and the contract stays as it was. As a result, the document ceases to match how the company actually operates today.',
        'If a contract contains no clear rules on liability, penalties, deadlines, acceptance procedures, termination, and dispute resolution, then in a conflict it becomes far harder for the company to protect its money, its deadlines, and its interests. In practice this leads to losses, protracted disputes, a weak negotiating position, and an inability to recover debt quickly.',
      ],
    },
    action: {
      uk: [
        'До договорів важливо ставитися не як до формальності, а як до інструменту захисту бізнесу.',
        'Краще, коли договори зроблені під Вашу реальну модель роботи, а не взяті з шаблонів чи зібрані через ChatGPT без перевірки. Такі тексти можуть виглядати переконливо, але містити помилки або вигадані конструкції, за які в підсумку відповідаєте Ви.',
        'Договори потрібно періодично переглядати. Достатньо хоча б раз на рік ставити собі запитання: цей документ відповідає тому, як ми реально працюємо сьогодні? Окремо перевірте, чи не посилаються Ваші документи на норми, що вже втратили чинність, – як-от Господарський кодекс.',
        'Простий тест – дайте договір людині «зі сторони». Якщо вона розуміє його інакше, ніж Ви задумували, значить, є слабкі місця.',
        'І обов’язково перевірте, чи є в договорі конкретні механізми захисту: відповідальність, штрафи, порядок оплати, приймання, розірвання та розгляду спорів. Якщо цього немає – договір Вас не захищає.',
        'І, будь ласка, не варто себе обманювати. Якщо Ви щось не розумієте, то, швидше за все, це буде використано проти Вас. Усе, що залишається незрозумілим, по суті є прихованим ризиком.',
      ],
      en: [
        'Contracts should be treated not as a formality, but as an instrument for protecting the business.',
        'It is better when contracts are built around your actual operating model rather than taken from templates or assembled with ChatGPT without review. Such texts may look convincing yet contain errors or invented constructs for which you are ultimately answerable.',
        'Contracts need to be reviewed periodically. It is enough to ask yourself at least once a year: does this document match the way we actually work today? Check separately whether your documents still refer to provisions that are no longer in force – such as the Commercial Code.',
        'A simple test – give the contract to an outsider. If they read it differently from the way you intended, that means there are weak spots.',
        'And be sure to check whether the contract contains concrete protection mechanisms: liability, penalties, payment procedures, acceptance, termination, and dispute resolution. If they are absent – the contract is not protecting you.',
        'And please do not deceive yourself. If there is something you do not understand, it will most likely be used against you. Everything that remains unclear is, in essence, a hidden risk.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Цивільний кодекс України',
        url: 'https://zakon.rada.gov.ua/laws/show/435-15',
      },
      en: {
        label: 'Civil Code of Ukraine No. 435-IV',
        url: 'https://zakon.rada.gov.ua/laws/show/435-15',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 4 — Riscuri financiare și fiscale
  ────────────────────────────────────────────────────── */
  {
    order: 4,
    title: {
      uk: 'Блок 4. Фінанси та податкові ризики',
      en: 'Block 4. Finances and tax risks',
    },
    essence: {
      uk: 'Цей блок показує, наскільки акуратно в компанії вибудувані відносини з грошима, податками та фінансовою дисципліною. Тут перевіряється, чи відокремлені гроші бізнесу від особистих витрат власників, наскільки стабільно компанія виконує податкові зобов’язання, як працює з готівкою і чи розуміє взагалі своє реальне податкове навантаження.',
      en: 'This block shows how carefully the company has structured its relationship with money, taxes, and financial discipline. It examines whether business money is kept separate from the owners’ personal spending, how consistently the company meets its tax obligations, how it handles cash, and whether it understands its real tax burden at all.',
    },
    risk: {
      uk: [
        'Коли гроші компанії використовуються на особисті витрати засновників або директора, межа між бізнесом і особистими коштами розмивається.',
        'У цей момент найчастіше звучить проста думка: «нічого страшного, це ж і так мої гроші». Логіка зрозуміла, але з точки зору закону це не так. Компанія – це окрема структура, і її гроші – це не особисті гроші власника.',
        'І саме з таких, на перший погляд, безневинних дій найчастіше починаються реальні проблеми: питання від банку, донарахування податків (зокрема ПДФО та військового збору, коли витрати визнають «додатковим благом»), штрафи й ризик того, що у складній ситуації відповідальність уже перейде на Вас особисто.',
        'Прострочення за податками, навіть якщо вони були несистемними, показують, що в компанії є слабкі місця у фінансовій дисципліні. А якщо такі прострочення повторюються, це вже ознака того, що бізнес живе в режимі постійного напруження і може в будь-який момент зіткнутися із санкціями, пенею, зупиненням реєстрації податкових накладних, статусом «ризикового» платника (за критеріями, затвердженими постановою КМУ № 1165) та додатковою увагою з боку держави.',
        'Окремий сигнал ризику – регулярна робота з готівкою. У наших реаліях це майже завжди чутлива зона, бо саме готівка найчастіше викликає запитання в банку, податкової служби та фінансового моніторингу. Варто пам’ятати й про ліміти готівкових розрахунків: до 10 000 грн на день з одним суб’єктом господарювання і до 50 000 грн на день з однією фізичною особою – незалежно від кількості платіжних документів. Якщо компанія регулярно знімає гроші, але не аналізує, навіщо і в якому обсязі це відбувається, це виглядає як непрозора фінансова модель.',
        'Додаткова проблема виникає тоді, коли бізнес взагалі не аналізує, яку частку обороту з’їдають податки. У такому разі компанія не управляє податковим навантаженням, а просто «платить як виходить». Це робить фінансову модель сліпою: власник може бачити виручку, але не розуміти, скільки бізнес реально втрачає на податках, помилках і неефективній структурі.',
        'У підсумку все це може призвести до штрафів, пені, касових розривів, блокування операцій, претензій з боку банку й податкових органів, а також до загальної втрати керованості фінансами.',
      ],
      en: [
        'When company money is used for the personal expenses of the founders or the director, the line between the business and personal funds becomes blurred.',
        'At that point the most common thought is a simple one: "no big deal, it’s my money anyway". The logic is understandable, but in law it is not so. A company is a separate entity, and its money is not the owner’s personal money.',
        'And it is precisely from such seemingly harmless actions that real problems most often begin: questions from the bank, additional tax assessments (personal income tax and the military levy in particular, once the spending is treated as an "additional benefit"), fines, and the risk that in a difficult situation liability will pass to you personally.',
        'Late tax payments, even if they were not systematic, show that the company has weak spots in its financial discipline. And if such delays recur, that is already a sign that the business is living under constant strain and could at any moment face sanctions, penalty interest, suspension of the registration of its tax invoices, "risky taxpayer" status (under the criteria approved by Cabinet of Ministers Resolution No. 1165), and additional attention from the state.',
        'A separate risk signal is regular handling of cash. In our environment this is almost always a sensitive area, because it is cash that most often raises questions with the bank, the tax service, and financial monitoring. It is also worth remembering the limits on cash settlements: up to UAH 10,000 per day with a single business entity and up to UAH 50,000 per day with a single individual – regardless of the number of payment documents. If the company regularly withdraws money but never analyses why and in what volume this happens, it looks like a non-transparent financial model.',
        'A further problem arises when the business never analyses what share of turnover taxes consume. In that case the company is not managing its tax burden but simply "paying whatever comes out". This leaves the financial model blind: the owner may see revenue but not understand how much the business actually loses to taxes, errors, and an inefficient structure.',
        'Ultimately all of this can lead to fines, penalty interest, cash-flow gaps, blocked transactions, claims from the bank and the tax authorities, and a general loss of control over finances.',
      ],
    },
    action: {
      uk: [
        'Тут насамперед важливо чесно відокремити гроші компанії від особистих витрат. Якщо власник або директор використовує кошти бізнесу для себе, такі операції мають бути або припинені, або правильно оформлені (дивіденди, заробітна плата, поворотна фінансова допомога, підзвітні кошти) – у цьому разі бюрократія стає Вашим надійним щитом від претензій з боку державних органів.',
        'Далі варто перевірити податкову дисципліну за останні три роки (1095 днів – строк, у межах якого податкова може донарахувати зобов’язання) й зрозуміти, чи були прострочення випадковістю, чи вже системою. Окремо потрібно подивитися на роботу з готівкою: як часто гроші знімаються, навіщо саме і чи можна скоротити такі операції.',
        'При цьому для бізнесу критично розуміти три базові речі. По-перше, скільки компанія реально заробляє – її чистий прибуток, тобто ті гроші, які залишаються після всіх витрат і податків. По-друге, який у неї оборот і як він поводиться в динаміці. І, по-третє, яку частку від цього обороту компанія платить у вигляді податків. Саме цей показник податкова порівнює із середнім по галузі, і суттєве відхилення може стати підставою для включення компанії до плану-графіка перевірок.',
        'Саме третій показник багато хто ігнорує, а даремно. У ньому часто прихована «міна сповільненої дії»: помилки, недоплати або неефективна податкова структура можуть довго не проявлятися, але при перевірці з боку податкової це може різко і суттєво вдарити по бізнесу.',
      ],
      en: [
        'Here the first priority is to separate company money from personal spending honestly. If the owner or the director uses business funds for themselves, such transactions must either stop or be properly documented (dividends, salary, repayable financial assistance, funds advanced on account) – in which case the paperwork becomes your reliable shield against claims from the state authorities.',
        'Next, it is worth reviewing tax discipline over the past three years (1,095 days is the period within which the tax authority may assess additional liabilities) and working out whether the late payments were incidental or already systemic. You should look separately at how cash is handled: how often money is withdrawn, exactly what for, and whether such transactions can be reduced.',
        'At the same time it is critical for a business to understand three basic things. First, how much the company actually earns – its net profit, that is, the money left after all costs and taxes. Second, what its turnover is and how it is trending. And third, what share of that turnover the company pays out in taxes. It is this last figure that the tax authority compares with the industry average, and a significant deviation can be grounds for including the company in the schedule of planned inspections.',
        'It is precisely this third indicator that many ignore, and wrongly so. It often conceals a "time bomb": errors, underpayments, or an inefficient tax structure may go unnoticed for a long time, but during a tax inspection they can hit the business sharply and severely.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Податковий кодекс України',
        url: 'https://zakon.rada.gov.ua/laws/show/2755-17',
      },
      en: {
        label: 'Tax Code of Ukraine No. 2755-VI',
        url: 'https://zakon.rada.gov.ua/laws/show/2755-17',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 5 — Răspundere personală și faliment
  ────────────────────────────────────────────────────── */
  {
    order: 5,
    title: {
      uk: 'Блок 5. Особиста відповідальність та банкрутство',
      en: 'Block 5. Personal liability and bankruptcy',
    },
    essence: {
      uk: 'Цей блок показує, наскільки у Вашому бізнесі реально працює принцип «компанія окремо – особисті ризики окремо». Формально це так, але в низці ситуацій ця межа може розмиватися.',
      en: 'This block shows how far the principle of "the company on one side, personal risk on the other" actually works in your business. Formally that is how it is, but in a number of situations this line can become blurred.',
    },
    risk: {
      uk: [
        'Основна помилка – вважати, що наявність компанії автоматично повністю захищає особисті активи від можливого стягнення. На практиці це не завжди так.',
        'Є ситуації, в яких ризик переходить на рівень власника або директора. Найчастіше це пов’язано з особистими поруками, перевищенням повноважень або діями без належного оформлення всередині компанії.',
        'Особливо уважно потрібно ставитися до порук. У момент підписання вони часто сприймаються як формальність, але, по суті, це добровільне прийняття на себе додаткового ризику. Якщо зобов’язання не виконується, вимоги можуть бути пред’явлені вже до Вас особисто – в межах такої поруки.',
        'В Україні є й специфічні механізми. Якщо компанії загрожує неплатоспроможність, керівник зобов’язаний протягом місяця звернутися до суду із заявою про банкрутство – інакше він може відповідати за боргами компанії солідарно. А якщо суд встановить, що до банкрутства компанію довели умисними діями чи бездіяльністю, на власників і керівників може бути покладена субсидіарна відповідальність – і суди останніми роками застосовують її дедалі активніше.',
        'Окрема зона ризику – коли договори або зобов’язання підписуються без погодження або поза зрозумілою структурою ухвалення рішень. У звичайній роботі це може не створювати проблем, але в конфлікті або спорі такі правочини можуть бути визнані нікчемними, і це може призвести до збитків і претензій.',
        'Важливо розуміти: не кожне порушення автоматично веде до особистої відповідальності, але певні дії можуть суттєво підвищити цей ризик і «пробити» захист компанії.',
      ],
      en: [
        'The main mistake is to assume that having a company automatically and fully protects personal assets from enforcement. In practice this is not always so.',
        'There are situations in which risk moves up to the level of the owner or the director. Most often this involves personal guarantees, acting beyond one’s authority, or actions taken without proper documentation inside the company.',
        'Guarantees deserve especially close attention. At the moment of signing they are often seen as a formality, but in substance they are a voluntary assumption of additional risk. If the obligation is not performed, claims may be brought against you personally – to the extent of that guarantee.',
        'Ukraine also has its own specific mechanisms. If a company faces insolvency, its head is obliged to apply to the court with a bankruptcy petition within one month – otherwise he or she may become jointly and severally liable for the company’s debts. And if the court establishes that the company was driven into bankruptcy by deliberate acts or omissions, subsidiary liability may be imposed on the owners and the management – and in recent years the courts have been applying it ever more readily.',
        'A separate risk zone is where contracts or obligations are signed without approval or outside any clear decision-making structure. In day-to-day operations this may cause no problems, but in a conflict or a dispute such transactions may be held null and void, and that can lead to losses and claims.',
        'It is important to understand: not every breach automatically leads to personal liability, but certain actions can significantly increase that risk and "pierce" the company’s protection.',
      ],
    },
    action: {
      uk: [
        'Тут ключове – усвідомленість і базова дисципліна.',
        'Потрібно чітко розуміти, чи підписувалися особисті поруки і в яких обсягах Ви вже прийняли на себе ризики. Надалі такі рішення варто ухвалювати лише усвідомлено, розуміючи наслідки та керуючи ними.',
        'Важливо вибудувати просту, але зрозумілу систему: ключові рішення фіксуються, суттєві зобов’язання погоджуються, повноваження не виходять за межі. А якщо компанія наближається до фінансових проблем – не тягнути, а вчасно звертатися по професійну допомогу: зволікання тут може коштувати вже особистих грошей керівника.',
        'І найголовніше – розуміти, де проходять межі особистої відповідальності у Вашій ситуації. Навіть базове розуміння цих правил уже суттєво знижує ризик помилок.',
      ],
      en: [
        'The key here is awareness and basic discipline.',
        'You need to know clearly whether personal guarantees have been signed and how much risk you have already taken on. In future, such decisions should be taken only deliberately, understanding the consequences and managing them.',
        'It is important to build a simple but clear system: key decisions are recorded, material obligations are approved, and no one acts beyond their authority. And if the company is heading towards financial trouble – do not put it off; seek professional help in good time, because hesitating here can end up costing the director his or her own money.',
        'And most importantly – understand where the boundaries of personal liability lie in your situation. Even a basic grasp of these rules already substantially reduces the risk of mistakes.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Кодекс України з процедур банкрутства',
        url: 'https://zakon.rada.gov.ua/laws/show/2597-19',
      },
      en: {
        label: 'Code of Ukraine on Bankruptcy Procedures No. 2597-VIII',
        url: 'https://zakon.rada.gov.ua/laws/show/2597-19',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 6 — Contrapărți și activități reale
  ────────────────────────────────────────────────────── */
  {
    order: 6,
    title: {
      uk: 'Блок 6. Контрагенти та реальна діяльність',
      en: 'Block 6. Counterparties and real activity',
    },
    essence: {
      uk: 'Цей блок показує, наскільки компанія живе в реальності, а не лише «на папері». Тут проявляються дві дуже практичні речі. По-перше, чи вмієте Ви заздалегідь перевіряти, з ким починаєте працювати, і відсікати неблагонадійні компанії та потенційних шахраїв, які можуть створити Вам проблеми. По-друге, чи здатні Ви оцінити, чи дійсно контрагент може виконати свої зобов’язання, чи він перебуває на межі банкрутства. Інакше кажучи, йдеться про те, чи розумієте Ви, що в компанії реально є, чим вона володіє і які зобов’язання на ній фактично лежать. По суті, це питання не лише про документи, а про керованість і передбачуваність бізнесу.',
      en: 'This block shows how far the company lives in reality rather than merely "on paper". Two very practical things come to light here. First, whether you know how to check in advance who you are starting to work with, and to screen out unreliable companies and potential fraudsters who could create problems for you. Second, whether you are able to assess whether a counterparty can genuinely perform its obligations or is on the brink of bankruptcy. In other words, it is about whether you understand what the company actually has, what it owns, and what obligations in fact rest on it. In essence, this is a question not only of documents, but of how manageable and predictable the business is.',
    },
    risk: {
      uk: [
        'Якщо в компанії немає зрозумілого порядку перевірки контрагентів, співпраця часто починається «на довірі», «за рекомендацією» або просто тому, що потрібно швидко закрити угоду. У спокійний період це може здаватися нормальним. Але потім раптово з’ясовується, що контрагент проблемний, не виконує зобов’язання, має борги, ознаки фіктивності або просто від початку не був надійним партнером.',
        'У такій ситуації бізнес втрачає не лише гроші. Він втрачає час, управлінську увагу, репутацію та можливість швидко захистити себе. В Україні є й окремий податковий вимір: якщо податкова визнає операції із сумнівним контрагентом «нереальними», компанія може втратити податковий кредит з ПДВ і витрати – тобто заплатити за чужі проблеми власними грошима. І питання можуть з’явитися вже не лише до контрагента, а й до самої компанії: чому Ви взагалі почали з ним працювати і наскільки сумлінно перевіряли його до угоди. У судовій практиці це називають належною обачністю – і саме її відсутність найчастіше стає ключовим аргументом не на користь компанії.',
        'При цьому в Україні перевірити контрагента – давно не складно: відкриті державні реєстри, статус платника ПДВ, судові рішення, податковий борг і виконавчі провадження доступні за кілька хвилин, зокрема через спеціалізовані аналітичні сервіси. Тому «ми не знали» виглядає дедалі менш переконливо – і для суду, і для податкової.',
        'Друга чутлива зона – інвентаризація. Багато хто сприймає її як нудний бухгалтерський обов’язок, який можна відкласти. Але на практиці саме вона показує, чи збігається те, що компанія думає про себе, з тим, що в неї є насправді.',
        'Якщо інвентаризація не проводиться, бізнес поступово починає жити в ілюзії. На папері може бути одне майно, одні залишки, одні зобов’язання, а в реальності – зовсім інша картина. І зазвичай це з’ясовується в найневідповідніший момент: перед продажем бізнесу, у конфлікті між засновниками, під час перевірки, зміни бухгалтера, спору з контрагентом або касового розриву.',
        'У результаті компанія може зіткнутися з втратами, внутрішнім хаосом, спорами щодо активів і боргів, проблемами зі звітністю та слабкою позицією під час перевірок чи переговорів.',
      ],
      en: [
        'If the company has no clear procedure for vetting counterparties, cooperation often begins "on trust", "on a recommendation", or simply because a deal needs to be closed quickly. In calm times this may seem perfectly normal. But then it suddenly emerges that the counterparty is problematic, does not perform its obligations, has debts, shows signs of being a shell, or was simply never a reliable partner to begin with.',
        'In such a situation the business loses more than money. It loses time, management attention, reputation, and the ability to defend itself quickly. In Ukraine there is also a distinct tax dimension: if the tax authority treats transactions with a questionable counterparty as "non-genuine", the company may lose its VAT input credit and its deductible costs – in other words, pay for someone else’s problems out of its own pocket. And questions may then arise not only about the counterparty but about the company itself: why you started working with them at all, and how diligently you checked them before the deal. In case law this is called due care and diligence – and it is precisely its absence that most often becomes the decisive argument against the company.',
        'And in Ukraine checking a counterparty has long ceased to be difficult: open state registers, VAT payer status, court judgments, tax debt, and enforcement proceedings are all available within minutes, including through specialised analytics services. So "we did not know" looks less and less convincing – both to a court and to the tax authority.',
        'The second sensitive area is inventory-taking. Many treat it as a tedious accounting duty that can be put off. But in practice it is precisely what shows whether what the company believes about itself matches what it actually has.',
        'If no inventory is taken, the business gradually starts living in an illusion. On paper there may be one set of assets, one set of balances, one set of obligations, while in reality the picture is entirely different. And this usually comes to light at the most inconvenient moment: before selling the business, in a conflict between founders, during an inspection, when changing accountants, in a dispute with a counterparty, or during a cash-flow gap.',
        'As a result, the company may face losses, internal chaos, disputes over assets and debts, reporting problems, and a weak position during inspections or negotiations.',
      ],
    },
    action: {
      uk: [
        'Тут не потрібно вигадувати складну систему. Достатньо запровадити базову дисципліну.',
        'Перед початком роботи з новим контрагентом варто проводити хоча б базову перевірку: зрозуміти, хто це, чи діє він реально і чи немає в нього очевидних проблем. Реєстри та відкриті сервіси дають цю картину за лічені хвилини. Результати такої перевірки варто зберігати – витяги чи скриншоти з датою згодом підтверджують, що компанія діяла добросовісно.',
        'Інвентаризацію важливо сприймати не як формальність, а як спосіб періодично звіряти дані з реальністю. Закон і так вимагає проводити її щороку перед складанням річної звітності, а також в окремих обов’язкових випадках – зокрема при зміні матеріально відповідальної особи, виявленні нестач чи крадіжки, ліквідації підприємства; навіть якщо немає ресурсу на складні процедури, достатньо хоча б раз на рік перевіряти основні активи та зобов’язання.',
        'Загалом завдання просте – бачити, з ким Ви працюєте і що у Вас є.',
      ],
      en: [
        'There is no need to invent a complex system here. Introducing basic discipline is enough.',
        'Before starting work with a new counterparty, it is worth carrying out at least a basic check: establish who they are, whether they genuinely operate, and whether they have any obvious problems. Registers and open services give you that picture within minutes. It is worth keeping the results of such a check – dated extracts or screenshots later serve as proof that the company acted in good faith.',
        'Inventory-taking should be seen not as a formality, but as a way of periodically reconciling your records against reality. The law already requires it to be carried out every year before the annual financial statements are prepared, as well as in certain mandatory cases – in particular when the employee bearing financial responsibility changes, when shortages or theft are discovered, or on liquidation of the enterprise; and even if there are no resources for elaborate procedures, checking the main assets and obligations at least once a year is enough.',
        'On the whole the task is simple – to see who you are working with and what you have.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон України «Про бухгалтерський облік та фінансову звітність в Україні» № 996-XIV',
        url: 'https://zakon.rada.gov.ua/laws/show/996-14',
      },
      en: {
        label: 'Law of Ukraine "On Accounting and Financial Reporting in Ukraine" No. 996-XIV',
        url: 'https://zakon.rada.gov.ua/laws/show/996-14',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 7 — Relații de muncă
  ────────────────────────────────────────────────────── */
  {
    order: 7,
    title: {
      uk: 'Блок 7. Трудові відносини',
      en: 'Block 7. Employment relations',
    },
    essence: {
      uk: 'Цей блок про те, наскільки компанія заздалегідь захищає свою клієнтську базу, внутрішню інформацію та ключові робочі зв’язки.',
      en: 'This block is about how far the company protects its client base, its internal information, and its key working relationships in advance.',
    },
    risk: {
      uk: [
        'Одна з найнеприємніших ситуацій для власника – коли працівник іде не сам, а разом із клієнтами, листуванням, контактами та розумінням, як у Вас все влаштовано всередині. Дуже часто це відбувається не через «злий намір», а просто тому, що компанія заздалегідь не вибудувала межі.',
        'В Україні є важлива особливість, про яку багато хто не знає: пряма заборона працівникові конкурувати після звільнення в межах трудових відносин може бути визнана судами недійсна, як така, що погіршує становище працівника та обмежує конституційне право на працю. На практиці частіше застосовується захист бізнесу через режим комерційної таємниці та угоди про конфіденційність.',
        'Якщо в компанії не визначено, що саме є комерційною таємницею, не підписані угоди про конфіденційність і немає актів передачі інформації, потім стає важко пояснити й довести, що саме було конфіденційною інформацією та комерційною таємницею. А якщо з ключовими людьми не врегульовано питання використання клієнтської бази після виходу, бізнес може зіткнутися з дуже неприємною картиною: вчора людина працювала у Вас, а завтра вже пише тим самим клієнтам від свого імені або від імені конкурента.',
        'Для підприємця це майже завжди виглядає однаково болісно: клієнтська база начебто створювалася коштом компанії, а в момент виходу перетворюється на особистий актив співробітника. І тоді бізнес втрачає не лише виручку, а й контроль.',
      ],
      en: [
        'One of the most unpleasant situations for an owner is when an employee leaves not alone, but together with the clients, the correspondence, the contacts, and an understanding of how everything works inside your company. Very often this happens not out of "bad intent", but simply because the company never set the boundaries in advance.',
        'Ukraine has an important peculiarity that many are unaware of: an outright ban on an employee competing after leaving, imposed within the employment relationship, may be held invalid by the courts as worsening the employee’s position and restricting the constitutional right to work. In practice, the business is more commonly protected through a trade secret regime and confidentiality agreements.',
        'If the company has not defined what exactly constitutes a trade secret, has no signed confidentiality agreements and no records of information handover, it later becomes hard to explain and prove what precisely was confidential information and a trade secret. And if the use of the client base after departure has not been regulated with key people, the business may face a very unpleasant picture: yesterday the person was working for you, and tomorrow they are already writing to those same clients in their own name or on behalf of a competitor.',
        'For an entrepreneur this almost always looks equally painful: the client base was ostensibly built at the company’s expense, yet at the moment of departure it turns into the employee’s personal asset. And then the business loses not only revenue, but control.',
      ],
    },
    action: {
      uk: [
        'Тут краще не ускладнювати, а заздалегідь закрити базові речі.',
        'Перший крок – запровадити режим комерційної таємниці: затвердити перелік відомостей, що становлять комерційну таємницю, положення про роботу з нею та порядок доступу. Без цього будь-які заборони залишаються словами.',
        'З працівниками, які мають доступ до клієнтів, цін, листування, файлів і внутрішньої інформації, мають бути підписані зрозумілі угоди про конфіденційність, а при звільненні – акти передачі інформації та доступів. З ключовими людьми варто окремо врегулювати, що відбувається з клієнтською базою та комерційною інформацією після їхнього виходу. А якщо Ви працюєте з підрядниками чи ФОПами, обмеження щодо клієнтів і конфіденційності можна гнучкіше будувати вже в цивільно-правових договорах.',
        'Що раніше це оформлено, то менша ймовірність, що потім доведеться наздоганяти клієнтів, які вже пішли, і розбиратися, хто кому що «мав на увазі».',
      ],
      en: [
        'Here it is better not to overcomplicate things, but to take care of the basics in advance.',
        'The first step is to put a trade secret regime in place: approve the list of information that constitutes a trade secret, the rules for handling it, and the access procedure. Without this, any prohibitions remain mere words.',
        'Employees who have access to clients, prices, correspondence, files, and internal information should sign clear confidentiality agreements, and on departure should sign records handing over information and access credentials. With key people it is worth regulating separately what happens to the client base and commercial information after they leave. And if you work with contractors or private entrepreneurs, restrictions on clients and confidentiality can be structured more flexibly in civil-law contracts.',
        'The sooner this is documented, the lower the likelihood that you will later have to chase after clients who have already gone and work out who "meant" what to whom.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Кодекс законів про працю України',
        url: 'https://zakon.rada.gov.ua/laws/show/322-08',
      },
      en: {
        label: 'Labour Code of Ukraine No. 322-VIII',
        url: 'https://zakon.rada.gov.ua/laws/show/322-08',
      },
    },
  },

  /* ──────────────────────────────────────────────────────
     BLOC 8 — Riscuri de piață
  ────────────────────────────────────────────────────── */
  {
    order: 8,
    title: {
      uk: 'Блок 8. Ринкові ризики',
      en: 'Block 8. Market risks',
    },
    essence: {
      uk: 'Цей блок про те, як компанія поводиться на ринку і чи розуміє правила гри з точки зору конкуренції.',
      en: 'This block is about how the company conducts itself in the market and whether it understands the rules of the game from a competition standpoint.',
    },
    risk: {
      uk: [
        'Є речі, які в бізнес-середовищі часто вважаються «нормальними» – встановити ціни з колегами по ринку, обмежити виробництво або розподілити ринки товарів, домовитися «щоб усім було комфортно». У реальності такі дії можуть кваліфікуватися як антиконкурентні узгоджені дії, за які Антимонопольний комітет України (АМКУ) може накладати штрафи до 10% річного доходу компанії за останній звітний рік.',
        'І проблема тут у тому, що це не виглядає як щось небезпечне. Люди спілкуються, зустрічаються, перебувають в асоціаціях, листуються в чатах. Але в певний момент такі домовленості можуть стати підставою для серйозних претензій з боку регулятора.',
        'У таких випадках бізнес може зіткнутися зі штрафами, перевірками та обмеженнями, і це вже зовсім інший рівень ризику – не операційний, а системний.',
        'Друга чутлива зона – угоди з бізнесом: купівля компанії, її частини або злиття/приєднання. Багато хто сприймає це як звичайну комерційну угоду, але закон встановлює чіткі пороги, після яких потрібен попередній дозвіл АМКУ на концентрацію.',
        'Дозвіл потрібен, зокрема, якщо сукупна вартість активів або обсяг реалізації всіх учасників угоди за останній рік, у тому числі за кордоном, перевищує еквівалент 30 млн євро, і при цьому щонайменше у двох учасників показники в Україні перевищують 4 млн євро в кожного. Є й окремий поріг: якщо показники хоча б одного учасника угоди в Україні перевищують 8 млн євро, а оборот іншого учасника за кордоном – 150 млн євро.',
        'При досягненні зазначених вище фінансових показників дозвіл потрібно отримати до проведення будь-яких дій щодо передачі бізнесу. При цьому під самою угодою розуміється вже не лише факт передачі бізнесу, а момент підписання договору, оголошення публічної оферти або набуття контролю.',
        'Якщо ця вимога ігнорується, навіть повністю «біла» й економічно логічна угода може створити серйозні проблеми: штраф до 5% річного доходу за останній звітний рік, втручання регулятора, необхідність перегляду умов або повернення до вихідного стану. І це той випадок, коли питання виникає не до «змісту угоди», а до того, що її було здійснено без дотримання процедури.',
      ],
      en: [
        'There are things that in the business community are often regarded as "normal" – setting prices together with peers in the market, limiting output or dividing up product markets, agreeing "so that everyone is comfortable". In reality such conduct may qualify as anticompetitive concerted practices, for which the Antimonopoly Committee of Ukraine (AMCU) may impose fines of up to 10% of the company’s annual income for the last reporting year.',
        'And the problem here is that none of it looks dangerous. People socialise, meet, belong to associations, exchange messages in group chats. But at a certain point such understandings can become grounds for serious claims from the regulator.',
        'In such cases the business may face fines, inspections, and restrictions, and that is already an entirely different level of risk – not operational, but systemic.',
        'The second sensitive area is business transactions: buying a company, part of it, or a merger or acquisition. Many treat this as an ordinary commercial deal, but the law sets clear thresholds above which prior AMCU clearance for the concentration is required.',
        'Clearance is required, in particular, where the combined value of the assets or the sales volume of all parties to the transaction over the last year, including abroad, exceeds the equivalent of EUR 30 million, and at the same time at least two of the parties each exceed EUR 4 million on those figures in Ukraine. There is also a separate threshold: where the figures in Ukraine of at least one party to the transaction exceed EUR 8 million and the turnover of another party abroad exceeds EUR 150 million.',
        'Once the financial thresholds set out above are met, clearance must be obtained before any steps are taken to transfer the business. Moreover, the transaction itself is understood to mean not merely the fact of the business changing hands, but the moment the agreement is signed, a public offer is announced, or control is acquired.',
        'If this requirement is ignored, even a completely "clean" and economically sound deal can create serious problems: a fine of up to 5% of annual income for the last reporting year, intervention by the regulator, the need to revise the terms, or a return to the original position. And this is the case where the question arises not about the "substance of the deal", but about the fact that it was carried out without following the procedure.',
      ],
    },
    action: {
      uk: [
        'Тут важливо просто розуміти межі.',
        'З конкурентами краще не домовлятися про ціни, умови продажів або плани – навіть у неформальній обстановці. Те, що виглядає як звичайне спілкування, за певних умов може бути інтерпретовано інакше.',
        'Якщо йдеться про купівлю бізнесу, його частини або злиття/приєднання, має сенс заздалегідь перевірити, чи потребує угода дозволу АМКУ. Це нескладна перевірка, але вона може зекономити багато грошей і нервів.',
        'Загалом логіка проста: на ринку важливо не лише заробляти, а й не порушувати правила, навіть якщо вони не завжди очевидні.',
      ],
      en: [
        'Here it is important simply to understand the boundaries.',
        'It is better not to agree prices, sales terms, or plans with competitors – even in an informal setting. What looks like ordinary conversation may, in certain circumstances, be interpreted quite differently.',
        'If the matter concerns buying a business, part of it, or a merger or acquisition, it makes sense to check in advance whether the transaction requires AMCU clearance. This is not a difficult check, but it can save a great deal of money and stress.',
        'On the whole the logic is simple: in the market it is important not only to make money, but also not to break the rules, even if they are not always obvious.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон України «Про захист економічної конкуренції» № 2210-III',
        url: 'https://zakon.rada.gov.ua/laws/show/2210-14',
      },
      en: {
        label: 'Law of Ukraine "On Protection of Economic Competition" No. 2210-III',
        url: 'https://zakon.rada.gov.ua/laws/show/2210-14',
      },
    },
  },
];

export function findBlockExplanation(order: number | undefined): BlockExplanation | null {
  if (typeof order !== 'number') return null;
  return BLOCK_EXPLANATIONS.find(b => b.order === order) ?? null;
}
