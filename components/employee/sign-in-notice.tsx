import { LockKeyhole } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export function SignInNotice() {
  return (
    <EmptyState
      icon={LockKeyhole}
      title="Sign in to view your workspace"
      description="This page shows only your personal data. Sign in with your WorkforceIQ account to load your goals, skills, performance, and growth plan."
    />
  );
}