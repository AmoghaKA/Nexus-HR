"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { SeriesPoint } from "@/types";

const PRIMARY = "#4f46e5";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function SkillsRadarChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={BORDER} />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: MUTED }}
        />
        <Tooltip
          formatter={(value) => [`${value} / 10`, "Proficiency"]}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 12,
          }}
        />
        <Radar
          dataKey="value"
          stroke={PRIMARY}
          fill={PRIMARY}
          fillOpacity={0.18}
          name="Proficiency"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}