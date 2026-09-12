"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const BORDER = "#e2e8f0";
const MUTED = "#64748b";

export function SkillCoverageChart({ coverage }: { coverage: number }) {
  const data = [
    { name: "Covered", value: Math.max(0, Math.min(100, coverage)) },
    { name: "Gap", value: Math.max(0, Math.min(100, 100 - coverage)) },
  ];
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Tooltip
            formatter={(value) => [`${value}%`, null]}
            labelStyle={{ color: MUTED, fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              fontSize: 12,
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill="#10b981" />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" aria-hidden="true" />
          Covered
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e2e8f0]" aria-hidden="true" />
          Gap
        </span>
      </div>
    </div>
  );
}