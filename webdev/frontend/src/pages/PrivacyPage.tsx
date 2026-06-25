import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import Seo, { breadcrumbSchema } from '@/components/seo/Seo';
import './PrivacyPage.css';

export default function PrivacyPage() {
  const { lang } = useLang();

  return (
    <div className="privacy-page">
      <Seo
        title={lang === 'en'
          ? 'Privacy Policy · Bizcheck.md'
          : 'Політика конфіденційності · Bizcheck.md'}
        description={lang === 'en'
          ? 'Personal data processing policy, cookies, and terms of use of the Bizcheck.md platform by Crowe Turcan Mikhailenko.'
          : 'Політика обробки персональних даних, файлів cookie та умови використання платформи Bizcheck.md від Crowe Turcan Mikhailenko.'}
        path="/confidentialitate"
        jsonLd={breadcrumbSchema([
          { name: lang === 'en' ? 'Home' : 'Головна', path: '/' },
          { name: lang === 'en' ? 'Privacy' : 'Конфіденційність', path: '/confidentialitate' },
        ])}
      />
      <div className="privacy-page__inner">
        <Link to="/" className="privacy-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 7H2M6 3L2 7l4 4" />
          </svg>
          {lang === 'uk' ? 'Назад на головну сторінку' : 'Back to home page'}
        </Link>

        <h1 className="privacy-page__title">
          {lang === 'uk'
            ? 'Політика конфіденційності'
            : 'Privacy Policy'}
        </h1>

        <p className="privacy-page__sub">
          {lang === 'uk'
            ? 'Файли cookie · Обробка персональних даних · Умови використання'
            : 'Cookies · Personal data processing · Terms of use'}
        </p>

        {/* TODO: official content to be added here (Crowe/Legal). */}
        <section className="privacy-page__section">
          <h2>{lang === 'uk' ? '1. Вступ' : '1. Introduction'}</h2>
          <p>
            {lang === 'uk'
              ? 'Зміст цієї сторінки буде доповнено офіційним текстом політики конфіденційності. З питаннями звертайтеся до нас за адресою office@bizcheck.md.'
              : 'The content of this page will be supplemented with the official text of the privacy policy. For questions, contact us at office@bizcheck.md.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'uk' ? '2. Дані, які ми збираємо' : '2. Data collected'}</h2>
          <p>
            {lang === 'uk'
              ? 'Під час використання платформи BizCheck ми збираємо: імʼя, прізвище та, залежно від обраного способу доставки, номер телефону або адресу електронної пошти. Дані зберігаються в зашифрованому вигляді.'
              : 'While using the BizCheck platform we collect: first name, last name and, depending on the chosen delivery method, a phone number or email address. The data is stored in encrypted form.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'uk' ? '3. Файли cookie' : '3. Cookies'}</h2>
          <p>
            {lang === 'uk'
              ? 'Ми використовуємо технічні файли cookie для роботи застосунку (вибір мови, сесія тесту). Ми не використовуємо рекламні файли cookie для відстеження.'
              : 'We use technical cookies for the application to function (language selection, test session). We do not use advertising tracking cookies.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'uk' ? '4. Ваші права' : '4. Your rights'}</h2>
          <p>
            {lang === 'uk'
              ? 'Ви маєте право вимагати доступу до персональних даних, їх виправлення або видалення. Надішліть запит на office@bizcheck.md.'
              : 'You have the right to request access to, rectification of, or deletion of your personal data. Send your request to office@bizcheck.md.'}
          </p>
        </section>

        <div className="privacy-page__contact">
          <strong>Crowe Turcan Mikhailenko</strong>
          <span>office@bizcheck.md · crowe-tm.md</span>
        </div>
      </div>
    </div>
  );
}
