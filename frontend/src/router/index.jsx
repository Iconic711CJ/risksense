import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import useAppStore from "../store/useAppStore";
import AppShell from "../components/layout/AppShell";

// Lazy-load pages for code splitting
const Login = lazy(() => import("../pages/Login"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const DepartmentsOverview = lazy(() => import("../pages/DepartmentsOverview"));
const DeptRegister = lazy(() => import("../pages/DeptRegister"));
const KanbanPage = lazy(() => import("../pages/KanbanPage"));
const AddRisk = lazy(() => import("../pages/AddRisk"));
const AuditTrail = lazy(() => import("../pages/AuditTrail"));
const UserManagement = lazy(() => import("../pages/UserManagement"));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const loading = useAppStore((s) => s.loading);

  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

function AdminRoute() {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/department/register" replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

function RootRedirect() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return user.role === "admin"
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/department/register" replace />;
}

// ── Router config ─────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <RootRedirect /> },

      // Admin-only routes
      {
        element: <AdminRoute />,
        children: [
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "departments", element: <DepartmentsOverview /> },
          { path: "departments/:deptId", element: <DeptRegister /> },
          { path: "audit", element: <AuditTrail /> },
          { path: "users", element: <UserManagement /> },
        ],
      },

      // Shared routes (dept user + admin)
      { path: "department/register", element: <DeptRegister /> },
      { path: "department/kanban", element: <KanbanPage /> },
      { path: "departments/:deptId/kanban", element: <KanbanPage /> },
      { path: "risks/new", element: <AddRisk /> },
      { path: "risks/:id/edit", element: <AddRisk /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
