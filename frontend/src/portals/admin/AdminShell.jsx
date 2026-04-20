import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, ShieldAlert, ClipboardList,
  ShieldCheck, LogOut, Menu, X, Building2, Plus
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";

const NAV = [
  { to: "/admin",             icon: LayoutDashboard, label: "Dashboard",        end: true },
  { to: "/admin/staff",       icon: Users,           label: "Staff Management"            },
  { to: "/admin/risks",       icon: ShieldAlert,     label: "Risk Register"               },
  { to: "/admin/departments", icon: Building2,       label: "Departments"                 },
  { to: "/admin/audit",       icon: ClipboardList,   label: "Audit Trail"                 },
];

export default function AdminShell() {
  const user      = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    toast.info("Signed out");
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#DEDCDC" }}>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )} style={{ background: "#191D23", borderRight: "1px solid #2a333d" }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 shrink-0" style={{ borderBottom: "1px solid #2a333d" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#57707A" }}>
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest" style={{ color: "#DEDCDC" }}>ERIMP</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#57707A" }}>Admin Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden" style={{ color: "#7E919F" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User */}
        <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #2a333d" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ background: "#57707A22", border: "1px solid #57707A55" }}>
              <span className="text-xs font-black" style={{ color: "#57707A" }}>
                {(user?.full_name || "A").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "#DEDCDC" }}>{user?.full_name}</p>
              <p className="text-[10px]" style={{ color: "#7E919F" }}>Organisation Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
            >
              {({ isActive }) => (
                <div
                  className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2"
                  style={{
                    color: isActive ? "#DEDCDC" : "#7E919F",
                    borderLeftColor: isActive ? "#57707A" : "transparent",
                    background: isActive ? "#57707A15" : "transparent",
                  }}
                >
                  <item.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "#57707A" : "#57707A55" }} />
                  <span className={isActive ? "font-semibold" : ""}>{item.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid #2a333d" }}>
          <NavLink
            to="/admin/risks/new"
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ background: "#57707A", color: "#DEDCDC" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Log New Risk
          </NavLink>
        </div>

        {/* Logout */}
        <div className="px-3 pb-3 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 hover:text-red-400"
            style={{ color: "#57707A" }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 h-14 shrink-0" style={{ background: "#ffffff", borderBottom: "1px solid #C5BAC4" }}>
          <button onClick={() => setOpen(true)} className="lg:hidden" style={{ color: "#979DAB" }}>
            <Menu className="w-5 h-5" />
          </button>
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#57707A" }} />
          <span className="text-xs font-bold uppercase tracking-[0.15em] flex-1" style={{ color: "#979DAB" }}>
            Organisation Control Panel
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block" style={{ color: "#C5BAC4" }}>
            ERIMP · NIPA Zambia
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6" style={{ background: "#DEDCDC" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
