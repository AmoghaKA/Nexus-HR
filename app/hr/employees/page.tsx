import type { Metadata } from "next";

import { fetchEmployeeDirectory } from "@/lib/hr/directory";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { EmployeeDirectory } from "@/components/hr/employee-directory";

export const metadata: Metadata = { title: "Employees" };

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  let employees;
  try {
    employees = await fetchEmployeeDirectory();
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load the employee directory"
        message={
          error instanceof Error
            ? error.message
            : "We couldn't reach Supabase to load your people. Please try again."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Search your entire workforce, filter by team, role, location, performance, risk, or skills."
        badge={<Badge variant="secondary">{employees.length} people</Badge>}
      />
      <EmployeeDirectory employees={employees} />
    </div>
  );
}