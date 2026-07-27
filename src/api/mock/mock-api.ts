/**
 * In-memory implementation of {@link CodeDeskApi}.
 *
 * Purpose: let the whole desktop client be developed, demoed and tested
 * before the Spring Boot/NestJS backend exists. It deliberately mimics
 * realistic backend behaviour — latency, auth failures, revision conflicts
 * and answer-key stripping — so that swapping in the HTTP binding does not
 * surface a class of bugs the mock was hiding.
 *
 * It is NOT a grading engine: `runCode` returns a plausible shaped result
 * without executing anything. Real execution requires the sandboxed
 * Judge0/Piston service described in the PRD.
 */

import { ApiError, type CodeDeskApi } from '../contract';
import type {
  Answer,
  AttemptResult,
  ExecutionResult,
  SyncEnvelope,
  TestResult,
} from '../../types/answer';
import type {
  Attempt,
  Exam,
  ExamPaper,
  ExamSummary,
  Paginated,
  QuestionFilter,
} from '../../types/exam';
import type { AuthTokens, LoginCredentials, LoginResult } from '../../types/auth';
import type { Course, Id, User } from '../../types/domain';
import type { Language, Question } from '../../types/question';
import { isCodeQuestion } from '../../types/question';
import {
  DEMO_PASSWORD,
  courses as seedCourses,
  exams as seedExams,
  institution,
  questions as seedQuestions,
  users as seedUsers,
} from './fixtures';

/** Simulated network latency in milliseconds. */
const LATENCY_MS = 180;

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Removes answer keys before a question reaches a student client.
 * The real backend must do the same; mirroring it here keeps the client
 * honest about never relying on fields it will not receive in production.
 */
function stripAnswerKey(question: Question): Question {
  const copy = clone(question) as unknown as Record<string, unknown>;
  delete copy.correctChoiceId;
  delete copy.correctChoiceIds;
  delete copy.correctAnswer;
  delete copy.acceptedAnswers;
  delete copy.correctPairs;
  delete copy.correctOrder;
  delete copy.expectedOutput;
  delete copy.expectedResult;
  delete copy.referenceSolution;
  delete copy.explanation;
  delete copy.flagHash;
  delete copy.verificationScript;
  if (Array.isArray(copy.blanks)) {
    copy.blanks = (copy.blanks as Array<Record<string, unknown>>).map((b) => {
      const rest = { ...b };
      delete rest.acceptedAnswers;
      return rest;
    });
  }
  // Hidden test cases exist, but their IO is never disclosed.
  if (Array.isArray(copy.testCases)) {
    copy.testCases = (copy.testCases as Array<Record<string, unknown>>).map((t) =>
      t.visibility === 'HIDDEN'
        ? { id: t.id, visibility: 'HIDDEN', weight: t.weight, stdin: '', expectedStdout: '' }
        : t,
    );
  }
  return copy as unknown as Question;
}

interface MockState {
  users: User[];
  courses: Course[];
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  answers: Map<Id, Map<Id, Answer>>;
  results: AttemptResult[];
  currentUserId: Id | null;
}

const state: MockState = {
  users: clone(seedUsers),
  courses: clone(seedCourses),
  exams: clone(seedExams),
  questions: clone(seedQuestions),
  attempts: [],
  answers: new Map(),
  results: [],
  currentUserId: null,
};

function requireUser(): User {
  const user = state.users.find((u) => u.id === state.currentUserId);
  if (!user) throw new ApiError('Not authenticated', 401, 'UNAUTHENTICATED');
  return user;
}

function findExam(examId: Id): Exam {
  const exam = state.exams.find((e) => e.id === examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'EXAM_NOT_FOUND');
  return exam;
}

function findQuestion(questionId: Id): Question {
  const question = state.questions.find((q) => q.id === questionId);
  if (!question) throw new ApiError('Question not found', 404, 'QUESTION_NOT_FOUND');
  return question;
}

function courseFor(exam: Exam): Course | undefined {
  return state.courses.find((c) => c.id === exam.courseId);
}

function questionCount(exam: Exam): number {
  return exam.sections.reduce((sum, s) => sum + s.questionIds.length, 0);
}

function toSummary(exam: Exam, forUser: User): ExamSummary {
  const course = courseFor(exam);
  const attempt = state.attempts.find(
    (a) => a.examId === exam.id && a.studentId === forUser.id,
  );
  return {
    id: exam.id,
    title: exam.title,
    courseCode: course?.code ?? '—',
    courseTitle: course?.title ?? '—',
    status: exam.status,
    startsAt: exam.startsAt,
    endsAt: exam.endsAt,
    durationMinutes: exam.durationMinutes,
    totalMarks: exam.totalMarks,
    questionCount: questionCount(exam),
    attemptStatus: attempt?.status ?? 'NOT_STARTED',
  };
}

function issueTokens(): AuthTokens {
  return {
    accessToken: `mock-access-${uid('t')}`,
    refreshToken: `mock-refresh-${uid('r')}`,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
}

const pendingTotp = new Map<string, Id>();

export const mockApi: CodeDeskApi = {
  auth: {
    async login(credentials: LoginCredentials): Promise<LoginResult> {
      await delay(null);
      const identifier = credentials.identifier.trim().toLowerCase();
      const user = state.users.find(
        (u) =>
          u.email.toLowerCase() === identifier ||
          u.identifier.toLowerCase() === identifier,
      );
      if (!user || credentials.password !== DEMO_PASSWORD) {
        return { outcome: 'INVALID_CREDENTIALS' };
      }
      if (user.twoFactorEnabled && !credentials.totpCode) {
        const challengeId = uid('challenge');
        pendingTotp.set(challengeId, user.id);
        return { outcome: 'TOTP_REQUIRED', challengeId };
      }
      state.currentUserId = user.id;
      return {
        outcome: 'SUCCESS',
        session: {
          user: clone(user),
          institution: clone(institution),
          tokens: issueTokens(),
          extraPermissions: [],
        },
      };
    },

    async verifyTotp(challengeId: Id, code: string): Promise<LoginResult> {
      await delay(null);
      const userId = pendingTotp.get(challengeId);
      if (!userId) return { outcome: 'INVALID_CREDENTIALS' };
      // Any six-digit code is accepted by the mock.
      if (!/^\d{6}$/.test(code)) return { outcome: 'INVALID_CREDENTIALS' };
      pendingTotp.delete(challengeId);
      const user = state.users.find((u) => u.id === userId);
      if (!user) return { outcome: 'INVALID_CREDENTIALS' };
      state.currentUserId = user.id;
      return {
        outcome: 'SUCCESS',
        session: {
          user: clone(user),
          institution: clone(institution),
          tokens: issueTokens(),
          extraPermissions: [],
        },
      };
    },

    async refresh(): Promise<AuthTokens> {
      await delay(null, 60);
      return issueTokens();
    },

    async logout(): Promise<void> {
      await delay(null, 60);
      state.currentUserId = null;
    },

    async currentUser(): Promise<User> {
      await delay(null, 60);
      return clone(requireUser());
    },
  },

  exams: {
    async listExams(params): Promise<ExamSummary[]> {
      await delay(null);
      const user = requireUser();
      let exams = state.exams;
      if (params?.courseId) {
        exams = exams.filter((e) => e.courseId === params.courseId);
      }
      if (params?.status) {
        exams = exams.filter((e) => e.status === params.status);
      }
      // Students never see drafts.
      if (user.role === 'STUDENT') {
        exams = exams.filter((e) => e.status !== 'DRAFT');
      }
      return exams.map((e) => toSummary(e, user));
    },

    async getExam(examId: Id): Promise<Exam> {
      await delay(null);
      requireUser();
      return clone(findExam(examId));
    },

    async createExam(draft: Partial<Exam>): Promise<Exam> {
      await delay(null);
      const user = requireUser();
      const now = new Date().toISOString();
      const exam: Exam = {
        id: uid('exam'),
        institutionId: institution.id,
        courseId: draft.courseId ?? state.courses[0].id,
        title: draft.title ?? 'Untitled examination',
        description: draft.description,
        status: 'DRAFT',
        startsAt: draft.startsAt ?? now,
        endsAt: draft.endsAt ?? now,
        durationMinutes: draft.durationMinutes ?? 60,
        lateEntryMinutes: draft.lateEntryMinutes ?? 10,
        sections: draft.sections ?? [],
        totalMarks: draft.totalMarks ?? 0,
        security: draft.security ?? state.exams[0].security,
        grading: draft.grading ?? state.exams[0].grading,
        randomisation:
          draft.randomisation ?? {
            shuffleQuestions: false,
            shuffleChoices: false,
            drawFromPool: false,
          },
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      state.exams.push(exam);
      return clone(exam);
    },

    async updateExam(examId: Id, patch: Partial<Exam>): Promise<Exam> {
      await delay(null);
      requireUser();
      const exam = findExam(examId);
      Object.assign(exam, patch, { updatedAt: new Date().toISOString() });
      return clone(exam);
    },

    async publishExam(examId: Id): Promise<Exam> {
      await delay(null);
      requireUser();
      const exam = findExam(examId);
      exam.status = 'SCHEDULED';
      exam.updatedAt = new Date().toISOString();
      return clone(exam);
    },
  },

  attempts: {
    async startAttempt(examId: Id) {
      await delay(null, 320);
      const user = requireUser();
      const exam = findExam(examId);

      let attempt = state.attempts.find(
        (a) => a.examId === examId && a.studentId === user.id,
      );
      if (!attempt) {
        const startedAt = new Date();
        attempt = {
          id: uid('attempt'),
          examId,
          studentId: user.id,
          status: 'IN_PROGRESS',
          startedAt: startedAt.toISOString(),
          expiresAt: new Date(
            startedAt.getTime() + exam.durationMinutes * 60_000,
          ).toISOString(),
          revision: 0,
        };
        state.attempts.push(attempt);
        state.answers.set(attempt.id, new Map());
      }

      const course = courseFor(exam);
      const paper: ExamPaper = {
        examId: exam.id,
        attemptId: attempt.id,
        title: exam.title,
        courseCode: course?.code ?? '—',
        durationMinutes: exam.durationMinutes,
        security: clone(exam.security),
        totalMarks: exam.totalMarks,
        sections: exam.sections.map((section) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          questions: section.questionIds
            .map((id) => state.questions.find((q) => q.id === id))
            .filter((q): q is Question => Boolean(q))
            .map(stripAnswerKey),
        })),
      };

      return { attempt: clone(attempt), paper };
    },

    async getAttempt(attemptId: Id): Promise<Attempt> {
      await delay(null, 80);
      const attempt = state.attempts.find((a) => a.id === attemptId);
      if (!attempt) throw new ApiError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
      return clone(attempt);
    },

    async syncAnswers(envelope: SyncEnvelope): Promise<{ revision: number }> {
      await delay(null, 90);
      const attempt = state.attempts.find((a) => a.id === envelope.attemptId);
      if (!attempt) throw new ApiError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
      if (attempt.status !== 'IN_PROGRESS') {
        throw new ApiError('Attempt is closed', 409, 'ATTEMPT_CLOSED');
      }
      // Stale batches are rejected, mirroring the real optimistic-concurrency
      // check so the client's conflict handling is exercised in development.
      if (envelope.revision < attempt.revision) {
        throw new ApiError('Stale revision', 409, 'STALE_REVISION');
      }
      const bucket = state.answers.get(attempt.id) ?? new Map<Id, Answer>();
      for (const answer of envelope.answers) {
        bucket.set(answer.questionId, clone(answer));
      }
      state.answers.set(attempt.id, bucket);
      attempt.revision = envelope.revision + 1;
      return { revision: attempt.revision };
    },

    async getAnswers(attemptId: Id): Promise<Answer[]> {
      await delay(null, 80);
      return Array.from(state.answers.get(attemptId)?.values() ?? []).map(clone);
    },

    async submitAttempt(attemptId: Id): Promise<Attempt> {
      await delay(null, 400);
      const attempt = state.attempts.find((a) => a.id === attemptId);
      if (!attempt) throw new ApiError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
      attempt.status = 'SUBMITTED';
      attempt.submittedAt = new Date().toISOString();
      return clone(attempt);
    },

    async getResult(attemptId: Id): Promise<AttemptResult> {
      await delay(null, 200);
      const existing = state.results.find((r) => r.attemptId === attemptId);
      if (existing) return clone(existing);
      throw new ApiError('Result not released', 404, 'RESULT_NOT_READY');
    },
  },

  execution: {
    async runCode(params): Promise<ExecutionResult> {
      // Deliberately slower: real sandboxed execution is not instant, and the
      // UI must show pending state convincingly.
      await delay(null, 900);
      const question = findQuestion(params.questionId);
      if (!isCodeQuestion(question)) {
        throw new ApiError('Question is not executable', 400, 'NOT_EXECUTABLE');
      }
      const publicTests = question.testCases.filter(
        (t) => t.visibility === 'PUBLIC',
      );
      // Heuristic stand-in for real evaluation: non-trivial source "passes".
      const looksImplemented =
        params.source.trim().length > 0 &&
        !params.source.includes('TODO') &&
        !params.source.includes('pass');

      const tests: TestResult[] = publicTests.map((test) => ({
        testCaseId: test.id,
        name: test.name,
        visibility: 'PUBLIC',
        passed: looksImplemented,
        stdin: test.stdin,
        expectedStdout: test.expectedStdout,
        actualStdout: looksImplemented ? test.expectedStdout : '',
        stderr: looksImplemented ? '' : 'No output produced.',
        runtimeMs: 12 + Math.floor(Math.random() * 40),
        memoryKb: 8_192 + Math.floor(Math.random() * 2_048),
        marksAwarded: looksImplemented ? test.weight : 0,
      }));

      return {
        id: uid('exec'),
        questionId: params.questionId,
        status: 'COMPLETED',
        tests,
        totalRuntimeMs: tests.reduce((sum, t) => sum + t.runtimeMs, 0),
        peakMemoryKb: Math.max(0, ...tests.map((t) => t.memoryKb)),
        createdAt: new Date().toISOString(),
      };
    },
  },

  questionBank: {
    async listQuestions(filter?: QuestionFilter): Promise<Paginated<Question>> {
      await delay(null);
      requireUser();
      let items = state.questions;
      if (filter?.search) {
        const needle = filter.search.toLowerCase();
        items = items.filter((q) => q.prompt.toLowerCase().includes(needle));
      }
      if (filter?.types?.length) {
        items = items.filter((q) => filter.types?.includes(q.type));
      }
      if (filter?.difficulties?.length) {
        items = items.filter((q) => filter.difficulties?.includes(q.difficulty));
      }
      if (filter?.courseId) {
        items = items.filter((q) => q.courseId === filter.courseId);
      }
      if (filter?.tags?.length) {
        items = items.filter((q) =>
          filter.tags?.some((tag) => q.tags.includes(tag)),
        );
      }
      const page = filter?.page ?? 1;
      const pageSize = filter?.pageSize ?? 20;
      const start = (page - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize).map(clone),
        page,
        pageSize,
        total: items.length,
      };
    },

    async getQuestion(questionId: Id): Promise<Question> {
      await delay(null, 80);
      requireUser();
      return clone(findQuestion(questionId));
    },

    async createQuestion(question): Promise<Question> {
      await delay(null);
      requireUser();
      const created = { ...clone(question), id: uid('q') } as Question;
      state.questions.push(created);
      return clone(created);
    },

    async updateQuestion(questionId: Id, patch): Promise<Question> {
      await delay(null);
      requireUser();
      const question = findQuestion(questionId);
      Object.assign(question, patch, { updatedAt: new Date().toISOString() });
      return clone(question);
    },

    async deleteQuestion(questionId: Id): Promise<void> {
      await delay(null);
      requireUser();
      state.questions = state.questions.filter((q) => q.id !== questionId);
    },
  },

  courses: {
    async listCourses(): Promise<Course[]> {
      await delay(null, 80);
      requireUser();
      return state.courses.map(clone);
    },
  },
};

/** Restores the mock to its seeded state; used by tests. */
export function resetMockState(): void {
  state.users = clone(seedUsers);
  state.courses = clone(seedCourses);
  state.exams = clone(seedExams);
  state.questions = clone(seedQuestions);
  state.attempts = [];
  state.answers = new Map();
  state.results = [];
  state.currentUserId = null;
  pendingTotp.clear();
}

/** Test helper: signs a user in without going through the login flow. */
export function signInAs(userId: Id): void {
  state.currentUserId = userId;
}

/** Language list the mock claims to support, for UI wiring. */
export const MOCK_SUPPORTED_LANGUAGES: Language[] = [
  'C',
  'CPP',
  'JAVA',
  'PYTHON',
  'JAVASCRIPT',
  'TYPESCRIPT',
  'CSHARP',
  'GO',
  'RUST',
  'PHP',
];
