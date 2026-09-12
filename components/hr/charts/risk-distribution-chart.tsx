"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BarDatum } from "@/types";

const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function RiskDistributionChart({ data }: { data: BarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={36}>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value) => [`${value} employees`, "Risk band"]}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Risk band">
          {data.map((entry) => (
            <Cell key={entry.category} fill={entry.fill ?? "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}