import type { ReportData, Zone } from '@/types';
import { getZoneColor, getZone, displayPct } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import { useQuiz } from '@/context/QuizContext';
import { pickLang } from '@/i18n/pickLang';
import type { TranslationKey } from '@/i18n/translations';
import './ReportHeader.css';

interface ReportHeaderProps {
  report: ReportData;
}

const ZONE_VERDICT_KEYS: Record<Zone, TranslationKey> = {
  safe: 'verdictHigh',
  developing: 'verdictMid',
  warning: 'verdictWarning',
  risk: 'verdictLow',
};

const ZONE_DESC_KEYS: Record<Zone, TranslationKey> = {
  safe: 'legendGreenDesc',
  developing: 'legendYellowDesc',
  warning: 'legendOrangeDesc',
  risk: 'legendRedDesc',
};

export default function ReportHeader({ report }: ReportHeaderProps) {
  const { t, lang } = useLang();
  const { tests, selectedTestSlug } = useQuiz();
  const zone = getZone(report.totalScore, report.zones);
  const totalColor = getZoneColor(zone);
  const shownPct = displayPct(report.totalScore);
  const currentTest = tests.find(tt => tt.slug === selectedTestSlug);
  const testName = pickLang(currentTest, 'name', lang);

  // Legend rows built from the SAME thresholds the report was scored with —
  // the ranges used to be hard-coded strings ("80% – 100%") that silently
  // contradicted any test whose zones an admin had edited.
  // A band whose upper bound falls below its lower bound is empty (the admin
  // collapsed it) and is dropped rather than printed as an inverted range.
  const { safe, developing, warn } = report.zones;
  const legendRows = ([
    { zone: 'safe', lo: safe, hi: 100 },
    { zone: 'developing', lo: developing, hi: safe - 1 },
    { zone: 'warning', lo: warn, hi: developing - 1 },
    { zone: 'risk', lo: 0, hi: warn - 1 },
  ] as { zone: Zone; lo: number; hi: number }[]).filter(b => b.hi >= b.lo);

  return (
    <div className="report-header" data-pdf-section data-pdf-page>
      {/* Top gold accent line */}
      <div className="report-header__gold-line" />

      <div className="report-header__top">
        <div className="report-header__inner">
          <div className="report-header__brand">BIZCHECK.COM.UA</div>
          <h1 className="report-header__title">{t('reportTitle')}</h1>
          <p className="report-header__subtitle">{t('reportSubtitle')}</p>
          <div className="report-header__meta">
            <span className="report-header__company">
              {report.userInfo.firstName} {report.userInfo.lastName}
            </span>
            <span className="report-header__meta-sep" />
            <span className="report-header__date">{report.date}</span>
          </div>
        </div>
      </div>

      <div className="report-header__scores">
        <div className="report-header__scores-inner">
          <div className="report-header__total-row">
            <div className="report-header__total-label">{t('overallResult')}</div>
            {testName && (
              <div className="report-header__test-name">{testName}</div>
            )}
            <div className="report-header__total-bar">
              <div
                className="report-header__total-bar-fill"
                style={{ width: `${shownPct}%`, background: totalColor }}
              />
            </div>
            <div className="report-header__total-bar-pct" style={{ color: totalColor }}>
              {shownPct}%
            </div>
          </div>

          <div className="report-header__total-big">
            <div className="report-header__total-num" style={{ color: totalColor }}>
              {shownPct}%
            </div>
            <div className="report-header__total-verdict">
              {t(ZONE_VERDICT_KEYS[zone])}
            </div>
          </div>

          <div className="report-header__legend">
            <div className="report-header__legend-title">{t('legendTitle')}</div>
            <div className="report-header__legend-grid">
              {legendRows.map(band => (
                <div className="report-header__legend-row" key={band.zone}>
                  <span
                    className="report-header__legend-badge"
                    style={{ background: getZoneColor(band.zone) }}
                  />
                  <span className="report-header__legend-range">
                    {Math.round(band.lo)}% – {Math.round(band.hi)}%
                  </span>
                  <span className="report-header__legend-desc">{t(ZONE_DESC_KEYS[band.zone])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom signature — thin gradient line + "Crowe · Bizcheck.com.ua 2026" on the right */}
      <div className="report-header__foot">
        <div className="report-header__foot-line" />
        <div className="report-header__foot-text">
          Crowe · Bizcheck.com.ua {new Date().getFullYear()}
        </div>
      </div>

      {/* Bottom gold accent line */}
      <div className="report-header__gold-line" />
    </div>
  );
}
