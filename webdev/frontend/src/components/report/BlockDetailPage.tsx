import type { BlockResult } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import { getZoneColor } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import { findBlockExplanation } from '@/data/blockExplanations';
import type { TranslationKey } from '@/i18n/translations';
import type { Zone } from '@/types';
import './BlockDetailPage.css';

interface BlockDetailPageProps {
  block: BlockResult;
}

const ZONE_LABEL_KEYS: Record<Zone, TranslationKey> = {
  safe: 'zoneSafe',
  developing: 'zoneDeveloping',
  warning: 'zoneWarning',
  risk: 'zoneRisk',
};

export default function BlockDetailPage({ block }: BlockDetailPageProps) {
  const { t, lang } = useLang();
  const explanation = findBlockExplanation(block.order);
  if (!explanation) return null;

  const color = getZoneColor(block.zone);
  const zoneLabel = t(ZONE_LABEL_KEYS[block.zone]);

  const title = explanation.title[lang];
  const essence = explanation.essence[lang];
  const riskParagraphs = explanation.risk[lang];
  const actionParagraphs = explanation.action[lang];
  const regulatory = explanation.regulatory[lang];

  return (
    <section className="block-detail" data-pdf-section>
      <header className="block-detail__top">
        <div className="block-detail__score" style={{ borderColor: color }}>
          <DonutChart
            percentage={block.score}
            color={color}
            size={130}
            strokeWidth={11}
            animated={true}
            delay={120}
            labelSize={30}
          />
          <div className="block-detail__zone" style={{ background: color }}>
            {zoneLabel}
          </div>
        </div>

        <div className="block-detail__header-right">
          <div className="block-detail__block-num">
            {t('blockLabel')} {block.order}
          </div>
          <h2 className="block-detail__title">{title}</h2>
          <p className="block-detail__essence-text">{essence}</p>
        </div>
      </header>

      <div className="block-detail__section">
        <h3 className="block-detail__section-title block-detail__section-title--risk">
          {t('blockRiskLabel')}
        </h3>
        <div className="block-detail__paragraphs">
          {riskParagraphs.map((p, i) => (
            <p key={i} className="block-detail__p">{p}</p>
          ))}
        </div>
      </div>

      <div className="block-detail__section">
        <h3 className="block-detail__section-title block-detail__section-title--action">
          {t('blockActionLabel')}
        </h3>
        <div className="block-detail__paragraphs">
          {actionParagraphs.map((p, i) => (
            <p key={i} className="block-detail__p">{p}</p>
          ))}
        </div>
      </div>

      <div className="block-detail__regulatory">
        <div className="block-detail__regulatory-label">
          {t('blockRegulatoryLabel')}
        </div>
        <a
          href={regulatory.url}
          className="block-detail__regulatory-link"
          data-pdf-link={regulatory.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {regulatory.label}
        </a>
      </div>
    </section>
  );
}
