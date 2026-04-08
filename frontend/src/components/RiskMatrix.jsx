import { useState } from "react";
import { cn } from "../lib/utils";

const LIKELIHOOD = ["Rare", "Unlikely", "Moderate", "Likely", "Common"];
const IMPACT = ["Insig.", "Minor", "Moderate", "Major", "Critical"];

function getCellColor(l, i) {
  const score = l * i;
  if (score <= 4) return "bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-500/20";
  if (score <= 9) return "bg-yellow-500/20 hover:bg-yellow-500/35 border-yellow-500/20";
  if (score <= 16) return "bg-orange-500/20 hover:bg-orange-500/35 border-orange-500/20";
  return "bg-red-500/25 hover:bg-red-500/40 border-red-500/25";
}

function getCellTextColor(l, i) {
  const score = l * i;
  if (score <= 4) return "text-emerald-400";
  if (score <= 9) return "text-yellow-400";
  if (score <= 16) return "text-orange-400";
  return "text-red-400";
}

export default function RiskMatrix({ items = [] }) {
  const [mode, setMode] = useState("inherent"); // "inherent" or "residual"

  // Build item count map
  const countMap = {};
  items.forEach((item) => {
    const l = mode === "inherent" ? item.inherent_likelihood : item.residual_likelihood;
    const i = mode === "inherent" ? item.inherent_impact : item.residual_impact;
    if (l && i) {
      const key = `${l}-${i}`;
      countMap[key] = (countMap[key] || []).concat(item);
    }
  });

  return (
    <div className="select-none flex flex-col gap-4">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg w-max mx-auto border border-border">
        <button
          onClick={() => setMode("inherent")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            mode === "inherent" ? "bg-background text-foreground shadow scale-100" : "text-muted-foreground hover:text-foreground scale-95"
          )}
        >
          Inherent Risk
        </button>
        <button
          onClick={() => setMode("residual")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            mode === "residual" ? "bg-background text-foreground shadow scale-100" : "text-muted-foreground hover:text-foreground scale-95"
          )}
        >
          Residual Risk
        </button>
      </div>

      <div className="flex gap-1">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-6">
          <p className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap tracking-widest uppercase">Likelihood</p>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid gap-1" style={{ gridTemplateRows: "repeat(5, 1fr)" }}>
            {[5, 4, 3, 2, 1].map((l) => (
              <div key={l} className="flex gap-1 items-center">
                <span className="w-14 text-right text-[10px] text-muted-foreground shrink-0 pr-1">{LIKELIHOOD[l - 1]}</span>
                {[1, 2, 3, 4, 5].map((i) => {
                  const key = `${l}-${i}`;
                  const cellItems = countMap[key] || [];
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-10 rounded border flex items-center justify-center transition-all duration-150 cursor-default relative group",
                        getCellColor(l, i)
                      )}
                      title={cellItems.map((it) => it.risk_id || it.item).join(", ")}
                    >
                      <span className={cn("text-xs font-bold", getCellTextColor(l, i))}>
                        {l * i}
                      </span>
                      {cellItems.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center z-10 shadow">
                          {cellItems.length}
                        </span>
                      )}
                      {/* Tooltip */}
                      {cellItems.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col gap-1 bg-card border border-border rounded-lg p-2 shadow-xl z-20 min-w-[140px]">
                          {cellItems.slice(0, 4).map((it, idx) => (
                            <p key={idx} className="text-[10px] text-foreground truncate">{it.risk_id || it.item}</p>
                          ))}
                          {cellItems.length > 4 && <p className="text-[10px] text-muted-foreground">+{cellItems.length - 4} more</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1 mt-1 ml-[3.75rem]">
            {IMPACT.map((label, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{label}</div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1 tracking-widest uppercase">Impact</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[
          { label: "Low (1–4)", color: "bg-emerald-500/30 border-emerald-500/40" },
          { label: "Tolerable (5–9)", color: "bg-yellow-500/30 border-yellow-500/40" },
          { label: "High (10–16)", color: "bg-orange-500/30 border-orange-500/40" },
          { label: "Critical (17–25)", color: "bg-red-500/30 border-red-500/40" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded border", l.color)} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
