/**
 * Crowe Mikhailenko partners shown in the landing "who is behind BizCheck"
 * section, below the two managing partners.
 *
 * Source: the client's own deck `Crowe mikhailenko_2026_ua.pptx` (2026), team
 * slide. Only people whose title actually contains "Партнер" are listed here —
 * practice heads and advisers from the same slide are deliberately excluded.
 *
 * Names are stored in natural case; the uppercase look comes from CSS
 * (`text-transform`), so screen readers still get real words rather than a
 * string of capitals.
 *
 * Photos live in `public/images/team/` as `.jpg` + `.webp` pairs — BOTH must
 * exist, a <picture> does not fall back to the <img> when its <source> 404s.
 * They are 512×512 tiles normalised from the deck: every head sits at the same
 * height and the same scale, on the same Crowe Indigo ground, so the row reads
 * as one set instead of ten unrelated crops.
 */

export interface Partner {
  /** Stable key — also the photo basename. */
  slug: string;
  name: { uk: string; en: string };
  role: { uk: string; en: string };
}

export const PARTNERS: Partner[] = [
  {
    slug: 'olha-bohdanova',
    name: { uk: 'Ольга Богданова', en: 'Olha Bohdanova' },
    role: { uk: 'Партнер, сертифікований аудитор', en: 'Partner, certified auditor' },
  },
  {
    slug: 'andrii-dukhnytskyi',
    name: { uk: 'Андрій Духницький', en: 'Andrii Dukhnytskyi' },
    role: { uk: 'Партнер, керівник корпоративної практики', en: 'Partner, head of corporate practice' },
  },
  {
    slug: 'vladyslav-papakin',
    name: { uk: 'Владислав Папакін', en: 'Vladyslav Papakin' },
    role: {
      uk: 'Партнер, керівник практики трансфертного ціноутворення',
      en: 'Partner, head of transfer pricing practice',
    },
  },
  {
    slug: 'serhii-kliutsa',
    name: { uk: 'Сергій Клюца', en: 'Serhii Kliutsa' },
    role: { uk: 'Партнер, керівник практики адвокатів', en: 'Partner, head of attorneys practice' },
  },
  {
    slug: 'tetiana-honcharenko',
    name: { uk: 'Тетяна Гончаренко', en: 'Tetiana Honcharenko' },
    role: { uk: 'Партнер, член наглядової ради', en: 'Partner, supervisory board member' },
  },
  {
    slug: 'ruslan-zemlianyi',
    name: { uk: 'Руслан Земляний', en: 'Ruslan Zemlianyi' },
    role: {
      uk: 'Партнер, керівник практики інвестування і розвитку бізнесу',
      en: 'Partner, head of investment and business development practice',
    },
  },
  {
    slug: 'andrii-sysoiev',
    name: { uk: 'Андрій Сисоєв', en: 'Andrii Sysoiev' },
    role: { uk: 'Партнер, член наглядової ради', en: 'Partner, supervisory board member' },
  },
  {
    slug: 'artem-vasylenko',
    name: { uk: 'Артем Василенко', en: 'Artem Vasylenko' },
    role: { uk: 'Партнер, керівник практики IT', en: 'Partner, head of IT practice' },
  },
  {
    slug: 'volodymyr-zaika',
    name: { uk: 'Володимир Заїка', en: 'Volodymyr Zaika' },
    role: { uk: 'Партнер, керівник HR-практики', en: 'Partner, head of HR practice' },
  },
  {
    // The deck contradicts itself: the team slide omits "Партнер", the GR
    // practice slide states it. Following the practice slide — confirm with
    // the client before printing this anywhere harder to change than a page.
    slug: 'yefrem-lashchuk',
    name: { uk: 'Єфрем Лащук', en: 'Yefrem Lashchuk' },
    role: {
      uk: 'Партнер, керівник практики GR та публічної адвокації',
      en: 'Partner, head of GR and public advocacy practice',
    },
  },
];
