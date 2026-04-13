import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, ShieldAlert, KanbanSquare,
  ShieldCheck, LogOut, Menu, X, ChevronRight, Plus
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";

const NAV = [
  { to: "/staff", icon: LayoutDashboard, label: "My Dashboard", end: true },
  { to: "/staff/risks", icon: ShieldAlert, label: "Risk Register" },
  { to: "/staff/kanban", icon: KanbanSquare, label: "Kanban Board" },
];

export default function StaffShell() {
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — clean white */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-60",
        "bg-white border-r border-slate-200 transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#064E3B] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">ERIMP</p>
              <p className="text-[10px] text-slate-400">Staff Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.department_name ?? "No department"}</p>
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                isActive
                  ? "bg-emerald-50 text-[#064E3B] font-semibold border-l-2 border-[#064E3B] pl-[10px]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#064E3B]" : "text-slate-400")} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <div className="px-3 pb-2">
          <NavLink
            to="/staff/risks/new"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#064E3B] hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report a Risk
          </NavLink>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 mt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {user?.department_name ? `${user.department_name} · ERIMP` : "ERIMP Staff Portal"}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
