/**
 * Exam definition, scheduling and policy types.
 */

import type { Id, IsoDateTime } from './domain';
import type { Difficulty, Question, QuestionType } from './question';

export const EXAM_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'CLOSED',
  'GRADING',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type ExamStatus = (typeof EXAM_STATUSES)[number];

/**
 * Security and proctoring policy. Proctoring is deliberately not implemented
 * in the current milestone; these flags exist so exam definitions authored
 * today remain valid once the proctoring module lands.
 */
export interface ExamSecurityPolicy {
  requireFullscreen: boolean;
  /** Log focus loss and surface it to invigilators. */
  detectWindowSwitch: boolean;
  /** Maximum tolerated focus losses before auto-submission; 0 disables. */
  maxFocusLossCount: number;
  disableCopyPaste: boolean;
  detectMultipleMonitors: boolean;
  detectRemoteDesktop: boolean;
  blockUnauthorisedApps: boolean;
  /** Auto-submit after this many minutes without input; 0 disables. */
  inactivityTimeoutMinutes: number;
  webcamRecording: boolean;
  screenRecording: boolean;
  microphoneMonitoring: boolean;
  faceVerification: boolean;
}

export const DEFAULT_SECURITY_POLICY: ExamSecurityPolicy = {
  requireFullscreen: true,
  detectWindowSwitch: true,
  maxFocusLossCount: 0,
  disableCopyPaste: true,
  detectMultipleMonitors: false,
  detectRemoteDesktop: false,
  blockUnauthorisedApps: false,
  inactivityTimeoutMinutes: 0,
  webcamRecording: false,
  screenRecording: false,
  microphoneMonitoring: false,
  faceVerification: false,
};

/** Marking rules applied when the attempt is scored. */
export interface GradingPolicy {
  /** Deduct this fraction of the question's marks for a wrong answer. */
  negativeMarkingFactor: number;
  /** Allow fractional marks on partially correct answers. */
  partialGrading: boolean;
  /** Percentage of total marks required to pass. */
  passMarkPercentage: number;
  /** Release results as soon as auto-grading completes. */
  autoReleaseResults: boolean;
  /** Show which tests passed or failed once results are released. */
  showTestResultsToStudent: boolean;
}

export const DEFAULT_GRADING_POLICY: GradingPolicy = {
  negativeMarkingFactor: 0,
  partialGrading: true,
  passMarkPercentage: 40,
  autoReleaseResults: false,
  showTestResultsToStudent: true,
};

/** Controls how questions are drawn and ordered per candidate. */
export interface RandomisationPolicy {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  /**
   * Draw a random subset from each section's pool. When absent, every
   * question in the section is served to every candidate.
   */
  drawFromPool: boolean;
}

/** A titled grouping of questions, e.g. "Section A — Theory". */
export interface ExamSection {
  id: Id;
  title: string;
  description?: string;
  /** Ordered question references. */
  questionIds: Id[];
  /** When `drawFromPool` is on, how many to serve from `questionIds`. */
  drawCount?: number;
  /** Optional per-section time limit in minutes. */
  timeLimitMinutes?: number;
}

export interface Exam {
  id: Id;
  institutionId: Id;
  courseId: Id;
  title: string;
  description?: string;
  status: ExamStatus;
  /** Scheduled window. Candidates may only start within it. */
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  /** Total duration in minutes, independent of the scheduling window. */
  durationMinutes: number;
  /** Grace period after `startsAt` during which late entry is allowed. */
  lateEntryMinutes: number;
  sections: ExamSection[];
  totalMarks: number;
  security: ExamSecurityPolicy;
  grading: GradingPolicy;
  randomisation: RandomisationPolicy;
  createdBy: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Lightweight exam projection used by dashboard lists. */
export interface ExamSummary {
  id: Id;
  title: string;
  courseCode: string;
  courseTitle: string;
  status: ExamStatus;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  /** Present for students: their attempt state for this exam. */
  attemptStatus?: AttemptStatus;
}

/**
 * The exam as delivered to a candidate: questions are resolved, shuffled and
 * stripped of answer keys by the backend before transmission.
 */
export interface ExamPaper {
  examId: Id;
  attemptId: Id;
  title: string;
  courseCode: string;
  durationMinutes: number;
  security: ExamSecurityPolicy;
  sections: Array<{
    id: Id;
    title: string;
    description?: string;
    questions: Question[];
  }>;
  totalMarks: number;
}

export const ATTEMPT_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'AUTO_SUBMITTED',
  'FORCE_SUBMITTED',
  'GRADED',
  'VOIDED',
] as const;

export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export interface Attempt {
  id: Id;
  examId: Id;
  studentId: Id;
  status: AttemptStatus;
  startedAt?: IsoDateTime;
  submittedAt?: IsoDateTime;
  /** Server-authoritative deadline; the client clock is never trusted. */
  expiresAt?: IsoDateTime;
  /** Monotonic counter incremented on every accepted sync. */
  revision: number;
}

/** Filter used by dashboard and question-bank queries. */
export interface QuestionFilter {
  search?: string;
  types?: QuestionType[];
  difficulties?: Difficulty[];
  tags?: string[];
  courseId?: Id;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
