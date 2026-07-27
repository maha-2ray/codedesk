/**
 * Candidate answers, autosave envelopes and grading results.
 *
 * Answers are a discriminated union keyed by `kind` rather than by question
 * type, because several question types share an answer shape (for example
 * every code-editor variant produces a `CODE` answer).
 */

import type { Id, IsoDateTime } from './domain';
import type { Language } from './question';

export interface AnswerBase {
  questionId: Id;
  /** Client timestamp of the last edit; used for conflict resolution. */
  updatedAt: IsoDateTime;
  /** Candidate flagged this question for review. */
  flagged?: boolean;
  /** Milliseconds the candidate has spent on this question. */
  timeSpentMs?: number;
}

export interface ChoiceAnswer extends AnswerBase {
  kind: 'CHOICE';
  /** Single selection for MULTIPLE_CHOICE, many for MULTIPLE_SELECT. */
  choiceIds: Id[];
}

export interface BooleanAnswer extends AnswerBase {
  kind: 'BOOLEAN';
  value: boolean | null;
}

export interface TextAnswer extends AnswerBase {
  kind: 'TEXT';
  /** Used by SHORT_ANSWER, ESSAY and PREDICT_OUTPUT. */
  value: string;
}

export interface BlanksAnswer extends AnswerBase {
  kind: 'BLANKS';
  /** Blank index → candidate response. */
  values: Record<number, string>;
}

export interface PairsAnswer extends AnswerBase {
  kind: 'PAIRS';
  pairs: Array<[Id, Id]>;
}

export interface OrderAnswer extends AnswerBase {
  kind: 'ORDER';
  orderedIds: Id[];
}

export interface CodeAnswer extends AnswerBase {
  kind: 'CODE';
  language: Language;
  source: string;
  /** Per-language drafts so switching language does not lose work. */
  drafts?: Partial<Record<Language, string>>;
}

export interface FilesAnswer extends AnswerBase {
  kind: 'FILES';
  /** Path → contents, for HTML/CSS and React project questions. */
  files: Record<string, string>;
  activeFile?: string;
}

export interface TerminalAnswer extends AnswerBase {
  kind: 'TERMINAL';
  /** Commands issued, for Linux and Git simulations. */
  history: string[];
  /** Opaque snapshot id of the container state. */
  snapshotId?: string;
}

export interface FlagAnswer extends AnswerBase {
  kind: 'FLAG';
  /** Submitted CTF flag. */
  value: string;
}

export type Answer =
  | ChoiceAnswer
  | BooleanAnswer
  | TextAnswer
  | BlanksAnswer
  | PairsAnswer
  | OrderAnswer
  | CodeAnswer
  | FilesAnswer
  | TerminalAnswer
  | FlagAnswer;

export type AnswerKind = Answer['kind'];

/** Map of questionId → answer, the shape held in the attempt store. */
export type AnswerMap = Record<Id, Answer>;

/**
 * A batch of answer changes queued for synchronisation.
 *
 * The client persists these locally first so an attempt survives a crash or
 * a network outage; the sync worker drains the queue when connectivity
 * returns. `revision` lets the server reject stale or replayed batches.
 */
export interface SyncEnvelope {
  attemptId: Id;
  revision: number;
  answers: Answer[];
  /** Client-side creation time, for ordering and diagnostics. */
  queuedAt: IsoDateTime;
}

export const SYNC_STATES = ['IDLE', 'PENDING', 'SYNCING', 'OFFLINE', 'ERROR'] as const;
export type SyncState = (typeof SYNC_STATES)[number];

/** Outcome of a single test case execution. */
export interface TestResult {
  testCaseId: Id;
  name?: string;
  visibility: 'PUBLIC' | 'HIDDEN';
  passed: boolean;
  /** Populated for public tests only; hidden test IO is never disclosed. */
  stdin?: string;
  expectedStdout?: string;
  actualStdout?: string;
  stderr?: string;
  runtimeMs: number;
  memoryKb: number;
  marksAwarded: number;
}

export const EXECUTION_STATUSES = [
  'QUEUED',
  'COMPILING',
  'RUNNING',
  'COMPLETED',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

/** Result of a run against the sandboxed execution engine. */
export interface ExecutionResult {
  id: Id;
  questionId: Id;
  status: ExecutionStatus;
  /** Compiler diagnostics, when the language has a compile step. */
  compileOutput?: string;
  tests: TestResult[];
  totalRuntimeMs: number;
  peakMemoryKb: number;
  createdAt: IsoDateTime;
}

/** Per-question grading outcome. */
export interface QuestionResult {
  questionId: Id;
  marksAwarded: number;
  marksAvailable: number;
  /** Auto-graded, or adjusted by a human grader. */
  gradedBy: 'AUTO' | 'MANUAL';
  graderId?: Id;
  feedback?: string;
  tests?: TestResult[];
}

export interface AttemptResult {
  attemptId: Id;
  examId: Id;
  studentId: Id;
  marksAwarded: number;
  marksAvailable: number;
  percentage: number;
  passed: boolean;
  questions: QuestionResult[];
  /** Overall remark from the lecturer. */
  comment?: string;
  releasedAt?: IsoDateTime;
}

/** Creates an empty answer appropriate to the given kind. */
export function emptyAnswer(
  questionId: Id,
  kind: AnswerKind,
  language?: Language,
): Answer {
  const updatedAt = new Date().toISOString();
  switch (kind) {
    case 'CHOICE':
      return { kind, questionId, updatedAt, choiceIds: [] };
    case 'BOOLEAN':
      return { kind, questionId, updatedAt, value: null };
    case 'TEXT':
      return { kind, questionId, updatedAt, value: '' };
    case 'BLANKS':
      return { kind, questionId, updatedAt, values: {} };
    case 'PAIRS':
      return { kind, questionId, updatedAt, pairs: [] };
    case 'ORDER':
      return { kind, questionId, updatedAt, orderedIds: [] };
    case 'CODE':
      return {
        kind,
        questionId,
        updatedAt,
        language: language ?? 'PYTHON',
        source: '',
        drafts: {},
      };
    case 'FILES':
      return { kind, questionId, updatedAt, files: {} };
    case 'TERMINAL':
      return { kind, questionId, updatedAt, history: [] };
    case 'FLAG':
      return { kind, questionId, updatedAt, value: '' };
  }
}

/** True when the candidate has provided something gradable. */
export function isAnswered(answer: Answer | undefined): boolean {
  if (!answer) return false;
  switch (answer.kind) {
    case 'CHOICE':
      return answer.choiceIds.length > 0;
    case 'BOOLEAN':
      return answer.value !== null;
    case 'TEXT':
    case 'FLAG':
      return answer.value.trim().length > 0;
    case 'BLANKS':
      return Object.values(answer.values).some((v) => v.trim().length > 0);
    case 'PAIRS':
      return answer.pairs.length > 0;
    case 'ORDER':
      return answer.orderedIds.length > 0;
    case 'CODE':
      return answer.source.trim().length > 0;
    case 'FILES':
      return Object.values(answer.files).some((v) => v.trim().length > 0);
    case 'TERMINAL':
      return answer.history.length > 0;
  }
}
