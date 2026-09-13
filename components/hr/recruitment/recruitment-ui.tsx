"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Shared recruitment UI vocabulary: pipeline stages, AI recommendations and
// score tones. Kept in one place so the board, lists and comparison table
// present a consistent picture.
// ---------------------------------------------------------------------------

export const STAGE_META: Record<string, { label: string; short: string }> = {
  applied: { label: "Applied", short: "Applied" },
  screening: { label: "Screening", short: "Screening" },
  interview: { label: "Interview", short: "Interview" },
  evaluation: { label: "Evaluation", short: "Evaluation" },
  shortlisted: { label: "Shortlisted", short: "Shortlist" },
  hired: { label: "Hired", short: "Hired" },
  rejected: { label: "Rejected", short: "Rejected" },
  withdrawn: { label: "Withdrawn", short: "Withdrawn" },
};

export type Recommendation = "strong" | "potential" | "needs_assessment";

export function recommendationMeta(recommendation: Recommendation | null): {
  label: string;
  variant: BadgeProps["variant"];
} {
  switch (recommendation) {
    case "strong":
      return { label: "Strong match", variant: "success" };
    case "potential":
      return { label: "Potential match", variant: "warning" };
    case "needs_assessment":
      return { label: "Needs further assessment", variant: "outline" };
    default:
      return { label: "Not assessed", variant: "secondary" };
  }
}

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation | null }) {
  const meta = recommendationMeta(recommendation);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function scoreTone(score: number | null | undefined): "success" | "warning" | "outline" {
  if (score == null) return "outline";
  if (score >= 80) return "success";
  if (score >= 55) return "warning";
  return "outline";
}

export function MatchBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge variant="outline">Not scored</Badge>;
  return <Badge variant={scoreTone(score)}>{score}% match</Badge>;
}