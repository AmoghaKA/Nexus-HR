import type { Employee } from "@/types";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { RiskBadge } from "@/components/shared/risk-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function HighRiskEmployees({ employees }: { employees: Employee[] }) {
  const columns: DataTableColumn<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(row.name)}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
    },
    {
      key: "risk",
      header: "Risk",
      cell: (row) => (
        <RiskBadge level={row.risk} score={row.score} />
      ),
    },
  ];

  return <DataTable columns={columns} data={employees} />;
}