import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, ShieldAlert, ClipboardList,
  ShieldCheck, LogOut, Menu, X, ChevronRight, Building2
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/staff", icon: Users, label: "Staff Management" },
  { to: "/admin/risks", icon: ShieldAlert, label: "Risk Register" },
  { to: "/admin/departments", icon: Building2, label: "Departments" },
  { to: "/admin/audit", icon: ClipboardList, label: "Audit Trail" },
];

export default function AdminShell() {
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
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — dark brand green */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-64",
        "bg-[#064E3B] transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm tracking-wide">ERIMP</p>
              <p className="text-[10px] text-emerald-300 font-semibold uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-orange-400/20 flex items-center justify-center">
              <span className="text-xs font-bold text-orange-300">
                {(user?.full_name || "A").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-emerald-400 font-medium">Organisation Admin</p>
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
                  ? "bg-white/10 text-white font-semibold border-l-2 border-orange-400 pl-[10px]"
                  : "text-emerald-200/70 hover:bg-white/5 hover:text-white"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-orange-400" : "text-emerald-400/50")} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-orange-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* New Risk CTA */}
        <div className="px-3 pb-2">
          <NavLink
            to="/admin/risks/new"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
          >
            <ShieldAlert className="w-4 h-4" />
            Log New Risk
          </NavLink>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 mt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-300/50 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-4 h-4 text-[#064E3B]" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Organisation Control Panel
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden md:block">
            ERIMP · NIPA Zambia
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
