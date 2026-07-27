/**
 * Application root: providers and the route tree.
 */

import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import QueryProvider from './providers/query-provider';
import { ROUTES } from './constants/routes';
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequirePermission,
  RequireRole,
} from './components/auth/route-guard';
import { AppShell } from './components/layout/app-shell';
import { LoginScreen } from './screens/login-screen';
import { StudentDashboard } from './screens/student/student-dashboard';
import { LecturerDashboard } from './screens/lecturer/lecturer-dashboard';
import { ExamSessionScreen } from './screens/exam/exam-session-screen';
import { SettingsScreen } from './screens/settings-screen';
import { PlaceholderScreen } from './screens/placeholder-screen';
import { RoleHomeRedirect } from './components/auth/role-home-redirect';

const App: React.FC = () => (
  <QueryProvider>
    {/*
      HashRouter rather than BrowserRouter: a packaged Electron app loads the
      renderer from a file:// URL, where history-based routing cannot resolve
      deep paths on reload.
    */}
    <HashRouter>
      <Routes>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path={ROUTES.login} element={<LoginScreen />} />
        </Route>

        <Route element={<RequireAuth />}>
          {/* The exam runner sits outside the dashboard shell by design. */}
          <Route path={ROUTES.exam.session} element={<ExamSessionScreen />} />

          <Route element={<AppShell />}>
            <Route path={ROUTES.settings} element={<SettingsScreen />} />

            <Route element={<RequireRole roles={['STUDENT']} />}>
              <Route
                path={ROUTES.student.dashboard}
                element={<StudentDashboard />}
              />
              <Route
                path={ROUTES.student.exams}
                element={
                  <PlaceholderScreen
                    title="My Examinations"
                    description="Full history and details of every examination."
                    milestone="the student milestone"
                  />
                }
              />
              <Route
                path={ROUTES.student.results}
                element={
                  <PlaceholderScreen
                    title="Results"
                    description="Marks, feedback and test outcomes."
                    milestone="the results milestone"
                  />
                }
              />
            </Route>

            <Route element={<RequireRole roles={['LECTURER']} />}>
              <Route
                path={ROUTES.lecturer.dashboard}
                element={<LecturerDashboard />}
              />
              <Route element={<RequirePermission permission="exam:create" />}>
                <Route
                  path={ROUTES.lecturer.exams}
                  element={
                    <PlaceholderScreen
                      title="Examinations"
                      description="Create and schedule assessments."
                      milestone="the exam-builder milestone"
                    />
                  }
                />
              </Route>
              <Route
                element={<RequirePermission permission="question-bank:read" />}
              >
                <Route
                  path={ROUTES.lecturer.questionBank}
                  element={
                    <PlaceholderScreen
                      title="Question Bank"
                      description="Reusable questions organised by course, topic and difficulty."
                      milestone="the question-bank milestone"
                    />
                  }
                />
              </Route>
              <Route element={<RequirePermission permission="exam:grade" />}>
                <Route
                  path={ROUTES.lecturer.grading}
                  element={
                    <PlaceholderScreen
                      title="Grading"
                      description="Review submissions and moderate automatic marks."
                      milestone="the grading milestone"
                    />
                  }
                />
              </Route>
              <Route element={<RequirePermission permission="analytics:view" />}>
                <Route
                  path={ROUTES.lecturer.analytics}
                  element={
                    <PlaceholderScreen
                      title="Analytics"
                      description="Question difficulty, failure rates and time-per-question."
                      milestone="the analytics milestone"
                    />
                  }
                />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['INVIGILATOR']} />}>
              <Route
                path={ROUTES.invigilator.dashboard}
                element={
                  <PlaceholderScreen
                    title="Invigilation"
                    description="Examinations you are assigned to supervise."
                    milestone="the invigilation milestone"
                  />
                }
              />
              <Route
                path={ROUTES.invigilator.monitor}
                element={
                  <PlaceholderScreen
                    title="Live Monitor"
                    description="Candidate activity, alerts and force-submit controls."
                    milestone="the proctoring milestone"
                  />
                }
              />
            </Route>

            <Route element={<RequireRole roles={['ADMIN']} />}>
              <Route
                path={ROUTES.admin.dashboard}
                element={
                  <PlaceholderScreen
                    title="Administration"
                    description="Institution-wide examination activity."
                    milestone="the administration milestone"
                  />
                }
              />
              <Route
                path={ROUTES.admin.users}
                element={
                  <PlaceholderScreen
                    title="Users"
                    description="Accounts, roles and enrolment."
                    milestone="the administration milestone"
                  />
                }
              />
              <Route
                path={ROUTES.admin.institution}
                element={
                  <PlaceholderScreen
                    title="Institution"
                    description="Departments, courses and examination policy."
                    milestone="the administration milestone"
                  />
                }
              />
            </Route>
          </Route>
        </Route>

        {/* Send anything unrecognised to the caller's role home. */}
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </QueryProvider>
);

export default App;
