import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Phase, Answers, UserInfo, ReportData, Block, Question, TestOption } from '@/types';
import { buildReport, calculateBlockScore } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import { API_BASE } from '@/config/api';

interface QuizContextValue {
  blocks: Block[];
  sectors: string[];
  sizes: string[];
  ages: string[];
  revenues: string[];
  loading: boolean;

  tests: TestOption[];
  selectedTestSlug: string | null;
  selectTest: (slug: string) => void;

  phase: Phase;
  currentBlock: number;
  currentQuestion: Question | null;
  currentQuestionIndex: number;       // display index (1-based position in visible sequence)
  topLevelQuestionCount: number;      // total top-level questions in current block
  answers: Answers;
  selectedKeys: Record<string, string>;
  userInfo: UserInfo;
  report: ReportData | null;
  canGoPrev: boolean;
  animating: boolean;
  submissionId: number | null;

  setPhase: (phase: Phase) => void;
  setUserInfo: (info: UserInfo) => void;
  recordAnswer: (answerKey: string, score: number, optionKey: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToBlock: (index: number) => void;
  generateReport: () => void;
  restartQuiz: () => void;
  setAnimating: (v: boolean) => void;
  createSubmission: (info?: { firstName?: string; lastName?: string; email?: string; phone?: string; consent?: boolean }) => Promise<number | null>;
  updateSubmission: (data: Record<string, unknown>) => void;
  submissionToken: string | null;
}

const QuizContext = createContext<QuizContextValue | null>(null);

const defaultUserInfo: UserInfo = { firstName: '', lastName: '', email: '', phone: '', consent: false, sector: '', size: '', age: '', revenue: '' };

const SESSION_KEY = 'bizcheck_quiz_state_v2';

interface SavedState {
  phase: Phase;
  currentBlock: number;
  currentQuestionDbId: number | null;
  topLevelIndex: number;
  answers: Answers;
  selectedKeys: Record<string, string>;
  userInfo: UserInfo;
  submissionId: number | null;
  submissionToken: string | null;
  selectedTestSlug: string | null;
}

function loadSavedState(): Partial<SavedState> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SavedState>;
  } catch { return null; }
}

function clearSavedState() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ---- Bilingual API types ---- */
interface ApiAnswer {
  label_ro: string;
  label_ru: string;
  key: string;
  score: number;
  next_question_id: number | null;
}
interface ApiQuestion {
  id: string;
  db_id: number;
  parent_question_id: number | null;
  text_ro: string;
  text_ru: string;
  note_ro: string | null;
  note_ru: string | null;
  options: ApiAnswer[];
}
interface ApiBlock {
  id: number;
  title_ro: string;
  title_ru: string;
  questions: ApiQuestion[];
}

/** Resolve bilingual API data to single-language Block[] */
function resolveBlocks(apiBlocks: ApiBlock[], lang: 'ro' | 'ru'): Block[] {
  return apiBlocks.map(b => ({
    id: b.id,
    title: lang === 'ro' ? b.title_ro : b.title_ru,
    questions: b.questions.map(q => ({
      id: q.id,
      db_id: q.db_id,
      parent_question_id: q.parent_question_id,
      text: lang === 'ro' ? q.text_ro : q.text_ru,
      note: lang === 'ro' ? q.note_ro : q.note_ru,
      options: q.options.map(o => ({
        label: lang === 'ro' ? o.label_ro : o.label_ru,
        key: o.key,
        score: o.score,
        next_question_id: o.next_question_id,
      })),
    })),
  }));
}

/** Get top-level questions (not sub-questions) for a block */
function getTopLevelQuestions(block: Block): Question[] {
  return block.questions.filter(q => q.parent_question_id === null || q.parent_question_id === undefined);
}

/** Build a map of db_id -> Question for fast lookup */
function buildQuestionMap(blocks: Block[]): Map<number, { question: Question; blockIndex: number }> {
  const map = new Map<number, { question: Question; blockIndex: number }>();
  blocks.forEach((block, bi) => {
    block.questions.forEach(q => {
      map.set(q.db_id, { question: q, blockIndex: bi });
    });
  });
  return map;
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const { lang, tList } = useLang();

  const saved = useRef(loadSavedState());

  const [rawApiBlocks, setRawApiBlocks] = useState<ApiBlock[] | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  const [tests, setTests] = useState<TestOption[]>([]);
  const [selectedTestSlug, setSelectedTestSlug] = useState<string | null>(saved.current?.selectedTestSlug ?? null);

  const [phase, setPhase] = useState<Phase>(saved.current?.phase ?? 'start');
  const [currentBlock, setCurrentBlock] = useState(saved.current?.currentBlock ?? 0);
  const [currentQuestionDbId, setCurrentQuestionDbId] = useState<number | null>(saved.current?.currentQuestionDbId ?? null);
  const [navigationStack, setNavigationStack] = useState<number[]>([]); // stack of db_ids for back nav
  const [topLevelIndex, setTopLevelIndex] = useState(saved.current?.topLevelIndex ?? 0); // index within top-level questions
  const [answers, setAnswers] = useState<Answers>(saved.current?.answers ?? {});
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>(saved.current?.selectedKeys ?? {});
  const [userInfo, setUserInfo] = useState<UserInfo>(saved.current?.userInfo ?? defaultUserInfo);
  const [report, setReport] = useState<ReportData | null>(null);
  const [animating, setAnimating] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(saved.current?.submissionId ?? null);
  const [submissionToken, setSubmissionToken] = useState<string | null>(saved.current?.submissionToken ?? null);

  /* Refs for latest values in callbacks */
  const submissionIdRef = useRef(submissionId);
  submissionIdRef.current = submissionId;
  const submissionTokenRef = useRef(submissionToken);
  submissionTokenRef.current = submissionToken;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const selectedKeysRef = useRef(selectedKeys);
  selectedKeysRef.current = selectedKeys;

  /* Derived: question map and current question */
  const questionMap = buildQuestionMap(blocks);

  const currentQuestion = currentQuestionDbId !== null
    ? (questionMap.get(currentQuestionDbId)?.question ?? null)
    : null;

  const topLevelQuestions = blocks[currentBlock] ? getTopLevelQuestions(blocks[currentBlock]) : [];
  const topLevelQuestionCount = topLevelQuestions.length;
  // Derive index from actual position in top-level list; fall back to topLevelIndex for sub-questions
  const _topLevelPos = topLevelQuestions.findIndex(q => q.db_id === currentQuestionDbId);
  const currentQuestionIndex = _topLevelPos >= 0 ? _topLevelPos + 1 : topLevelIndex + 1;
  const canGoPrev = currentBlock > 0 || currentQuestionIndex > 1 || navigationStack.length > 0;

  /* Persist quiz state to sessionStorage */
  useEffect(() => {
    if (phase === 'start' && !submissionId) {
      clearSavedState();
      return;
    }
    const state: SavedState = {
      phase, currentBlock, currentQuestionDbId, topLevelIndex,
      answers, selectedKeys, userInfo, submissionId, submissionToken, selectedTestSlug,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [phase, currentBlock, currentQuestionDbId, topLevelIndex, answers, selectedKeys, userInfo, submissionId, submissionToken, selectedTestSlug]);

  /* Fetch available tests on mount */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/tests`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.tests)) {
          setTests(data.tests);
        }
      } catch {
        // No tests available
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Fetch blocks for the selected test */
  useEffect(() => {
    if (!selectedTestSlug) {
      setRawApiBlocks(null);
      setBlocks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/blocks/quiz?test=${encodeURIComponent(selectedTestSlug)}`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        if (!cancelled && data.blocks) {
          setRawApiBlocks(data.blocks);
          setBlocks(resolveBlocks(data.blocks, lang));
        }
      } catch {
        // No blocks available
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestSlug]);

  /* Re-resolve blocks when language changes */
  useEffect(() => {
    if (rawApiBlocks) {
      setBlocks(resolveBlocks(rawApiBlocks, lang));
    }
  }, [lang, rawApiBlocks]);

  const sectors = tList('sectors');
  const sizes = tList('sizes');
  const ages = tList('ages');
  const revenues = tList('revenues');

  /* ---- Backend save helpers ----
   * All per-submission writes carry X-Submission-Token. The server uses this to
   * authorize PATCH/PDF/email — without it (or with the wrong one), the request
   * is rejected even if the submission id is known.
   */
  const saveToBackend = useCallback(async (subId: number, payload: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (submissionTokenRef.current) {
      headers['X-Submission-Token'] = submissionTokenRef.current;
    }
    try {
      await fetch(`${API_BASE}/submissions/${subId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-critical
    }
  }, []);

  const createSubmission = useCallback(async (info?: { firstName?: string; lastName?: string; email?: string; phone?: string; consent?: boolean }): Promise<number | null> => {
    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: info?.firstName || null,
          last_name: info?.lastName || null,
          email: info?.email || null,
          phone: info?.phone || null,
          consent: info?.consent ?? false,
          language: lang,
          test_slug: selectedTestSlug,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const id = data.submission?.id;
        const token = data.submission?.submission_token ?? null;
        if (id) {
          setSubmissionId(id);
          setSubmissionToken(token);
          return id;
        }
      } else {
        console.error('[Submission] 400 error:', JSON.stringify(data));
      }
    } catch (err) { console.error('[Submission] Network error:', err); }
    return null;
  }, [lang, selectedTestSlug]);

  const selectTest = useCallback((slug: string) => {
    setSelectedTestSlug(slug);
  }, []);

  const updateSubmission = useCallback((data: Record<string, unknown>) => {
    if (submissionIdRef.current) {
      saveToBackend(submissionIdRef.current, data);
    }
  }, [saveToBackend]);

  /* Auto-save answers on every question transition */
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase !== 'quiz') { prevPhaseRef.current = phase; return; }
    if (prevPhaseRef.current !== 'quiz') { prevPhaseRef.current = phase; return; }
    prevPhaseRef.current = phase;

    if (!submissionIdRef.current) return;

    const currentAnswers = answersRef.current;
    const currentBlocks = blocksRef.current;
    const blockScores = currentBlocks.map(block => ({
      id: block.id,
      title: block.title,
      score: calculateBlockScore(block, currentAnswers),
    }));

    saveToBackend(submissionIdRef.current, {
      answers_json: currentAnswers,
      selected_answers_json: selectedKeysRef.current,
      block_scores_json: blockScores,
      status: 'in_progress',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionDbId, currentBlock]);

  /** Initialize first question when entering a block */
  function enterBlock(blockIndex: number) {
    const block = blocksRef.current[blockIndex];
    if (!block) return;
    const topLevel = getTopLevelQuestions(block);
    if (topLevel.length > 0) {
      setCurrentQuestionDbId(topLevel[0].db_id);
      setTopLevelIndex(0);
      setNavigationStack([]);
    }
  }

  const recordAnswer = useCallback((answerKey: string, score: number, optionKey: string) => {
    setAnswers(prev => ({ ...prev, [answerKey]: score }));
    setSelectedKeys(prev => ({ ...prev, [answerKey]: optionKey }));
  }, []);

  const nextQuestion = useCallback(() => {
    const block = blocksRef.current[currentBlock];
    if (!block || !currentQuestion) return;

    const topLevel = getTopLevelQuestions(block);
    const qMap = buildQuestionMap(blocksRef.current);

    // Find the selected answer's option to check for branching
    const currentKey = selectedKeysRef.current[currentQuestion.id];
    const selectedOption = currentKey
      ? currentQuestion.options.find(o => o.key === currentKey)
      : null;

    // Check if the selected answer branches to another question
    if (selectedOption?.next_question_id) {
      const target = qMap.get(selectedOption.next_question_id);
      if (target && target.blockIndex === currentBlock) {
        // Branch to question within same block
        const targetTopIdx = topLevel.findIndex(q => q.db_id === selectedOption.next_question_id);
        setNavigationStack(prev => [...prev, currentQuestion.db_id]);
        setCurrentQuestionDbId(selectedOption.next_question_id);
        // If target is top-level, sync topLevelIndex so back navigation is correct
        if (targetTopIdx >= 0) {
          setTopLevelIndex(targetTopIdx);
        }
        return;
      }
    }

    // No branching — find next top-level question in order
    const currentTopIdx = topLevel.findIndex(q => q.db_id === currentQuestion.db_id);
    // If we're on a sub-question, use the stored topLevelIndex
    const effectiveTopIdx = currentTopIdx >= 0 ? currentTopIdx : topLevelIndex;
    const nextTopIdx = effectiveTopIdx + 1;

    if (nextTopIdx < topLevel.length) {
      // More top-level questions in this block
      setNavigationStack([]);
      setTopLevelIndex(nextTopIdx);
      setCurrentQuestionDbId(topLevel[nextTopIdx].db_id);
    } else if (currentBlock < blocksRef.current.length - 1) {
      // Move directly to next block (no transition screen)
      setNavigationStack([]);
      setCurrentBlock(currentBlock + 1);
    } else {
      // Last question of last block — generate report
      setAnswers(latestAnswers => {
        const reportData = buildReport(blocksRef.current, latestAnswers, userInfo);
        setReport(reportData);
        setPhase('cta');

        if (submissionIdRef.current) {
          saveToBackend(submissionIdRef.current, {
            answers_json: latestAnswers,
            selected_answers_json: selectedKeysRef.current,
            block_scores_json: reportData.blockScores.map(b => ({ id: b.id, title: b.title, score: b.score })),
            total_score: reportData.totalScore,
            status: 'completed',
          });
        }
        return latestAnswers;
      });
    }
  }, [currentBlock, currentQuestion, topLevelIndex, userInfo, saveToBackend]);

  const prevQuestion = useCallback(() => {
    // If we have navigation stack (came from a branch), pop back
    if (navigationStack.length > 0) {
      const prevDbId = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setCurrentQuestionDbId(prevDbId);
      return;
    }

    // Go to previous top-level question
    const block = blocksRef.current[currentBlock];
    if (!block) return;
    const topLevel = getTopLevelQuestions(block);

    if (topLevelIndex > 0) {
      const prevIdx = topLevelIndex - 1;
      setTopLevelIndex(prevIdx);
      setCurrentQuestionDbId(topLevel[prevIdx].db_id);
    } else if (currentBlock > 0) {
      // Go to last question of previous block
      const prevBlockIdx = currentBlock - 1;
      const prevBlock = blocksRef.current[prevBlockIdx];
      const prevTopLevel = getTopLevelQuestions(prevBlock);
      setCurrentBlock(prevBlockIdx);
      setTopLevelIndex(prevTopLevel.length - 1);
      setCurrentQuestionDbId(prevTopLevel[prevTopLevel.length - 1].db_id);
      setNavigationStack([]);
    }
  }, [currentBlock, topLevelIndex, navigationStack]);

  const goToBlock = useCallback((index: number) => {
    setCurrentBlock(index);
    setPhase('quiz');
    // enterBlock will be called via effect
  }, []);

  // When block changes and phase is quiz, initialize the first question.
  // Skip ONLY if a restored question actually exists (page refresh mid-quiz).
  // If the session was reset (e.g. fresh start via CTA) currentQuestionDbId is
  // null — we must initialize, otherwise QuizPage renders blank until a refresh.
  const restoredRef = useRef(!!saved.current?.currentQuestionDbId);
  useEffect(() => {
    if (phase === 'quiz' && blocks.length > 0) {
      if (restoredRef.current) {
        restoredRef.current = false;
        if (currentQuestionDbId !== null) return;  // genuine restore → keep it
      }
      enterBlock(currentBlock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBlock, phase, blocks]);

  // If phase is 'cta' but report is null (page refresh), regenerate from saved data
  useEffect(() => {
    if (phase === 'cta' && !report && blocks.length > 0 && Object.keys(answers).length > 0) {
      const reportData = buildReport(blocks, answers, userInfo);
      setReport(reportData);
    }
  }, [phase, report, blocks, answers, userInfo]);

  const generateReport = useCallback(() => {
    const reportData = buildReport(blocks, answers, userInfo);
    setReport(reportData);
    setPhase('cta');

    if (submissionIdRef.current) {
      saveToBackend(submissionIdRef.current, {
        answers_json: answers,
        block_scores_json: reportData.blockScores.map(b => ({ id: b.id, title: b.title, score: b.score })),
        total_score: reportData.totalScore,
        status: 'completed',
      });
    }
  }, [blocks, answers, userInfo, saveToBackend]);

  const restartQuiz = useCallback(() => {
    clearSavedState();
    setPhase('start');
    setCurrentBlock(0);
    setCurrentQuestionDbId(null);
    setNavigationStack([]);
    setTopLevelIndex(0);
    setAnswers({});
    setSelectedKeys({});
    setUserInfo(defaultUserInfo);
    setReport(null);
    setSubmissionId(null);
    setSubmissionToken(null);
    setSelectedTestSlug(null);
  }, []);

  return (
    <QuizContext.Provider
      value={{
        blocks,
        sectors,
        sizes,
        ages,
        revenues,
        loading,
        tests,
        selectedTestSlug,
        selectTest,
        phase,
        currentBlock,
        currentQuestion,
        currentQuestionIndex,
        topLevelQuestionCount,
        answers,
        selectedKeys,
        userInfo,
        report,
        canGoPrev,
        animating,
        submissionId,
        setPhase,
        setUserInfo,
        recordAnswer,
        nextQuestion,
        prevQuestion,
        goToBlock,
        generateReport,
        restartQuiz,
        setAnimating,
        createSubmission,
        updateSubmission,
        submissionToken,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used inside QuizProvider');
  return ctx;
}
