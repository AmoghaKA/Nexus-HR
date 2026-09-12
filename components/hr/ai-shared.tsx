import * as React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Minus, ShieldAlert, Sparkles } from "lucide-react";

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

export function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (typeof confidence !== "number") return null;
  return (
    <Badge variant="outline" className="bg-card">
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
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-card-foreground">
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
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Recommended actions</p>
      <ul className="space-y-1.5">
        {actions.map((action) => (
          <li key={action} className="flex items-start gap-2 text-sm text-card-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {action}
          </li>
        ))}
      </ul>
    </div>
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

export function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
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