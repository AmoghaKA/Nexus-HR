"use client";

import { ArrowRight, UserRound, Users, type LucideIcon } from "lucide-react";

import {
  type WorkspaceRole,
} from "@/lib/auth/role";
import { Card } from "@/components/ui/card";

export type { WorkspaceRole } from "@/lib/auth/role";

const roles: {
  value: WorkspaceRole;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "hr",
    title: "HR team",
    description:
      "Workforce analytics, recruitment, attrition, and people operations.",
    icon: Users,
  },
  {
    value: "employee",
    title: "Employee",
    description:
      "Your goals, performance, skills, learning, and career path.",
    icon: UserRound,
  },
];

interface RoleSelectionProps {
  onSelect: (role: WorkspaceRole) => void;
  title?: string;
  description?: string;
}

export function RoleSelection({
  onSelect,
  title = "Who's signing in?",
  description = "Choose the workspace you'd like to access.",
}: RoleSelectionProps) {
  return (
    <Card className="border-none p-6 shadow-xl sm:border sm:shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onSelect(role.value)}
              className="group rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {role.title}
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {role.description}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}