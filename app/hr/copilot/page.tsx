import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { CopilotWorkspace } from "@/components/hr/copilot/copilot-workspace";

export const metadata: Metadata = { title: "AI Copilot" };

export default function CopilotPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Copilot"
        description="Ask natural-language questions about your workforce — attrition, performance, skills, recruitment, and onboarding — and get evidence-backed answers, reasoning, and recommended actions."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <CopilotWorkspace />
    </div>
  );
}