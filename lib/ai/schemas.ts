import { SchemaType, type Schema } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Structured output contracts
//
// Every Gemini feature is forced to return one of these shapes (JSON schema,
// requested via responseSchema + responseMimeType). Types mirror the on-wire
// schema and validators coerce/malformed safely so nothing downstream receives
// raw model output.
// ---------------------------------------------------------------------------

export type InsightSeverity = "low" | "medium" | "high" | "critical";

export interface GeminiInsight {
  title: string;
  severity: InsightSeverity;
  summary: string;
  evidence: string[];
  reasoning: string;
  confidence: number; // 0..1
  recommended_action: string;
  action_type: string;
  affected_entities: string[];
}

export interface EmployeeAnalysis {
  summary: string;
  strengths: string[];
  development_areas: string[];
  skill_gaps: string[];
  performance_trend: { direction: "up" | "down" | "flat"; description: string };
  engagement_signals: string[];
  risk_signals: string[];
  recommended_actions: string[];
  insights: GeminiInsight[];
  confidence: number;
}

export interface AttritionReport {
  headline: string;
  overall_risk_level: "low" | "medium" | "high";
  segments: {
    name: string;
    headcount: number;
    avg_risk_score: number;
    risk_level: "low" | "medium" | "high" | "critical";
    key_drivers: string[];
    recommended_action: string;
  }[];
  recommended_actions: string[];
  confidence: number;
}

export interface PerformanceAnalysis {
  headline: string;
  overall_rating: number;
  by_department: {
    department: string;
    rating: number;
    trend: "up" | "down" | "flat";
    note: string;
  }[];
  strengths: string[];
  improvement_areas: string[];
  goal_risks: string[];
  development_recommendations: string[];
  recommended_actions: string[];
  confidence: number;
}

export interface SkillRecommendation {
  skill: string;
  current_coverage_pct: number;
  gap: number;
  priority: "low" | "medium" | "high";
  rationale: string;
  recommended_actions: string[];
  target_roles: string[];
}
export interface SkillRecommendationReport {
  headline: string;
  overall_coverage_pct: number;
  recommendations: SkillRecommendation[];
  confidence: number;
}

export interface OnboardingPhaseTask {
  title: string;
  description: string;
  owner_role: string;
}
export interface OnboardingPhase {
  phase: string;
  duration_weeks: number;
  objective: string;
  tasks: OnboardingPhaseTask[];
}
export interface OnboardingPlan {
  headline: string;
  expected_time_to_productivity_weeks: number;
  phases: OnboardingPhase[];
  confidence: number;
}

export interface CandidateRanking {
  candidate_name: string;
  job_title: string;
  overall_score: number; // 0..100
  fit_summary: string;
  strengths: string[];
  concerns: string[];
  recommended_stage: "new" | "screening" | "interview" | "offer" | "reject";
  recommended_action: string;
  confidence: number;
}

export interface InterviewQuestion {
  question: string;
  skill_assessed: string;
  follow_ups: string[];
}
export interface InterviewQuestionSection {
  focus_area: string;
  rationale: string;
  questions: InterviewQuestion[];
}
export interface InterviewQuestions {
  headline: string;
  sections: InterviewQuestionSection[];
  confidence: number;
}

export interface InterviewEvaluation {
  headline: string;
  overall_score: number; // 0..100
  dimensions: { dimension: string; rating: number; note: string }[];
  highlights: string[];
  risks: string[];
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  next_step: string;
  confidence: number;
}

export interface PolicyAnswer {
  answer: string;
  confidence: number;
  citations: { policy: string; section: string }[];
  disclaimer: string;
}

export interface CareerPath {
  path: string;
  rationale: string;
  readiness: "not_ready" | "developing" | "ready";
  steps: string[];
  required_skills: string[];
  timeline_months: number;
}
export interface CareerRecommendations {
  headline: string;
  career_paths: CareerPath[];
  immediate_actions: string[];
  confidence: number;
}

// ---------------------------------------------------------------------------
// Gemini schema helpers
// ---------------------------------------------------------------------------

function str(description: string): Schema {
  return { type: SchemaType.STRING, description };
}
function strEnum(description: string, values: string[]): Schema {
  return { type: SchemaType.STRING, format: "enum" as const, enum: values, description };
}
function num(description: string): Schema {
  return { type: SchemaType.NUMBER, description };
}
function integer(description: string): Schema {
  return { type: SchemaType.INTEGER, description };
}
function arr(description: string, items: Schema): Schema {
  return { type: SchemaType.ARRAY, description, items };
}
function obj(description: string, properties: { [k: string]: Schema }, required: string[]): Schema {
  return { type: SchemaType.OBJECT, description, properties, required };
}

export const insightSchema: Schema = obj(
  "A single explainable workforce insight backed by evidence.",
  {
    title: str("Short, specific title of the insight"),
    severity: strEnum("Severity of the insight", ["low", "medium", "high", "critical"]),
    summary: str("Plain-language summary of the finding"),
    evidence: arr("Concrete, quantitative or factual evidence pulled from the provided data", str("One piece of evidence")),
    reasoning: str("Explain WHY this finding matters for the workforce"),
    confidence: num("Model confidence between 0 and 1"),
    recommended_action: str("A specific, actionable next step"),
    action_type: str("Type of action: monitor | check-in | training | review | offer | escalate"),
    affected_entities: arr("Departments, teams, or employees that are affected", str("Affected entity")),
  },
  ["title", "severity", "summary", "evidence", "reasoning", "confidence", "recommended_action", "affected_entities"]
);

export const insightsWrapperSchema: Schema = obj(
  "Wrapper containing a list of workforce insights",
  { insights: arr("Workforce insights", insightSchema) },
  ["insights"]
);

export const employeeAnalysisSchema: Schema = obj(
  "Structured employee analysis produced from the summarized signals.",
  {
    summary: str("1-2 sentence executive summary of this employee's profile"),
    strengths: arr("Demonstrated strengths", str("Strength")),
    development_areas: arr("Development areas to grow", str("Development area")),
    skill_gaps: arr("Missing or thin critical skills", str("Skill gap")),
    performance_trend: obj("Direction of the performance trend", {
      direction: strEnum("Trend direction", ["up", "down", "flat"]),
      description: str("Qualitative description of the trend"),
    }, ["direction", "description"]),
    engagement_signals: arr("Signals about engagement/motivation", str("Signal")),
    risk_signals: arr("Signals that may indicate elevated attrition risk", str("Risk signal")),
    recommended_actions: arr("Concrete recommended actions", str("Recommended action")),
    insights: arr("Structured insights (reuse the insight schema)", insightSchema),
    confidence: num("Model confidence between 0 and 1"),
  },
  [
    "summary",
    "strengths",
    "development_areas",
    "skill_gaps",
    "performance_trend",
    "engagement_signals",
    "risk_signals",
    "recommended_actions",
    "insights",
    "confidence",
  ]
);

export const attritionReportSchema: Schema = obj(
  "Attrition risk report computed from workforce signals. Never use protected characteristics.",
  {
    headline: str("One-line summary of the attrition outlook"),
    overall_risk_level: strEnum("Overall risk level", ["low", "medium", "high"]),
    segments: arr("High-attrition-risk cohorts", obj("A cohort with elevated attrition risk", {
      name: str("Cohort name"),
      headcount: integer("Number of employees in the cohort"),
      avg_risk_score: num("Average model risk score (0-100)"),
      risk_level: strEnum("Risk level of the cohort", ["low", "medium", "high", "critical"]),
      key_drivers: arr("Leading drivers of risk", str("Driver")),
      recommended_action: str("Recommended action for this cohort"),
    }, ["name", "headcount", "avg_risk_score", "risk_level", "key_drivers", "recommended_action"])),
    recommended_actions: arr("Org-wide recommended actions", str("Recommended action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_risk_level", "segments", "recommended_actions", "confidence"]
);

export const performanceAnalysisSchema: Schema = obj(
  "Performance analysis by department.",
  {
    headline: str("One-line summary of the performance outlook"),
    overall_rating: num("Average rating across the org (1-5)"),
    by_department: arr("Per-department performance", obj("Department performance", {
      department: str("Department name"),
      rating: num("Average rating (1-5)"),
      trend: strEnum("Trend direction", ["up", "down", "flat"]),
      note: str("Short qualitative note"),
    }, ["department", "rating", "trend", "note"])),
    strengths: arr("Org strengths", str("Strength")),
    improvement_areas: arr("Areas where the org should improve", str("Improvement area")),
    goal_risks: arr("Risks to goal attainment", str("Goal risk")),
    development_recommendations: arr("Development recommendations for HR to consider", str("Recommendation")),
    recommended_actions: arr("Recommended actions", str("Recommended action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_rating", "by_department", "strengths", "improvement_areas", "goal_risks", "development_recommendations", "recommended_actions", "confidence"]
);

export const skillRecommendationSchema: Schema = obj(
  "Skill gap analysis and recommendations.",
  {
    headline: str("One-line summary of the skills outlook"),
    overall_coverage_pct: num("Overall critical-skill coverage (0-100)"),
    recommendations: arr("Per-skill recommendations", obj("Skill recommendation", {
      skill: str("Skill name"),
      current_coverage_pct: num("Current coverage (0-100)"),
      gap: num("Gap percentage (0-100)"),
      priority: strEnum("Priority", ["low", "medium", "high"]),
      rationale: str("Why this skill matters"),
      recommended_actions: arr("Concrete remediation actions", str("Action")),
      target_roles: arr("Roles that most need this skill", str("Role")),
    }, ["skill", "current_coverage_pct", "gap", "priority", "rationale", "recommended_actions", "target_roles"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_coverage_pct", "recommendations", "confidence"]
);

export const onboardingPlanSchema: Schema = obj(
  "Structured onboarding plan for a new hire.",
  {
    headline: str("One-line summary of the plan"),
    expected_time_to_productivity_weeks: integer("Expected weeks to full productivity"),
    phases: arr("Onboarding phases", obj("Phase", {
      phase: str("Phase name"),
      duration_weeks: integer("Weeks in this phase"),
      objective: str("Phase objective"),
      tasks: arr("Tasks in this phase", obj("Task", {
        title: str("Task title"),
        description: str("Task description"),
        owner_role: str("Role responsible for this task"),
      }, ["title", "description", "owner_role"])),
    }, ["phase", "duration_weeks", "objective", "tasks"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "expected_time_to_productivity_weeks", "phases", "confidence"]
);

export const candidateRankingSchema: Schema = obj(
  "Candidate fit assessment. Use ONLY the provided candidate data — never protected characteristics.",
  {
    candidate_name: str("Candidate full name"),
    job_title: str("Job they applied for"),
    overall_score: integer("Overall fit score 0-100"),
    fit_summary: str("Short summary of fit"),
    strengths: arr("Relevant strengths", str("Strength")),
    concerns: arr("Concerns / gaps", str("Concern")),
    recommended_stage: strEnum("Recommended next pipeline stage", ["new", "screening", "interview", "offer", "reject"]),
    recommended_action: str("Concrete next step for the recruiter"),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["candidate_name", "job_title", "overall_score", "fit_summary", "strengths", "concerns", "recommended_stage", "recommended_action", "confidence"]
);

export const interviewQuestionsSchema: Schema = obj(
  "Interview question sets by focus area.",
  {
    headline: str("One-line description of the question set"),
    sections: arr("Question sections", obj("Section", {
      focus_area: str("Focus area"),
      rationale: str("Why this area matters"),
      questions: arr("Questions", obj("Question", {
        question: str("The interview question"),
        skill_assessed: str("Skill or competency assessed"),
        follow_ups: arr("Follow-up probes", str("Follow-up")),
      }, ["question", "skill_assessed", "follow_ups"])),
    }, ["focus_area", "rationale", "questions"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "sections", "confidence"]
);

export const interviewEvaluationSchema: Schema = obj(
  "Consolidated interview evaluation.",
  {
    headline: str("One-line summary of the interview result"),
    overall_score: integer("Overall score 0-100"),
    dimensions: arr("Scored dimensions", obj("Dimension", {
      dimension: str("Dimension name"),
      rating: integer("Rating 1-5"),
      note: str("Short note"),
    }, ["dimension", "rating", "note"])),
    highlights: arr("Interview highlights", str("Highlight")),
    risks: arr("Concerns identified", str("Risk")),
    recommendation: strEnum("Hiring recommendation", ["strong_yes", "yes", "maybe", "no", "strong_no"]),
    next_step: str("Concrete next step"),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_score", "dimensions", "highlights", "risks", "recommendation", "next_step", "confidence"]
);

export const policyAnswerSchema: Schema = obj(
  "Answer to a policy question grounded in the provided policy text.",
  {
    answer: str("Direct answer to the policy question"),
    confidence: num("Model confidence between 0 and 1"),
    citations: arr("Policy sections that support the answer", obj("Citation", {
      policy: str("Policy title"),
      section: str("Section title or excerpt"),
    }, ["policy", "section"])),
    disclaimer: str("Note that the answer is guidance, not legal advice"),
  },
  ["answer", "confidence", "citations", "disclaimer"]
);

export const careerRecommendationsSchema: Schema = obj(
  "Career growth recommendations grounded in the employee's skills, role and goals.",
  {
    headline: str("One-line summary of career outlook"),
    career_paths: arr("Recommended career paths", obj("Career path", {
      path: str("Path or next role"),
      rationale: str("Why this is a fit"),
      readiness: strEnum("Readiness", ["not_ready", "developing", "ready"]),
      steps: arr("Steps to get there", str("Step")),
      required_skills: arr("Skills to build", str("Skill")),
      timeline_months: integer("Estimated timeline in months"),
    }, ["path", "rationale", "readiness", "steps", "required_skills", "timeline_months"])),
    immediate_actions: arr("Actions to start now", str("Action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "career_paths", "immediate_actions", "confidence"]
);

// ---------------------------------------------------------------------------
// Validators / normalizers — safe coercion of model output
// ---------------------------------------------------------------------------

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function asConfidence(value: unknown): number {
  const n = asNumber(value);
  return Math.round(clamp(n, 0, 1) * 100) / 100;
}

const SEVERITIES: InsightSeverity[] = ["low", "medium", "high", "critical"];

function asSeverity(value: unknown): InsightSeverity {
  const candidate = asString(value).toLowerCase();
  return SEVERITIES.includes(candidate as InsightSeverity)
    ? (candidate as InsightSeverity)
    : "medium";
}

export function normalizeInsight(raw: Record<string, unknown>): GeminiInsight | null {
  const title = asString(raw.title);
  const summary = asString(raw.summary);
  if (!title || !summary) return null;
  return {
    title,
    severity: asSeverity(raw.severity),
    summary,
    evidence: asStringArray(raw.evidence),
    reasoning: asString(raw.reasoning),
    confidence: asConfidence(raw.confidence),
    recommended_action: asString(raw.recommended_action),
    action_type: asString(raw.action_type),
    affected_entities: asStringArray(raw.affected_entities),
  };
}

/** Accepts `{ insights: [...] }` or a bare array. */
export function normalizeInsights(payload: unknown): GeminiInsight[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { insights?: unknown })?.insights)
      ? (payload as { insights: unknown[] }).insights
      : [];
  const seen = new Set<string>();
  const out: GeminiInsight[] = [];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const insight = normalizeInsight(record as Record<string, unknown>);
    if (!insight) continue;
    if (seen.has(insight.title)) continue;
    seen.add(insight.title);
    out.push(insight);
  }
  return out;
}

export function normalizeEmployeeAnalysis(raw: Record<string, unknown>): EmployeeAnalysis {
  const trend = (raw.performance_trend ?? {}) as Record<string, unknown>;
  return {
    summary: asString(raw.summary),
    strengths: asStringArray(raw.strengths),
    development_areas: asStringArray(raw.development_areas),
    skill_gaps: asStringArray(raw.skill_gaps),
    performance_trend: {
      direction: ["up", "down", "flat"].includes(asString(trend.direction).toLowerCase())
        ? (asString(trend.direction).toLowerCase() as "up" | "down" | "flat")
        : "flat",
      description: asString(trend.description),
    },
    engagement_signals: asStringArray(raw.engagement_signals),
    risk_signals: asStringArray(raw.risk_signals),
    recommended_actions: asStringArray(raw.recommended_actions),
    insights: normalizeInsights(raw.insights),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeAttritionReport(raw: Record<string, unknown>): AttritionReport {
  const segments = Array.isArray(raw.segments) ? raw.segments : [];
  return {
    headline: asString(raw.headline),
    overall_risk_level: ["low", "medium", "high"].includes(asString(raw.overall_risk_level))
      ? (asString(raw.overall_risk_level) as AttritionReport["overall_risk_level"])
      : "medium",
    segments: segments.map((s) => {
      const row = (s ?? {}) as Record<string, unknown>;
      return {
        name: asString(row.name),
        headcount: Math.round(asNumber(row.headcount)),
        avg_risk_score: Math.round(asNumber(row.avg_risk_score) * 10) / 10,
        risk_level: SEVERITIES.includes(asString(row.risk_level) as InsightSeverity)
          ? (asString(row.risk_level) as AttritionReport["segments"][number]["risk_level"])
          : "medium",
        key_drivers: asStringArray(row.key_drivers),
        recommended_action: asString(row.recommended_action),
      };
    }),
    recommended_actions: asStringArray(raw.recommended_actions),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizePerformanceAnalysis(raw: Record<string, unknown>): PerformanceAnalysis {
  const byDept = Array.isArray(raw.by_department) ? raw.by_department : [];
  return {
    headline: asString(raw.headline),
    overall_rating: Math.round(asNumber(raw.overall_rating) * 10) / 10,
    by_department: byDept.map((d) => {
      const row = (d ?? {}) as Record<string, unknown>;
      return {
        department: asString(row.department),
        rating: Math.round(asNumber(row.rating) * 10) / 10,
        trend: ["up", "down", "flat"].includes(asString(row.trend)) ? (asString(row.trend) as "up" | "down" | "flat") : "flat",
        note: asString(row.note),
      };
    }),
    strengths: asStringArray(raw.strengths),
    improvement_areas: asStringArray(raw.improvement_areas),
    goal_risks: asStringArray(raw.goal_risks),
    development_recommendations: asStringArray(raw.development_recommendations),
    recommended_actions: asStringArray(raw.recommended_actions),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeSkillRecommendations(raw: Record<string, unknown>): SkillRecommendationReport {
  const recs = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  return {
    headline: asString(raw.headline),
    overall_coverage_pct: Math.round(asNumber(raw.overall_coverage_pct) * 10) / 10,
    recommendations: recs.map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        skill: asString(row.skill),
        current_coverage_pct: Math.round(asNumber(row.current_coverage_pct) * 10) / 10,
        gap: Math.round(asNumber(row.gap) * 10) / 10,
        priority: ["low", "medium", "high"].includes(asString(row.priority))
          ? (asString(row.priority) as "low" | "medium" | "high")
          : "medium",
        rationale: asString(row.rationale),
        recommended_actions: asStringArray(row.recommended_actions),
        target_roles: asStringArray(row.target_roles),
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeOnboardingPlan(raw: Record<string, unknown>): OnboardingPlan {
  const phases = Array.isArray(raw.phases) ? raw.phases : [];
  return {
    headline: asString(raw.headline),
    expected_time_to_productivity_weeks: Math.round(asNumber(raw.expected_time_to_productivity_weeks)),
    phases: phases.map((p) => {
      const row = (p ?? {}) as Record<string, unknown>;
      const tasks = Array.isArray(row.tasks) ? row.tasks : [];
      return {
        phase: asString(row.phase),
        duration_weeks: Math.round(asNumber(row.duration_weeks)),
        objective: asString(row.objective),
        tasks: tasks.map((t) => {
          const task = (t ?? {}) as Record<string, unknown>;
          return {
            title: asString(task.title),
            description: asString(task.description),
            owner_role: asString(task.owner_role),
          };
        }),
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeCandidateRanking(raw: Record<string, unknown>): CandidateRanking {
  const stages: CandidateRanking["recommended_stage"][] = ["new", "screening", "interview", "offer", "reject"];
  const stage = asString(raw.recommended_stage).toLowerCase();
  return {
    candidate_name: asString(raw.candidate_name),
    job_title: asString(raw.job_title),
    overall_score: clamp(Math.round(asNumber(raw.overall_score)), 0, 100),
    fit_summary: asString(raw.fit_summary),
    strengths: asStringArray(raw.strengths),
    concerns: asStringArray(raw.concerns),
    recommended_stage: stages.includes(stage as CandidateRanking["recommended_stage"])
      ? (stage as CandidateRanking["recommended_stage"])
      : "screening",
    recommended_action: asString(raw.recommended_action),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeInterviewQuestions(raw: Record<string, unknown>): InterviewQuestions {
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    headline: asString(raw.headline),
    sections: sections.map((s) => {
      const row = (s ?? {}) as Record<string, unknown>;
      const questions = Array.isArray(row.questions) ? row.questions : [];
      return {
        focus_area: asString(row.focus_area),
        rationale: asString(row.rationale),
        questions: questions.map((q) => {
          const question = (q ?? {}) as Record<string, unknown>;
          return {
            question: asString(question.question),
            skill_assessed: asString(question.skill_assessed),
            follow_ups: asStringArray(question.follow_ups),
          };
        }),
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeInterviewEvaluation(raw: Record<string, unknown>): InterviewEvaluation {
  const recommendations: InterviewEvaluation["recommendation"][] = ["strong_yes", "yes", "maybe", "no", "strong_no"];
  const rec = asString(raw.recommendation).toLowerCase();
  const dimensions = Array.isArray(raw.dimensions) ? raw.dimensions : [];
  return {
    headline: asString(raw.headline),
    overall_score: clamp(Math.round(asNumber(raw.overall_score)), 0, 100),
    dimensions: dimensions.map((d) => {
      const row = (d ?? {}) as Record<string, unknown>;
      return {
        dimension: asString(row.dimension),
        rating: clamp(Math.round(asNumber(row.rating)), 1, 5),
        note: asString(row.note),
      };
    }),
    highlights: asStringArray(raw.highlights),
    risks: asStringArray(raw.risks),
    recommendation: recommendations.includes(rec as InterviewEvaluation["recommendation"])
      ? (rec as InterviewEvaluation["recommendation"])
      : "maybe",
    next_step: asString(raw.next_step),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizePolicyAnswer(raw: Record<string, unknown>): PolicyAnswer {
  const citations = Array.isArray(raw.citations) ? raw.citations : [];
  return {
    answer: asString(raw.answer),
    confidence: asConfidence(raw.confidence),
    citations: citations.map((c) => {
      const row = (c ?? {}) as Record<string, unknown>;
      return { policy: asString(row.policy), section: asString(row.section) };
    }),
    disclaimer: asString(raw.disclaimer),
  };
}

export function normalizeCareerRecommendations(raw: Record<string, unknown>): CareerRecommendations {
  const paths = Array.isArray(raw.career_paths) ? raw.career_paths : [];
  return {
    headline: asString(raw.headline),
    career_paths: paths.map((p) => {
      const row = (p ?? {}) as Record<string, unknown>;
      const readiness = asString(row.readiness).toLowerCase();
      return {
        path: asString(row.path),
        rationale: asString(row.rationale),
        readiness: ["not_ready", "developing", "ready"].includes(readiness)
          ? (readiness as CareerPath["readiness"])
          : "developing",
        steps: asStringArray(row.steps),
        required_skills: asStringArray(row.required_skills),
        timeline_months: Math.round(asNumber(row.timeline_months)),
      };
    }),
    immediate_actions: asStringArray(raw.immediate_actions),
    confidence: asConfidence(raw.confidence),
  };
}