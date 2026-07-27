/**
 * Lecturer dashboard: courses, examinations and question-bank overview.
 */

import React from 'react';
import { useCourses, useExams, useQuestionBank } from '../../hooks/queries';
import { useSessionStore } from '../../stores/session-store';
import { formatDateTime } from '../../lib/utils';
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/ui/primitives';
import { ExamStatusBadge } from '../../components/exam/exam-status-badge';

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <Card>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </Card>
);

export const LecturerDashboard: React.FC = () => {
  const user = useSessionStore((s) => s.session?.user);
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: courses } = useCourses();
  const { data: bank } = useQuestionBank();

  if (examsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-sky-500" />
      </div>
    );
  }

  const active = exams?.filter((e) => e.status === 'ACTIVE') ?? [];
  const scheduled = exams?.filter((e) => e.status === 'SCHEDULED') ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Good day, ${user?.firstName ?? 'lecturer'}`}
        description="Overview of your courses and assessments."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={courses?.length ?? 0} />
        <StatCard label="Live examinations" value={active.length} hint="Running now" />
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard
          label="Questions in bank"
          value={bank?.total ?? 0}
          hint="Across all courses"
        />
      </div>

      <section className="mb-8" aria-labelledby="exams-heading">
        <h2 id="exams-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Examinations
        </h2>
        {!exams || exams.length === 0 ? (
          <EmptyState
            title="No examinations yet"
            description="Create an exam to start assessing your students."
          />
        ) : (
          <Card className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Examination</th>
                  <th scope="col" className="px-5 py-3 font-medium">Course</th>
                  <th scope="col" className="px-5 py-3 font-medium">Opens</th>
                  <th scope="col" className="px-5 py-3 font-medium">Questions</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {exams.map((exam) => (
                  <tr key={exam.id} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-100">{exam.title}</td>
                    <td className="px-5 py-3 text-slate-400">{exam.courseCode}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {formatDateTime(exam.startsAt)}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{exam.questionCount}</td>
                    <td className="px-5 py-3">
                      <ExamStatusBadge status={exam.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Your courses
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course) => (
            <Card key={course.id}>
              <p className="text-sm font-medium text-sky-400">{course.code}</p>
              <p className="mt-1 text-base text-white">{course.title}</p>
              <p className="mt-2 text-xs text-slate-500">
                Level {course.level} · {course.creditHours} credit hours
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
