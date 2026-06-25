import { useQuiz } from '@/context/QuizContext';
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
  } = useQuiz();

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
