import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, ChevronDown, CheckCircle2, PlayCircle, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { updateRiskStatus } from "../../services/api";

const STATUS_STYLE = {
  "Identified":       { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  "Under Mitigation": { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  "Resolved":         { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
};

const STATUS_STYLE_DARK = {
  "Identified":       { bg: "#1e2a35", text: "#94a3b8", border: "#334155" },
  "Under Mitigation": { bg: "#1e3a5f", text: "#93c5fd", border: "#1d4ed8" },
  "Resolved":         { bg: "#064e3b", text: "#6ee7b7", border: "#047857" },
};

const TRANSITIONS = {
  "Identified": [
    { to: "Under Mitigation", label: "Start Mitigation", icon: PlayCircle,   color: "#1d4ed8" },
    { to: "Resolved",         label: "Resolve",          icon: CheckCircle2, color: "#065f46" },
  ],
  "Under Mitigation": [
    { to: "Resolved",         label: "Resolve",          icon: CheckCircle2, color: "#065f46" },
    { to: "Identified",       label: "Reopen",           icon: RotateCcw,    color: "#64748b" },
  ],
  "Resolved": [
    { to: "Under Mitigation", label: "Re-mitigate",      icon: Zap,          color: "#1d4ed8" },
    { to: "Identified",       label: "Reopen",           icon: RotateCcw,    color: "#64748b" },
  ],
};

export default function StatusChanger({ riskId, status, onChange, dark = false }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(status);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  useEffect(() => { setCurrent(status); }, [status]);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (loading) return;
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen((o) => !o);
  }

  async function handleTransition(newStatus) {
    setOpen(false);
    setLoading(true);
    const prev = current;
    setCurrent(newStatus);
    try {
      await updateRiskStatus(riskId, newStatus);
      toast.success(`Status → ${newStatus}`);
      onChange?.(newStatus);
    } catch (err) {
      setCurrent(prev);
      toast.error(err.response?.data?.detail || "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  const transitions = TRANSITIONS[current] ?? [];
  const styleMap    = dark ? STATUS_STYLE_DARK : STATUS_STYLE;
  const s           = styleMap[current] ?? { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 text-[10px] font-bold transition-colors select-none border"
        style={{
          background: s.bg,
          color: s.text,
          borderColor: s.border,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        {current}
        {!loading && transitions.length > 0 && (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && transitions.length > 0 && createPortal(
        <div
          className="fixed z-[9999] w-44 shadow-2xl border"
          style={{
            top: dropPos.top,
            left: dropPos.left,
            background: dark ? "#1e2530" : "#ffffff",
            borderColor: dark ? "#334155" : "#e2e8f0",
          }}
        >
          <div
            className="px-3 py-2 text-[9px] font-black uppercase tracking-widest border-b"
            style={{ color: "#979DAB", borderColor: dark ? "#334155" : "#f1f5f9" }}
          >
            Change status
          </div>
          {transitions.map((t) => (
            <button
              key={t.to}
              onClick={() => handleTransition(t.to)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors hover:bg-black/5"
              style={{ color: t.color }}
            >
              <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {t.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
