import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { employeeNav, employeeUser } from "@/lib/navigation";

export const metadata: Metadata = {
  title: {
    default: "Employee Workspace",
    template: "%s | WorkforceIQ",
  },
};

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      variant="employee"
      user={employeeUser}
      groups={employeeNav}
      switchTo={{ href: "/hr/dashboard", label: "Switch to HR view" }}
    >
      {children}
    </DashboardShell>
  );
}