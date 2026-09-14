import * as React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Lightbulb,
  Minus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Shared presentational helpers for AI-powered HR/employee pages.
// ---------------------------------------------------------------------------

export type Level = "critical" | "high" | "medium" | "low" | "info";

export function levelVariant(level: Level | undefined): {
  variant: "success" | "warning" | "danger" | "secondary" | "outline";
  className: string;
} {
  switch (level) {
    case "critical":
      return { variant: "danger", className: "bg-destructive" };
    case "high":
      return { variant: "danger", className: "bg-destructive" };
    case "medium":
      return { variant: "warning", className: "bg-warning" };
    case "low":
      return { variant: "success", className: "bg-success" };
    default:
      return { variant: "secondary", className: "bg-muted-foreground" };
  }
}

export function LevelBadge({ level }: { level: Level }) {
  const styles = levelVariant(level);
  return (
    <Badge variant={styles.variant} className="capitalize">
      {level}
    </Badge>
  );
}

export function LevelDot({ level, className }: { level: Level; className?: string }) {
  const styles = levelVariant(level);
  return (
    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.className, className)} aria-hidden="true" />
  );
}

export function ConfidenceBadge({ confidence, className }: { confidence?: number; className?: string }) {
  if (typeof confidence !== "number") return null;
  return (
    <Badge variant="outline" className={cn("bg-card", className)}>
      {Math.round(confidence * 100)}% confidence
    </Badge>
  );
}

const trendIcon = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

export function TrendIcon({ direction }: { direction: "up" | "down" | "flat" | undefined }) {
  const Icon = trendIcon[direction ?? "flat"];
  return (
    <Icon
      className={cn(
        "h-4 w-4 shrink-0",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        (direction === "flat" || !direction) && "text-muted-foreground"
      )}
      aria-hidden="true"
    />
  );
}

export function ScoreBar({
  value,
  max = 100,
  tone = "primary",
  className,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "destructive" | "success" | "warning";
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  const color =
    tone === "destructive" ? "bg-destructive" : tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function BulletList({
  items,
  tone = "primary",
  empty = "None listed.",
}: {
  items: string[];
  tone?: "primary" | "muted";
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-start gap-2 text-sm leading-relaxed text-card-foreground">
          <span
            className={cn(
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              tone === "primary" ? "bg-primary" : "bg-muted-foreground"
            )}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("ai-gradient-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

export function RecommendedActions({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        Recommended actions
      </p>
      <ul className="mt-2.5 space-y-2">
        {actions.map((action, i) => (
          <li key={`${action}-${i}`} className="flex items-start gap-2.5 text-sm leading-relaxed text-card-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function AiAnswerFrame({
  title,
  icon,
  badges,
  headline,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  badges?: React.ReactNode;
  headline?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl rounded-tl-sm border bg-card shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-primary/[0.07] via-indigo-500/[0.05] to-transparent px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-500 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
          {icon}
          {title}
        </span>
        {badges}
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {headline && <p className="text-[15px] leading-relaxed text-card-foreground">{headline}</p>}
        {children}
      </div>
    </div>
  );
}

export function AiResultCard({
  icon,
  children,
  className,
  index,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border bg-card/80 transition-shadow hover:shadow-md",
        index != null && `sr-fade sr-fade-d${Math.min(index + 1, 6)}`,
        className
      )}
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500 opacity-70 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex items-start gap-3 p-4">
        {icon}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Card>
  );
}

export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground", className)}>
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      AI-generated estimate from workforce data. Not a guarantee; review before acting.
    </div>
  );
}

export function PersistenceBadges({
  saved,
  persistError,
  noun = "insights saved",
}: {
  saved?: number;
  persistError?: string;
  noun?: string;
}) {
  if (typeof saved !== "number") return null;
  return (
    <>
      <Badge variant="success">
        {saved} {noun}
      </Badge>
      {persistError && (
        <Badge variant="outline" className="text-destructive">
          not persisted
        </Badge>
      )}
    </>
  );
}

export function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {error}
    </div>
  );
}

export function LoadingRow({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground", className)}>
      <Sparkles className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyAnalytics({ headline, detail }: { headline: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-card-foreground">{headline}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premium "AI insight / explanation" card used by the brief, employee analysis,
// and any feature that renders an InsightOutput-shaped entity.
// ---------------------------------------------------------------------------

export interface InsightStatement {
  title: string;
  severity?: string;
  summary: string;
  evidence?: string[];
  reasoning?: string;
  confidence?: number;
  recommended_action?: string;
}

const severityPillStyle: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

const severityDotStyle: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

export function SeverityPill({ severity }: { severity?: string }) {
  const tone = severityPillStyle[severity ?? ""] ?? "bg-muted text-muted-foreground";
  const dot = severityDotStyle[severity ?? ""] ?? "bg-muted-foreground";
  const label = severity ?? "info";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
        tone
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

export function InsightCard({
  insight,
  index,
  className,
}: {
  insight: InsightStatement;
  index?: number;
  className?: string;
}) {
  const hasEvidence = insight.evidence && insight.evidence.length > 0;
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border bg-card/80 transition-shadow hover:shadow-md",
        index != null && `sr-fade sr-fade-d${Math.min(index + 1, 6)}`,
        className
      )}
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500 transition-opacity opacity-70 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <SeverityPill severity={insight.severity} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          AI Insight
        </span>
        {typeof insight.confidence === "number" && (
          <ConfidenceBadge confidence={insight.confidence} className="ml-auto" />
        )}
      </div>

      <div className="space-y-3.5 px-5 pb-5 pt-3">
        <div>
          <h4 className="text-[15px] font-semibold leading-snug tracking-tight text-card-foreground">
            {insight.title}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.summary}</p>
        </div>

        {hasEvidence && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {insight.evidence!.slice(0, 4).map((item, i) => (
              <div
                key={`${item}-${i}`}
                className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-card-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        )}

        {insight.reasoning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] px-3.5 py-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-card-foreground">Why: </span>
              {insight.reasoning}
            </p>
          </div>
        )}

        {insight.recommended_action && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] px-3.5 py-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Recommended action
              </p>
              <p className="text-sm font-medium leading-snug text-card-foreground">
                {insight.recommended_action}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}