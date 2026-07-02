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

export interface TestOption {
  id: number;
  slug: string;
  name_ro: string;
  name_ru: string;
  description_ro: string;
  description_ru: string;
  report_type?: 'standard' | 'premium' | 'bizcheck' | 'gdpr';
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

export type Phase = 'start' | 'quiz' | 'transition' | 'report' | 'cta';

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
  distanceFromPerfect: number;
  userInfo: UserInfo;
  date: string;
}
