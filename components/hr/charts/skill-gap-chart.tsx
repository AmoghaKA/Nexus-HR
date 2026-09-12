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

import type { SkillGap } from "@/types";

const BORDER = "#e2e8f0";
const MUTED = "#64748b";
const AMBER = "#d97706";

export function SkillGapChart({ data }: { data: SkillGap[] }) {
  const chartData = data.map((s) => ({ skill: s.skill, gap: s.gap }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barSize={13}
      >
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          unit="%"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="skill"
          width={130}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}% gap`, "Coverage gap"]}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="gap" fill={AMBER} radius={[0, 6, 6, 0]} name="Coverage gap" />
      </BarChart>
    </ResponsiveContainer>
  );
}