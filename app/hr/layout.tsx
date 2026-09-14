import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { hrNav, hrUser, type DashboardUser } from "@/lib/navigation";
import { getSessionUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: {
    default: "HR Workspace",
    template: "%s | Nexus HR",
  },
};

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  const user: DashboardUser = {
    name: session?.name ?? hrUser.name,
    email: session?.email || hrUser.email,
    role: session?.jobTitle ?? session?.roleLabel ?? hrUser.role,
  };

  return (
    <DashboardShell variant="hr" user={user} groups={hrNav}>
      {children}
    </DashboardShell>
  );
}