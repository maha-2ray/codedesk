/**
 * The API contract the desktop client depends on.
 *
 * This interface is the single seam between the UI and any backend. The
 * current build binds it to an in-memory mock; pointing the app at a real
 * Spring Boot or NestJS service means implementing this interface with
 * `fetch` and swapping the binding in `src/api/index.ts` — no UI changes.
 *
 * The corresponding HTTP surface is documented in `docs/api-contract.md`.
 */

import type {
  Answer,
  AttemptResult,
  ExecutionResult,
  SyncEnvelope,
} from '../types/answer';
import type {
  Attempt,
  Exam,
  ExamPaper,
  ExamSummary,
  Paginated,
  QuestionFilter,
} from '../types/exam';
import type { AuthTokens, LoginCredentials, LoginResult } from '../types/auth';
import type { Course, Id, User } from '../types/domain';
import type { Language, Question } from '../types/question';

/** Error thrown by every transport binding on a non-2xx response. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for a network/transport failure. */
    readonly status: number,
    /** Machine-readable code from the backend error envelope. */
    readonly code?: string,
    /** Field-level validation messages, keyed by field path. */
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when retrying the request may succeed. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export interface AuthApi {
  login(credentials: LoginCredentials): Promise<LoginResult>;
  /** Completes a login that returned `TOTP_REQUIRED`. */
  verifyTotp(challengeId: Id, code: string): Promise<LoginResult>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(): Promise<void>;
  currentUser(): Promise<User>;
}

export interface ExamApi {
  /** Exams visible to the caller, filtered by role server-side. */
  listExams(params?: {
    courseId?: Id;
    status?: string;
  }): Promise<ExamSummary[]>;
  getExam(examId: Id): Promise<Exam>;
  createExam(draft: Partial<Exam>): Promise<Exam>;
  updateExam(examId: Id, patch: Partial<Exam>): Promise<Exam>;
  publishExam(examId: Id): Promise<Exam>;
}

export interface AttemptApi {
  /**
   * Starts or resumes an attempt and returns the delivered paper.
   * Idempotent: calling it twice returns the same attempt.
   */
  startAttempt(examId: Id): Promise<{ attempt: Attempt; paper: ExamPaper }>;
  getAttempt(attemptId: Id): Promise<Attempt>;
  /** Pushes a batch of answers. Returns the accepted server revision. */
  syncAnswers(envelope: SyncEnvelope): Promise<{ revision: number }>;
  /** Fetches server-held answers, used when resuming on another machine. */
  getAnswers(attemptId: Id): Promise<Answer[]>;
  submitAttempt(attemptId: Id): Promise<Attempt>;
  getResult(attemptId: Id): Promise<AttemptResult>;
}

export interface ExecutionApi {
  /**
   * Runs candidate code against the question's public tests.
   * Hidden tests only ever run during grading, server-side.
   */
  runCode(params: {
    attemptId: Id;
    questionId: Id;
    language: Language;
    source: string;
    /** Optional ad-hoc input for a scratch run. */
    stdin?: string;
  }): Promise<ExecutionResult>;
}

export interface QuestionBankApi {
  listQuestions(filter?: QuestionFilter): Promise<Paginated<Question>>;
  getQuestion(questionId: Id): Promise<Question>;
  createQuestion(question: Omit<Question, 'id'>): Promise<Question>;
  updateQuestion(questionId: Id, patch: Partial<Question>): Promise<Question>;
  deleteQuestion(questionId: Id): Promise<void>;
}

export interface CourseApi {
  listCourses(): Promise<Course[]>;
}

/** The complete client-facing API. */
export interface CodeDeskApi {
  auth: AuthApi;
  exams: ExamApi;
  attempts: AttemptApi;
  execution: ExecutionApi;
  questionBank: QuestionBankApi;
  courses: CourseApi;
}
