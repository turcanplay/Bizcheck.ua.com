import type { BlockResult } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import { getZoneColor } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import './BlockGrid.css';

interface BlockGridProps {
  blocks: BlockResult[];
}

/** Split array into chunks of given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export default function BlockGrid({ blocks }: BlockGridProps) {
  const { t } = useLang();
  const chunks = chunk(blocks, 4);

  return (
    <>
      {chunks.map((group, ci) => (
        <section className="block-grid" data-pdf-section data-pdf-page key={ci}>
          <div className="block-grid__section-bar">
            <h2 className="block-grid__section-title">{t('resultsByCategory')}</h2>
          </div>
          <div className="block-grid__grid">
            {group.map((b, i) => {
              const color = getZoneColor(b.zone);
              return (
                <div className="block-grid__card" key={b.id}>
                  <div className="block-grid__card-donut">
                    <DonutChart
                      percentage={b.score}
                      color={color}
                      size={200}
                      strokeWidth={16}
                      animated={true}
                      delay={200 + (ci * 4 + i) * 150}
                    />
                  </div>
                  <div className="block-grid__card-info">
                    <span className="block-grid__card-num">{t('blockLabel')} {b.order}</span>
                    <span className="block-grid__card-title">{b.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
