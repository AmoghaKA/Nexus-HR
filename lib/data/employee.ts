import type {
  AiInsight,
  BarDatum,
  Goal,
  LearningRecommendation,
  Onboarding,
  PolicyTopic,
  SeriesPoint,
  StatCardData,
  TrendPoint,
  UpcomingTask,
} from "@/types";

export const employeeStats: StatCardData[] = [
  {
    id: "my-goals",
    label: "My Goals",
    value: "4",
    change: 1,
    trend: "up",
    hint: "active this quarter",
    icon: "flag",
  },
  {
    id: "goal-progress",
    label: "Goal Progress",
    value: "78%",
    change: 6,
    trend: "up",
    hint: "across all goals",
    icon: "target",
  },
  {
    id: "performance",
    label: "My Performance",
    value: "4.2 / 5",
    change: 0.3,
    trend: "up",
    hint: "above team avg",
    icon: "users",
  },
  {
    id: "skills",
    label: "My Skills",
    value: "18",
    change: 2,
    trend: "up",
    hint: "verified skills",
    icon: "layers",
  },
];

export const employeeBrief: AiInsight = {
  id: "insight-employee-growth",
  title: "Your goal progress is strong",
  summary:
    "Based on your current role and career direction, improving system design and cloud architecture could accelerate your growth.",
  signals: [
    { label: "Goal completion on track", direction: "up", severity: "positive" },
    { label: "Feedback trend improving", direction: "up", severity: "positive" },
    { label: "System design learning gap", direction: "down", severity: "neutral" },
  ],
  recommendedAction: "Start the cloud architecture learning path",
  confidence: 0.87,
  category: "engagement",
};

export const myGoals: Goal[] = [
  {
    title: "Ship the workforce analytics module",
    progress: 82,
    due: "Sep 30",
    status: "on-track",
  },
  {
    title: "Complete cloud architecture certification",
    progress: 64,
    due: "Oct 15",
    status: "on-track",
  },
  {
    title: "Mentor two junior engineers",
    progress: 40,
    due: "Nov 12",
    status: "at-risk",
  },
  {
    title: "Reduce dashboard render time by 30%",
    progress: 100,
    due: "Sep 5",
    status: "completed",
  },
];

export const performanceTrend: TrendPoint[] = [
  { month: "Mar", value: 3.7 },
  { month: "Apr", value: 3.7 },
  { month: "May", value: 3.8 },
  { month: "Jun", value: 3.9 },
  { month: "Jul", value: 3.9 },
  { month: "Aug", value: 4.1 },
  { month: "Sep", value: 4.2 },
];

export const skillLevels: SeriesPoint[] = [
  { label: "TypeScript", value: 9 },
  { label: "React", value: 9 },
  { label: "System Design", value: 5 },
  { label: "Cloud Architecture", value: 4 },
  { label: "Data Modeling", value: 6 },
  { label: "Testing", value: 7 },
];

export const learningRecommendations: LearningRecommendation[] = [
  {
    id: "lr-1",
    title: "Cloud Architecture on Google Cloud",
    provider: "Coursera · Professional Certificate",
    duration: "24h",
    reason: "Matches your stated career direction toward platform engineering.",
  },
  {
    id: "lr-2",
    title: "Designing Data-Intensive Systems",
    provider: "Internal library · Book track",
    duration: "12h",
    reason: "Closes your largest skill gap: system design.",
  },
  {
    id: "lr-3",
    title: "Distributed Systems Patterns",
    provider: "Udemy · Video course",
    duration: "9h",
    reason: "Complements your current work on the analytics module.",
  },
];

export const myOnboarding: Onboarding[] = [
  {
    id: "ob-emp-1",
    name: "Core system access",
    role: "Setup",
    startedOn: "Week 1",
    progress: 100,
  },
  {
    id: "ob-emp-2",
    name: "Team introductions",
    role: "Week 2",
    startedOn: "Week 1",
    progress: 100,
  },
  {
    id: "ob-emp-3",
    name: "Security & compliance training",
    role: "Week 3",
    startedOn: "Week 2",
    progress: 60,
  },
  {
    id: "ob-emp-4",
    name: "First project ramp-up",
    role: "Week 4",
    startedOn: "Week 3",
    progress: 35,
  },
];

export const upcomingTasks: UpcomingTask[] = [
  {
    id: "task-1",
    title: "Quarterly goal check-in with manager",
    due: "Tomorrow",
    kind: "checkin",
  },
  {
    id: "task-2",
    title: "Complete security awareness training",
    due: "Sep 18",
    kind: "training",
  },
  {
    id: "task-3",
    title: "Submit peer feedback for Sprint 14",
    due: "Sep 20",
    kind: "review",
  },
  {
    id: "task-4",
    title: "Renew workstation asset request",
    due: "Sep 28",
    kind: "admin",
  },
];

export const policyTopics: PolicyTopic[] = [
  {
    id: "pol-1",
    title: "Remote work policy",
    summary: "Flexible work, T&E expectations, and core collaboration hours.",
  },
  {
    id: "pol-2",
    title: "Parental leave",
    summary: "Leave entitlements, benefits continuity, and return support.",
  },
  {
    id: "pol-3",
    title: "Learning & development budget",
    summary: "Annual allowance and approval process for courses and books.",
  },
];

export const skillGapBars: BarDatum[] = [
  { category: "System Design", value: 5, fill: "hsl(38 92% 50%)" },
  { category: "Cloud Architecture", value: 4, fill: "hsl(38 92% 50%)" },
  { category: "Data Modeling", value: 6, fill: "hsl(160 76% 32%)" },
  { category: "Testing", value: 7, fill: "hsl(160 76% 32%)" },
  { category: "React", value: 9, fill: "hsl(160 76% 32%)" },
  { category: "TypeScript", value: 9, fill: "hsl(160 76% 32%)" },
];