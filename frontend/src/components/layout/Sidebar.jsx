import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, ShieldAlert, KanbanSquare,
  ClipboardList, Users, FileText, LogOut, ShieldCheck,
  ChevronRight, X
} from "lucide-react";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";

const ADMIN_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/departments", icon: Building2, label: "Departments" },
  { to: "/department/register", icon: ShieldAlert, label: "Risk Register" },
  { to: "/department/kanban", icon: KanbanSquare, label: "Kanban Board" },
  { to: "/audit", icon: ClipboardList, label: "Audit Trail" },
  { to: "/users", icon: Users, label: "User Management" },
];

const DEPT_NAV = [
  { to: "/department/register", icon: ShieldAlert, label: "Risk Register" },
  { to: "/department/kanban", icon: KanbanSquare, label: "Kanban Board" },
];

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : DEPT_NAV;

  function handleLogout() {
    clearAuth();
    toast.info("Signed out successfully");
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col",
          "w-64 bg-card border-r border-border",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-foreground text-sm tracking-wide">ERIMP</p>
              <p className="text-[10px] text-muted-foreground leading-tight">NIPA Zambia</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-border bg-slate-50/30">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-border bg-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {(user?.full_name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate italic">
                {isAdmin ? "Administrator" : user?.department_name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200",
                  isActive
                    ? "bg-secondary text-primary font-bold shadow-sm border-r-4 border-primary"
                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Action Button (Orange Highlight) */}
        <div className="px-4 py-2">
          <NavLink
            to="/risks/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>New Risk Report</span>
          </NavLink>
        </div>

        {/* Logout */}
        <div className="px-4 pb-6 mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
