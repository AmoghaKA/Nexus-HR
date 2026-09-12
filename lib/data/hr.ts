import type {
  AiInsight,
  BarDatum,
  Employee,
  Onboarding,
  RecruitmentStage,
  SeriesPoint,
  SkillGap,
  StatCardData,
  TrendPoint,
} from "@/types";

export const hrStats: StatCardData[] = [
  {
    id: "total-employees",
    label: "Total Employees",
    value: "1,284",
    change: 38,
    trend: "up",
    hint: "vs last quarter",
    icon: "users",
  },
  {
    id: "new-hires",
    label: "New Hires",
    value: "42",
    change: 12,
    trend: "up",
    hint: "this month",
    icon: "user-plus",
  },
  {
    id: "open-positions",
    label: "Open Positions",
    value: "18",
    change: -3,
    trend: "down",
    hint: "across 9 teams",
    icon: "briefcase",
  },
  {
    id: "high-risk",
    label: "High Risk Employees",
    value: "23",
    change: 4,
    trend: "up",
    hint: "attrition risk",
    icon: "alert",
  },
  {
    id: "avg-performance",
    label: "Average Performance",
    value: "3.9 / 5",
    change: 0.1,
    trend: "up",
    hint: "last review cycle",
    icon: "target",
  },
  {
    id: "goal-completion",
    label: "Goal Completion",
    value: "78%",
    change: -2,
    trend: "down",
    hint: "Q3 objectives",
    icon: "flag",
  },
  {
    id: "attendance",
    label: "Attendance Rate",
    value: "94.2%",
    change: -0.6,
    trend: "down",
    hint: "rolling 30 days",
    icon: "calendar",
  },
  {
    id: "skill-coverage",
    label: "Skill Coverage",
    value: "71%",
    change: 4,
    trend: "up",
    hint: "of critical skills",
    icon: "layers",
  },
];

export const workforceTrend: TrendPoint[] = [
  { month: "Oct", value: 1102 },
  { month: "Nov", value: 1128 },
  { month: "Dec", value: 1140 },
  { month: "Jan", value: 1165 },
  { month: "Feb", value: 1181 },
  { month: "Mar", value: 1193 },
  { month: "Apr", value: 1212 },
  { month: "May", value: 1226 },
  { month: "Jun", value: 1240 },
  { month: "Jul", value: 1253 },
  { month: "Aug", value: 1266 },
  { month: "Sep", value: 1284 },
];

export const departmentComposition: SeriesPoint[] = [
  { label: "Engineering", value: 412 },
  { label: "Product", value: 186 },
  { label: "Design", value: 98 },
  { label: "Data", value: 121 },
  { label: "Sales", value: 153 },
  { label: "Marketing", value: 107 },
  { label: "Finance", value: 84 },
  { label: "People", value: 63 },
  { label: "Operations", value: 60 },
];

export const attritionTrend: TrendPoint[] = [
  { month: "Feb", value: 6.1 },
  { month: "Mar", value: 5.8 },
  { month: "Apr", value: 6.4 },
  { month: "May", value: 6.2 },
  { month: "Jun", value: 7.0 },
  { month: "Jul", value: 6.8 },
  { month: "Aug", value: 7.6 },
  { month: "Sep", value: 8.1 },
];

export const attritionByDepartment: BarDatum[] = [
  { category: "Engineering", value: 12, fill: "hsl(0 72% 51%)" },
  { category: "Sales", value: 9, fill: "hsl(243 68% 55%)" },
  { category: "Operations", value: 7, fill: "hsl(243 68% 55%)" },
  { category: "Product", value: 5, fill: "hsl(243 68% 55%)" },
  { category: "Design", value: 4, fill: "hsl(243 68% 55%)" },
];

export const highRiskEmployees: Employee[] = [
  {
    id: "emp-104",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    department: "Engineering",
    risk: "critical",
    score: 82,
  },
  {
    id: "emp-211",
    name: "Marcus Chen",
    role: "Data Platform Engineer",
    department: "Engineering",
    risk: "high",
    score: 74,
  },
  {
    id: "emp-087",
    name: "Elena Petrova",
    role: "Account Executive",
    department: "Sales",
    risk: "high",
    score: 71,
  },
  {
    id: "emp-163",
    name: "David Osei",
    role: "Site Reliability Engineer",
    department: "Engineering",
    risk: "high",
    score: 68,
  },
  {
    id: "emp-044",
    name: "Sofia Ramos",
    role: "Product Operations Lead",
    department: "Operations",
    risk: "medium",
    score: 61,
  },
];

export const recruitmentPipeline: RecruitmentStage[] = [
  { stage: "Applied", count: 486 },
  { stage: "Screened", count: 214 },
  { stage: "Interviewed", count: 96 },
  { stage: "Assessed", count: 41 },
  { stage: "Offered", count: 15 },
  { stage: "Hired", count: 42 },
];

export const skillGaps: SkillGap[] = [
  {
    skill: "Cloud Architecture",
    gap: 34,
    priority: "high",
    suggestedAction: "Launch cloud certification track",
  },
  {
    skill: "AI / ML Engineering",
    gap: 28,
    priority: "high",
    suggestedAction: "Partner learning path with hands-on sprints",
  },
  {
    skill: "Data Visualization",
    gap: 22,
    priority: "medium",
    suggestedAction: "Analyst enablement workshop",
  },
  {
    skill: "Security Compliance",
    gap: 18,
    priority: "medium",
    suggestedAction: "Mandatory awareness training",
  },
  {
    skill: "Leadership",
    gap: 12,
    priority: "low",
    suggestedAction: "Manager cohort program",
  },
];

export const onboardingProgress: Onboarding[] = [
  {
    id: "ob-1",
    name: "Aisha Malik",
    role: "Frontend Engineer",
    startedOn: "Sep 8",
    progress: 64,
  },
  {
    id: "ob-2",
    name: "Jonas Weber",
    role: "Data Analyst",
    startedOn: "Sep 5",
    progress: 48,
  },
  {
    id: "ob-3",
    name: "Isabella Moretti",
    role: "Product Designer",
    startedOn: "Aug 25",
    progress: 82,
  },
  {
    id: "ob-4",
    name: "Kenji Tanaka",
    role: "Sales Development Rep",
    startedOn: "Aug 18",
    progress: 91,
  },
];

export const workforceBriefing: AiInsight = {
  id: "insight-attrition-eng",
  title: "Engineering attrition risk increased",
  summary:
    "The risk of voluntary attrition in Engineering rose sharply over the last 30 days and is now the highest of any department.",
  signals: [
    { label: "Goal completion decreased", direction: "down", severity: "negative" },
    { label: "Attendance volatility increased", direction: "up", severity: "negative" },
    { label: "Negative feedback increased", direction: "up", severity: "negative" },
  ],
  recommendedAction: "Review high-risk employees",
  confidence: 0.92,
  category: "attrition",
};