"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SeriesPoint } from "@/types";

const BORDER = "#e2e8f0";
const MUTED = "#64748b";
const VIOLET = "#8b5cf6";

export function DepartmentCompositionChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barSize={14}
      >
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={84}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}`, "People"]}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Bar dataKey="value" fill={VIOLET} radius={[0, 6, 6, 0]} name="People" />
      </BarChart>
    </ResponsiveContainer>
  );
}