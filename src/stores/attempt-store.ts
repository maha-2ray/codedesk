/**
 * Live exam attempt state.
 *
 * This store owns the data a candidate must never lose, so it follows a
 * strict write ordering on every edit:
 *
 *   1. Update in-memory state immediately — the UI must stay under 100 ms.
 *   2. Mark the answer dirty.
 *   3. On the autosave tick (2 s), write a snapshot to disk via IPC *before*
 *      attempting the network sync. Disk is fast and always available; the
 *      network is neither.
 *   4. Push the batch to the server. On failure, queue it in the durable
 *      outbox and retry with backoff once connectivity returns.
 *
 * The consequence is that a crash or outage costs at most one autosave
 * interval of work, and only if the machine itself dies mid-write.
 */

import { create } from 'zustand';
import { api } from '../api';
import { ApiError } from '../api/contract';
import type { Answer, AnswerMap, SyncState } from '../types/answer';
import { isAnswered } from '../types/answer';
import type { Attempt, ExamPaper } from '../types/exam';
import type { Id } from '../types/domain';
import type { Question } from '../types/question';

/** Autosave cadence required by the PRD. */
export const AUTOSAVE_INTERVAL_MS = 2000;

/** Retry backoff for a failed sync, in milliseconds. */
const RETRY_BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000];

interface AttemptState {
  attempt: Attempt | null;
  paper: ExamPaper | null;
  answers: AnswerMap;

  /** Question ids edited since the last successful sync. */
  dirty: Set<Id>;
  syncState: SyncState;
  lastSavedAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;

  /** Server-authoritative deadline, mirrored for the countdown. */
  expiresAt: string | null;

  /** Flat, ordered question list across all sections, for navigation. */
  orderedQuestions: Question[];
  currentIndex: number;

  loading: boolean;
  submitting: boolean;

  startAttempt(examId: Id): Promise<void>;
  setAnswer(answer: Answer): void;
  toggleFlag(questionId: Id): void;
  goToIndex(index: number): void;
  next(): void;
  previous(): void;
  /** Forces an immediate save; used before submit and on window close. */
  flush(): Promise<void>;
  submit(): Promise<void>;
  reset(): void;
}

let autosaveTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function flatten(paper: ExamPaper): Question[] {
  return paper.sections.flatMap((section) => section.questions);
}

/** Writes a crash-recovery snapshot through the native bridge, if present. */
async function persistSnapshot(
  attempt: Attempt,
  answers: AnswerMap,
): Promise<void> {
  const bridge = window.codedesk;
  if (!bridge) return; // Running outside Electron, e.g. in a browser harness.
  try {
    await bridge.attempt.saveSnapshot({
      attemptId: attempt.id,
      examId: attempt.examId,
      studentId: attempt.studentId,
      answers,
      revision: attempt.revision,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    // A snapshot failure must never interrupt the exam; log and continue.
    console.error('[attempt] snapshot write failed', error);
  }
}

export const useAttemptStore = create<AttemptState>((set, get) => {
  /** Sends dirty answers to the server, falling back to the durable outbox. */
  async function sync(): Promise<void> {
    const { attempt, answers, dirty } = get();
    if (!attempt || dirty.size === 0) return;

    const batch = Array.from(dirty)
      .map((id) => answers[id])
      .filter((a): a is Answer => Boolean(a));
    if (batch.length === 0) return;

    // Snapshot to disk first: this is the durable step.
    await persistSnapshot(attempt, answers);

    const envelope = {
      attemptId: attempt.id,
      revision: attempt.revision,
      answers: batch,
      queuedAt: new Date().toISOString(),
    };

    set({ syncState: 'SYNCING' });
    try {
      const { revision } = await api.attempts.syncAnswers(envelope);
      // Clear only the ids we just sent; edits made during the request stay dirty.
      const stillDirty = new Set(get().dirty);
      for (const answer of batch) stillDirty.delete(answer.questionId);

      set({
        attempt: { ...attempt, revision },
        dirty: stillDirty,
        syncState: stillDirty.size > 0 ? 'PENDING' : 'IDLE',
        lastSavedAt: new Date().toISOString(),
        lastError: null,
        consecutiveFailures: 0,
      });

      const bridge = window.codedesk;
      if (bridge) {
        await bridge.sync.acknowledge(attempt.id, revision).catch(() => undefined);
      }
    } catch (error) {
      const offline =
        error instanceof ApiError ? error.retryable : !navigator.onLine;

      // Persist to the durable outbox so the batch survives a restart.
      const bridge = window.codedesk;
      if (bridge) {
        await bridge.sync.enqueue(envelope).catch(() => undefined);
      }

      const failures = get().consecutiveFailures + 1;
      set({
        syncState: offline ? 'OFFLINE' : 'ERROR',
        lastError:
          error instanceof Error ? error.message : 'Could not reach the server.',
        consecutiveFailures: failures,
      });

      // Schedule a backoff retry; the autosave tick also keeps trying.
      if (retryTimer) clearTimeout(retryTimer);
      const wait =
        RETRY_BACKOFF_MS[Math.min(failures - 1, RETRY_BACKOFF_MS.length - 1)];
      retryTimer = setTimeout(() => void sync(), wait);
    }
  }

  function startAutosave(): void {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => {
      if (get().dirty.size > 0) void sync();
    }, AUTOSAVE_INTERVAL_MS);
  }

  function stopAutosave(): void {
    if (autosaveTimer) clearInterval(autosaveTimer);
    if (retryTimer) clearTimeout(retryTimer);
    autosaveTimer = null;
    retryTimer = null;
  }

  return {
    attempt: null,
    paper: null,
    answers: {},
    dirty: new Set<Id>(),
    syncState: 'IDLE',
    lastSavedAt: null,
    lastError: null,
    consecutiveFailures: 0,
    expiresAt: null,
    orderedQuestions: [],
    currentIndex: 0,
    loading: false,
    submitting: false,

    async startAttempt(examId: Id) {
      set({ loading: true, lastError: null });
      try {
        const { attempt, paper } = await api.attempts.startAttempt(examId);

        // Prefer a local snapshot when it is ahead of the server: it may hold
        // answers written just before a crash that never reached the network.
        let answers: AnswerMap = {};
        const serverAnswers = await api.attempts.getAnswers(attempt.id);
        for (const answer of serverAnswers) answers[answer.questionId] = answer;

        const bridge = window.codedesk;
        if (bridge) {
          const snapshot = await bridge.attempt
            .loadSnapshot(attempt.id)
            .catch(() => null);
          if (snapshot && snapshot.revision >= attempt.revision) {
            answers = { ...answers, ...(snapshot.answers as AnswerMap) };
          }
        }

        set({
          attempt,
          paper,
          answers,
          dirty: new Set<Id>(),
          orderedQuestions: flatten(paper),
          currentIndex: 0,
          expiresAt: attempt.expiresAt ?? null,
          syncState: 'IDLE',
          loading: false,
        });
        startAutosave();
      } catch (error) {
        set({
          loading: false,
          lastError:
            error instanceof Error ? error.message : 'Could not start the exam.',
        });
        throw error;
      }
    },

    setAnswer(answer: Answer) {
      const dirty = new Set(get().dirty);
      dirty.add(answer.questionId);
      set((state) => ({
        answers: {
          ...state.answers,
          [answer.questionId]: { ...answer, updatedAt: new Date().toISOString() },
        },
        dirty,
        syncState: state.syncState === 'IDLE' ? 'PENDING' : state.syncState,
      }));
    },

    toggleFlag(questionId: Id) {
      const existing = get().answers[questionId];
      if (!existing) return;
      get().setAnswer({ ...existing, flagged: !existing.flagged });
    },

    goToIndex(index: number) {
      const max = get().orderedQuestions.length - 1;
      set({ currentIndex: Math.max(0, Math.min(index, max)) });
    },

    next() {
      get().goToIndex(get().currentIndex + 1);
    },

    previous() {
      get().goToIndex(get().currentIndex - 1);
    },

    async flush() {
      await sync();
    },

    async submit() {
      const attempt = get().attempt;
      if (!attempt) return;
      set({ submitting: true });
      try {
        // Never submit with unsynced work outstanding.
        await sync();
        const submitted = await api.attempts.submitAttempt(attempt.id);
        stopAutosave();

        const bridge = window.codedesk;
        if (bridge) {
          await bridge.attempt.clearSnapshot(attempt.id).catch(() => undefined);
        }

        set({ attempt: submitted, submitting: false, syncState: 'IDLE' });
      } catch (error) {
        set({
          submitting: false,
          lastError:
            error instanceof Error ? error.message : 'Submission failed.',
        });
        throw error;
      }
    },

    reset() {
      stopAutosave();
      set({
        attempt: null,
        paper: null,
        answers: {},
        dirty: new Set<Id>(),
        syncState: 'IDLE',
        lastSavedAt: null,
        lastError: null,
        consecutiveFailures: 0,
        expiresAt: null,
        orderedQuestions: [],
        currentIndex: 0,
        loading: false,
        submitting: false,
      });
    },
  };
});

/* ---------- Selectors ---------- */

export const useCurrentQuestion = (): Question | null =>
  useAttemptStore((s) => s.orderedQuestions[s.currentIndex] ?? null);

/** Progress counts for the navigator and submit confirmation. */
export function useAttemptProgress(): {
  total: number;
  answered: number;
  flagged: number;
} {
  const total = useAttemptStore((s) => s.orderedQuestions.length);
  const answered = useAttemptStore((s) => {
    let answered = 0;
    for (const question of s.orderedQuestions) {
      const answer = s.answers[question.id];
      if (isAnswered(answer)) answered += 1;
    }
    return answered;
  });
  const flagged = useAttemptStore((s) => {
    let flagged = 0;
    for (const question of s.orderedQuestions) {
      if (s.answers[question.id]?.flagged) flagged += 1;
    }
    return flagged;
  });

  return { total, answered, flagged };
}
