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
      uk: 'Цей блок показує, як у Вас влаштоване управління компанією: скільки людей ухвалюють рішення, чи є між ними домовленості й наскільки ці домовленості зафіксовані.',
      en: 'This block shows how management is set up in your company: how many people make decisions, whether there are agreements between them, and how well those agreements are documented.',
    },
    risk: {
      uk: [
        'Коли в компанії один засновник, усе працює просто і швидко – рішення ухвалюються без погоджень, але водночас усі ризики концентруються на одній людині.',
        'Коли засновників двоє або більше, ситуація змінюється. Бізнес починає залежати не лише від ринку чи клієнтів, а від стосунків між партнерами. Якщо правила не зафіксовані, то за першої серйозної незгоди кожен починає по-своєму розуміти, «як правильно». У цей момент рішення можуть затягуватися, блокуватися або взагалі не ухвалюватися.',
        'На практиці це призводить до конфліктів, втрати контролю над компанією, зупинки окремих процесів, а іноді й до фактичного паралічу бізнесу. Особливо гостро це проявляється в ситуаціях, пов’язаних із грошима, виходом одного з учасників або стратегічними рішеннями.',
        'Окремий ризик виникає, якщо рішення засновників не фіксуються письмово. У цьому випадку неможливо підтвердити, хто і що погодив, і компанія стає вразливою як усередині, так і в зовнішніх спорах.',
      ],
      en: [
        'When a company has a single founder, everything works simply and quickly – decisions are made without approvals, but at the same time all the risk is concentrated in one person.',
        'When there are two or more founders, the situation changes. The business starts to depend not only on the market or clients, but on the relationship between the partners. If the rules are not documented, then at the first serious disagreement each person begins to interpret "the right way" differently. At that moment decisions can be delayed, blocked, or not made at all.',
        'In practice this leads to conflicts, loss of control over the company, stalled processes, and sometimes even effective paralysis of the business. This shows up especially sharply in situations involving money, the exit of one of the participants, or strategic decisions.',
        'A separate risk arises when founders’ decisions are not recorded in writing. In that case it is impossible to confirm who agreed to what, and the company becomes vulnerable both internally and in external disputes.',
      ],
    },
    action: {
      uk: [
        'Якщо у Вас кілька засновників, важливо письмово зафіксувати базові правила: хто ухвалює рішення, як розподіляється прибуток, що відбувається за конфлікту і як учасник може вийти з бізнесу.',
        'При цьому практика показує, що не обов’язково одразу робити складні й дорогі документи. Навіть короткі, зрозумілі домовленості, зафіксовані на папері та переглядувані хоча б раз на рік, уже суттєво підвищують стійкість бізнесу. Сам факт того, що Ви періодично повертаєтеся до цих правил, допомагає нагадати одне одному про ці правила, синхронізувати очікування та знизити ризик конфліктів.',
      ],
      en: [
        'If you have several founders, it is important to document the basic rules in writing: who makes decisions, how profit is distributed, what happens in the event of a conflict, and how a participant can exit the business.',
        'That said, practice shows that you do not need to create complex and expensive documents right away. Even short, clear agreements set down on paper and reviewed at least once a year already significantly improve the resilience of the business. The very fact that you periodically return to these rules helps remind each other of them, align expectations, and reduce the risk of conflict.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон №135/2007 про товариства з обмеженою відповідальністю',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152601&lang=ru',
      },
      en: {
        label: 'Law No. 135/2007 on limited liability companies',
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
      uk: 'Блок 2. Персональні дані та IT',
      en: 'Block 2. Personal data and IT',
    },
    essence: {
      uk: 'Цей блок показує, наскільки Ви контролюєте дані, з якими працює компанія. Ідеться про все: відеоспостереження, CRM-системи, хмарні сервіси, бази клієнтів, інформація про співробітників – будь-які інструменти, де є інформація про людей. По суті, це питання не про IT-безпеку, і навіть не про те, чи розумієте Ви, які дані у Вас є і що з ними відбувається, а про те, як державні органи інтерпретують Ваші дії з цими даними.',
      en: 'This block shows how well you control the data your company works with. It covers everything: video surveillance, CRM systems, cloud services, client databases, employee information – any tool that holds information about people. In essence, this is not a question about IT security, or even about whether you understand what data you have and what happens to it, but about how government authorities interpret your handling of that data.',
    },
    risk: {
      uk: [
        'Основний ризик тут у тому, що бізнес майже завжди використовує такі інструменти, але не оформлює це юридично й навіть не до кінця розуміє, як саме влаштована робота з даними.',
        'Наприклад, відеоспостереження – це вже обробка персональних даних. CRM-система – це зберігання і часто передавання даних третім особам. Хмарні сервіси можуть зберігати інформацію за межами країни або ЄС, і компанія про це навіть не знає. Фактично, будь-яка компанія, у якій є хоча б один співробітник, з точки зору закону здійснює обробку персональних даних.',
        'У результаті компанія формально порушує закон, навіть якщо нічого «поганого» не робить. Це може призвести до штрафів, перевірок, скарг з боку клієнтів чи співробітників і, що не менш важливо, до втрати довіри.',
        'Окрема проблема виникає, коли всередині компанії відсутні документи, які чітко фіксують, які дані Ви збираєте, де вони містяться і хто за них відповідає. Сама відсутність таких документів уже викликає в держави підозри й робить ситуацію для компанії юридично непередбачуваною. У цій ситуації стає вкрай складно довести, що Ви дійсно дотримуєтеся вимог закону.',
      ],
      en: [
        'The main risk here is that a business almost always uses such tools but does not formalize this legally and does not even fully understand how its handling of data actually works.',
        'For example, video surveillance is already the processing of personal data. A CRM system means storing and often transferring data to third parties. Cloud services may store information outside the country or the EU without the company even knowing. In fact, from a legal standpoint, any company with even a single employee is processing personal data.',
        'As a result, the company formally breaks the law even if it is not doing anything "bad." This can lead to fines, inspections, complaints from clients or employees and, just as importantly, loss of trust.',
        'A separate problem arises when the company lacks documents that clearly record what data you collect, where it is held, and who is responsible for it. The mere absence of such documents already raises suspicion with the state and makes the company’s situation legally unpredictable. In this situation it becomes extremely difficult to prove that you actually comply with the requirements of the law.',
      ],
    },
    action: {
      uk: [
        'Тут важливо не ускладнювати, а навести базовий лад.',
        'Потрібно для себе чітко розуміти, які персональні дані Ви збираєте, де вони зберігаються і хто має до них доступ.',
        'Окремо важливо перевірити використання відеоспостереження: на якій підставі воно здійснюється, чи розміщені таблички про те, що ведеться відеоспостереження, і чи дотримано вимог закону до зберігання та обробки таких даних.',
        'Якщо Ви працюєте з CRM або хмарними сервісами, важливо розуміти, де фізично розташовані сервери і хто саме обробляє дані. Якщо сервери розташовані в ЄС – Вам пощастило, якщо в будь-якій іншій країні – це вже зона ризику.',
        'Далі – зафіксувати це в простій письмовій політиці. Не потрібно робити складний документ – достатньо зрозумілого опису, який Ви самі зможете пояснити.',
        'Якщо в компанії є більш чутливі процеси (наприклад, відеоспостереження, обробка контактних або біометричних даних), украй важливо провести оцінку ризиків, оформити її документально й підготувати повний комплект необхідних документів. Це дасть змогу заздалегідь закрити вразливості й уникнути негативних наслідків. У протилежному випадку застосовуються штрафи згідно із Законом № 195 від 25.07.2024 – до 2 000 000 леїв або до 2% від загального обороту, застосовується найбільше значення.',
      ],
      en: [
        'Here it is important not to overcomplicate things, but to establish basic order.',
        'You need to clearly understand for yourself what personal data you collect, where it is stored, and who has access to it.',
        'It is separately important to check your use of video surveillance: on what legal basis it is carried out, whether signs are posted stating that video surveillance is in operation, and whether the legal requirements for storing and processing such data are met.',
        'If you work with a CRM or cloud services, it is important to understand where the servers are physically located and who exactly processes the data. If the servers are in the EU – you are in luck; if they are in any other country – that is already a risk zone.',
        'Next – record this in a simple written policy. There is no need to create a complex document – a clear description that you yourself can explain is enough.',
        'If the company has more sensitive processes (for example, video surveillance, or processing of contact or biometric data), it is essential to conduct a risk assessment, document it, and prepare a complete set of the necessary documents. This lets you close vulnerabilities in advance and avoid negative consequences. Otherwise, fines apply under Law No. 195 of 25.07.2024 – up to MDL 2,000,000 or up to 2% of total turnover, whichever is greater.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон №195/2024 про захист персональних даних',
        url: 'https://www.legis.md/cautare/getResults?doc_id=144681&lang=ru',
      },
      en: {
        label: 'Law No. 195/2024 on personal data protection',
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
      uk: 'Блок 3. Надійність договорів',
      en: 'Block 3. Reliability of contracts',
    },
    essence: {
      uk: 'Цей блок показує, наскільки договори у Вашій компанії реально захищають Ваш бізнес, а не просто створюють відчуття безпеки. Важлива не лише наявність договору як документа, а й те, як він з’явився, чи враховує він специфіку Вашої діяльності, чи оновлювався він разом зі зміною бізнесу і чи містить зрозумілі механізми захисту.',
      en: 'This block shows how well the contracts in your company actually protect your business, rather than simply creating a sense of security. What matters is not just the existence of a contract as a document, but how it came about, whether it accounts for the specifics of your activity, whether it was updated as the business changed, and whether it contains clear protection mechanisms.',
    },
    risk: {
      uk: [
        'Якщо договори збираються з випадкових шаблонів, копіюються у знайомих, завантажуються з інтернету або взагалі не використовуються, компанія фактично працює без нормальної юридичної опори. Поки все спокійно, це може довго не відчуватися як проблема. Але спокійний період у бізнесі часто створює хибне відчуття безпеки.',
        'У молдовських реаліях це особливо помітно: у нас кризи приходять так регулярно, що договори можна вважати не просто документами, а інструментом виживання. Кожен новий стресовий період швидко показує, що саме в компанії оформлено по-справжньому, а що трималося «на довірі», «на словах» чи «якось потім розберемося».',
        'Саме в момент затримок оплат, відмов від зобов’язань, спроб перегляду умов або спорів щодо якості стає зрозуміло, наскільки договір реально працює. Дуже часто виявляється, що документ або не захищає компанію, або не дає необхідних інструментів для тиску, переговорів і стягнення заборгованості.',
        'Особливо варто враховувати, що договір може просто не працювати, бо застарів і не враховує актуальні норми права, які в Молдові змінюються досить часто.',
        'Окрема проблема сьогодні пов’язана з тим, що багато хто починає складати договори через ChatGPT. Це зручно, швидко і іноді дійсно корисно як чернетка. Але є принциповий ризик: ChatGPT може не просто помилятися, а впевнено вигадувати те, чого взагалі не існує – неіснуючі конструкції, неточні посилання, чужу логіку з інших країн, слабкі або юридично порожні формулювання. Він пише переконливо, і саме тому ризик особливо небезпечний: людина може не помітити, де текст уже почав вводити її в оману.',
        'Тому, якщо Ви берете договори із шаблонів або довіряєте їхню підготовку штучному інтелекту без професійної перевірки, потрібно чесно відповісти собі на запитання: чи готові Ви довірити ризики свого бізнесу інструменту, який може галюцинувати й вигадувати норми, яких у природі немає. Якщо так – отже, потрібно так само чесно розуміти, що відповідальність за наслідки залишиться на Вас.',
        'Додатковий ризик виникає тоді, коли договори колись були підготовлені, але потім роками не переглядалися. Бізнес змінюється, процеси ускладнюються, законодавство оновлюється, а договір залишається старим. У результаті документ перестає відповідати тому, як компанія реально працює сьогодні.',
        'Якщо в договорі немає чітких правил про відповідальність, штрафи, строки, порядок приймання, розірвання та вирішення спорів, то в конфліктній ситуації компанії стає набагато складніше захищати свої гроші, строки й інтереси. На практиці це призводить до втрат, затяжних спорів, слабкої позиції в переговорах і неможливості швидко стягнути заборгованість.',
      ],
      en: [
        'If contracts are pieced together from random templates, copied from acquaintances, downloaded from the internet, or not used at all, the company is effectively operating without a proper legal foundation. As long as everything is calm, this may not feel like a problem for a long time. But a calm period in business often creates a false sense of security.',
        'In Moldovan reality this is especially noticeable: here crises come so regularly that contracts can be regarded not merely as documents, but as a survival tool. Each new stressful period quickly reveals what the company has genuinely put in order and what was held together "on trust," "on someone’s word," or "we’ll sort it out somehow later."',
        'It is precisely at the moment of payment delays, refusals to honor obligations, attempts to renegotiate terms, or quality disputes that it becomes clear how well a contract actually works. Very often it turns out that the document either does not protect the company or does not provide the necessary tools for leverage, negotiation, and debt recovery.',
        'It is especially worth keeping in mind that a contract may simply not work because it is outdated and does not reflect current legal norms, which change quite frequently in Moldova.',
        'A separate problem today stems from the fact that many people start drafting contracts with ChatGPT. It is convenient, fast, and sometimes genuinely useful as a draft. But there is a fundamental risk: ChatGPT can not only make mistakes but confidently invent things that do not exist at all – nonexistent constructs, inaccurate references, logic borrowed from other countries, and weak or legally empty wording. It writes persuasively, and that is exactly why the risk is so dangerous: a person may not notice where the text has already begun to mislead them.',
        'Therefore, if you take contracts from templates or entrust their preparation to artificial intelligence without professional review, you need to answer one question honestly: are you prepared to entrust the risks of your business to a tool that can hallucinate and invent rules that do not exist in nature. If so – then you also need to honestly understand that responsibility for the consequences will remain with you.',
        'An additional risk arises when contracts were prepared at some point but then not reviewed for years. The business changes, processes grow more complex, legislation is updated, and the contract stays the same. As a result, the document ceases to match how the company actually operates today.',
        'If a contract has no clear rules on liability, penalties, deadlines, acceptance procedures, termination, and dispute resolution, then in a conflict situation it becomes far harder for the company to protect its money, deadlines, and interests. In practice this leads to losses, drawn-out disputes, a weak negotiating position, and the inability to recover debt quickly.',
      ],
    },
    action: {
      uk: [
        'До договорів важливо ставитися не як до формальності, а як до інструмента захисту бізнесу.',
        'Краще, коли договори зроблені під Вашу реальну модель роботи, а не взяті з шаблонів чи зібрані через ChatGPT без перевірки. Такі тексти можуть виглядати переконливо, але містити помилки або вигадані конструкції, за які зрештою відповідаєте Ви.',
        'Договори потрібно періодично переглядати. Достатньо хоча б раз на рік ставити собі запитання: чи цей документ відповідає тому, як ми реально працюємо сьогодні?',
        'Простий тест – дайте договір людині «зі сторони». Якщо вона розуміє його інакше, ніж Ви задумували, отже, є слабкі місця.',
        'І обов’язково перевірте, чи є в договорі конкретні механізми захисту: відповідальність, штрафи, порядок оплати, приймання, розірвання і розгляду спорів. Якщо цього немає – договір Вас не захищає.',
        'І, будь ласка, не варто себе обманювати. Якщо Ви чогось не розумієте, то, найімовірніше, це буде використано проти Вас. Усе, що залишається незрозумілим, по суті є прихованим ризиком.',
      ],
      en: [
        'It is important to treat contracts not as a formality, but as a tool for protecting the business.',
        'It is better when contracts are tailored to your actual operating model rather than taken from templates or assembled with ChatGPT without review. Such texts may look convincing but contain errors or invented constructs for which you ultimately bear responsibility.',
        'Contracts need to be reviewed periodically. It is enough to ask yourself at least once a year: does this document match how we actually work today?',
        'A simple test – give the contract to an outside person. If they understand it differently from what you intended, that means there are weak spots.',
        'And be sure to check whether the contract contains concrete protection mechanisms: liability, penalties, payment procedures, acceptance, termination, and dispute resolution. If these are missing – the contract does not protect you.',
        'And please, do not fool yourself. If you do not understand something, it will most likely be used against you. Everything that remains unclear is essentially a hidden risk.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Цивільний кодекс Республіки Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=150498&lang=ru',
      },
      en: {
        label: 'Civil Code of the Republic of Moldova',
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
      uk: 'Блок 4. Фінанси та податкові ризики',
      en: 'Block 4. Finances and tax risks',
    },
    essence: {
      uk: 'Цей блок показує, наскільки акуратно в компанії вибудувані відносини з грошима, податками й фінансовою дисципліною. Тут перевіряється, чи відокремлені гроші бізнесу від особистих витрат власників, наскільки стабільно компанія виконує податкові зобов’язання, як працює з готівкою і чи взагалі розуміє своє реальне податкове навантаження.',
      en: 'This block shows how carefully the company has organized its relationship with money, taxes, and financial discipline. It checks whether business money is separated from the owners’ personal spending, how consistently the company meets its tax obligations, how it handles cash, and whether it understands its real tax burden at all.',
    },
    risk: {
      uk: [
        'Коли гроші компанії використовуються на особисті витрати засновників або директора, межа між бізнесом і особистими коштами розмивається.',
        'У цей момент найчастіше звучить проста думка: «нічого страшного, це ж і так мої гроші». Логіка зрозуміла, але з точки зору закону це не так. Компанія – це окрема структура, і її гроші – це не особисті гроші власника.',
        'І саме з таких, на перший погляд, безневинних дій найчастіше починаються реальні проблеми: питання від банку, донарахування податків, штрафи і ризик того, що в складній ситуації відповідальність уже перейде на Вас особисто.',
        'Прострочення за податками, навіть якщо вони були не системними, показують, що в компанії є слабкі місця у фінансовій дисципліні. А якщо такі прострочення повторюються, це вже ознака того, що бізнес живе в режимі постійної напруги і може будь-якої миті зіткнутися із санкціями, пенею, блокуваннями та додатковою увагою з боку держави.',
        'Окремий сигнал ризику – регулярна робота з готівкою. У наших реаліях це майже завжди чутлива зона, тому що саме готівка найчастіше викликає питання в банку, податкової служби та Центру з боротьби з відмиванням грошей. Якщо компанія регулярно знімає гроші, але не аналізує, навіщо і в якому обсязі це відбувається, це виглядає як непрозора фінансова модель.',
        'Додаткова проблема виникає тоді, коли бізнес узагалі не аналізує, яку частку обороту з’їдають податки. У цьому випадку компанія не керує податковим навантаженням, а просто «платить як виходить». Це робить фінансову модель сліпою: власник може бачити виручку, але не розуміти, скільки бізнес реально втрачає на податках, помилках і неефективній структурі.',
        'У підсумку все це може призвести до штрафів, пені, касових розривів, блокувань операцій, претензій з боку банку та податкових органів, а також до загальної втрати керованості фінансами.',
      ],
      en: [
        'When company money is used for the personal expenses of the founders or the director, the line between the business and personal funds becomes blurred.',
        'At that moment the most common thought is a simple one: "no big deal, it’s my money anyway." The logic is understandable, but from a legal standpoint it is not so. A company is a separate entity, and its money is not the owner’s personal money.',
        'And it is precisely from such seemingly harmless actions that real problems most often begin: questions from the bank, additional tax assessments, fines, and the risk that in a difficult situation liability will pass to you personally.',
        'Tax arrears, even if they were not systemic, show that the company has weak spots in its financial discipline. And if such arrears recur, that is already a sign the business is living in a state of constant strain and could at any moment face sanctions, penalty interest, blocked accounts, and extra attention from the state.',
        'A separate risk signal is regular handling of cash. In our reality this is almost always a sensitive zone, because cash is precisely what most often raises questions with the bank, the tax authority, and the Center for Combating Money Laundering. If the company regularly withdraws money but does not analyze why and in what volume it happens, it looks like a non-transparent financial model.',
        'An additional problem arises when the business does not analyze at all what share of turnover taxes consume. In this case the company does not manage its tax burden but simply "pays whatever comes out." This makes the financial model blind: the owner may see revenue but not understand how much the business actually loses to taxes, errors, and an inefficient structure.',
        'In the end, all of this can lead to fines, penalty interest, cash-flow gaps, blocked transactions, claims from the bank and tax authorities, and a general loss of control over finances.',
      ],
    },
    action: {
      uk: [
        'Тут насамперед важливо чесно відокремити гроші компанії від особистих витрат. Якщо власник або директор використовує кошти бізнесу для себе, такі операції мають бути або припинені, або правильно оформлені – у цьому випадку бюрократія стає Вашим надійним щитом від претензій з боку державних органів.',
        'Далі варто перевірити податкову дисципліну за останні роки й зрозуміти, чи були прострочення випадковістю, чи вже системою. Окремо потрібно подивитися на роботу з готівкою: як часто гроші знімаються, навіщо саме і чи можна скоротити такі операції.',
        'При цьому для бізнесу критично розуміти три базові речі. По-перше, скільки компанія реально заробляє – її чистий прибуток, тобто ті гроші, які залишаються після всіх витрат і податків. По-друге, який у неї оборот і як він поводиться в динаміці. І, по-третє, яку частку від цього обороту компанія платить у вигляді податків.',
        'Саме третій показник багато хто ігнорує, а даремно. У ньому часто прихована «міна сповільненої дії»: помилки, недоплати або неефективна податкова структура можуть довго не проявлятися, але під час перевірки з боку податкової це може різко й суттєво вдарити по бізнесу.',
      ],
      en: [
        'Here it is above all important to honestly separate company money from personal expenses. If the owner or director uses business funds for themselves, such transactions must be either stopped or properly documented – in that case, the paperwork becomes your reliable shield against claims from government authorities.',
        'Next, it is worth reviewing tax discipline over recent years and determining whether the arrears were a one-off or already a pattern. Separately, you should look at how cash is handled: how often money is withdrawn, exactly why, and whether such transactions can be reduced.',
        'At the same time, it is critical for a business to understand three basic things. First, how much the company actually earns – its net profit, that is, the money left after all expenses and taxes. Second, what its turnover is and how it behaves over time. And third, what share of that turnover the company pays in taxes.',
        'It is precisely the third figure that many people ignore, and in vain. It often hides a "time bomb": errors, underpayments, or an inefficient tax structure may go unnoticed for a long time, but during a tax inspection they can hit the business sharply and substantially.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Податковий кодекс Республіки Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=138613&lang=ru',
      },
      en: {
        label: 'Tax Code of the Republic of Moldova',
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
      uk: 'Блок 5. Особиста відповідальність і банкрутство',
      en: 'Block 5. Personal liability and insolvency',
    },
    essence: {
      uk: 'Цей блок показує, наскільки у Вашому бізнесі реально працює принцип «компанія окремо – особисті ризики окремо». Формально це так, але в низці ситуацій ця межа може розмиватися.',
      en: 'This block shows how well the principle of "the company separate – personal risk separate" actually works in your business. Formally it holds, but in a number of situations this line can become blurred.',
    },
    risk: {
      uk: [
        'Основна помилка – вважати, що наявність компанії автоматично повністю захищає особисті активи від можливого стягнення. На практиці це не завжди так.',
        'Є ситуації, у яких ризик переходить на рівень власника або директора. Найчастіше це пов’язано з особистими поруками, перевищенням повноважень або діями без належного оформлення всередині компанії.',
        'Особливо уважно потрібно ставитися до порук. У момент підписання вони часто сприймаються як формальність, але, по суті, це добровільне прийняття на себе додаткового ризику. Якщо зобов’язання не виконується, вимоги можуть бути пред’явлені вже до Вас особисто – у межах такої поруки.',
        'Окрема зона ризику – коли договори або зобов’язання підписуються без погодження або поза зрозумілою структурою ухвалення рішень. У звичайній роботі це може не створювати проблем, але в конфлікті чи спорі такі дії можуть бути оскаржені й призвести до збитків і претензій.',
        'Важливо розуміти: не кожне порушення автоматично веде до особистої відповідальності, але певні дії можуть суттєво підвищити цей ризик і «пробити» захист компанії.',
      ],
      en: [
        'The main mistake is to assume that having a company automatically and fully protects personal assets from possible collection. In practice this is not always the case.',
        'There are situations in which risk shifts to the level of the owner or director. Most often this involves personal guarantees, exceeding one’s authority, or actions taken without proper documentation inside the company.',
        'Guarantees deserve especially close attention. At the moment of signing they are often perceived as a formality, but in essence they are a voluntary assumption of additional risk. If the obligation is not met, claims may be brought against you personally – within the limits of that guarantee.',
        'A separate risk zone is when contracts or obligations are signed without approval or outside a clear decision-making structure. In ordinary operations this may cause no problems, but in a conflict or dispute such actions can be challenged and lead to losses and claims.',
        'It is important to understand: not every violation automatically leads to personal liability, but certain actions can substantially increase this risk and "pierce" the company’s protection.',
      ],
    },
    action: {
      uk: [
        'Тут ключове – усвідомленість і базова дисципліна.',
        'Потрібно чітко розуміти, чи підписувалися особисті поруки і в яких обсягах Ви вже прийняли на себе ризики. Надалі такі рішення варто ухвалювати лише усвідомлено, розуміючи наслідки й керуючи ними.',
        'Важливо вибудувати просту, але зрозумілу систему: ключові рішення фіксуються, суттєві зобов’язання погоджуються, повноваження не виходять за межі.',
        'І найголовніше – розуміти, де проходять межі особистої відповідальності у Вашій ситуації. Навіть базове розуміння цих правил уже суттєво знижує ризик помилок.',
      ],
      en: [
        'Here the key is awareness and basic discipline.',
        'You need to clearly understand whether personal guarantees were signed and to what extent you have already taken on risk. Going forward, such decisions should be made only deliberately, understanding and managing the consequences.',
        'It is important to build a simple but clear system: key decisions are recorded, material obligations are approved, and authority does not exceed its limits.',
        'And most importantly – understand where the boundaries of personal liability run in your situation. Even a basic understanding of these rules already substantially reduces the risk of mistakes.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон про неспроможність (банкрутство) Республіки Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152605&lang=ru',
      },
      en: {
        label: 'Law on insolvency (bankruptcy) of the Republic of Moldova',
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
      uk: 'Блок 6. Контрагенти та реальна діяльність',
      en: 'Block 6. Counterparties and real activity',
    },
    essence: {
      uk: 'Цей блок показує, наскільки компанія живе в реальності, а не лише «на папері». Тут проявляються дві дуже практичні речі. По-перше, чи вмієте Ви заздалегідь перевіряти, з ким починаєте працювати, і відсікати неблагонадійні компанії та потенційних шахраїв, які можуть створити Вам проблеми. По-друге, чи здатні Ви оцінити, чи дійсно контрагент може виконати свої зобов’язання або перебуває на межі банкрутства. Інакше кажучи, ідеться про те, чи розумієте Ви, що в компанії реально є, чим вона володіє і які зобов’язання на ній фактично лежать. По суті, це питання не лише про документи, а про керованість і передбачуваність бізнесу.',
      en: 'This block shows how much the company lives in reality rather than only "on paper." Two very practical things come to light here. First, whether you know how to check in advance whom you are starting to work with and to screen out unreliable companies and potential fraudsters who could create problems for you. Second, whether you are able to assess whether a counterparty can really meet its obligations or is on the verge of bankruptcy. In other words, it is about whether you understand what the company actually has, what it owns, and what obligations actually rest on it. In essence, this is a question not only about documents, but about the manageability and predictability of the business.',
    },
    risk: {
      uk: [
        'Якщо в компанії немає зрозумілого порядку перевірки контрагентів, співпраця часто починається «на довірі», «за рекомендацією» або просто тому, що потрібно швидко закрити угоду. У спокійний період це може здаватися нормальним. Але потім раптово виявляється, що контрагент проблемний, не виконує зобов’язань, має борги, ознаки фіктивності або просто від початку не був надійним партнером.',
        'У такій ситуації бізнес втрачає не лише гроші. Він втрачає час, управлінську увагу, репутацію і можливість швидко захистити себе. А в деяких випадках питання можуть з’явитися вже не тільки до контрагента, а й до самої компанії: чому Ви взагалі почали з ним працювати і наскільки сумлінно перевіряли його до угоди.',
        'Друга чутлива зона – інвентаризація. Багато хто сприймає її як нудний бухгалтерський обов’язок, який можна відкласти. Але на практиці саме вона показує, чи збігається те, що компанія думає про себе, з тим, що в неї є насправді.',
        'Якщо інвентаризація не проводиться, бізнес поступово починає жити в ілюзії. На папері може бути одне майно, одні залишки, одні зобов’язання, а в реальності – зовсім інша картина. І зазвичай це з’ясовується в найбільш невідповідний момент: перед продажем бізнесу, у конфлікті між засновниками, під час перевірки, зміни бухгалтера, спору з контрагентом чи касового розриву.',
        'У результаті компанія може зіткнутися з втратами, внутрішнім хаосом, спорами щодо активів і боргів, проблемами зі звітністю та слабкою позицією під час перевірок або переговорів.',
      ],
      en: [
        'If the company has no clear procedure for vetting counterparties, cooperation often begins "on trust," "on a recommendation," or simply because the deal needs to be closed quickly. In a calm period this may seem fine. But then it suddenly turns out that the counterparty is problematic, does not meet its obligations, has debts, shows signs of being a shell, or simply was never a reliable partner to begin with.',
        'In such a situation the business loses more than money. It loses time, management attention, reputation, and the ability to protect itself quickly. And in some cases questions may arise not only about the counterparty, but about the company itself: why did you start working with them at all, and how diligently did you check them before the deal.',
        'The second sensitive zone is inventory-taking. Many treat it as a tedious accounting duty that can be postponed. But in practice it is precisely what shows whether what the company thinks about itself matches what it actually has.',
        'If no inventory is taken, the business gradually starts living in an illusion. On paper there may be one set of assets, one set of balances, one set of obligations, while in reality the picture is entirely different. And this usually comes to light at the most inconvenient moment: before selling the business, in a conflict between founders, during an inspection, when changing accountants, in a dispute with a counterparty, or during a cash-flow gap.',
        'As a result, the company may face losses, internal chaos, disputes over assets and debts, reporting problems, and a weak position during inspections or negotiations.',
      ],
    },
    action: {
      uk: [
        'Тут не потрібно винаходити складну систему. Достатньо запровадити базову дисципліну.',
        'Перед початком роботи з новим контрагентом варто проводити хоча б базову перевірку: зрозуміти, хто це, чи діє він реально і чи немає в нього очевидних проблем.',
        'Інвентаризацію важливо сприймати не як формальність, а як спосіб періодично звіряти дані з реальністю. Навіть якщо немає ресурсу робити складні процедури, достатньо хоча б раз на рік перевіряти основні активи та зобов’язання.',
        'Загалом завдання просте – бачити, з ким Ви працюєте і що у Вас є.',
      ],
      en: [
        'Here there is no need to invent a complex system. It is enough to introduce basic discipline.',
        'Before starting to work with a new counterparty, it is worth carrying out at least a basic check: understand who they are, whether they genuinely operate, and whether they have any obvious problems.',
        'It is important to treat inventory-taking not as a formality, but as a way to periodically reconcile your records with reality. Even if there are no resources for complex procedures, it is enough to check the main assets and obligations at least once a year.',
        'On the whole the task is simple – to see whom you are working with and what you have.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон про бухгалтерський облік і фінансову звітність Республіки Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=140124&lang=ru',
      },
      en: {
        label: 'Law on accounting and financial reporting of the Republic of Moldova',
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
      uk: 'Блок 7. Трудові відносини',
      en: 'Block 7. Employment relations',
    },
    essence: {
      uk: 'Цей блок про те, наскільки компанія заздалегідь захищає свою клієнтську базу, внутрішню інформацію і ключові робочі зв’язки.',
      en: 'This block is about how well the company protects its client base, internal information, and key working relationships in advance.',
    },
    risk: {
      uk: [
        'Одна з найнеприємніших ситуацій для власника – коли співробітник іде не сам, а разом із клієнтами, листуванням, контактами і розумінням того, як у Вас усе влаштовано всередині. Дуже часто це відбувається не через «злий намір», а просто тому, що компанія заздалегідь не вибудувала межі.',
        'Якщо зі співробітником не підписано угоду про конфіденційність і акт передавання інформації, потім стає важко пояснити і довести, що саме було конфіденційною інформацією і комерційною таємницею. А якщо з ключовими людьми не врегульовано питання використання клієнтської бази після звільнення, бізнес може зіткнутися з дуже неприємною картиною: учора людина працювала у Вас, а завтра вже пише тим самим клієнтам від свого імені або від імені конкурента.',
        'Для підприємця це майже завжди виглядає однаково болісно: клієнтська база начебто створювалася за рахунок компанії, а в момент звільнення перетворюється на особистий актив співробітника. І тоді бізнес втрачає не лише виручку, а й контроль.',
      ],
      en: [
        'One of the most unpleasant situations for an owner is when an employee leaves not alone, but together with clients, correspondence, contacts, and an understanding of how everything works inside your company. Very often this happens not out of "malicious intent," but simply because the company did not set boundaries in advance.',
        'If no confidentiality agreement and information handover record have been signed with the employee, it later becomes hard to explain and prove exactly what constituted confidential information and a trade secret. And if the use of the client base after departure is not regulated with key people, the business may face a very unpleasant picture: yesterday the person worked for you, and tomorrow they are already writing to those same clients in their own name or in the name of a competitor.',
        'For an entrepreneur this almost always looks equally painful: the client base was seemingly built at the company’s expense, yet at the moment of departure it turns into the employee’s personal asset. And then the business loses not only revenue, but control.',
      ],
    },
    action: {
      uk: [
        'Тут краще не ускладнювати, а заздалегідь закрити базові речі. Зі співробітниками, які мають доступ до клієнтів, цін, листування, файлів і внутрішньої інформації, мають бути підписані зрозумілі угоди про конфіденційність. А з ключовими людьми варто окремо врегулювати, що відбувається з клієнтською базою і комерційною інформацією після їхнього звільнення.',
        'Чим раніше це оформлено спокійно і нормально, тим менша ймовірність, що потім доведеться наздоганяти вже втрачених клієнтів і розбиратися, хто кому що «мав на увазі».',
      ],
      en: [
        'Here it is better not to overcomplicate things, but to take care of the basics in advance. Employees who have access to clients, prices, correspondence, files, and internal information should sign clear confidentiality agreements. And with key people it is worth separately regulating what happens to the client base and commercial information after their departure.',
        'The sooner this is put in order calmly and properly, the lower the likelihood that you will later have to chase after clients who have already left and sort out who "meant" what to whom.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Трудовий кодекс Республіки Молдова',
        url: 'https://www.legis.md/cautare/getResults?doc_id=151096&lang=ru',
      },
      en: {
        label: 'Labor Code of the Republic of Moldova',
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
      uk: 'Блок 8. Ринкові ризики',
      en: 'Block 8. Market risks',
    },
    essence: {
      uk: 'Цей блок про те, як компанія поводиться на ринку і чи розуміє правила гри з точки зору конкуренції.',
      en: 'This block is about how the company behaves in the market and whether it understands the rules of the game from a competition standpoint.',
    },
    risk: {
      uk: [
        'Є речі, які в бізнес-середовищі часто вважаються «нормальними» – обговорити ціни з колегами по ринку, обмінятися планами, домовитися «щоб усім було комфортно». У реальності такі дії можуть сприйматися як порушення правил конкуренції.',
        'І проблема тут у тому, що це не виглядає як щось небезпечне. Люди спілкуються, зустрічаються, перебувають в асоціаціях, листуються в чатах. Але в певний момент такі розмови можуть стати підставою для серйозних претензій з боку регулюючих органів.',
        'У таких випадках бізнес може зіткнутися зі штрафами, перевірками та обмеженнями, і це вже зовсім інший рівень ризику – не операційний, а системний.',
        'Друга чутлива зона – угоди з бізнесом: купівля компанії, часток або об’єднання. Багато хто сприймає це як звичайну комерційну угоду, але закон установлює чіткі пороги, після яких вмикається обов’язковий контроль з боку Ради з конкуренції.',
        'Якщо сукупний оборот учасників угоди перевищує 50 000 000 леїв, і при цьому щонайменше два учасники мають оборот у Республіці Молдова понад 20 000 000 леїв кожен, така угода підлягає обов’язковому повідомленню до її реалізації.',
        'При цьому під самою угодою розуміється вже не лише факт передавання бізнесу, а момент підписання угоди, оголошення публічної оферти або набуття контролю.',
        'Якщо ця вимога ігнорується, навіть повністю «біла» і економічно логічна угода може створити серйозні проблеми: штрафи, втручання регулятора, необхідність перегляду умов або повернення до початкового стану. І це той випадок, коли питання виникає не до «змісту угоди», а до того, що вона була здійснена без дотримання процедури.',
      ],
      en: [
        'There are things that in the business environment are often considered "normal" – discussing prices with peers in the market, exchanging plans, agreeing "so that everyone is comfortable." In reality such actions may be perceived as a breach of competition rules.',
        'And the problem here is that it does not look like anything dangerous. People socialize, meet, belong to associations, chat in group messages. But at a certain point such conversations can become grounds for serious claims from regulatory authorities.',
        'In such cases the business may face fines, inspections, and restrictions, and that is already an entirely different level of risk – not operational, but systemic.',
        'The second sensitive zone is business transactions: buying a company, shares, or a merger. Many treat this as an ordinary commercial deal, but the law sets clear thresholds beyond which mandatory review by the Competition Council kicks in.',
        'If the combined turnover of the parties to a transaction exceeds MDL 50,000,000, and at least two of the parties each have turnover in the Republic of Moldova of more than MDL 20,000,000, such a transaction is subject to mandatory notification before it is carried out.',
        'Moreover, the transaction itself is understood to mean not only the fact of transferring the business, but the moment of signing the agreement, announcing a public offer, or acquiring control.',
        'If this requirement is ignored, even a fully "clean" and economically sound deal can create serious problems: fines, regulator intervention, the need to revise terms, or a return to the original state. And this is a case where the question arises not about the "substance of the deal," but about the fact that it was carried out without following the procedure.',
      ],
    },
    action: {
      uk: [
        'Тут важливо просто розуміти межі.',
        'З конкурентами краще не обговорювати ціни, умови продажів або плани – навіть у неформальній обстановці. Те, що виглядає як звичайне спілкування, за певних умов може бути інтерпретоване інакше.',
        'Якщо йдеться про купівлю бізнесу, часток або об’єднання компаній, має сенс заздалегідь перевірити, чи підпадає угода під вимоги повідомлення. Це не складна перевірка, але вона може зекономити багато грошей і нервів.',
        'Загалом логіка проста: на ринку важливо не лише заробляти, а й не порушувати правила, навіть якщо вони не завжди очевидні.',
      ],
      en: [
        'Here it is important simply to understand the boundaries.',
        'With competitors it is better not to discuss prices, sales terms, or plans – even in an informal setting. What looks like ordinary conversation can, under certain conditions, be interpreted differently.',
        'If it concerns buying a business, shares, or merging companies, it makes sense to check in advance whether the deal falls under the notification requirements. This is not a difficult check, but it can save a lot of money and nerves.',
        'On the whole the logic is simple: in the market it is important not only to earn money, but also not to break the rules, even if they are not always obvious.',
      ],
    },
    regulatory: {
      uk: {
        label: 'Закон про конкуренцію №183/2012',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152606&lang=ru',
      },
      en: {
        label: 'Competition Law No. 183/2012',
        url: 'https://www.legis.md/cautare/getResults?doc_id=152606&lang=ru',
      },
    },
  },
];

export function findBlockExplanation(order: number | undefined): BlockExplanation | null {
  if (typeof order !== 'number') return null;
  return BLOCK_EXPLANATIONS.find(b => b.order === order) ?? null;
}
