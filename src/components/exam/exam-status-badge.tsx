/** Status pills for exams and attempts. */

import React from 'react';
import { Badge } from '../ui/primitives';
import type { AttemptStatus, ExamStatus } from '../../types/exam';

const examTones: Record<
  ExamStatus,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  ACTIVE: 'success',
  CLOSED: 'warning',
  GRADING: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
};

const examLabels: Record<ExamStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Open now',
  CLOSED: 'Closed',
  GRADING: 'Grading',
  PUBLISHED: 'Results published',
  ARCHIVED: 'Archived',
};

export const ExamStatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => (
  <Badge tone={examTones[status]}>{examLabels[status]}</Badge>
);

const attemptTones: Record<
  AttemptStatus,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'info',
  SUBMITTED: 'success',
  AUTO_SUBMITTED: 'warning',
  FORCE_SUBMITTED: 'danger',
  GRADED: 'success',
  VOIDED: 'danger',
};

const attemptLabels: Record<AttemptStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  AUTO_SUBMITTED: 'Auto-submitted',
  FORCE_SUBMITTED: 'Force-submitted',
  GRADED: 'Graded',
  VOIDED: 'Voided',
};

export const AttemptStatusBadge: React.FC<{ status: AttemptStatus }> = ({
  status,
}) => <Badge tone={attemptTones[status]}>{attemptLabels[status]}</Badge>;
