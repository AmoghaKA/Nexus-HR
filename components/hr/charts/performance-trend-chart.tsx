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

const VIOLET = "#8b5cf6";
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
          domain={[0, 5]}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          formatter={(value) => [`${value} / 5`, "Avg rating"]}
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
          stroke={VIOLET}
          strokeWidth={2}
          dot={{ r: 3, fill: VIOLET, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Avg rating"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}