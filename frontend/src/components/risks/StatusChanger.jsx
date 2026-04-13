import { useState, useRef, useEffect } from "react";
import { Loader2, ChevronDown, CheckCircle2, PlayCircle, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { updateRiskStatus } from "../../services/api";

// ── Status appearance ─────────────────────────────────────────────────────────
const STATUS_STYLE = {
  "Identified":      "bg-slate-100 text-slate-600 border border-slate-300 hover:border-slate-400",
  "Under Mitigation":"bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-400",
  "Resolved":        "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-400",
};

// Dark theme variant (for super-admin portal)
const STATUS_STYLE_DARK = {
  "Identified":      "bg-slate-700/60 text-slate-300 border border-slate-600 hover:border-slate-400",
  "Under Mitigation":"bg-blue-900/40 text-blue-300 border border-blue-700 hover:border-blue-500",
  "Resolved":        "bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:border-emerald-500",
};

// ── Transition definitions ────────────────────────────────────────────────────
const TRANSITIONS = {
  "Identified": [
    {
      to: "Under Mitigation",
      label: "Start Mitigation",
      icon: PlayCircle,
      cls: "text-blue-600 hover:bg-blue-50",
      clsDark: "text-blue-400 hover:bg-blue-900/40",
    },
    {
      to: "Resolved",
      label: "Resolve",
      icon: CheckCircle2,
      cls: "text-emerald-600 hover:bg-emerald-50",
      clsDark: "text-emerald-400 hover:bg-emerald-900/40",
    },
  ],
  "Under Mitigation": [
    {
      to: "Resolved",
      label: "Resolve",
      icon: CheckCircle2,
      cls: "text-emerald-600 hover:bg-emerald-50",
      clsDark: "text-emerald-400 hover:bg-emerald-900/40",
    },
    {
      to: "Identified",
      label: "Reopen",
      icon: RotateCcw,
      cls: "text-slate-500 hover:bg-slate-100",
      clsDark: "text-slate-400 hover:bg-slate-700",
    },
  ],
  "Resolved": [
    {
      to: "Under Mitigation",
      label: "Re-mitigate",
      icon: Zap,
      cls: "text-blue-600 hover:bg-blue-50",
      clsDark: "text-blue-400 hover:bg-blue-900/40",
    },
    {
      to: "Identified",
      label: "Reopen",
      icon: RotateCcw,
      cls: "text-slate-500 hover:bg-slate-100",
      clsDark: "text-slate-400 hover:bg-slate-700",
    },
  ],
};

/**
 * props:
 *   riskId   – UUID of the risk
 *   status   – current status string
 *   onChange – callback(newStatus) after a successful update
 *   dark     – boolean, use dark-theme variant (super-admin portal)
 */
export default function StatusChanger({ riskId, status, onChange, dark = false }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(status);
  const ref = useRef(null);

  // Sync if parent re-renders with new status
  useEffect(() => { setCurrent(status); }, [status]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleTransition(newStatus) {
    setOpen(false);
    setLoading(true);
    const prev = current;
    setCurrent(newStatus); // optimistic
    try {
      await updateRiskStatus(riskId, newStatus);
      toast.success(`Status → ${newStatus}`);
      onChange?.(newStatus);
    } catch (err) {
      setCurrent(prev); // rollback
      toast.error(err.response?.data?.detail || "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  const transitions = TRANSITIONS[current] ?? [];
  const styleMap    = dark ? STATUS_STYLE_DARK : STATUS_STYLE;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !loading && setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors select-none
          ${styleMap[current] ?? "bg-slate-100 text-slate-500 border border-slate-200"}
          ${loading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : null
        }
        {current}
        {!loading && transitions.length > 0 && (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && transitions.length > 0 && (
        <div className={`absolute z-50 top-full left-0 mt-1.5 w-44 rounded-xl shadow-xl overflow-hidden
          ${dark
            ? "bg-slate-800 border border-slate-700"
            : "bg-white border border-slate-200"
          }`}
        >
          <div className={`px-3 py-2 border-b text-[9px] font-black uppercase tracking-widest
            ${dark ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-400"}`}>
            Change status
          </div>
          {transitions.map((t) => (
            <button
              key={t.to}
              onClick={() => handleTransition(t.to)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors text-left
                ${dark ? t.clsDark : t.cls}`}
            >
              <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
