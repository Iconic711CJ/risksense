import { cn } from "../../lib/utils";

const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Certain"];
const IMPACT = ["Negl.", "Minor", "Moderate", "High", "Critical"];

function getCellStyle(score, count) {
  const hasRisks = count > 0;
  if (score <= 4)
    return {
      bg: hasRisks ? "bg-emerald-500 border-emerald-600" : "bg-emerald-50 border-emerald-100 opacity-40",
      text: hasRisks ? "text-white" : "text-emerald-300",
    };
  if (score <= 9)
    return {
      bg: hasRisks ? "bg-yellow-400 border-yellow-500" : "bg-yellow-50 border-yellow-100 opacity-40",
      text: hasRisks ? "text-yellow-900 font-black" : "text-yellow-300",
    };
  if (score <= 16)
    return {
      bg: hasRisks ? "bg-orange-500 border-orange-600" : "bg-orange-50 border-orange-100 opacity-40",
      text: hasRisks ? "text-white" : "text-orange-300",
    };
  return {
    bg: hasRisks ? "bg-red-600 border-red-700" : "bg-red-50 border-red-100 opacity-40",
    text: hasRisks ? "text-white" : "text-red-300",
  };
}

export default function RiskHeatmap({ cells = [], loading }) {
  // Build a lookup: "l-i" → count
  const countMap = {};
  (cells || []).forEach((c) => {
    countMap[`${c.likelihood}-${c.impact}`] = c.count || 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-52">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="select-none flex flex-col gap-3">
      <div className="flex gap-1">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-5">
          <p className="text-[9px] text-muted-foreground -rotate-90 whitespace-nowrap uppercase tracking-widest">
            Likelihood
          </p>
        </div>

        <div className="flex-1 min-w-0">
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={l} className="flex gap-0.5 items-center mb-0.5">
              <span className="w-12 text-right text-[9px] text-muted-foreground pr-1 shrink-0">
                {LIKELIHOOD[l - 1]}
              </span>
              {[1, 2, 3, 4, 5].map((i) => {
                const score = l * i;
                const count = countMap[`${l}-${i}`] || 0;
                const style = getCellStyle(score, count);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-8 rounded border flex items-center justify-center",
                      "transition-all duration-150 cursor-default relative group",
                      style.bg
                    )}
                    title={`L${l}×I${i} = ${score} | ${count} risk${count !== 1 ? "s" : ""}`}
                  >
                    <span className={cn("text-[10px] font-bold", style.text)}>
                      {count > 0 ? count : ""}
                    </span>
                    {count > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card border border-border rounded-lg px-2 py-1 shadow-xl z-10 whitespace-nowrap">
                        <p className="text-[10px] text-foreground font-semibold">{count} risk{count !== 1 ? "s" : ""}</p>
                        <p className="text-[9px] text-muted-foreground">Score: {score}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex gap-0.5 mt-1 ml-[3.25rem]">
            {IMPACT.map((label, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{label}</div>
            ))}
          </div>
          <p className="text-center text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest">Impact</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-2 border-t border-slate-50 pt-3">
        {[
          { label: "Low", color: "bg-emerald-500 border-emerald-600" },
          { label: "Tolerable", color: "bg-yellow-400 border-yellow-500" },
          { label: "High", color: "bg-orange-500 border-orange-600" },
          { label: "Critical", color: "bg-red-600 border-red-700" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full border shadow-sm", l.color)} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
