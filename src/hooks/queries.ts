/**
 * TanStack Query bindings.
 *
 * Query keys are centralised so cache invalidation stays consistent as the
 * surface grows. Everything here goes through the `api` seam, so these hooks
 * work identically against the mock and a real backend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Id } from '../types/domain';
import type { QuestionFilter } from '../types/exam';

export const queryKeys = {
  currentUser: ['current-user'] as const,
  courses: ['courses'] as const,
  exams: (params?: Record<string, unknown>) => ['exams', params ?? {}] as const,
  exam: (examId: Id) => ['exam', examId] as const,
  attempt: (attemptId: Id) => ['attempt', attemptId] as const,
  result: (attemptId: Id) => ['result', attemptId] as const,
  questions: (filter?: QuestionFilter) => ['questions', filter ?? {}] as const,
  question: (questionId: Id) => ['question', questionId] as const,
};

export function useExams(params?: { courseId?: Id; status?: string }) {
  return useQuery({
    queryKey: queryKeys.exams(params),
    queryFn: () => api.exams.listExams(params),
  });
}

export function useExam(examId: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.exam(examId ?? ''),
    queryFn: () => api.exams.getExam(examId as Id),
    enabled: Boolean(examId),
  });
}

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => api.courses.listCourses(),
  });
}

export function useQuestionBank(filter?: QuestionFilter) {
  return useQuery({
    queryKey: queryKeys.questions(filter),
    queryFn: () => api.questionBank.listQuestions(filter),
  });
}

export function useAttemptResult(attemptId: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.result(attemptId ?? ''),
    queryFn: () => api.attempts.getResult(attemptId as Id),
    enabled: Boolean(attemptId),
    // A result that is not ready yet is an expected state, not a failure.
    retry: false,
  });
}

export function usePublishExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: Id) => api.exams.publishExam(examId),
    onSuccess: (exam) => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exam(exam.id) });
    },
  });
}
