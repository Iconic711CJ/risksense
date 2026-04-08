import { Menu, Bell, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import useAppStore from "../../store/useAppStore";
import { cn } from "../../lib/utils";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/departments": "Departments Overview",
  "/department/register": "Risk Register",
  "/department/kanban": "Kanban Board",
  "/risks/new": "Log New Risk",
  "/audit": "Audit Trail",
  "/users": "User Management",
};

function getTitle(pathname) {
  if (pathname.startsWith("/departments/") && pathname.endsWith("/kanban")) return "Kanban Board";
  if (pathname.startsWith("/departments/")) return "Department Register";
  if (pathname.includes("/edit")) return "Edit Risk";
  return ROUTE_TITLES[pathname] || "ERIMP";
}

export default function Topbar() {
  const user = useAppStore((s) => s.user);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const { pathname } = useLocation();
  const isAdmin = user?.role === "admin";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-white sticky top-0 z-20 shrink-0">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight leading-none">
            {getTitle(pathname)}
          </h2>
          {user?.department_name && !isAdmin && (
            <p className="text-xs font-medium text-primary mt-1">{user.department_name}</p>
          )}
        </div>
      </div>

      {/* Right: notifications + user info */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full text-slate-400 hover:text-primary hover:bg-slate-50 transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 leading-none">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">
              {isAdmin ? "Admin Access" : "Staff Portal"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shadow-sm">
            <span className="text-xs font-black text-white">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
