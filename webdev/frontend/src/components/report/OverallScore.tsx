import type { ReportData } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import { getZoneColor, getZone } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import type { Zone } from '@/types';
import type { TranslationKey } from '@/i18n/translations';
import './OverallScore.css';

interface OverallScoreProps {
  report: ReportData;
}

const ZONE_LABEL_KEYS: Record<Zone, TranslationKey> = {
  safe: 'zoneSafe',
  developing: 'zoneDeveloping',
  warning: 'zoneWarning',
  risk: 'zoneRisk',
};

export default function OverallScore({ report }: OverallScoreProps) {
  const { t } = useLang();
  const zone = getZone(report.totalScore);
  const color = getZoneColor(zone);
  const zoneLabel = t(ZONE_LABEL_KEYS[zone]);

  return (
    <section className="overall-score" data-pdf-section>
      <div className="overall-score__section-bar">
        <h2 className="overall-score__section-title">{t('overallResult')}</h2>
      </div>

      <div className="overall-score__card">
        <div className="overall-score__left">
          <div className="overall-score__donut">
            <DonutChart
              percentage={report.totalScore}
              color={color}
              size={180}
              strokeWidth={18}
              animated={true}
              delay={400}
              labelSize={48}
            />
          </div>
          <div className="overall-score__zone-badge" style={{ background: color }}>
            {zoneLabel}
          </div>
        </div>

        <div className="overall-score__right">
          <div className="overall-score__conclusion-label">{t('conclusion')}</div>
          <p className="overall-score__conclusion-headline">
            {t('onPathTo', { pct: report.totalScore })}
          </p>
          <p className="overall-score__conclusion-detail">
            {report.totalScore >= 80
              ? t('conclusionHigh')
              : report.totalScore >= 70
                ? t('conclusionMid')
                : report.totalScore >= 65
                  ? t('conclusionWarning')
                  : t('conclusionLow')}
          </p>
        </div>
      </div>
    </section>
  );
}
