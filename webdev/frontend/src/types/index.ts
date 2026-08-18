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

/**
 * Report layouts the SPA knows how to render. This is the single source of
 * truth on the client and mirrors `CANONICAL_REPORT_TYPES` in the backend's
 * `services/test_service.py` — keep the two in sync.
 */
export const REPORT_TYPES = ['bizcheck', 'standard', 'premium', 'gdpr'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

/** Layout used when a test carries no `report_type` (legacy rows / legacy API). */
export const DEFAULT_REPORT_TYPE: ReportType = 'bizcheck';

/**
 * Narrow an API-supplied `report_type` to a layout this build can render.
 *
 * `null`/`undefined` is a legitimate "not set" and defaults silently. Any other
 * value means the backend knows a layout this bundle does not (new report type
 * shipped server-side first, or a corrupted row): the user would otherwise get
 * the `bizcheck` report with no trace anywhere. The default is deliberately
 * unchanged — this only makes the fallback observable.
 */
export function normalizeReportType(value: unknown): ReportType {
  if (value === null || value === undefined) return DEFAULT_REPORT_TYPE;
  if ((REPORT_TYPES as readonly unknown[]).includes(value)) return value as ReportType;
  console.warn(
    `[report] Unknown report_type ${JSON.stringify(value)} — falling back to ` +
    `"${DEFAULT_REPORT_TYPE}". Known types: ${REPORT_TYPES.join(', ')}.`,
  );
  return DEFAULT_REPORT_TYPE;
}

export interface TestOption {
  id: number;
  slug: string;
  name_uk: string;
  name_en: string;
  description_uk: string;
  description_en: string;
  report_type?: ReportType;
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
