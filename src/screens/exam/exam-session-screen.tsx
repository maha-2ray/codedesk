/**
 * Exam runner shell.
 *
 * This is the foundation slice: it starts an attempt, drives the timer,
 * navigation, autosave and submission, and renders a basic answer surface
 * for each question type. The rich per-type editors — Monaco, SQL runner,
 * React sandbox, terminal — replace `QuestionSurface` in the next milestone
 * without touching the surrounding session machinery.
 *
 * Note this screen renders outside the dashboard shell on purpose: during an
 * attempt there must be no navigation leading away from the exam.
 */

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import {
  useAttemptProgress,
  useAttemptStore,
  useCurrentQuestion,
} from '../../stores/attempt-store';
import { useExamTimer } from '../../hooks/use-exam-timer';
import { cn, formatDuration } from '../../lib/utils';
import { Button, Card, Spinner } from '../../components/ui/primitives';
import { AutosaveIndicator } from '../../components/exam/autosave-indicator';
import { QuestionSurface } from '../../components/exam/question-surface';
import { isAnswered } from '../../types/answer';
import { QUESTION_TYPE_LABELS } from '../../types/question';

export const ExamSessionScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const reset = useAttemptStore((s) => s.reset);
  const flush = useAttemptStore((s) => s.flush);
  const submit = useAttemptStore((s) => s.submit);
  const loading = useAttemptStore((s) => s.loading);
  const submitting = useAttemptStore((s) => s.submitting);
  const paper = useAttemptStore((s) => s.paper);
  const attempt = useAttemptStore((s) => s.attempt);
  const lastError = useAttemptStore((s) => s.lastError);
  const answers = useAttemptStore((s) => s.answers);
  const orderedQuestions = useAttemptStore((s) => s.orderedQuestions);
  const currentIndex = useAttemptStore((s) => s.currentIndex);
  const goToIndex = useAttemptStore((s) => s.goToIndex);
  const next = useAttemptStore((s) => s.next);
  const previous = useAttemptStore((s) => s.previous);
  const expiresAt = useAttemptStore((s) => s.expiresAt);

  const question = useCurrentQuestion();
  const progress = useAttemptProgress();
  const timer = useExamTimer(expiresAt);

  useEffect(() => {
    if (examId) void startAttempt(examId);
    return () => reset();
  }, [examId, startAttempt, reset]);

  // Last-chance save if the window is closing mid-attempt.
  useEffect(() => {
    const handler = () => void flush();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flush]);

  const handleSubmit = React.useCallback(async () => {
    await submit();
    navigate(ROUTES.student.dashboard, { replace: true });
  }, [submit, navigate]);

  // Time is authoritative: when it runs out the attempt is submitted.
  useEffect(() => {
    if (timer.expired && attempt?.status === 'IN_PROGRESS') {
      void handleSubmit();
    }
  }, [timer.expired, attempt?.status, handleSubmit]);

  if (loading || !paper || !question) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950">
        <Spinner className="size-10 text-sky-500" />
        <p className="text-sm text-slate-400">Preparing your examination…</p>
        {lastError && <p className="text-sm text-red-400">{lastError}</p>}
      </div>
    );
  }

  const confirmSubmit = () => {
    const unanswered = progress.total - progress.answered;
    const message =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
        : 'Submit your examination? You cannot make further changes.';
    if (window.confirm(message)) void handleSubmit();
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-slate-800 bg-slate-900 px-6">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-white">
            {paper.title}
          </h1>
          <p className="text-xs text-slate-400">
            {paper.courseCode} · {progress.answered}/{progress.total} answered
          </p>
        </div>

        <div className="flex items-center gap-6">
          <AutosaveIndicator />
          <div
            className={cn(
              'rounded-md px-3 py-1.5 font-mono text-lg tabular-nums',
              timer.critical
                ? 'bg-red-950 text-red-300'
                : 'bg-slate-800 text-slate-100',
            )}
            role="timer"
            aria-live={timer.critical ? 'assertive' : 'off'}
            aria-label="Time remaining"
          >
            {formatDuration(timer.remainingMs)}
          </div>
          <Button variant="danger" onClick={confirmSubmit} loading={submitting}>
            Submit exam
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          className="w-64 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/50 p-4"
          aria-label="Question navigator"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Questions
          </h2>
          <ol className="grid grid-cols-5 gap-2">
            {orderedQuestions.map((q, index) => {
              const answer = answers[q.id];
              const done = isAnswered(answer);
              const isCurrent = index === currentIndex;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => goToIndex(index)}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={`Question ${index + 1}${done ? ', answered' : ', not answered'}${answer?.flagged ? ', flagged' : ''}`}
                    className={cn(
                      'relative grid size-9 place-items-center rounded text-sm font-medium transition-colors',
                      isCurrent
                        ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                        : done
                          ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                    )}
                  >
                    {index + 1}
                    {answer?.flagged && (
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <dl className="mt-6 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <dt>Answered</dt>
              <dd className="text-emerald-400">{progress.answered}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Flagged</dt>
              <dd className="text-amber-400">{progress.flagged}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Remaining</dt>
              <dd>{progress.total - progress.answered}</dd>
            </div>
          </dl>
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-400">
                  Question {currentIndex + 1} of {progress.total}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {QUESTION_TYPE_LABELS[question.type]}
                </span>
                <span className="text-xs text-slate-500">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </span>
              </div>
            </div>

            <Card className="mb-4">
              <QuestionSurface question={question} />
            </Card>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={previous}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={next}
                disabled={currentIndex >= progress.total - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
