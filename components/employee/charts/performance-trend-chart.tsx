"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/types";

const PRIMARY = "#4f46e5";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function PerformanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          domain={[3, 5]}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value) => [`${value} / 5`, "Performance"]}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={PRIMARY}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="Performance"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}