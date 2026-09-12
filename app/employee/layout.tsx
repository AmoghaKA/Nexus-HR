import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { employeeNav, employeeUser, type DashboardUser } from "@/lib/navigation";
import { getSessionUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: {
    default: "Employee Workspace",
    template: "%s | WorkforceIQ",
  },
};

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  const user: DashboardUser = {
    name: session?.name ?? employeeUser.name,
    email: session?.email || employeeUser.email,
    role: session?.jobTitle ?? session?.roleLabel ?? employeeUser.role,
  };

  return (
    <DashboardShell variant="employee" user={user} groups={employeeNav}>
      {children}
    </DashboardShell>
  );
}