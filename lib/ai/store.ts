import { getSupabaseServer } from "@/lib/supabase/server";
import type { GeminiInsight } from "@/lib/ai/schemas";

export type StoredCategory =
  | "attrition"
  | "performance"
  | "engagement"
  | "recruitment"
  | "skills"
  | "onboarding"
  | "career"
  | "policy";

export interface InsightRecordInput {
  category: StoredCategory;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  content: string;
  evidence: string[];
  reasoning: string;
  confidence: number;
  recommendedAction: string;
  actionType?: string;
  affectedEntities?: string[];
  employeeId?: string | null;
}

export interface SaveInsightsResult {
  saved: number;
  error?: string;
}

/**
 * Persists validated AI insights into the `ai_insights` table.
 *
 * The table keeps `title`/`category`/`severity`/`content` as columns; the
 * remaining structured fields (evidence, reasoning, confidence,
 * recommended action, affected entities) are stored in the `metadata` jsonb
 * column so the full explainable insight survives.
 *
 * Persistence failures never break the AI feature itself — the insight is
 * still returned to the UI and the error is surfaced alongside it.
 */
export async function saveInsights(records: InsightRecordInput[]): Promise<SaveInsightsResult> {
  const usable = records.filter((r) => r.title && r.content);
  if (usable.length === 0) return { saved: 0 };

  const supabase = getSupabaseServer();
  if (!supabase) return { saved: 0, error: "Supabase is not configured." };

  const rows = usable.map((r) => ({
    employee_id: r.employeeId ?? null,
    category: r.category,
    severity: r.severity,
    title: r.title,
    content: r.content,
    metadata: {
      evidence: r.evidence,
      reasoning: r.reasoning,
      confidence: r.confidence,
      recommended_action: r.recommendedAction,
      action_type: r.actionType ?? "",
      affected_entities: r.affectedEntities ?? [],
    },
  }));

  const { error } = await supabase.from("ai_insights").insert(rows);
  if (error) return { saved: 0, error: `Failed to save insights: ${error.message}` };
  return { saved: rows.length };
}

/** Heuristic category assignment for insights produced by the workforce brief. */
export function categoryForInsight(insight: GeminiInsight): StoredCategory {
  const haystack = [insight.title, insight.recommended_action, ...insight.evidence, ...insight.affected_entities]
    .join(" ")
    .toLowerCase();

  if (/(attrit|retain|turnover|resign|churn)/.test(haystack)) return "attrition";
  if (/(onboard)/.test(haystack)) return "onboarding";
  if (/(skill|coverage|upskill|training|learning|catalog)/.test(haystack)) return "skills";
  if (/(recruit|hiring|candidate|pipeline|application|sourcing|open role)/.test(haystack)) return "recruitment";
  if (/(performance|rating|review|rating)/.test(haystack)) return "performance";
  if (/(career|growth|promotion|path)/.test(haystack)) return "career";
  if (/(policy|leave|benefit|conduct|compliance)/.test(haystack)) return "policy";
  return "engagement";
}

/** Maps a normalized Gemini insight into a row ready for persistence. */
export function toInsightRecord(insight: GeminiInsight, category?: StoredCategory): InsightRecordInput {
  return {
    category: category ?? categoryForInsight(insight),
    severity: insight.severity,
    title: insight.title,
    content: insight.summary,
    evidence: insight.evidence,
    reasoning: insight.reasoning,
    confidence: insight.confidence,
    recommendedAction: insight.recommended_action,
    actionType: insight.action_type,
    affectedEntities: insight.affected_entities,
  };
}