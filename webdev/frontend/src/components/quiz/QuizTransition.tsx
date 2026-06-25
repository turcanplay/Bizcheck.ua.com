import { useEffect, useState } from 'react';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import DonutChart from '@/components/ui/DonutChart';
import { calculateBlockScore, getZone, getZoneColor } from '@/utils/scoring';
import './QuizTransition.css';

export default function QuizTransition() {
  const { blocks, currentBlock, answers, goToBlock } = useQuiz();
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  const completedBlock = blocks[currentBlock];
  const nextBlock = blocks[currentBlock + 1];
  const score = calculateBlockScore(completedBlock, answers);
  const zone = getZone(score);
  const color = getZoneColor(zone);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  function handleContinue() {
    goToBlock(currentBlock + 1);
  }

  return (
    <div className={`quiz-transition ${visible ? 'quiz-transition--visible' : ''}`}>
      <div className="quiz-transition__card">
        <div className="quiz-transition__check">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="var(--green)" />
            <path d="M14 24l7 7 13-13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="quiz-transition__title">{t('blockCompleted')}</h2>

        <div className="quiz-transition__block-name">
          {t('blockLabel')} {currentBlock + 1}: {completedBlock.title}
        </div>

        <div className="quiz-transition__donut">
          <DonutChart
            percentage={score}
            color={color}
            size={140}
            strokeWidth={14}
            animated={true}
            delay={300}
          />
        </div>

        {nextBlock && (
          <div className="quiz-transition__next-label">
            {t('nextLabel')} <strong>{t('blockLabel')} {currentBlock + 2} — {nextBlock.title}</strong>
          </div>
        )}

        <button className="quiz-transition__btn" onClick={handleContinue}>
          {t('btnContinue')}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 7h10M8 3l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
