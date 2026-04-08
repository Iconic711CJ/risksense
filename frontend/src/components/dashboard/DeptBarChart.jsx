import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = {
  critical: "#ef4444",   // Red 500
  high: "#f97316",      // Orange 500
  tolerable: "#f59e0b", // Amber 500
  low: "#10b981",      // Emerald 500
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xl min-w-[180px]">
      <p className="text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">{label}</p>
      <div className="space-y-2">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: p.fill }} />
              <span className="text-slate-500 font-bold uppercase">{p.dataKey}</span>
            </span>
            <span className="font-black text-slate-900">{p.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-50 mt-3 pt-2 flex justify-between text-[11px]">
        <span className="text-slate-400 font-bold uppercase">Total Risks</span>
        <span className="font-black text-primary">{total}</span>
      </div>
    </div>
  );
};

export default function DeptBarChart({ data = [], loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-bold uppercase tracking-widest">
        No active department data
      </div>
    );
  }

  // Abbreviate long dept names for x-axis
  const chartData = data.map((d) => ({
    ...d,
    name: d.dept_code || d.dept_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc", radius: 8 }} />
        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: "10px", fontWeight: 700, paddingBottom: "20px", textTransform: "uppercase", letterSpacing: "0.05em" }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="critical" name="Critical" stackId="a" fill={COLORS.critical} barSize={32} />
        <Bar dataKey="high" name="High" stackId="a" fill={COLORS.high} />
        <Bar dataKey="tolerable" name="Tolerable" stackId="a" fill={COLORS.tolerable} />
        <Bar dataKey="low" name="Low" stackId="a" fill={COLORS.low} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
