/**
 * Route table.
 *
 * Every path in the application is declared here so that navigation targets
 * are checked at compile time and the RBAC guard has one place to consult.
 */

import type { Permission, UserRole } from '../types/domain';

export const ROUTES = {
  login: '/login',

  student: {
    root: '/student',
    dashboard: '/student/dashboard',
    exams: '/student/exams',
    results: '/student/results',
  },

  lecturer: {
    root: '/lecturer',
    dashboard: '/lecturer/dashboard',
    exams: '/lecturer/exams',
    questionBank: '/lecturer/question-bank',
    grading: '/lecturer/grading',
    analytics: '/lecturer/analytics',
  },

  invigilator: {
    root: '/invigilator',
    dashboard: '/invigilator/dashboard',
    monitor: '/invigilator/monitor',
  },

  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    institution: '/admin/institution',
  },

  /** The exam runner is deliberately outside every dashboard shell. */
  exam: {
    session: '/exam/:examId',
    build: (examId: string) => `/exam/${examId}`,
  },

  settings: '/settings',
} as const;

/** Landing route for each role, used after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: ROUTES.student.dashboard,
  LECTURER: ROUTES.lecturer.dashboard,
  INVIGILATOR: ROUTES.invigilator.dashboard,
  ADMIN: ROUTES.admin.dashboard,
};

/** Navigation entry rendered in the sidebar. */
export interface NavItem {
  label: string;
  path: string;
  /** Hidden unless the session holds this capability. */
  permission?: Permission;
  /** Lucide-style icon key; resolved by the sidebar component. */
  icon: string;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { label: 'Dashboard', path: ROUTES.student.dashboard, icon: 'home' },
    { label: 'My Exams', path: ROUTES.student.exams, icon: 'clipboard' },
    { label: 'Results', path: ROUTES.student.results, icon: 'award' },
  ],
  LECTURER: [
    { label: 'Dashboard', path: ROUTES.lecturer.dashboard, icon: 'home' },
    {
      label: 'Examinations',
      path: ROUTES.lecturer.exams,
      icon: 'clipboard',
      permission: 'exam:create',
    },
    {
      label: 'Question Bank',
      path: ROUTES.lecturer.questionBank,
      icon: 'database',
      permission: 'question-bank:read',
    },
    {
      label: 'Grading',
      path: ROUTES.lecturer.grading,
      icon: 'check',
      permission: 'exam:grade',
    },
    {
      label: 'Analytics',
      path: ROUTES.lecturer.analytics,
      icon: 'chart',
      permission: 'analytics:view',
    },
  ],
  INVIGILATOR: [
    { label: 'Dashboard', path: ROUTES.invigilator.dashboard, icon: 'home' },
    {
      label: 'Live Monitor',
      path: ROUTES.invigilator.monitor,
      icon: 'eye',
      permission: 'exam:monitor',
    },
  ],
  ADMIN: [
    { label: 'Dashboard', path: ROUTES.admin.dashboard, icon: 'home' },
    {
      label: 'Users',
      path: ROUTES.admin.users,
      icon: 'users',
      permission: 'user:manage',
    },
    {
      label: 'Institution',
      path: ROUTES.admin.institution,
      icon: 'building',
      permission: 'institution:manage',
    },
  ],
};
