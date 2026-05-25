import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const AcceptInvitePage = lazy(() => import('@/pages/auth/AcceptInvitePage'));
const OrgDashboard = lazy(() => import('@/pages/org/OrgDashboard'));
const ProjectsPage = lazy(() => import('@/pages/org/ProjectsPage'));
const MyIssuesPage = lazy(() => import('@/pages/org/MyIssuesPage'));
const InboxPage = lazy(() => import('@/pages/org/InboxPage'));
const OrgSettingsPage = lazy(() => import('@/pages/org/settings/OrgSettingsPage'));
const ProjectDashboard = lazy(() => import('@/pages/project/ProjectDashboard'));
const BoardPage = lazy(() => import('@/pages/project/BoardPage'));
const BacklogPage = lazy(() => import('@/pages/project/BacklogPage'));
const SprintsPage = lazy(() => import('@/pages/project/SprintsPage'));
const RoadmapPage = lazy(() => import('@/pages/project/RoadmapPage'));
const AnalyticsPage = lazy(() => import('@/pages/project/AnalyticsPage'));
const IssueDetailPage = lazy(() => import('@/pages/project/IssueDetailPage'));
const DocsPage = lazy(() => import('@/pages/project/DocsPage'));
const DocDetailPage = lazy(() => import('@/pages/project/DocDetailPage'));
const ProjectSettingsPage = lazy(() => import('@/pages/project/ProjectSettingsPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminOrgsPage = lazy(() => import('@/pages/admin/AdminOrgsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));
const AdminMetricsPage = lazy(() => import('@/pages/admin/AdminMetricsPage'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.platformRole !== 'platform_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

        {/* App routes (require auth) */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell>
                <Routes>
                  {/* Platform admin */}
                  <Route
                    path="/admin"
                    element={
                      <RequirePlatformAdmin>
                        <AdminDashboard />
                      </RequirePlatformAdmin>
                    }
                  />
                  <Route
                    path="/admin/orgs"
                    element={
                      <RequirePlatformAdmin>
                        <AdminOrgsPage />
                      </RequirePlatformAdmin>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <RequirePlatformAdmin>
                        <AdminUsersPage />
                      </RequirePlatformAdmin>
                    }
                  />
                  <Route
                    path="/admin/audit-logs"
                    element={
                      <RequirePlatformAdmin>
                        <AdminAuditLogsPage />
                      </RequirePlatformAdmin>
                    }
                  />
                  <Route
                    path="/admin/metrics"
                    element={
                      <RequirePlatformAdmin>
                        <AdminMetricsPage />
                      </RequirePlatformAdmin>
                    }
                  />

                  {/* Org routes */}
                  <Route path="/:orgSlug" element={<OrgDashboard />} />
                  <Route path="/:orgSlug/projects" element={<ProjectsPage />} />
                  <Route path="/:orgSlug/my-issues" element={<MyIssuesPage />} />
                  <Route path="/:orgSlug/inbox" element={<InboxPage />} />
                  <Route path="/:orgSlug/settings" element={<OrgSettingsPage />} />
                  <Route path="/:orgSlug/settings/:tab" element={<OrgSettingsPage />} />

                  {/* Project routes */}
                  <Route path="/:orgSlug/:projectKey" element={<ProjectDashboard />} />
                  <Route path="/:orgSlug/:projectKey/board" element={<BoardPage />} />
                  <Route path="/:orgSlug/:projectKey/backlog" element={<BacklogPage />} />
                  <Route path="/:orgSlug/:projectKey/sprints" element={<SprintsPage />} />
                  <Route path="/:orgSlug/:projectKey/roadmap" element={<RoadmapPage />} />
                  <Route path="/:orgSlug/:projectKey/analytics" element={<AnalyticsPage />} />
                  <Route path="/:orgSlug/:projectKey/issues/:issueKey" element={<IssueDetailPage />} />
                  <Route path="/:orgSlug/:projectKey/docs" element={<DocsPage />} />
                  <Route path="/:orgSlug/:projectKey/docs/:pageId" element={<DocDetailPage />} />
                  <Route path="/:orgSlug/:projectKey/settings" element={<ProjectSettingsPage />} />

                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </Suspense>
  );
}
