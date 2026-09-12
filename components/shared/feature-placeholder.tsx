import { CheckCircle2, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  highlights: string[];
}

export function FeaturePlaceholder({
  title,
  description,
  highlights,
}: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        badge={<Badge variant="secondary">Coming in Phase 2</Badge>}
      />
      <EmptyState
        icon={Flag}
        title={`${title} is planned for Phase 2`}
        description="This module will be backed by live Supabase data and Gemini-generated insights once those integrations are wired up."
        action={
          <ul className="mx-auto w-full max-w-md space-y-1.5 text-left">
            {highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {highlight}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}