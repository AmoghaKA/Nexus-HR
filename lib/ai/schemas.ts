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

export type OnboardingProgressStatus = "on_track" | "at_risk" | "behind" | "blocked";

export interface OnboardingProgressInsight {
  headline: string;
  summary: string;
  status: OnboardingProgressStatus;
  completed_pct: number;
  days_since_start: number;
  total_tasks: number;
  completed: number;
  pending: number;
  overdue: number;
  blocked: number;
  issue: string;
  recommendation: string;
  prescribed_actions: string[];
  confidence: number;
}

export interface SkillFocusNote {
  skill: string;
  rationale: string;
  recommended_action: string;
}

export interface WorkforceSkillsAnalysis {
  headline: string;
  overall_assessment: string;
  top_finding: string;
  focus: SkillFocusNote[];
  recommended_actions: string[];
  confidence: number;
}

export interface CandidateRanking {
  candidate_name: string;
  job_title: string;
  overall_score: number; // 0..100
  fit_summary: string;
  strengths: string[];
  concerns: string[];
  recommended_stage: "applied" | "screening" | "interview" | "evaluation" | "shortlisted" | "hired" | "rejected";
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

export interface InterviewDimensionScore {
  rating: number; // 1..5
  note: string;
}

/**
 * Advisory-only interview insight. Derived from per-question interview
 * records (interview_evaluation_rows) but never a hiring decision — HR always
 * makes the final call.
 */
export interface InterviewInsight {
  headline: string;
  overall_score: number; // 0..100
  technical_competency: InterviewDimensionScore;
  communication: InterviewDimensionScore;
  problem_solving: InterviewDimensionScore;
  role_fit: InterviewDimensionScore;
  strengths: string[];
  concerns: string[];
  evidence: string[];
  confidence: number;
}

export interface PolicyAnswer {
  answer: string;
  explanation: string;
  confidence: number;
  citations: { policy: string; section: string }[];
  disclaimer: string;
}

export interface CopilotEvidence {
  label: string;
  value: string;
  detail?: string;
}

export interface CopilotEntityRef {
  name: string;
  note?: string;
  id?: string;
}

/**
 * Structured answer produced by the HR AI Workforce Copilot. Everything is
 * advisory and grounded in the supplied data package; entity refs carry a
 * stable id (attached server-side) so the UI can link to real records.
 */
export interface CopilotAnswer {
  answer: string;
  evidence: CopilotEvidence[];
  reasoning: string;
  recommended_actions: string[];
  relevant_departments: CopilotEntityRef[];
  relevant_employees: CopilotEntityRef[];
  relevant_candidates: CopilotEntityRef[];
  confidence: number;
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

export interface ResumeAnalysis {
  full_name: string;
  email: string;
  phone: string;
  current_title: string;
  location: string;
  summary: string;
  years_of_experience: number;
  education: string;
  skills: string[];
  projects: string[];
  certifications: string[];
  relevant_experience: string;
}

export type CandidateRecommendation = "strong" | "potential" | "needs_assessment";

export interface CandidateMatch {
  candidate_name: string;
  job_title: string;
  overall_match: number; // 0..100
  skill_match: number; // 0..100
  experience_match: number; // 0..100
  role_relevance: number; // 0..100
  education_match: number; // 0..100
  recommendation: CandidateRecommendation;
  summary: string;
  why_matches: string[];
  missing_requirements: string[];
  relevant_evidence: string[];
  interview_focus: string[];
  strengths: string[];
  gaps: string[];
  next_step: string;
  confidence: number;
}

export interface CandidateComparison {
  headline: string;
  recommended_candidate: string;
  candidate_notes: { candidate_name: string; note: string }[];
  confidence: number;
}

// ---------------------------------------------------------------------------
// Employee workspace contracts (sections 15-19)
// ---------------------------------------------------------------------------

export interface EmployeeBriefFocusArea {
  area: string;
  why: string;
  action: string;
}

export interface EmployeeBrief {
  headline: string;
  summary: string;
  focus_areas: EmployeeBriefFocusArea[];
  recommended_action: string;
  confidence: number;
  insights: GeminiInsight[];
}

export interface SharpenedGoalMilestone {
  label: string;
  weeks: number;
  progress: number;
}

export interface SharpenedGoal {
  title: string;
  description: string;
  success_criteria: string[];
  kpis: string[];
  milestones: SharpenedGoalMilestone[];
  confidence: number;
}

export interface SkillPlanRecommendation {
  skill: string;
  current_proficiency: number; // 0..5
  target_proficiency: number; // 0..5
  gap: "none" | "small" | "medium" | "large";
  priority: "low" | "medium" | "high";
  rationale: string;
  courses: string[];
  projects: string[];
  career_paths: string[];
}

export interface SkillPlan {
  headline: string;
  overall_coverage_pct: number;
  recommendations: SkillPlanRecommendation[];
  confidence: number;
}

export interface PerformanceCoach {
  headline: string;
  strengths: string[];
  improvement_focus: string[];
  recommended_actions: string[];
  confidence: number;
}

export interface LearningRecommendationPlan {
  course_title: string;
  provider: string;
  duration_hours: number;
  reason: string;
  supports_goals: string[];
  priority: "low" | "medium" | "high";
}

export interface LearningPlan {
  headline: string;
  recommendations: LearningRecommendationPlan[];
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

export const onboardingProgressSchema: Schema = obj(
  "Adaptive onboarding progression assessment grounded in the tenant's tracked onboarding tasks, their statuses, and due dates.",
  {
    headline: str("One-line summary of the new hire's onboarding progression"),
    summary: str("2-3 sentence plain-language assessment of the progression"),
    status: strEnum("Overall progression status", ["on_track", "at_risk", "behind", "blocked"]),
    completed_pct: num("Percentage of all onboarding tasks completed (must match the evidence)"),
    days_since_start: integer("Days since the onboarding start date"),
    total_tasks: integer("Total onboarding tasks"),
    completed: integer("Tasks completed"),
    pending: integer("Tasks pending and not yet overdue"),
    overdue: integer("Pending tasks past their due date"),
    blocked: integer("Tasks explicitly blocked"),
    issue: str("The specific issue if not on track; otherwise 'None'"),
    recommendation: str("The single most important next step for HR or the manager"),
    prescribed_actions: arr("Concrete actions to get the new hire back on track", str("Action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  [
    "headline", "summary", "status", "completed_pct", "days_since_start",
    "total_tasks", "completed", "pending", "overdue", "blocked",
    "issue", "recommendation", "prescribed_actions", "confidence",
  ]
);

export const workforceSkillsSchema: Schema = obj(
  "Workforce skill-graph analysis: how skill coverage and headcount gaps map to business readiness and hiring or upskilling decisions.",
  {
    headline: str("One-line summary of the workforce skill graph outlook"),
    overall_assessment: str("2-3 sentence assessment of workforce skill coverage and its business impact"),
    top_finding: str("The single most important finding from the coverage data"),
    focus: arr("Per-skill focus notes", obj("Skill focus", {
      skill: str("Exact skill name from the provided data"),
      rationale: str("Why this skill's coverage matters"),
      recommended_action: str("Upskill, hire, or training specific to this skill"),
    }, ["skill", "rationale", "recommended_action"])),
    recommended_actions: arr("Org-wide recommended actions", str("Recommended action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_assessment", "top_finding", "focus", "recommended_actions", "confidence"]
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
    recommended_stage: strEnum("Recommended next pipeline stage", ["applied", "screening", "interview", "evaluation", "shortlisted", "hired", "rejected"]),
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

const interviewDimensionSchema: Schema = obj("Scored dimension", {
  rating: integer("Rating 1-5"),
  note: str("Short supporting note"),
}, ["rating", "note"]);

export const interviewInsightSchema: Schema = obj(
  "Advisory interview insight derived from per-question interview records.",
  {
    headline: str("One-line summary of the interview"),
    overall_score: integer("Overall fit score 0-100"),
    technical_competency: interviewDimensionSchema,
    communication: interviewDimensionSchema,
    problem_solving: interviewDimensionSchema,
    role_fit: interviewDimensionSchema,
    strengths: arr("Demonstrated strengths", str("Strength")),
    concerns: arr("Concerns raised by the responses", str("Concern")),
    evidence: arr("Evidence drawn directly from the recorded responses", str("Evidence")),
    confidence: num("Model confidence between 0 and 1"),
  },
  [
    "headline", "overall_score", "technical_competency", "communication",
    "problem_solving", "role_fit", "strengths", "concerns", "evidence", "confidence",
  ]
);

export const resumeAnalysisSchema: Schema = obj(
  "Structured candidate profile extracted from a resume. Extract ONLY job-relevant facts present in the text — never invent anything and never record or infer protected characteristics (gender, age, race, religion, marital/family status, disability, nationality).",
  {
    full_name: str("Candidate full name as printed on the resume"),
    email: str("Email address if present, otherwise empty"),
    phone: str("Phone number if present, otherwise empty"),
    current_title: str("Most recent job title or headline"),
    location: str("City/region if present, otherwise empty"),
    summary: str("1-3 sentence professional summary"),
    years_of_experience: integer("Total years of relevant professional experience (0 if unknown)"),
    education: str("Highest degree and institution, e.g. 'BSc Computer Science, TU Berlin, 2016'"),
    skills: arr("Skills and technologies from the resume", str("Skill")),
    projects: arr("Notable projects from the resume", str("Project")),
    certifications: arr("Certifications and licenses", str("Certification")),
    relevant_experience: str("Short paragraph or list of roles most relevant to the target role"),
  },
  [
    "full_name",
    "email",
    "phone",
    "current_title",
    "location",
    "summary",
    "years_of_experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "relevant_experience",
  ]
);

export const candidateMatchSchema: Schema = obj(
  "Candidate-job match assessment. Blend the deterministic scores with resume evidence. Use ONLY the provided data and never protected characteristics. Never recommend rejection — at worst mark 'needs_assessment'.",
  {
    candidate_name: str("Candidate full name"),
    job_title: str("Job title"),
    overall_score: integer("Overall match 0-100"),
    skill_match: integer("Skill dimension score 0-100"),
    experience_match: integer("Experience dimension score 0-100"),
    role_relevance: integer("Role relevance score 0-100"),
    education_match: integer("Education dimension score 0-100"),
    recommendation: strEnum("Overall AI recommendation", ["strong", "potential", "needs_assessment"]),
    summary: str("1-2 sentence plain-language summary of the fit"),
    why_matches: arr("Reasons the candidate matches this role", str("Reason")),
    missing_requirements: arr("Requirements the candidate does not clearly meet", str("Missing requirement")),
    relevant_evidence: arr("Concrete evidence from the resume supporting the score", str("Evidence")),
    interview_focus: arr("Specific areas to probe in the interview", str("Interview focus")),
    strengths: arr("Job-relevant strengths", str("Strength")),
    gaps: arr("Job-relevant gaps or risks", str("Gap")),
    next_step: str("Recommended next step for the recruiter (never a rejection)"),
    confidence: num("Model confidence between 0 and 1"),
  },
  [
    "candidate_name",
    "job_title",
    "overall_score",
    "skill_match",
    "experience_match",
    "role_relevance",
    "education_match",
    "recommendation",
    "summary",
    "why_matches",
    "missing_requirements",
    "relevant_evidence",
    "interview_focus",
    "strengths",
    "gaps",
    "next_step",
    "confidence",
  ]
);

export const candidateComparisonSchema: Schema = obj(
  "Short comparative read across candidates for the same role. Compare only on job-relevant skills, experience, and evidence — never protected characteristics. No candidate should be recommended for rejection.",
  {
    headline: str("One-line summary of how the candidates compare"),
    recommended_candidate: str("Name of the strongest fit, or 'Mixed — review both' if it is close"),
    candidate_notes: arr("Per-candidate one-liners", obj("Candidate note", {
      candidate_name: str("Candidate full name"),
      note: str("One-line observation about their fit"),
    }, ["candidate_name", "note"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "recommended_candidate", "candidate_notes", "confidence"]
);

export const policyAnswerSchema: Schema = obj(
  "Answer to a policy question grounded in the provided policy text.",
  {
    answer: str("Direct answer to the policy question"),
    explanation: str("Explain how the answer follows from the cited policy text"),
    confidence: num("Model confidence between 0 and 1"),
    citations: arr("Policy sections that support the answer", obj("Citation", {
      policy: str("Policy title"),
      section: str("Section title or excerpt"),
    }, ["policy", "section"])),
    disclaimer: str("Note that the answer is guidance, not legal advice"),
  },
  ["answer", "explanation", "confidence", "citations", "disclaimer"]
);

export const copilotAnswerSchema: Schema = obj(
  "Answer to an HR workforce question, grounded in the provided workforce data package. Answer plus supporting evidence, reasoning, recommended actions and relevant entities.",
  {
    answer: str("Direct, plain-language answer to the user's question"),
    evidence: arr("Concrete facts pulled verbatim from the provided data package", obj("Evidence fact", {
      label: str("Short label, e.g. 'Engineering avg risk score'"),
      value: str("The actual number or fact in plain text"),
      detail: str("Optional supporting detail, e.g. '10 employees'"),
    }, ["label", "value"])),
    reasoning: str("Explain how the evidence leads to the answer"),
    recommended_actions: arr("Concrete, prioritized recommended next steps", str("Recommended action")),
    relevant_departments: arr("Departments referenced by the answer", obj("Department", {
      name: str("Department name exactly as shown in the provided context"),
      note: str("Why this department is relevant"),
    }, ["name"])),
    relevant_employees: arr("Employees referenced by the answer", obj("Employee", {
      name: str("Employee full name exactly as shown in the provided context"),
      note: str("Why this employee is relevant, e.g. 'high-risk: 78'"),
    }, ["name"])),
    relevant_candidates: arr("Candidates referenced by the answer", obj("Candidate", {
      name: str("Candidate full name exactly as shown in the provided context"),
      note: str("Why this candidate is relevant, e.g. '92 match'"),
    }, ["name"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["answer", "evidence", "reasoning", "recommended_actions", "relevant_departments", "relevant_employees", "relevant_candidates", "confidence"]
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

export const employeeBriefSchema: Schema = obj(
  "Personal AI workforce briefing for an individual employee, grounded only in their own data.",
  {
    headline: str("One-line summary of this period's key focus"),
    summary: str("2-3 sentence plain-language brief on where the employee stands"),
    focus_areas: arr("Prioritized focus areas", obj("Focus area", {
      area: str("Focus area name"),
      why: str("Why this matters right now"),
      action: str("Concrete action to move forward"),
    }, ["area", "why", "action"])),
    recommended_action: str("The single most valuable next step"),
    insights: arr("Supporting insights (reuse the insight schema)", insightSchema),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "summary", "focus_areas", "recommended_action", "insights", "confidence"]
);

export const sharpenedGoalSchema: Schema = obj(
  "A vague goal rewritten into a measurable, achievable goal with milestones.",
  {
    title: str("Rewritten, specific goal title"),
    description: str("1-2 sentence description with a measurable outcome"),
    success_criteria: arr("Concrete criteria that prove success", str("Criterion")),
    kpis: arr("Measurable KPIs tied to the success criteria", str("KPI")),
    milestones: arr("Milestones", obj("Milestone", {
      label: str("Milestone label"),
      weeks: integer("Weeks from now"),
      progress: integer("Expected progress percentage at this milestone (0-100)"),
    }, ["label", "weeks", "progress"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["title", "description", "success_criteria", "kpis", "milestones", "confidence"]
);

export const skillPlanSchema: Schema = obj(
  "Personal skill development plan: gaps, priorities, courses and career paths.",
  {
    headline: str("One-line summary of the skills outlook"),
    overall_coverage_pct: num("Overall coverage of critical skills (0-100)"),
    recommendations: arr("Per-skill recommendations", obj("Recommendation", {
      skill: str("Skill name"),
      current_proficiency: num("Current proficiency (0-5)"),
      target_proficiency: num("Target proficiency (0-5)"),
      gap: strEnum("Gap size", ["none", "small", "medium", "large"]),
      priority: strEnum("Priority", ["low", "medium", "high"]),
      rationale: str("Why this skill matters for the employee"),
      courses: arr("Courses that build this skill", str("Course")),
      projects: arr("Practical projects to practice it", str("Project")),
      career_paths: arr("Career paths this skill unlocks", str("Career path")),
    }, ["skill", "current_proficiency", "target_proficiency", "gap", "priority", "rationale", "courses", "projects", "career_paths"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "overall_coverage_pct", "recommendations", "confidence"]
);

export const performanceCoachSchema: Schema = obj(
  "Personal performance coaching: what to keep doing and what to improve, grounded in reviews and feedback.",
  {
    headline: str("One-line summary of the performance outlook"),
    strengths: arr("Demonstrated strengths from reviews and feedback", str("Strength")),
    improvement_focus: arr("Direct answer to 'what should I improve?', one item per focus", str("Improvement focus")),
    recommended_actions: arr("Concrete actions tied to the improvement focus", str("Recommended action")),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "strengths", "improvement_focus", "recommended_actions", "confidence"]
);

export const learningPlanSchema: Schema = obj(
  "Personalized learning recommendations tied to goals and skill gaps.",
  {
    headline: str("One-line summary of the learning plan"),
    recommendations: arr("Recommended learning", obj("Recommendation", {
      course_title: str("Course or learning resource title"),
      provider: str("Provider or platform"),
      duration_hours: num("Estimated duration in hours"),
      reason: str("Why this is recommended for the employee"),
      supports_goals: arr("Goals or skills it supports", str("Goal or skill")),
      priority: strEnum("Priority", ["low", "medium", "high"]),
    }, ["course_title", "provider", "duration_hours", "reason", "supports_goals", "priority"])),
    confidence: num("Model confidence between 0 and 1"),
  },
  ["headline", "recommendations", "confidence"]
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

export function normalizeOnboardingProgress(raw: Record<string, unknown>): OnboardingProgressInsight {
  const statuses: OnboardingProgressStatus[] = ["on_track", "at_risk", "behind", "blocked"];
  const status = asString(raw.status).toLowerCase();
  return {
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    status: statuses.includes(status as OnboardingProgressStatus)
      ? (status as OnboardingProgressStatus)
      : "at_risk",
    completed_pct: Math.round(clamp(asNumber(raw.completed_pct), 0, 100) * 10) / 10,
    days_since_start: Math.round(asNumber(raw.days_since_start)),
    total_tasks: Math.round(asNumber(raw.total_tasks)),
    completed: Math.round(asNumber(raw.completed)),
    pending: Math.round(asNumber(raw.pending)),
    overdue: Math.round(asNumber(raw.overdue)),
    blocked: Math.round(asNumber(raw.blocked)),
    issue: asString(raw.issue),
    recommendation: asString(raw.recommendation),
    prescribed_actions: asStringArray(raw.prescribed_actions),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeWorkforceSkills(raw: Record<string, unknown>): WorkforceSkillsAnalysis {
  const focus = Array.isArray(raw.focus) ? raw.focus : [];
  return {
    headline: asString(raw.headline),
    overall_assessment: asString(raw.overall_assessment),
    top_finding: asString(raw.top_finding),
    focus: focus.map((f) => {
      const row = (f ?? {}) as Record<string, unknown>;
      return {
        skill: asString(row.skill),
        rationale: asString(row.rationale),
        recommended_action: asString(row.recommended_action),
      };
    }),
    recommended_actions: asStringArray(raw.recommended_actions),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeCandidateRanking(raw: Record<string, unknown>): CandidateRanking {
  const stages: CandidateRanking["recommended_stage"][] = ["applied", "screening", "interview", "evaluation", "shortlisted", "hired", "rejected"];
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

function normalizeDimensionScore(row: Record<string, unknown>): InterviewDimensionScore {
  return {
    rating: clamp(Math.round(asNumber(row.rating)), 1, 5),
    note: asString(row.note),
  };
}

export function normalizeInterviewInsight(raw: Record<string, unknown>): InterviewInsight {
  const dimension = (key: string): InterviewDimensionScore =>
    normalizeDimensionScore(((raw[key] ?? {}) as Record<string, unknown>));
  return {
    headline: asString(raw.headline),
    overall_score: clamp(Math.round(asNumber(raw.overall_score)), 0, 100),
    technical_competency: dimension("technical_competency"),
    communication: dimension("communication"),
    problem_solving: dimension("problem_solving"),
    role_fit: dimension("role_fit"),
    strengths: asStringArray(raw.strengths),
    concerns: asStringArray(raw.concerns),
    evidence: asStringArray(raw.evidence),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizePolicyAnswer(raw: Record<string, unknown>): PolicyAnswer {
  const citations = Array.isArray(raw.citations) ? raw.citations : [];
  return {
    answer: asString(raw.answer),
    explanation: asString(raw.explanation),
    confidence: asConfidence(raw.confidence),
    citations: citations.map((c) => {
      const row = (c ?? {}) as Record<string, unknown>;
      return { policy: asString(row.policy), section: asString(row.section) };
    }),
    disclaimer: asString(raw.disclaimer),
  };
}

function normalizeCopilotEntityRefs(raw: unknown): CopilotEntityRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const name = asString(row.name);
      if (!name) return null;
      const ref: CopilotEntityRef = { name };
      const note = asString(row.note);
      if (note) ref.note = note;
      const id = asString(row.id);
      if (id) ref.id = id;
      return ref;
    })
    .filter((ref): ref is CopilotEntityRef => ref !== null);
}

export function normalizeCopilotAnswer(raw: Record<string, unknown>): CopilotAnswer {
  const evidence = Array.isArray(raw.evidence) ? raw.evidence : [];
  return {
    answer: asString(raw.answer),
    evidence: evidence.map((e) => {
      const row = (e ?? {}) as Record<string, unknown>;
      const item: CopilotEvidence = { label: asString(row.label), value: asString(row.value) };
      const detail = asString(row.detail);
      if (detail) item.detail = detail;
      return item;
    }),
    reasoning: asString(raw.reasoning),
    recommended_actions: asStringArray(raw.recommended_actions),
    relevant_departments: normalizeCopilotEntityRefs(raw.relevant_departments),
    relevant_employees: normalizeCopilotEntityRefs(raw.relevant_employees),
    relevant_candidates: normalizeCopilotEntityRefs(raw.relevant_candidates),
    confidence: asConfidence(raw.confidence),
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

export function normalizeResumeAnalysis(raw: Record<string, unknown>): ResumeAnalysis {
  return {
    full_name: asString(raw.full_name),
    email: asString(raw.email).toLowerCase(),
    phone: asString(raw.phone),
    current_title: asString(raw.current_title),
    location: asString(raw.location),
    summary: asString(raw.summary),
    years_of_experience: Math.round(clamp(asNumber(raw.years_of_experience), 0, 60) * 10) / 10,
    education: asString(raw.education),
    skills: asStringArray(raw.skills),
    projects: asStringArray(raw.projects),
    certifications: asStringArray(raw.certifications),
    relevant_experience: asString(raw.relevant_experience),
  };
}

const CANDIDATE_RECS: CandidateRecommendation[] = ["strong", "potential", "needs_assessment"];

export function normalizeCandidateMatch(raw: Record<string, unknown>): CandidateMatch {
  const rec = asString(raw.recommendation).toLowerCase();
  return {
    candidate_name: asString(raw.candidate_name),
    job_title: asString(raw.job_title),
    overall_match: clamp(Math.round(asNumber(raw.overall_score)), 0, 100),
    skill_match: clamp(Math.round(asNumber(raw.skill_match)), 0, 100),
    experience_match: clamp(Math.round(asNumber(raw.experience_match)), 0, 100),
    role_relevance: clamp(Math.round(asNumber(raw.role_relevance)), 0, 100),
    education_match: clamp(Math.round(asNumber(raw.education_match)), 0, 100),
    recommendation: CANDIDATE_RECS.includes(rec as CandidateRecommendation)
      ? (rec as CandidateRecommendation)
      : "needs_assessment",
    summary: asString(raw.summary),
    why_matches: asStringArray(raw.why_matches),
    missing_requirements: asStringArray(raw.missing_requirements),
    relevant_evidence: asStringArray(raw.relevant_evidence),
    interview_focus: asStringArray(raw.interview_focus),
    strengths: asStringArray(raw.strengths),
    gaps: asStringArray(raw.gaps),
    next_step: asString(raw.next_step),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeCandidateComparison(raw: Record<string, unknown>): CandidateComparison {
  const notes = Array.isArray(raw.candidate_notes) ? raw.candidate_notes : [];
  return {
    headline: asString(raw.headline),
    recommended_candidate: asString(raw.recommended_candidate),
    candidate_notes: notes.map((n) => {
      const row = (n ?? {}) as Record<string, unknown>;
      return { candidate_name: asString(row.candidate_name), note: asString(row.note) };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Employee workspace normalizers (sections 15-19)
// ---------------------------------------------------------------------------

export function normalizeEmployeeBrief(raw: Record<string, unknown>): EmployeeBrief {
  const areas = Array.isArray(raw.focus_areas) ? raw.focus_areas : [];
  return {
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    focus_areas: areas.map((a) => {
      const row = (a ?? {}) as Record<string, unknown>;
      return {
        area: asString(row.area),
        why: asString(row.why),
        action: asString(row.action),
      };
    }),
    recommended_action: asString(raw.recommended_action),
    confidence: asConfidence(raw.confidence),
    insights: normalizeInsights(raw.insights),
  };
}

export function normalizeSharpenedGoal(raw: Record<string, unknown>): SharpenedGoal {
  const milestones = Array.isArray(raw.milestones) ? raw.milestones : [];
  return {
    title: asString(raw.title),
    description: asString(raw.description),
    success_criteria: asStringArray(raw.success_criteria),
    kpis: asStringArray(raw.kpis),
    milestones: milestones.map((m) => {
      const row = (m ?? {}) as Record<string, unknown>;
      return {
        label: asString(row.label),
        weeks: Math.round(asNumber(row.weeks)),
        progress: clamp(Math.round(asNumber(row.progress)), 0, 100),
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeSkillPlan(raw: Record<string, unknown>): SkillPlan {
  const recs = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  const gaps: SkillPlanRecommendation["gap"][] = ["none", "small", "medium", "large"];
  return {
    headline: asString(raw.headline),
    overall_coverage_pct: Math.round(clamp(asNumber(raw.overall_coverage_pct), 0, 100) * 10) / 10,
    recommendations: recs.map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const gap = asString(row.gap).toLowerCase();
      return {
        skill: asString(row.skill),
        current_proficiency: Math.round(clamp(asNumber(row.current_proficiency), 0, 5) * 10) / 10,
        target_proficiency: Math.round(clamp(asNumber(row.target_proficiency), 0, 5) * 10) / 10,
        gap: gaps.includes(gap as SkillPlanRecommendation["gap"])
          ? (gap as SkillPlanRecommendation["gap"])
          : "medium",
        priority: ["low", "medium", "high"].includes(asString(row.priority))
          ? (asString(row.priority) as "low" | "medium" | "high")
          : "medium",
        rationale: asString(row.rationale),
        courses: asStringArray(row.courses),
        projects: asStringArray(row.projects),
        career_paths: asStringArray(row.career_paths),
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizePerformanceCoach(raw: Record<string, unknown>): PerformanceCoach {
  return {
    headline: asString(raw.headline),
    strengths: asStringArray(raw.strengths),
    improvement_focus: asStringArray(raw.improvement_focus),
    recommended_actions: asStringArray(raw.recommended_actions),
    confidence: asConfidence(raw.confidence),
  };
}

export function normalizeLearningPlan(raw: Record<string, unknown>): LearningPlan {
  const recs = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  return {
    headline: asString(raw.headline),
    recommendations: recs.map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        course_title: asString(row.course_title),
        provider: asString(row.provider),
        duration_hours: Math.round(asNumber(row.duration_hours) * 10) / 10,
        reason: asString(row.reason),
        supports_goals: asStringArray(row.supports_goals),
        priority: ["low", "medium", "high"].includes(asString(row.priority))
          ? (asString(row.priority) as "low" | "medium" | "high")
          : "medium",
      };
    }),
    confidence: asConfidence(raw.confidence),
  };
}