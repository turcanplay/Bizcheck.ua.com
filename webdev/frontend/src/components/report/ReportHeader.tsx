import type { ReportData } from '@/types';
import { getZoneColor, getZone } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import { useQuiz } from '@/context/QuizContext';
import './ReportHeader.css';

interface ReportHeaderProps {
  report: ReportData;
}

export default function ReportHeader({ report }: ReportHeaderProps) {
  const { t, lang } = useLang();
  const { tests, selectedTestSlug } = useQuiz();
  const totalColor = getZoneColor(getZone(report.totalScore));
  const currentTest = tests.find(tt => tt.slug === selectedTestSlug);
  const testName = currentTest
    ? (lang === 'uk' ? currentTest.name_uk : currentTest.name_en)
    : '';

  return (
    <div className="report-header" data-pdf-section data-pdf-page>
      {/* Top gold accent line */}
      <div className="report-header__gold-line" />

      <div className="report-header__top">
        <div className="report-header__inner">
          <div className="report-header__brand">BIZCHECK.MD</div>
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
                style={{ width: `${report.totalScore}%`, background: totalColor }}
              />
            </div>
            <div className="report-header__total-bar-pct" style={{ color: totalColor }}>
              {report.totalScore}%
            </div>
          </div>

          <div className="report-header__total-big">
            <div className="report-header__total-num" style={{ color: totalColor }}>
              {report.totalScore}%
            </div>
            <div className="report-header__total-verdict">
              {report.totalScore >= 80
                ? t('verdictHigh')
                : report.totalScore >= 70
                  ? t('verdictMid')
                  : report.totalScore >= 65
                    ? t('verdictWarning')
                    : t('verdictLow')}
            </div>
          </div>

          <div className="report-header__legend">
            <div className="report-header__legend-title">{t('legendTitle')}</div>
            <div className="report-header__legend-grid">
              <div className="report-header__legend-row">
                <span className="report-header__legend-badge" style={{ background: '#05AB8C' }} />
                <span className="report-header__legend-range">{t('legendGreen')}</span>
                <span className="report-header__legend-desc">{t('legendGreenDesc')}</span>
              </div>
              <div className="report-header__legend-row">
                <span className="report-header__legend-badge" style={{ background: '#F5A800' }} />
                <span className="report-header__legend-range">{t('legendYellow')}</span>
                <span className="report-header__legend-desc">{t('legendYellowDesc')}</span>
              </div>
              <div className="report-header__legend-row">
                <span className="report-header__legend-badge" style={{ background: '#E07B00' }} />
                <span className="report-header__legend-range">{t('legendOrange')}</span>
                <span className="report-header__legend-desc">{t('legendOrangeDesc')}</span>
              </div>
              <div className="report-header__legend-row">
                <span className="report-header__legend-badge" style={{ background: '#D64535' }} />
                <span className="report-header__legend-range">{t('legendRed')}</span>
                <span className="report-header__legend-desc">{t('legendRedDesc')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom signature — thin gradient line + "Crowe · Bizcheck.md 2026" on the right */}
      <div className="report-header__foot">
        <div className="report-header__foot-line" />
        <div className="report-header__foot-text">
          Crowe · Bizcheck.md {new Date().getFullYear()}
        </div>
      </div>

      {/* Bottom gold accent line */}
      <div className="report-header__gold-line" />
    </div>
  );
}
