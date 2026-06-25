import type { BlockResult, Zone } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import { getZoneColor } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import './ZoneSection.css';

interface ZoneSectionProps {
  zone: Zone;
  blocks: BlockResult[];
}

const ZONE_LABEL_KEYS: Record<Zone, TranslationKey> = {
  safe: 'zoneSafe',
  developing: 'zoneDeveloping',
  warning: 'zoneWarning',
  risk: 'zoneRisk',
};

const ZONE_DESC_KEYS: Record<Zone, TranslationKey> = {
  risk: 'zoneDescRisk',
  warning: 'zoneDescWarning',
  developing: 'zoneDescDeveloping',
  safe: 'zoneDescSafe',
};

export default function ZoneSection({ zone, blocks }: ZoneSectionProps) {
  const { t } = useLang();

  const color = getZoneColor(zone);
  const label = t(ZONE_LABEL_KEYS[zone]);
  const avgScore = blocks.length === 0
    ? 0
    : Math.round(blocks.reduce((s, b) => s + b.score, 0) / blocks.length);

  return (
    <section className="zone-section" data-pdf-section style={{ '--zone-color': color } as React.CSSProperties}>
      <div className="zone-section__header">
        <div className="zone-section__dot" />
        <h3 className="zone-section__title">{label}</h3>
        <span className="zone-section__avg">{t('indicator')} {avgScore}%</span>
      </div>

      <div className="zone-section__desc-text">{t(ZONE_DESC_KEYS[zone])}</div>

      {blocks.length === 0 && (
        <div className="zone-section__empty">—</div>
      )}

      <div className="zone-section__cards">
        {blocks.map(b => (
          <div className="zone-section__card" key={b.id}>
            <div className="zone-section__card-left">
              <DonutChart
                percentage={b.score}
                color={color}
                size={88}
                strokeWidth={8}
                animated={true}
                delay={200}
                labelSize={20}
              />
            </div>
            <div className="zone-section__card-right">
              <div className="zone-section__card-num">{t('blockLabel')} {b.order}</div>
              <div className="zone-section__card-name">{b.title}</div>
              <div className="zone-section__card-bar">
                <div
                  className="zone-section__card-fill"
                  style={{ width: `${b.score}%`, background: color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
