export type RiskLevel = "low" | "medium" | "high" | "critical";

export type TrendDirection = "up" | "down" | "flat";

export interface StatCardData {
  id: string;
  label: string;
  value: string;
  change?: number;
  trend?: TrendDirection;
  hint?: string;
  icon: "users" | "user-plus" | "briefcase" | "alert" | "target" | "flag" | "calendar" | "layers";
}

export interface TrendPoint {
  month: string;
  value: number;
}

export interface SeriesPoint {
  label: string;
  [key: string]: string | number;
}

export interface BarDatum {
  category: string;
  value: number;
  fill?: string;
}

export interface AiInsight {
  id: string;
  title: string;
  summary: string;
  signals: { label: string; direction: "up" | "down"; severity: "positive" | "negative" | "neutral" }[];
  recommendedAction: string;
  confidence: number;
  category: "attrition" | "performance" | "engagement" | "recruitment" | "skills" | "onboarding";
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  risk: RiskLevel;
  score: number;
}

export interface RecruitmentStage {
  stage: string;
  count: number;
}

export interface SkillGap {
  skill: string;
  gap: number;
  priority: "low" | "medium" | "high";
  suggestedAction: string;
}

export interface Onboarding {
  id: string;
  name: string;
  role: string;
  startedOn: string;
  progress: number;
}

export interface Goal {
  title: string;
  progress: number;
  due: string;
  status: "on-track" | "at-risk" | "completed";
}

export interface LearningRecommendation {
  id: string;
  title: string;
  provider: string;
  duration: string;
  reason: string;
}

export interface UpcomingTask {
  id: string;
  title: string;
  due: string;
  kind: "review" | "training" | "checkin" | "admin";
}

export interface PolicyTopic {
  id: string;
  title: string;
  summary: string;
}