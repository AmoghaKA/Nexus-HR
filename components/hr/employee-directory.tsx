"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import type { DirectoryEmployee } from "@/lib/hr/directory";
import { SearchBar } from "@/components/shared/search-bar";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { RiskBadge } from "@/components/shared/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusTone(status: string) {
  switch (status) {
    case "probation":
      return { label: "Probation", variant: "warning" as const };
    case "on_leave":
      return { label: "On leave", variant: "secondary" as const };
    case "terminated":
    case "resigned":
      return { label: "Former", variant: "outline" as const };
    default:
      return { label: "Active", variant: "success" as const };
  }
}

interface EmployeeDirectoryProps {
  employees: DirectoryEmployee[];
}

export function EmployeeDirectory({ employees }: EmployeeDirectoryProps) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [role, setRole] = useState("all");
  const [location, setLocation] = useState("all");
  const [performance, setPerformance] = useState("all");
  const [risk, setRisk] = useState("all");
  const [skill, setSkill] = useState("all");

  const departments = unique(employees.map((e) => e.department));
  const roles = unique(employees.map((e) => e.role));
  const locations = unique(employees.map((e) => e.location));
  const skills = unique(employees.flatMap((e) => e.skills)).slice(0, 60);

  const filtered = employees.filter((e) => {
    const q = query.trim().toLowerCase();
    if (q && !`${e.name} ${e.email} ${e.employeeCode}`.toLowerCase().includes(q)) return false;
    if (department !== "all" && e.department !== department) return false;
    if (role !== "all" && e.role !== role) return false;
    if (location !== "all" && e.location !== location) return false;
    if (performance !== "all") {
      const score = e.performance;
      if (score == null) return false;
      if (performance === "4plus" && score < 4) return false;
      if (performance === "3plus" && score < 3) return false;
      if (performance === "below3" && score >= 3) return false;
    }
    if (risk !== "all" && e.risk !== risk) return false;
    if (skill !== "all" && !e.skills.includes(skill)) return false;
    return true;
  });

  const clearFilters = () => {
    setQuery("");
    setDepartment("all");
    setRole("all");
    setLocation("all");
    setPerformance("all");
    setRisk("all");
    setSkill("all");
  };

  const columns: DataTableColumn<DirectoryEmployee>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (row) => (
        <Link
          href={`/hr/employees/${row.id}`}
          className="group flex items-center gap-2.5"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(row.name)}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium group-hover:text-primary">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
    },
    {
      key: "role",
      header: "Role",
      className: "text-muted-foreground",
    },
    {
      key: "location",
      header: "Location",
      className: "text-muted-foreground",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const tone = statusTone(row.status);
        return <Badge variant={tone.variant}>{tone.label}</Badge>;
      },
    },
    {
      key: "performance",
      header: "Performance",
      className: "text-muted-foreground",
      cell: (row) => (row.performance != null ? `${row.performance} / 5` : "—"),
    },
    {
      key: "risk",
      header: "Risk",
      cell: (row) => <RiskBadge level={row.risk} score={row.riskScore ?? undefined} />,
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        label="Filter"
        right={
          filtered.length !== employees.length ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          ) : undefined
        }
      >
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, or code…"
          className="w-56"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by department"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by location"
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={performance}
          onChange={(e) => setPerformance(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by performance"
        >
          <option value="all">Any performance</option>
          <option value="4plus">Rating ≥ 4</option>
          <option value="3plus">Rating ≥ 3</option>
          <option value="below3">Rating &lt; 3</option>
        </select>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by risk"
        >
          <option value="all">Any risk</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="h-9 rounded-md border bg-card px-2.5 text-sm"
          aria-label="Filter by skill"
        >
          <option value="all">Any skill</option>
          {skills.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FilterBar>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {employees.length} employees
      </p>

      <DataTable
        columns={columns}
        data={filtered}
        emptyTitle="No employees match"
        emptyDescription="Try adjusting the search or clearing some filters."
        className="overflow-hidden"
      />
    </div>
  );
}