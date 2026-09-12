import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <FeaturePlaceholder
      title="My Profile"
      description="Your personal details, employment history, and preferences."
      highlights={[
        "Contact details, role, team, and reporting line",
        "Employment and compensation history",
        "Skill tags and certifications",
        "Preferences relevant to HR workflows",
      ]}
    />
  );
}