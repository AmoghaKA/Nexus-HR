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

const GREEN = "#10b981";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function AttendanceTrendChart({ data }: { data: TrendPoint[] }) {
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
          unit="%"
          domain={["dataMin - 2", "dataMax + 2"]}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Attendance rate"]}
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
          stroke={GREEN}
          strokeWidth={2}
          dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Attendance rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}