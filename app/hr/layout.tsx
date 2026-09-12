import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { hrNav, hrUser } from "@/lib/navigation";

export const metadata: Metadata = {
  title: {
    default: "HR Workspace",
    template: "%s | WorkforceIQ",
  },
};

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      variant="hr"
      user={hrUser}
      groups={hrNav}
      switchTo={{ href: "/employee/dashboard", label: "Switch to employee view" }}
    >
      {children}
    </DashboardShell>
  );
}