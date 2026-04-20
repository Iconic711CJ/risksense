const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Certain"];
const IMPACT_LABELS     = ["Negligible", "Minor", "Moderate", "Major", "Critical"];

function scoreToColor(score) {
  const stops = [
    { s: 1,  rgb: [22,  163, 74]  },
    { s: 6,  rgb: [132, 204, 22]  },
    { s: 9,  rgb: [202, 138, 4]   },
    { s: 16, rgb: [234, 88,  12]  },
    { s: 25, rgb: [220, 38,  38]  },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (score >= stops[i].s && score <= stops[i + 1].s) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = hi.s === lo.s ? 0 : (score - lo.s) / (hi.s - lo.s);
  const r = Math.round(lo.rgb[0] + t * (hi.rgb[0] - lo.rgb[0]));
  const g = Math.round(lo.rgb[1] + t * (hi.rgb[1] - lo.rgb[1]));
  const b = Math.round(lo.rgb[2] + t * (hi.rgb[2] - lo.rgb[2]));
  return { bg: `rgb(${r},${g},${b})`, shadow: `rgba(${r},${g},${b},0.5)` };
}

export default function RiskHeatmap({ cells = [], loading }) {
  const countMap = {};
  (cells || []).forEach((c) => { countMap[`${c.likelihood}-${c.impact}`] = c.count || 0; });
  const maxCount = Math.max(1, ...Object.values(countMap));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-52">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="select-none w-full">
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-4 shrink-0">
          <p className="text-[9px] text-slate-500 -rotate-90 whitespace-nowrap uppercase tracking-widest">
            Likelihood
          </p>
        </div>

        {/* Y-axis ticks */}
        <div className="flex flex-col justify-around shrink-0" style={{ height: 220 }}>
          {[5, 4, 3, 2, 1].map((l) => (
            <span key={l} className="text-[9px] text-slate-500 text-right leading-none w-12 pr-1">
              {LIKELIHOOD_LABELS[l - 1]}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col gap-1" style={{ height: 220 }}>
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={l} className="flex gap-1 flex-1">
              {[1, 2, 3, 4, 5].map((i) => {
                const score = l * i;
                const count = countMap[`${l}-${i}`] || 0;
                const { bg, shadow } = scoreToColor(score);
                const opacity = count > 0 ? 0.2 + 0.8 * (count / maxCount) : 0.12;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-lg flex flex-col items-center justify-center cursor-default relative group transition-transform hover:scale-105"
                    style={{
                      background: bg,
                      opacity,
                      boxShadow: count > 0 ? `0 2px 8px ${shadow}` : "none",
                    }}
                    title={`L${l} × I${i} = ${score} | ${count} risk${count !== 1 ? "s" : ""}`}
                  >
                    {count > 0 && (
                      <span className="text-white font-black text-sm leading-none drop-shadow">
                        {count}
                      </span>
                    )}
                    <span className="text-white/60 text-[8px] font-bold leading-none mt-0.5">{score}</span>

                    {/* Tooltip */}
                    {count > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 pointer-events-none">
                        <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                          <p className="text-[10px] text-white font-bold">{count} risk{count !== 1 ? "s" : ""}</p>
                          <p className="text-[9px] text-slate-400">L{l} × I{i} = {score}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* X-axis */}
      <div className="flex gap-2 mt-1.5">
        <div className="w-4 shrink-0" />
        <div className="w-12 shrink-0" />
        <div className="flex-1 flex gap-1">
          {IMPACT_LABELS.map((label) => (
            <div key={label} className="flex-1 text-center text-[9px] text-slate-500 truncate">{label}</div>
          ))}
        </div>
      </div>
      <div className="text-center text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Impact →</div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-1.5 h-3 w-32 rounded-full overflow-hidden"
          style={{ background: "linear-gradient(to right, #16a34a, #84cc16, #ca8a04, #ea580c, #dc2626)" }}
        />
        <div className="flex items-center justify-between w-32 text-[9px] text-slate-500">
          <span>Low</span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}
