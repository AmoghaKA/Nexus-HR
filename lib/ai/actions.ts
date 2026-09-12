"use server";

import { buildWorkforceBriefing, prepareBriefingPrompt } from "@/lib/ai/briefing";
import { buildEmployeeAnalysis, prepareEmployeePrompt } from "@/lib/ai/employee";
import { fetchEmployeeDetail } from "@/lib/hr/directory";

export interface GenerateBriefResult {
  ok: boolean;
  insightCount?: number;
  prompt?: string;
  generatedAt?: string;
  error?: string;
}

/**
 * Gathers current workforce signals from Supabase, packages them into the
 * summarized structured document, and prepares the Gemini handoff prompt.
 * The model call itself is the next step — this returns everything the model
 * needs so the flow can be completed without another round trip.
 */
export async function generateWorkforceBrief(): Promise<GenerateBriefResult> {
  try {
    const briefing = await buildWorkforceBriefing();
    return {
      ok: true,
      insightCount: briefing.insights.length,
      prompt: prepareBriefingPrompt(briefing.package),
      generatedAt: briefing.package.generatedAt,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export interface AnalyzeEmployeeResult {
  ok: boolean;
  package?: ReturnType<typeof buildEmployeeAnalysis>;
  prompt?: string;
  error?: string;
}

/**
 * Gathers an individual employee's records from Supabase into the summarized
 * structured package and prepares the Gemini handoff prompt for that employee.
 */
export async function analyzeEmployee(
  employeeId: string
): Promise<AnalyzeEmployeeResult> {
  try {
    const detail = await fetchEmployeeDetail(employeeId);
    if (!detail) return { ok: false, error: "Employee not found." };
    const pkg = buildEmployeeAnalysis(detail);
    return {
      ok: true,
      package: pkg,
      prompt: prepareEmployeePrompt(pkg),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}