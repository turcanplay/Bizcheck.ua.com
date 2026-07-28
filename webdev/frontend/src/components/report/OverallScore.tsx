import type { ReportData } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import { getZoneColor, getZone, displayPct } from '@/utils/scoring';
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

const ZONE_CONCLUSION_KEYS: Record<Zone, TranslationKey> = {
  safe: 'conclusionHigh',
  developing: 'conclusionMid',
  warning: 'conclusionWarning',
  risk: 'conclusionLow',
};

export default function OverallScore({ report }: OverallScoreProps) {
  const { t } = useLang();
  // Zone from the RAW score with the TEST's thresholds; only the printed
  // number is floored to 1 (see displayPct) so a 0 still reads as risk.
  const zone = getZone(report.totalScore, report.zones);
  const color = getZoneColor(zone);
  const zoneLabel = t(ZONE_LABEL_KEYS[zone]);
  const shownPct = displayPct(report.totalScore);

  return (
    <section className="overall-score" data-pdf-section>
      <div className="overall-score__section-bar">
        <h2 className="overall-score__section-title">{t('overallResult')}</h2>
      </div>

      <div className="overall-score__card">
        <div className="overall-score__left">
          <div className="overall-score__donut">
            <DonutChart
              percentage={shownPct}
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
            {t('onPathTo', { pct: shownPct })}
          </p>
          <p className="overall-score__conclusion-detail">
            {t(ZONE_CONCLUSION_KEYS[zone])}
          </p>
        </div>
      </div>
    </section>
  );
}
