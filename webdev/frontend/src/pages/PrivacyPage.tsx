import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import Seo, { breadcrumbSchema } from '@/components/seo/Seo';
import './PrivacyPage.css';

export default function PrivacyPage() {
  const { lang } = useLang();

  return (
    <div className="privacy-page">
      <Seo
        title={lang === 'ru'
          ? 'Политика конфиденциальности · Bizcheck.md'
          : 'Politica de confidențialitate · Bizcheck.md'}
        description={lang === 'ru'
          ? 'Политика обработки персональных данных, cookies и условия использования платформы Bizcheck.md от Crowe Turcan Mikhailenko.'
          : 'Politica de prelucrare a datelor personale, cookies și condițiile de utilizare ale platformei Bizcheck.md de la Crowe Turcan Mikhailenko.'}
        path="/confidentialitate"
        jsonLd={breadcrumbSchema([
          { name: lang === 'ru' ? 'Главная' : 'Acasă', path: '/' },
          { name: lang === 'ru' ? 'Конфиденциальность' : 'Confidențialitate', path: '/confidentialitate' },
        ])}
      />
      <div className="privacy-page__inner">
        <Link to="/" className="privacy-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 7H2M6 3L2 7l4 4" />
          </svg>
          {lang === 'ro' ? 'Înapoi la pagina principală' : 'Вернуться на главную'}
        </Link>

        <h1 className="privacy-page__title">
          {lang === 'ro'
            ? 'Politica de confidențialitate'
            : 'Политика конфиденциальности'}
        </h1>

        <p className="privacy-page__sub">
          {lang === 'ro'
            ? 'Cookies · Procesarea datelor personale · Termeni de utilizare'
            : 'Cookies · Обработка персональных данных · Условия использования'}
        </p>

        {/* TODO: conținutul oficial se adaugă aici (Crowe/Legal). */}
        <section className="privacy-page__section">
          <h2>{lang === 'ro' ? '1. Introducere' : '1. Введение'}</h2>
          <p>
            {lang === 'ro'
              ? 'Conținutul acestei pagini urmează să fie completat cu textul oficial al politicii de confidențialitate. Pentru întrebări, contactați-ne la office@bizcheck.md.'
              : 'Содержимое этой страницы будет дополнено официальным текстом политики конфиденциальности. По вопросам: office@bizcheck.md.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'ro' ? '2. Datele colectate' : '2. Собираемые данные'}</h2>
          <p>
            {lang === 'ro'
              ? 'În timpul utilizării platformei BizCheck colectăm: nume, prenume și, în funcție de metoda de livrare aleasă, număr de telefon sau adresă e-mail. Datele sunt stocate criptat.'
              : 'При использовании платформы BizCheck мы собираем: имя, фамилию и, в зависимости от выбранного способа доставки, номер телефона или адрес эл. почты. Данные хранятся в зашифрованном виде.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'ro' ? '3. Cookies' : '3. Cookies'}</h2>
          <p>
            {lang === 'ro'
              ? 'Folosim cookies tehnice pentru funcționarea aplicației (selectarea limbii, sesiunea de test). Nu folosim cookies de tracking publicitar.'
              : 'Мы используем технические cookies для работы приложения (выбор языка, сессия теста). Мы не используем рекламные tracking-cookies.'}
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>{lang === 'ro' ? '4. Drepturile dumneavoastră' : '4. Ваши права'}</h2>
          <p>
            {lang === 'ro'
              ? 'Aveți dreptul să solicitați accesul, rectificarea sau ștergerea datelor personale. Trimiteți cererea la office@bizcheck.md.'
              : 'Вы имеете право запросить доступ, исправление или удаление персональных данных. Отправьте запрос на office@bizcheck.md.'}
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
