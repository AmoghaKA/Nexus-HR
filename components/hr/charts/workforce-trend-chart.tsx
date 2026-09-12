"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/types";

const PRIMARY = "#4f46e5";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function WorkforceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="wfq-headcount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.28} />
            <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={["dataMin - 20", "dataMax + 20"]}
        />
        <Tooltip
          formatter={(value) => [`${value}`, "Headcount"]}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={PRIMARY}
          strokeWidth={2}
          fill="url(#wfq-headcount)"
          name="Headcount"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}