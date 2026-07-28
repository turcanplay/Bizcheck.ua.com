import { describe, it, expect } from 'vitest';
import {
  resolveBlocks,
  getTopLevelQuestions,
  blockHasQuestions,
  findNextBlockWithQuestions,
  findPrevBlockWithQuestions,
  countAnswerableQuestions,
  type ApiBlock,
} from '@/utils/quizContent';
import type { Block } from '@/types';

function apiBlock(over: Partial<ApiBlock> = {}): ApiBlock {
  return {
    id: 1,
    title_uk: 'Блок',
    title_en: 'Block',
    questions: [],
    ...over,
  };
}

function block(id: number, questionCount: number, parents = true): Block {
  return {
    id,
    title: `B${id}`,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `q${id}-${i}`,
      db_id: id * 100 + i,
      parent_question_id: parents ? null : 1,
      text: 't',
      note: null,
      options: [],
    })),
  };
}

describe('resolveBlocks — language selection', () => {
  const payload: ApiBlock[] = [
    apiBlock({
      id: 7,
      title_uk: 'Кадри',
      title_en: 'HR',
      questions: [{
        id: 'q1',
        db_id: 11,
        parent_question_id: null,
        text_uk: 'Питання?',
        text_en: 'Question?',
        note_uk: 'Примітка',
        note_en: 'Note',
        options: [
          { label_uk: 'Так', label_en: 'Yes', key: 'y', score: 1, next_question_id: null },
          { label_uk: 'Ні', label_en: 'No', key: 'n', score: 0, next_question_id: null },
        ],
      }],
    }),
  ];

  it('resolves every field to Ukrainian for lang=uk', () => {
    const [b] = resolveBlocks(payload, 'uk');
    expect(b.title).toBe('Кадри');
    expect(b.questions[0].text).toBe('Питання?');
    expect(b.questions[0].note).toBe('Примітка');
    expect(b.questions[0].options.map(o => o.label)).toEqual(['Так', 'Ні']);
  });

  it('resolves every field to English for lang=en', () => {
    const [b] = resolveBlocks(payload, 'en');
    expect(b.title).toBe('HR');
    expect(b.questions[0].text).toBe('Question?');
    expect(b.questions[0].note).toBe('Note');
    expect(b.questions[0].options.map(o => o.label)).toEqual(['Yes', 'No']);
  });

  it('falls back to Ukrainian when the English translation was never entered', () => {
    const untranslated: ApiBlock[] = [apiBlock({
      title_uk: 'Кадри',
      title_en: '',
      questions: [{
        id: 'q1', db_id: 11, parent_question_id: null,
        text_uk: 'Питання?', text_en: '   ',
        note_uk: 'Примітка', note_en: null,
        options: [{ label_uk: 'Так', label_en: '', key: 'y', score: 1, next_question_id: null }],
      }],
    })];
    const [b] = resolveBlocks(untranslated, 'en');
    expect(b.title).toBe('Кадри');
    expect(b.questions[0].text).toBe('Питання?');
    expect(b.questions[0].note).toBe('Примітка');
    expect(b.questions[0].options[0].label).toBe('Так');
  });

  it('falls back to English when the Ukrainian side is the missing one', () => {
    const enOnly: ApiBlock[] = [apiBlock({
      title_uk: '', title_en: 'HR',
      questions: [{
        id: 'q1', db_id: 11, parent_question_id: null,
        text_uk: '', text_en: 'Question?',
        note_uk: null, note_en: 'Note',
        options: [{ label_uk: '', label_en: 'Yes', key: 'y', score: 1, next_question_id: null }],
      }],
    })];
    const [b] = resolveBlocks(enOnly, 'uk');
    expect(b.title).toBe('HR');
    expect(b.questions[0].text).toBe('Question?');
    expect(b.questions[0].note).toBe('Note');
    expect(b.questions[0].options[0].label).toBe('Yes');
  });

  it('yields empty strings (and a null note) only when BOTH languages are blank', () => {
    const blank: ApiBlock[] = [apiBlock({
      title_uk: '', title_en: '',
      questions: [{
        id: 'q1', db_id: 11, parent_question_id: null,
        text_uk: '', text_en: '',
        note_uk: null, note_en: null,
        options: [],
      }],
    })];
    const [b] = resolveBlocks(blank, 'uk');
    expect(b.title).toBe('');
    expect(b.questions[0].text).toBe('');
    expect(b.questions[0].note).toBeNull();
  });

  it('returns an empty array for an empty payload (quiz not filled in yet)', () => {
    expect(resolveBlocks([], 'uk')).toEqual([]);
    expect(resolveBlocks([], 'en')).toEqual([]);
  });
});

describe('block navigation with missing content', () => {
  it('reports no questions for an empty or undefined block', () => {
    expect(getTopLevelQuestions(undefined)).toEqual([]);
    expect(blockHasQuestions(undefined)).toBe(false);
    expect(blockHasQuestions(block(1, 0))).toBe(false);
    expect(blockHasQuestions(block(1, 2))).toBe(true);
  });

  it('ignores sub-questions when deciding whether a block is answerable', () => {
    // A block holding only branch targets has no entry point of its own.
    expect(blockHasQuestions(block(1, 3, false))).toBe(false);
  });

  it('skips forward over empty blocks', () => {
    const blocks = [block(1, 0), block(2, 0), block(3, 2)];
    expect(findNextBlockWithQuestions(blocks, 0)).toBe(2);
    expect(findNextBlockWithQuestions(blocks, 3)).toBe(-1);
  });

  it('skips backward over empty blocks', () => {
    const blocks = [block(1, 2), block(2, 0), block(3, 0)];
    expect(findPrevBlockWithQuestions(blocks, 2)).toBe(0);
    expect(findPrevBlockWithQuestions(blocks, -1)).toBe(-1);
  });

  it('returns -1 in both directions when NO block has questions', () => {
    const blocks = [block(1, 0), block(2, 0)];
    expect(findNextBlockWithQuestions(blocks, 0)).toBe(-1);
    expect(findPrevBlockWithQuestions(blocks, 1)).toBe(-1);
  });

  it('returns -1 on a completely empty quiz', () => {
    expect(findNextBlockWithQuestions([], 0)).toBe(-1);
    expect(findPrevBlockWithQuestions([], 0)).toBe(-1);
    expect(countAnswerableQuestions([])).toBe(0);
  });

  it('counts only answerable top-level questions', () => {
    expect(countAnswerableQuestions([block(1, 3), block(2, 0), block(3, 2)])).toBe(5);
    expect(countAnswerableQuestions([block(1, 0), block(2, 0)])).toBe(0);
    expect(countAnswerableQuestions([block(1, 4, false)])).toBe(0);
  });
});
