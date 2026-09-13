"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  Network,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import type { SkillGraphData } from "@/lib/hr/skills";
import type { AnalyzeWorkforceSkillsActionResult } from "@/lib/ai/actions";
import type { SkillFocusNote } from "@/lib/ai/schemas";
import { analyzeWorkforceSkills } from "@/lib/ai/actions";
import { useAiRun } from "@/components/hr/ai-run";
import {
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  AiDisclaimer,
  ScoreBar,
} from "@/components/hr/ai-shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function coverageBadgeVariant(pct: number): "success" | "warning" | "danger" {
  if (pct >= 80) return "success";
  if (pct >= 40) return "warning";
  return "danger";
}

function scoreBarTone(pct: number): "destructive" | "warning" | "success" {
  if (pct < 40) return "destructive";
  if (pct < 80) return "warning";
  return "success";
}

function GapCard({
  row,
  expanded,
  onToggle,
}: {
  row: SkillGraphData["topGaps"][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{row.skill}</span>
            <Badge variant="outline">{row.category}</Badge>
            <Badge variant={row.gap >= 5 ? "danger" : "warning"}>
              -{row.gap}
            </Badge>
            <Badge variant={coverageBadgeVariant(row.coverage_pct)}>
              {row.coverage_pct}% coverage
            </Badge>
          </div>
          <ScoreBar value={row.coverage_pct} tone={scoreBarTone(row.coverage_pct)} className="max-w-xs" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {row.required} required
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {row.available} available
            </span>
            {row.gap > 0 && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {row.gap} gap
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      <div className="border-t px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Internal candidates
        </p>
        {row.candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No adjacent-skill employees identified yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {row.candidates.slice(0, 4).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2.5 text-xs"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-1 text-muted-foreground">
                    {c.role} · {c.department}
                  </span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {c.years}y
                </span>
              </li>
            ))}
            {row.candidates.length > 4 && (
              <li className="text-xs text-muted-foreground">
                +{row.candidates.length - 4} more
              </li>
            )}
          </ul>
        )}
      </div>

      {expanded && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Employees with this skill ({row.holders.length})
          </p>
          {row.holders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No employees currently hold this skill.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {row.holders.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                    {initials(h.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{h.name}</span>
                    <span className="ml-1 text-muted-foreground">
                      {h.role} · {h.department}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {h.years}y
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function FocusItem({ item }: { item: SkillFocusNote }) {
  return (
    <li className="space-y-1">
      <p className="text-xs font-semibold">{item.skill}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {item.rationale}
      </p>
      <p className="text-xs font-medium text-primary">
        {item.recommended_action}
      </p>
    </li>
  );
}

function AnalysisPanel({
  analysis,
}: {
  analysis: NonNullable<AnalyzeWorkforceSkillsActionResult["analysis"]>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Network className="h-4 w-4 text-primary" aria-hidden="true" />
          AI skill graph analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium">{analysis.headline}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {analysis.overall_assessment}
        </p>
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed">
          <span className="font-semibold text-primary">Key finding: </span>
          {analysis.top_finding}
        </div>

        {analysis.focus.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI focus
            </p>
            <ul className="space-y-3">
              {analysis.focus.map((item) => (
                <FocusItem key={item.skill} item={item} />
              ))}
            </ul>
          </div>
        )}

        <RecommendedActions actions={analysis.recommended_actions} />

        <div className="flex items-center gap-2 text-xs">
          <ConfidenceBadge confidence={analysis.confidence} />
        </div>

        <AiDisclaimer />
      </CardContent>
    </Card>
  );
}

export function SkillGraphWorkspace({
  initialGraph,
}: {
  initialGraph: SkillGraphData;
}) {
  const { isPending, result, run } =
    useAiRun<AnalyzeWorkforceSkillsActionResult>();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggle = React.useCallback((skill: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  }, []);

  if (initialGraph.rows.length === 0) {
    return (
      <EmptyState
        title="No skills in the catalog yet"
        description="Seed the skills catalog to map coverage to business requirements."
      />
    );
  }

  const chartData = initialGraph.topGaps.slice(0, 10).map((g) => ({
    skill: g.skill,
    available: g.available,
    required: g.required,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Skills catalog
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {initialGraph.totalSkills}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Active workforce
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {initialGraph.activeCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Overall coverage
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {initialGraph.coverage_pct}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {initialGraph.coveredHeadcount}/{initialGraph.requiredHeadcount}{" "}
            required slots covered
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Largest gap
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {initialGraph.topGap}
          </p>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(analyzeWorkforceSkills)}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending
            ? "Analyzing…"
            : "Run AI skill graph analysis"}
        </Button>
      </div>

      {isPending && (
        <LoadingRow label="Analyzing coverage and gaps across the skill graph…" />
      )}
      {result && !result.ok && (
        <ErrorBanner error={result.error ?? "Failed."} />
      )}
      {result?.ok && result.analysis && (
        <AnalysisPanel analysis={result.analysis} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Coverage vs required headcount — top 10 gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="skill"
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Legend />
              <Bar
                dataKey="required"
                name="Required"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="available"
                name="Available"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {initialGraph.topGaps.slice(0, 8).map((row) => (
          <GapCard
            key={row.skill}
            row={row}
            expanded={expanded.has(row.skill)}
            onToggle={() => toggle(row.skill)}
          />
        ))}
      </div>
    </div>
  );
}
