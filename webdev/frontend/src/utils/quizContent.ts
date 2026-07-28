import type { Block, Question } from '@/types';
import type { Lang } from '@/i18n/translations';
import { pickLang, pickLangOrNull } from '@/i18n/pickLang';

/* ---- Bilingual API payload (GET /blocks/quiz?test=<slug>) ---- */

export interface ApiAnswer {
  label_uk: string;
  label_en: string;
  key: string;
  score: number;
  next_question_id: number | null;
}

export interface ApiQuestion {
  id: string;
  db_id: number;
  parent_question_id: number | null;
  text_uk: string;
  text_en: string;
  note_uk: string | null;
  note_en: string | null;
  options: ApiAnswer[];
}

export interface ApiBlock {
  id: number;
  title_uk: string;
  title_en: string;
  questions: ApiQuestion[];
}

/**
 * Collapse the bilingual API payload into single-language `Block[]`.
 *
 * Every field goes through `pickLang`, so a block/question/answer that was only
 * filled in in Ukrainian still renders (in Ukrainian) for an English visitor
 * instead of collapsing into empty strings. This one function feeds the quiz
 * UI, the on-screen report, the PDF capture and the block scores — fixing the
 * fallback here fixes it for all of them.
 */
export function resolveBlocks(apiBlocks: ApiBlock[], lang: Lang): Block[] {
  return apiBlocks.map(b => ({
    id: b.id,
    title: pickLang(b, 'title', lang),
    questions: b.questions.map(q => ({
      id: q.id,
      db_id: q.db_id,
      parent_question_id: q.parent_question_id,
      text: pickLang(q, 'text', lang),
      note: pickLangOrNull(q, 'note', lang),
      options: q.options.map(o => ({
        label: pickLang(o, 'label', lang),
        key: o.key,
        score: o.score,
        next_question_id: o.next_question_id,
      })),
    })),
  }));
}

/** Top-level questions (sub-questions are reached through answer branching). */
export function getTopLevelQuestions(block: Block | undefined): Question[] {
  if (!block) return [];
  return block.questions.filter(
    q => q.parent_question_id === null || q.parent_question_id === undefined,
  );
}

/** Does this block have at least one question the user can be shown? */
export function blockHasQuestions(block: Block | undefined): boolean {
  return getTopLevelQuestions(block).length > 0;
}

/**
 * Index of the first block at or after `from` that actually has questions,
 * or -1 when there is none.
 *
 * Quiz content is entered by hand, so a block with zero questions is a normal
 * intermediate state (admin created the block, hasn't filled it yet). Without
 * skipping, `enterBlock` would set no current question and QuizPage would go
 * blank with no way forward.
 */
export function findNextBlockWithQuestions(blocks: Block[], from: number): number {
  for (let i = Math.max(0, from); i < blocks.length; i++) {
    if (blockHasQuestions(blocks[i])) return i;
  }
  return -1;
}

/** Mirror of {@link findNextBlockWithQuestions} walking backwards. */
export function findPrevBlockWithQuestions(blocks: Block[], from: number): number {
  for (let i = Math.min(from, blocks.length - 1); i >= 0; i--) {
    if (blockHasQuestions(blocks[i])) return i;
  }
  return -1;
}

/** Total number of answerable (top-level) questions across every block. */
export function countAnswerableQuestions(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + getTopLevelQuestions(b).length, 0);
}
