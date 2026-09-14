import type { AiInsight, InsightSeverity } from "@/types";
import type { EmployeeDetail } from "@/lib/hr/directory";

export interface EmployeeAnalysisPackage {
  generatedAt: string;
  employee: {
    id: string;
    name: string;
    role: string;
    department: string;
    status: string;
    joined: string | null;
    location: string | null;
    manager: string;
  };
  performance: {
    latestRating: number | null;
    ratingCount: number;
    delta: number | null;
  };
  attendance: {
    rate: number | null;
    recentCount: number;
  };
  goals: {
    active: number;
    completed: number;
    avgProgress: number | null;
  };
  skills: {
    total: number;
    criticalCoverage: string[];
  };
  risk: {
    latest: number | null;
    level: string | null;
    trendDelta: number | null;
  };
  feedback: {
    positive: number;
    negative: number;
  };
  training: {
    completed: number;
    total: number | null;
  };
  onboarding: {
    plans: number;
    doneTasks: number;
    totalTasks: number | null;
  };
  insights: AiInsight[];
}

const CRITICAL_SKILLS = [
  "TypeScript",
  "Cloud Architecture",
  "AI / ML Engineering",
  "Security Compliance",
  "Data Analysis",
  "People Management",
];

function severityFor(maxRisk: number | null): InsightSeverity {
  if (maxRisk == null) return "info";
  if (maxRisk >= 80) return "critical";
  if (maxRisk >= 65) return "high";
  if (maxRisk >= 50) return "medium";
  return "low";
}

function insight(
  partial: Omit<AiInsight, "severity" | "confidence"> & Partial<Pick<AiInsight, "severity" | "confidence">>
): AiInsight {
  return { severity: "medium", confidence: 0.72, ...partial };
}

/**
 * Builds the summarized, structured employee analysis package that the Qwen
 * engine will later expand into a narrative profile. No raw rows included —
 * only rollups, deltas, and derived signals.
 */
export function buildEmployeeAnalysis(detail: EmployeeDetail): EmployeeAnalysisPackage {
  const ratings = detail.reviews.filter((r) => r.rating != null).map((r) => r.rating as number);
  const latestRating = ratings[0] ?? null;
  const delta =
    ratings.length >= 2 ? (latestRating !== null ? latestRating - ratings[ratings.length - 1] : null) : null;

  const activeGoals = detail.goals.filter((g) => g.status === "active").length;
  const completedGoals = detail.goals.filter((g) => g.status === "completed").length;
  const completedWithProgress = detail.goals.filter((g) => g.status === "completed" || (g.progress >= 100 && g.status === "active"));
  const withProgress = detail.goals.filter((g) => g.status === "active" || g.status === "completed");
  const avgProgress =
    withProgress.length === 0 ? null : Math.round(withProgress.reduce((a, b) => a + b.progress, 0) / withProgress.length);

  const criticalCoverage = CRITICAL_SKILLS.filter((skill) =>
    detail.skills.some((s) => s.name === skill)
  );

  const riskHistory = detail.riskHistory.filter((r) => r.score != null);
  const latestRisk = detail.latestRisk?.score ?? null;
  const riskTrendDelta =
    riskHistory.length >= 2
      ? (riskHistory[riskHistory.length - 1].score ?? 0) - (riskHistory[0].score ?? 0)
      : null;

  const negativeFeedback = detail.feedback.filter((f) =>
    ["constructive", "engagement", "manager"].includes(f.category ?? "")
  ).length;
  const positiveFeedback = detail.feedback.filter((f) => f.category === "praise").length;

  const completedTraining = detail.training.filter((t) => t.status === "completed").length;

  const totalTasks = detail.onboarding.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = detail.onboarding.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length,
    0
  );

  const pkg: EmployeeAnalysisPackage = {
    generatedAt: new Date().toISOString(),
    employee: {
      id: detail.id,
      name: detail.name,
      role: detail.role,
      department: detail.department,
      status: detail.status,
      joined: detail.joined,
      location: detail.location,
      manager: detail.manager?.name ?? "—",
    },
    performance: { latestRating, ratingCount: detail.reviews.length, delta },
    attendance: { rate: detail.attendanceRate, recentCount: detail.recentAttendance.length },
    goals: { active: activeGoals, completed: completedGoals + completedWithProgress.length, avgProgress },
    skills: { total: detail.skills.length, criticalCoverage },
    risk: { latest: latestRisk, level: detail.latestRisk?.level ?? null, trendDelta: riskTrendDelta },
    feedback: { positive: positiveFeedback, negative: negativeFeedback },
    training: { completed: completedTraining, total: detail.training.length || null },
    onboarding: { plans: detail.onboarding.length, doneTasks, totalTasks: totalTasks || null },
    insights: [],
  };

  pkg.insights = deriveEmployeeInsights(pkg);
  return pkg;
}

function deriveEmployeeInsights(pkg: EmployeeAnalysisPackage): AiInsight[] {
  const insights: AiInsight[] = [];

  const evidence: string[] = [];
  if (pkg.risk.trendDelta != null && pkg.risk.trendDelta > 0)
    evidence.push(`Risk score ↑ ${pkg.risk.trendDelta} points over tracked periods`);
  if (pkg.goals.avgProgress != null && pkg.goals.avgProgress < 45)
    evidence.push(`Average goal progress ${pkg.goals.avgProgress}%`);
  if (pkg.feedback.negative > 0)
    evidence.push(`${pkg.feedback.negative} constructive/engagement feedback records`);
  if (pkg.attendance.rate != null && pkg.attendance.rate < 90)
    evidence.push(`Attendance rate ${pkg.attendance.rate}% in the last 60 days`);

  const s = pkg.risk.latest ?? 0;
  if (s >= 50 || evidence.length >= 2) {
    insights.push(
      insight({
        id: "emp-attrition",
        title: pkg.risk.level === "critical" ? "Critical attrition risk" : "Elevated attrition risk",
        summary: `${pkg.employee.name} shows ${evidence.length > 0 ? "several" : "at least one"} engagement signal that may require attention.`,
        evidence,
        reasoning:
          "Combining risk scores with goal progress, attendance, and feedback gives an early view of disengagement before turnover materializes.",
        recommendedAction:
          pkg.risk.level === "critical" || pkg.risk.level === "high"
            ? "Schedule a manager check-in and review recent workload and feedback."
            : "Monitor the trend and re-check next period.",
        confidence: 0.72,
        category: "engagement",
        severity: severityFor(s),
      })
    );
  }

  if (pkg.goals.active > 0 && pkg.goals.avgProgress != null && pkg.goals.avgProgress < 40) {
    insights.push(
      insight({
        id: "emp-goals-behind",
        title: "Goals behind schedule",
        summary: `${pkg.goals.active} active goal${pkg.goals.active > 1 ? "s" : ""} average ${pkg.goals.avgProgress}% progress against plan.`,
        evidence: [`${pkg.goals.avgProgress}% average progress across ${pkg.goals.active} active goal${pkg.goals.active > 1 ? "s" : ""}`],
        reasoning: "Low goal progress may reflect unclear priorities, resourcing pressure, or a need for support.",
        recommendedAction: "Rebook a 1:1 to review blockers and re-plan goals if needed.",
        confidence: 0.66,
        category: "engagement",
      })
    );
  }

  if (pkg.skills.total === 0 || pkg.skills.criticalCoverage.length === 0) {
    const missing = CRITICAL_SKILLS.filter((s) => !pkg.skills.criticalCoverage.includes(s)).slice(0, 3);
    insights.push(
      insight({
        id: "emp-skill-gap",
        title: "Development opportunity",
        summary: `No coverage of the critical skill${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`,
        evidence: missing.map((skill) => `Missing critical skill: ${skill}`),
        reasoning: "Closing critical-skill gaps strengthens resilience and career growth.",
        recommendedAction: "Suggest targeted training from the learning catalog.",
        confidence: 0.6,
        category: "skills",
        severity: "info",
      })
    );
  }

  const total = pkg.training.total ?? 0;
  if (total > 0 && pkg.training.completed < total) {
    insights.push(
      insight({
        id: "emp-training",
        title: "Training in progress",
        summary: `${pkg.training.completed} of ${total} enrolled course${total > 1 ? "s" : ""} completed.`,
        evidence: [`${pkg.training.completed}/${total} courses completed`],
        reasoning: "Completing enrolled training improves readiness and skill coverage.",
        recommendedAction: "Allow time this cycle to finish enrolled courses.",
        confidence: 0.65,
        category: "skills",
        severity: "low",
      })
    );
  }

  if (pkg.performance.delta != null && pkg.performance.delta > 0) {
    insights.push(
      insight({
        id: "emp-strength",
        title: "Performance improving",
        summary: `Latest rating ${pkg.performance.latestRating}/5 is up ${pkg.performance.delta} point${pkg.performance.delta > 1 ? "s" : ""} vs. the earliest rated cycle.`,
        evidence: [`Latest rating ${pkg.performance.latestRating}/5 (Δ+${pkg.performance.delta})`],
        reasoning: "A rising performance trend signals strong engagement and growth.",
        recommendedAction: "Recognize this progress and keep momentum through the next cycle.",
        confidence: 0.7,
        category: "performance",
        severity: "low",
      })
    );
  }

  return insights.sort(
    (a, b) =>
      (["critical", "high", "medium", "low", "info"].indexOf(b.severity ?? "medium") ?? 2) -
      (["critical", "high", "medium", "low", "info"].indexOf(a.severity ?? "medium") ?? 2)
  );
}

/** Renders the employee package into the prompt that the Qwen engine will receive. */
export function prepareEmployeePrompt(pkg: EmployeeAnalysisPackage): string {
  return `You are the Nexus HR HR personal-analytics assistant.

Compose a concise, supportive, executive-friendly profile for the employee below,
using only the summarized signals provided. Plain language, no invented facts.

Employee: ${pkg.employee.name} (${pkg.employee.role}, ${pkg.employee.department})
Status: ${pkg.employee.status}; joined ${pkg.employee.joined ?? "n/a"}; manager: ${pkg.employee.manager}
Location: ${pkg.employee.location ?? "n/a"}

PERFORMANCE
- Latest rating: ${pkg.performance.latestRating ?? "n/a"}/5 across ${pkg.performance.ratingCount} review(s); delta ${pkg.performance.delta ?? "n/a"}

ATTENDANCE
- Rate (last 60 days): ${pkg.attendance.rate ?? "n/a"}% across ${pkg.attendance.recentCount} recorded days

GOALS
- Active: ${pkg.goals.active}; completed: ${pkg.goals.completed}; avg progress: ${pkg.goals.avgProgress ?? "n/a"}%

SKILLS
- Total skills: ${pkg.skills.total}; critical coverage: ${pkg.skills.criticalCoverage.join(", ") || "none"}

RISK
- Latest score: ${pkg.risk.latest ?? "n/a"} (${pkg.risk.level ?? "n/a"}); trend delta: ${pkg.risk.trendDelta ?? "n/a"}

FEEDBACK
- Positive: ${pkg.feedback.positive}; constructive/engagement: ${pkg.feedback.negative}

TRAINING & ONBOARDING
- Courses completed: ${pkg.training.completed}/${pkg.training.total ?? "n/a"}
- Onboarding tasks: ${pkg.onboarding.doneTasks}/${pkg.onboarding.totalTasks ?? "n/a"} (${pkg.onboarding.plans} plan(s))

Signals already surfaced: ${pkg.insights.map((i) => `${i.title} [${i.severity}]`).join("; ") || "none"}
`;
}