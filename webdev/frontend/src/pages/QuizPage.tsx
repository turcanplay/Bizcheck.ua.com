import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import QuizProgress from '@/components/quiz/QuizProgress';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import './QuizPage.css';

export default function QuizPage() {
  const {
    currentQuestion,
    canGoPrev,
    recordAnswer,
    nextQuestion,
    prevQuestion,
    loading,
    answerableQuestionCount,
    restartQuiz,
  } = useQuiz();
  const { t } = useLang();

  // Quiz content is authored by hand in the admin panel, so "this test has no
  // questions" is a normal state — not an error. It used to render `null`,
  // i.e. a blank white page with no explanation and no way out. Show the empty
  // state explicitly, with a way back to the test picker.
  if (loading) {
    return (
      <div className="quiz-page">
        <div className="quiz-page__content">
          <div className="quiz-page__notice">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (answerableQuestionCount === 0) {
    return (
      <div className="quiz-page">
        <div className="quiz-page__content">
          <div className="quiz-page__notice quiz-page__notice--warn">{t('noQuestions')}</div>
          <button type="button" className="quiz-page__notice-btn" onClick={restartQuiz}>
            {t('ctaRestart')}
          </button>
        </div>
      </div>
    );
  }

  // Transient: questions exist but the "enter block" effect has not picked the
  // first one yet (same tick as a block change). Render nothing for that frame.
  if (!currentQuestion) return null;

  return (
    <div className="quiz-page">
      <QuizProgress />
      <div className="quiz-page__content">
        <QuizQuestion
          key={currentQuestion.db_id}
          question={currentQuestion}
          onAnswer={recordAnswer}
          onNext={nextQuestion}
          onPrev={prevQuestion}
          canGoPrev={canGoPrev}
        />
      </div>
    </div>
  );
}
