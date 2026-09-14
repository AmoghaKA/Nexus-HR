"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Brain,
  Compass,
  Flag,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Network,
  Rocket,
  ScrollText,
  Target,
  TrendingDown,
  UserRound,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  type DashboardUser,
  type NavGroup,
  tagline,
  workspaceMeta,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  recruitment: UserRoundCog,
  employees: Users,
  attrition: TrendingDown,
  workforce: Network,
  performance: Gauge,
  skills: Target,
  onboarding: Rocket,
  policies: ScrollText,
  copilot: Brain,
  reports: BarChart3,
  profile: UserRound,
  goals: Flag,
  "my-performance": LineChart,
  "my-skills": Target,
  learning: GraduationCap,
  career: Compass,
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group, idx) => (
        <div key={idx} className="space-y-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

interface DashboardShellProps {
  variant: "hr" | "employee";
  user: DashboardUser;
  groups: NavGroup[];
  switchTo?: { href: string; label: string };
  children: React.ReactNode;
}

export function DashboardShell({
  variant,
  user,
  groups,
  switchTo,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const meta = workspaceMeta[variant];

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center justify-between border-b px-5">
        <Link href={`/${variant === "hr" ? "hr" : "employee"}/dashboard`}>
          <Logo size="sm" />
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
              <Badge variant="secondary" className="hidden cursor-default sm:inline-flex">
              {variant === "hr" ? "HR" : "Employee"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="right">{meta.title}</TooltipContent>
        </Tooltip>
      </div>
      <NavLinks groups={groups} pathname={pathname} />
      <div className="border-t px-5 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{tagline}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-20 items-center justify-between border-b px-4">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <NavLinks
          groups={groups}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex min-h-svh flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{meta.title}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {meta.description}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-md p-1 pr-1 transition-colors hover:bg-accent sm:pr-2"
                  aria-label="Open user menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt="" />
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-medium leading-tight">
                      {user.name}
                    </span>
                    <span className="block text-xs leading-tight text-muted-foreground">
                      {user.role}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block">{user.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {switchTo && (
                  <DropdownMenuItem asChild>
                    <Link href={switchTo.href}>
                      <UserRound className="h-4 w-4" />
                      {switchTo.label}
                    </Link>
                  </DropdownMenuItem>
                )}
                {variant === "employee" && (
                  <DropdownMenuItem asChild>
                    <Link href="/employee/profile">
                      <UserRound className="h-4 w-4" />
                      My profile
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Separator className="lg:hidden" />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}