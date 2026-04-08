import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      <p className="text-sm font-bold text-primary mt-0.5">{payload[0]?.value} risks logged</p>
    </div>
  );
};

function formatXTick(dateStr) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

export default function TrendLineChart({ data = [], loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-52">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Show every 5th label to avoid crowding
  const labeledData = data.map((d, i) => ({
    ...d,
    showLabel: i % 5 === 0 || i === data.length - 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={labeledData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(199,89%,48%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(199,89%,48%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v, i) => labeledData[i]?.showLabel ? formatXTick(v) : ""}
          tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "Poppins" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "Poppins" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(199,89%,48%)"
          strokeWidth={2}
          fill="url(#trendGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "hsl(199,89%,48%)", stroke: "hsl(222,28%,7%)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
