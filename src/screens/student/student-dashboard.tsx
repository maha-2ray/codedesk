/**
 * Student dashboard: active, upcoming and past examinations.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExams } from '../../hooks/queries';
import { useSessionStore } from '../../stores/session-store';
import { ROUTES } from '../../constants/routes';
import { formatDateTime, formatRelative } from '../../lib/utils';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/ui/primitives';
import {
  AttemptStatusBadge,
  ExamStatusBadge,
} from '../../components/exam/exam-status-badge';
import { Icon } from '../../components/icons';
import type { ExamSummary } from '../../types/exam';

const ExamCard: React.FC<{ exam: ExamSummary; onEnter?: () => void }> = ({
  exam,
  onEnter,
}) => {
  const canEnter =
    exam.status === 'ACTIVE' &&
    exam.attemptStatus !== 'SUBMITTED' &&
    exam.attemptStatus !== 'GRADED';

  return (
    <Card className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-medium text-white">
            {exam.title}
          </h3>
          <ExamStatusBadge status={exam.status} />
          {exam.attemptStatus && exam.attemptStatus !== 'NOT_STARTED' && (
            <AttemptStatusBadge status={exam.attemptStatus} />
          )}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {exam.courseCode} — {exam.courseTitle}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5" />
            {exam.durationMinutes} minutes
          </span>
          <span>{exam.questionCount} questions</span>
          <span>{exam.totalMarks} marks</span>
          <span title={formatDateTime(exam.startsAt)}>
            Starts {formatRelative(exam.startsAt)}
          </span>
        </div>
      </div>
      {canEnter && (
        <Button onClick={onEnter} size="lg">
          Enter exam
        </Button>
      )}
    </Card>
  );
};

export const StudentDashboard: React.FC = () => {
  const { data: exams, isLoading, error } = useExams();
  const user = useSessionStore((s) => s.session?.user);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load your examinations"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const active = exams?.filter((e) => e.status === 'ACTIVE') ?? [];
  const upcoming = exams?.filter((e) => e.status === 'SCHEDULED') ?? [];
  const past =
    exams?.filter((e) =>
      ['CLOSED', 'GRADING', 'PUBLISHED', 'ARCHIVED'].includes(e.status),
    ) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'student'}`}
        description="Your examinations at a glance."
      />

      <section className="mb-8" aria-labelledby="active-heading">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="active-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Open now
          </h2>
          {active.length > 0 && <Badge tone="success">{active.length}</Badge>}
        </div>
        {active.length === 0 ? (
          <EmptyState
            title="No examinations are open"
            description="Exams appear here when their scheduled window opens."
          />
        ) : (
          <div className="space-y-3">
            {active.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onEnter={() => navigate(ROUTES.exam.build(exam.id))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="past-heading">
        <h2 id="past-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Completed
        </h2>
        {past.length === 0 ? (
          <p className="text-sm text-slate-500">No past examinations yet.</p>
        ) : (
          <div className="space-y-3">
            {past.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
