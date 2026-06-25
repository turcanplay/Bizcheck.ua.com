import Seo from '@/components/seo/Seo';
import { useLang } from '@/context/LanguageContext';
import Hero from './sections/Hero';
import AboutPlatform from './sections/AboutPlatform';
import WhyBizcheck from './sections/WhyBizcheck';
import CatalogSection from './sections/CatalogSection';
import Testimonials from './sections/Testimonials';
import FAQ from './sections/FAQ';
import FinalCta from './sections/FinalCta';
import Footer from './sections/Footer';
import './LandingPage.css';

const LANDING_TITLE_RO = 'Bizcheck.md · Evaluarea riscurilor afacerii · Crowe Turcan Mikhailenko';
const LANDING_TITLE_RU = 'Bizcheck.md · Оценка рисков бизнеса · Crowe Turcan Mikhailenko';
const LANDING_DESC_RO  = 'Diagnosticați riscurile afacerii prin metodologia Crowe. Test online gratuit, raport detaliat în PDF, șabloane juridice și consultanță pentru IMM-uri din Republica Moldova.';
const LANDING_DESC_RU  = 'Диагностика рисков бизнеса по методологии Crowe. Бесплатный онлайн-тест, детальный отчёт в PDF, юридические шаблоны и консультации для МСБ Республики Молдова.';

export default function LandingPage() {
  const { lang } = useLang();

  return (
    <div className="landing">
      <Seo
        title={lang === 'ru' ? LANDING_TITLE_RU : LANDING_TITLE_RO}
        description={lang === 'ru' ? LANDING_DESC_RU : LANDING_DESC_RO}
        path="/"
      />
      <Hero />
      <AboutPlatform />
      <WhyBizcheck />
      <CatalogSection />
      <Testimonials />
      <FAQ />
      <FinalCta />
      <Footer />
    </div>
  );
}
