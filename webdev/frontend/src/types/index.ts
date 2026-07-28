export interface QuestionOption {
  label: string;
  key: string;
  score: number;
  next_question_id: number | null;
}

export interface Question {
  id: string;
  db_id: number;
  parent_question_id: number | null;
  text: string;
  note: string | null;
  options: QuestionOption[];
}

export interface Block {
  id: number;
  title: string;
  questions: Question[];
}

export interface QuestionsData {
  blocks: Block[];
  sectors: string[];
  sizes: string[];
  ages: string[];
  revenues: string[];
}

/**
 * Score thresholds for the report's colour bands, as stored in
 * `tests.scoring_zones` and edited from the admin panel.
 *
 * The keys are the DB/admin spelling — note `warn`, while the rendered `Zone`
 * is called `warning`. Translate with `getZone()`, never by hand.
 */
export interface ScoringZones {
  safe: number;
  developing: number;
  warn: number;
  risk: number;
}

export interface TestOption {
  id: number;
  slug: string;
  name_uk: string;
  name_en: string;
  description_uk: string;
  description_en: string;
  report_type?: 'standard' | 'premium' | 'bizcheck' | 'gdpr';
  /** Optional: absent on a legacy API response → `resolveZones()` defaults. */
  scoring_zones?: Partial<ScoringZones> | null;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  sector: string;
  size: string;
  age: string;
  revenue: string;
}

export type Answers = Record<string, number>;

export type Phase = 'start' | 'quiz' | 'cta';

export type Zone = 'safe' | 'developing' | 'warning' | 'risk';

export interface BlockResult {
  id: number;
  order: number;        // 1-based display order
  title: string;
  score: number;
  zone: Zone;
  questionCount: number;
}

export interface ReportData {
  blockScores: BlockResult[];
  totalScore: number;
  /** Thresholds this report was scored with — resolved from the test once, in
   *  `buildReport()`, so no component re-derives them. */
  zones: ScoringZones;
  distanceFromPerfect: number;
  userInfo: UserInfo;
  date: string;
}
