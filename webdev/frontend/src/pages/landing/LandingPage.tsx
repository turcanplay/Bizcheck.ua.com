import Seo from '@/components/seo/Seo';
import { useLang } from '@/context/LanguageContext';
import Hero from './sections/Hero';
import CroweIntro from './sections/CroweIntro';
import AboutPlatform from './sections/AboutPlatform';
import WhyBizcheck from './sections/WhyBizcheck';
import CatalogSection from './sections/CatalogSection';
import Testimonials from './sections/Testimonials';
import FAQ from './sections/FAQ';
import FinalCta from './sections/FinalCta';
import Footer from './sections/Footer';
import './LandingPage.css';

const LANDING_TITLE_UK = 'Bizcheck.md · Оцінка ризиків бізнесу · Crowe Turcan Mikhailenko';
const LANDING_TITLE_EN = 'Bizcheck.md · Business Risk Assessment · Crowe Turcan Mikhailenko';
const LANDING_DESC_UK  = 'Діагностика ризиків бізнесу за методологією Crowe. Безкоштовний онлайн-тест, детальний звіт у PDF, юридичні шаблони та консультації для МСБ.';
const LANDING_DESC_EN  = 'Business risk diagnostics based on the Crowe methodology. A free online test, a detailed PDF report, legal templates, and consulting for SMEs in the Republic of Moldova.';

export default function LandingPage() {
  const { lang } = useLang();

  return (
    <div className="landing">
      <Seo
        title={lang === 'en' ? LANDING_TITLE_EN : LANDING_TITLE_UK}
        description={lang === 'en' ? LANDING_DESC_EN : LANDING_DESC_UK}
        path="/"
      />
      <Hero />
      <CroweIntro />
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
