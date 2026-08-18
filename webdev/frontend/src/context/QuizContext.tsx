import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Phase, Answers, UserInfo, ReportData, Block, Question, TestOption } from '@/types';
import { buildReport, calculateBlockScore } from '@/utils/scoring';
import { useLang } from '@/context/LanguageContext';
import { API_BASE } from '@/config/api';
import { enqueueSave } from '@/utils/durableSave';
import { readJson, writeJson, removeKey } from '@/utils/safeStorage';
import {
  resolveBlocks,
  getTopLevelQuestions,
  findNextBlockWithQuestions,
  findPrevBlockWithQuestions,
  countAnswerableQuestions,
  type ApiBlock,
} from '@/utils/quizContent';

interface QuizContextValue {
  blocks: Block[];
  sectors: string[];
  sizes: string[];
  ages: string[];
  revenues: string[];
  loading: boolean;
  /** Total answerable (top-level) questions across every block of the selected
   *  test. 0 means the admin has not entered any quiz content yet — callers
   *  must show an empty state instead of starting a run that cannot render. */
  answerableQuestionCount: number;

  tests: TestOption[];
  testsLoaded: boolean;
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
  return readJson<Partial<SavedState> | null>('session', SESSION_KEY, null);
}

function clearSavedState() {
  removeKey('session', SESSION_KEY);
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
  // True once the /tests fetch has settled (success OR failure). Report layout
  // selection keys off report_type from this list — rendering before it loads
  // would wrongly fall back to the 'bizcheck' layout. See CtaPage.
  const [testsLoaded, setTestsLoaded] = useState(false);
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

  const topLevelQuestions = getTopLevelQuestions(blocks[currentBlock]);
  const topLevelQuestionCount = topLevelQuestions.length;
  const answerableQuestionCount = countAnswerableQuestions(blocks);
  // Derive index from actual position in top-level list; fall back to topLevelIndex for sub-questions
  const _topLevelPos = topLevelQuestions.findIndex(q => q.db_id === currentQuestionDbId);
  const currentQuestionIndex = _topLevelPos >= 0 ? _topLevelPos + 1 : topLevelIndex + 1;
  // "Back" is only offered when prevQuestion() can actually move somewhere:
  // a branch to pop, an earlier question in this block, or an earlier block
  // that HAS questions (a preceding empty block is not a valid target).
  const canGoPrev =
    navigationStack.length > 0 ||
    currentQuestionIndex > 1 ||
    findPrevBlockWithQuestions(blocks, currentBlock - 1) !== -1;

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
    // Guarded: this runs on EVERY answer. A raw setItem throws in Safari
    // private mode / on quota, inside an effect, and takes the quiz down —
    // losing exactly the progress it was trying to preserve. Losing the resume
    // snapshot is acceptable; the answers themselves go to the backend outbox.
    writeJson('session', SESSION_KEY, state);
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
      } finally {
        if (!cancelled) setTestsLoaded(true);
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

  /* Scoring thresholds of the SELECTED test — the report's colour bands are
   * admin-configurable per test (`tests.scoring_zones`). Held in a ref because
   * buildReport() is called from callbacks that must not re-create on every
   * `tests` refresh. Undefined until /tests resolves → resolveZones() defaults. */
  const currentTestZones = tests.find(t => t.slug === selectedTestSlug)?.scoring_zones;
  const zonesRef = useRef(currentTestZones);
  zonesRef.current = currentTestZones;

  const sectors = tList('sectors');
  const sizes = tList('sizes');
  const ages = tList('ages');
  const revenues = tList('revenues');

  /* ---- Backend save helpers ----
   * All per-submission writes carry X-Submission-Token. The server uses this to
   * authorize PATCH/PDF/email — without it (or with the wrong one), the request
   * is rejected even if the submission id is known.
   */
  // Durable, fire-and-forget save. Instead of a single best-effort fetch (which
  // silently lost data on any network flap or brief backend downtime), the write
  // is queued in a localStorage-backed outbox that retries with backoff, flushes
  // on reconnect / next page load, and fires a keepalive PATCH on tab close. The
  // full answer snapshot is always replayed until the server acks (2xx), so a
  // completed quiz's answers cannot be lost. See utils/durableSave.ts.
  const saveToBackend = useCallback(async (subId: number, payload: Record<string, unknown>) => {
    enqueueSave(subId, submissionTokenRef.current, payload);
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
          // Update the refs SYNCHRONOUSLY (state setters only refresh the refs
          // on the next render). Without this, an updateSubmission() called in
          // the same tick — e.g. StartPage saving sector/size/age/revenue right
          // after createSubmission() — reads a stale null id/token and the
          // PATCH is silently skipped, so those fields never reach the DB.
          submissionIdRef.current = id;
          submissionTokenRef.current = token;
          setSubmissionId(id);
          setSubmissionToken(token);
          return id;
        }
      } else {
        // NEVER log the response body. The endpoint echoes back the payload it
        // rejected, and that payload carries the visitor's email and phone —
        // JSON.stringify(data) dumped that PII into the browser console, where
        // any extension, screen-share or support screenshot can pick it up.
        // Status plus the shape of the error is all that is needed to debug.
        const errorCount = Array.isArray(data?.errors) ? data.errors.length : 0;
        console.error('[Submission] create failed', { status: res.status, errorCount });
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

  /** Initialize the first question when entering a block.
   *
   * Quiz content is authored by hand, so an EMPTY block (created in the admin
   * panel but not yet filled with questions) is a normal state. Landing on one
   * used to leave `currentQuestionDbId` null forever → QuizPage rendered blank
   * with no way forward. Skip ahead to the first block that actually has
   * questions instead; if there is none, leave the question unset and let the
   * caller surface the empty state. */
  function enterBlock(blockIndex: number) {
    const list = blocksRef.current;
    let target = findNextBlockWithQuestions(list, blockIndex);
    // A restored block index can point past the end of the current content
    // (blocks deleted in the admin panel between two visits). Searching forward
    // finds nothing there, which used to leave the run with no question at all
    // — a blank page. Fall back to the first block that has questions.
    if (target === -1 && blockIndex > 0) target = findNextBlockWithQuestions(list, 0);
    if (target === -1) return;
    if (target !== blockIndex) setCurrentBlock(target);
    const topLevel = getTopLevelQuestions(list[target]);
    setCurrentQuestionDbId(topLevel[0].db_id);
    setTopLevelIndex(0);
    setNavigationStack([]);
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
      return;
    }

    // Move to the next block that actually HAS questions (no transition
    // screen). Skipping empty blocks matters because content is entered by
    // hand: a trailing empty block used to dead-end the run on a blank page
    // instead of finishing the quiz.
    const nextBlockIdx = findNextBlockWithQuestions(blocksRef.current, currentBlock + 1);
    if (nextBlockIdx !== -1) {
      setNavigationStack([]);
      setCurrentBlock(nextBlockIdx);
    } else {
      // Last question of last block — generate report
      setAnswers(latestAnswers => {
        const reportData = buildReport(blocksRef.current, latestAnswers, userInfo, zonesRef.current);
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
      return;
    }

    // Go to the last question of the closest EARLIER block that has questions.
    // Empty blocks in between are skipped — stepping into one would clear the
    // current question and blank the page.
    const prevBlockIdx = findPrevBlockWithQuestions(blocksRef.current, currentBlock - 1);
    if (prevBlockIdx !== -1) {
      const prevTopLevel = getTopLevelQuestions(blocksRef.current[prevBlockIdx]);
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

  // Keep a question of the CURRENT block selected while the quiz is running.
  //
  // The guard here used to be a one-shot ref ("we restored a question, keep
  // it"), consumed by the effect's first run. But this effect re-runs on every
  // new `blocks` identity, and `blocks` is re-created right after the fetch by
  // the language re-resolve below — so a second run always followed and called
  // enterBlock() unconditionally, resetting the position to the block's first
  // question. Three reproducible consequences:
  //   * an F5 mid-quiz restored the saved question and then jumped back to
  //     question 1 of the block, which is exactly the progress the restore
  //     path exists to preserve;
  //   * toggling the language mid-quiz did the same;
  //   * prevQuestion() stepping into an earlier block selects that block's
  //     LAST question, and this effect immediately reset it to the first.
  // The condition is now stateless: keep the current question when it belongs
  // to the current block, otherwise (re)initialize the block. A restored id
  // that no longer exists (question deleted in the admin panel) therefore
  // re-initializes instead of leaving `currentQuestion` null forever.
  useEffect(() => {
    if (phase !== 'quiz' || blocks.length === 0) return;
    const inCurrentBlock =
      currentQuestionDbId !== null &&
      (blocks[currentBlock]?.questions.some(q => q.db_id === currentQuestionDbId) ?? false);
    if (inCurrentBlock) return;
    enterBlock(currentBlock);
  }, [currentBlock, phase, blocks, currentQuestionDbId]);

  // If phase is 'cta' but report is null (page refresh), regenerate from saved data
  useEffect(() => {
    if (phase === 'cta' && !report && blocks.length > 0 && Object.keys(answers).length > 0) {
      const reportData = buildReport(blocks, answers, userInfo, currentTestZones);
      setReport(reportData);
    }
  }, [phase, report, blocks, answers, userInfo, currentTestZones]);

  const generateReport = useCallback(() => {
    const reportData = buildReport(blocks, answers, userInfo, zonesRef.current);
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
        answerableQuestionCount,
        tests,
        testsLoaded,
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
