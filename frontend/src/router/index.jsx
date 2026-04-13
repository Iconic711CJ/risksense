import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import useAppStore from "../store/useAppStore";

// ── Lazy imports ──────────────────────────────────────────────────────────────
const Login = lazy(() => import("../pages/Login"));

// Super Admin portal
const SuperAdminShell   = lazy(() => import("../portals/super-admin/SuperAdminShell"));
const SADashboard       = lazy(() => import("../portals/super-admin/SADashboard"));
const SAUsers           = lazy(() => import("../portals/super-admin/SAUsers"));
const SADepartments     = lazy(() => import("../portals/super-admin/SADepartments"));
const SAAudit           = lazy(() => import("../portals/super-admin/SAAudit"));

// Admin portal
const AdminShell        = lazy(() => import("../portals/admin/AdminShell"));
const AdminDashboard    = lazy(() => import("../portals/admin/AdminDashboard"));
const AdminStaff        = lazy(() => import("../portals/admin/AdminStaff"));
const AdminRisks        = lazy(() => import("../portals/admin/AdminRisks"));
const AdminDepts        = lazy(() => import("../portals/admin/AdminDepts"));
const AdminAudit        = lazy(() => import("../portals/admin/AdminAudit"));
const AdminAddRisk      = lazy(() => import("../portals/admin/AdminAddRisk"));

// Staff portal
const StaffShell        = lazy(() => import("../portals/staff/StaffShell"));
const StaffDashboard    = lazy(() => import("../portals/staff/StaffDashboard"));
const StaffRisks        = lazy(() => import("../portals/staff/StaffRisks"));
const StaffKanban       = lazy(() => import("../portals/staff/StaffKanban"));
const StaffAddRisk      = lazy(() => import("../portals/staff/StaffAddRisk"));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#064E3B] border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

function Wrap({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Root redirect — routes by role ────────────────────────────────────────────
function RootRedirect() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/staff" replace />;
}

// ── Portal guards ─────────────────────────────────────────────────────────────
function SuperAdminGuard() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "super_admin") return <Navigate to="/" replace />;
  return (
    <Wrap>
      <SuperAdminShell />
    </Wrap>
  );
}

function AdminGuard() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!["admin", "super_admin"].includes(user.role)) return <Navigate to="/staff" replace />;
  return (
    <Wrap>
      <AdminShell />
    </Wrap>
  );
}

function StaffGuard() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Wrap>
      <StaffShell />
    </Wrap>
  );
}

// ── Router config ─────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Wrap><Login /></Wrap>,
  },

  // Root → redirect by role
  {
    path: "/",
    element: <RootRedirect />,
  },

  // ── Super Admin portal ──────────────────────────────────────────────────────
  {
    path: "/super-admin",
    element: <SuperAdminGuard />,
    children: [
      { index: true, element: <Wrap><SADashboard /></Wrap> },
      { path: "users", element: <Wrap><SAUsers /></Wrap> },
      { path: "departments", element: <Wrap><SADepartments /></Wrap> },
      { path: "audit", element: <Wrap><SAAudit /></Wrap> },
    ],
  },

  // ── Admin portal ────────────────────────────────────────────────────────────
  {
    path: "/admin",
    element: <AdminGuard />,
    children: [
      { index: true, element: <Wrap><AdminDashboard /></Wrap> },
      { path: "staff", element: <Wrap><AdminStaff /></Wrap> },
      { path: "risks", element: <Wrap><AdminRisks /></Wrap> },
      { path: "risks/new", element: <Wrap><AdminAddRisk /></Wrap> },
      { path: "risks/:id/edit", element: <Wrap><AdminAddRisk /></Wrap> },
      { path: "departments", element: <Wrap><AdminDepts /></Wrap> },
      { path: "audit", element: <Wrap><AdminAudit /></Wrap> },
    ],
  },

  // ── Staff portal ────────────────────────────────────────────────────────────
  {
    path: "/staff",
    element: <StaffGuard />,
    children: [
      { index: true, element: <Wrap><StaffDashboard /></Wrap> },
      { path: "risks", element: <Wrap><StaffRisks /></Wrap> },
      { path: "risks/new", element: <Wrap><StaffAddRisk /></Wrap> },
      { path: "risks/:id/edit", element: <Wrap><StaffAddRisk /></Wrap> },
      { path: "kanban", element: <Wrap><StaffKanban /></Wrap> },
    ],
  },

  // Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
