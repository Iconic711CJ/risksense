import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, ClipboardList,
  ShieldCheck, LogOut, Menu, X, ChevronRight, Crown
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";

const NAV = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/super-admin/users", icon: Users, label: "User Management" },
  { to: "/super-admin/departments", icon: Building2, label: "Departments" },
  { to: "/super-admin/audit", icon: ClipboardList, label: "Audit Trail" },
];

export default function SuperAdminShell() {
  const user = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    toast.info("Signed out");
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/70 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-64",
        "bg-slate-900 border-r border-slate-800 transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm tracking-wide">ERIMP</p>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-400">
                {(user?.full_name || "S").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-indigo-400 font-medium">Super Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-[10px]"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-500")} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-indigo-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Platform Control Centre
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden md:block">
            ERIMP · NIPA Zambia
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
