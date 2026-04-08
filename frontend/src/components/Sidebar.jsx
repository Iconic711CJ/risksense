import { LayoutDashboard, ShieldAlert, FileUp, BarChart3, Settings, ChevronRight, Activity } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: ShieldAlert, label: "Risk Analyses", id: "analyses" },
  { icon: FileUp, label: "Import / Export", id: "import" },
  { icon: BarChart3, label: "Reports", id: "reports" },
  { icon: Settings, label: "Settings", id: "settings" },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-foreground tracking-wide">RiskSense</p>
            <p className="text-[10px] text-muted-foreground">Management Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2">Navigation</p>
        {navItems.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
              activePage === id
                ? "bg-primary/15 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {activePage === id && <ChevronRight className="w-3 h-3" />}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
          <p className="text-xs font-semibold text-primary mb-0.5">Pro Tip</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Upload a CSV or Excel file to instantly generate a risk analysis.</p>
        </div>
      </div>
    </aside>
  );
}
