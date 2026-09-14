import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { ArrowRight, Bot, Building2, Mail, MapPin, Briefcase, ShieldCheck, CalendarDays, UserCog } from "lucide-react";

import { getEmployeeContext } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditForm } from "@/components/employee/profile-edit-form";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-card-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  let ctx;
  try {
    ctx = await getEmployeeContext();
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load your profile"
        message={
          error instanceof Error
            ? error.message
            : "Something went wrong loading your profile. Please try again."
        }
      />
    );
  }

  if (!ctx) {
    return (
      <ErrorState
        title="No profile found"
        message="We couldn't find an employee profile linked to your account. Please contact HR."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Profile"
        description="Your personal details, team and reporting line."
        badge={
          <Badge variant="secondary">
            <UserCog className="mr-1 h-3 w-3" aria-hidden="true" />
            {ctx.employeeCode}
          </Badge>
        }
      />

      <div className="sr-fade sr-fade-d1 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center p-6 text-center">
          <Avatar className="h-20 w-20 text-lg">
            <AvatarImage src={ctx.avatarUrl ?? undefined} alt={ctx.name} />
            <AvatarFallback>{initials(ctx.name)}</AvatarFallback>
          </Avatar>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">{ctx.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ctx.role}</p>
          <p className="text-xs text-muted-foreground">{ctx.department}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/employee/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              Employee Dashboard
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/hr/copilot"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Ask the AI Copilot
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Personal details</h3>
            <ProfileEditForm location={ctx.location} />
          </div>
          <div className="mt-4 space-y-5">
            <Row icon={Building2} label="Full name" value={ctx.name} />
            <Row icon={Mail} label="Email" value={ctx.email} />
            <Row icon={Building2} label="Department" value={ctx.department} />
            <Row icon={Briefcase} label="Role" value={ctx.role} />
            <Row icon={MapPin} label="Location" value={ctx.location} />
            <Row icon={UserCog} label="Manager" value={ctx.managerName} />
            <Row icon={ShieldCheck} label="Employment status" value={ctx.status} />
            <Row icon={CalendarDays} label="Date joined" value={ctx.joined ? new Date(ctx.joined).toLocaleDateString() : null} />
          </div>
        </Card>
      </div>
    </div>
  );
}
