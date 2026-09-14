export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface DashboardUser {
  name: string;
  email: string;
  role: string;
}

export const hrNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/hr/dashboard",
        icon: "dashboard",
      },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Recruitment", href: "/hr/recruitment", icon: "recruitment" },
      { title: "Employees", href: "/hr/employees", icon: "employees" },
      { title: "Attrition", href: "/hr/attrition", icon: "attrition" },
      { title: "Workforce", href: "/hr/workforce", icon: "workforce" },
    ],
  },
  {
    label: "Development",
    items: [
      { title: "Performance", href: "/hr/performance", icon: "performance" },
      { title: "Skills", href: "/hr/skills", icon: "skills" },
      { title: "Onboarding", href: "/hr/onboarding", icon: "onboarding" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Policies", href: "/hr/policies", icon: "policies" },
      {
        title: "AI Copilot",
        href: "/hr/copilot",
        icon: "copilot",
        badge: "New",
      },
      { title: "Reports", href: "/hr/reports", icon: "reports" },
    ],
  },
];

export const employeeNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/employee/dashboard",
        icon: "dashboard",
      },
    ],
  },
  {
    label: "Me",
    items: [
      { title: "My Profile", href: "/employee/profile", icon: "profile" },
      { title: "My Goals", href: "/employee/goals", icon: "goals" },
      {
        title: "My Performance",
        href: "/employee/performance",
        icon: "my-performance",
      },
      { title: "My Skills", href: "/employee/skills", icon: "my-skills" },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Learning", href: "/employee/learning", icon: "learning" },
      { title: "Onboarding", href: "/employee/onboarding", icon: "onboarding" },
      { title: "Career Path", href: "/employee/career", icon: "career" },
    ],
  },
  {
    label: "Company",
    items: [
      { title: "Policies", href: "/employee/policies", icon: "policies" },
    ],
  },
];

export const hrUser: DashboardUser = {
  name: "Alex Morgan",
  email: "alex.morgan@nexushr.io",
  role: "People Operations",
};

export const employeeUser: DashboardUser = {
  name: "Sam Rivera",
  email: "sam.rivera@nexushr.io",
  role: "Senior Frontend Engineer",
};

export const tagline =
  "AI-powered intelligence for every stage of the employee lifecycle.";

export const workspaceMeta: Record<
  "hr" | "employee",
  { title: string; description: string }
> = {
  hr: {
    title: "HR Workspace",
    description:
      "Workforce planning, people analytics, and lifecycle coverage for the entire organization.",
  },
  employee: {
    title: "Employee Workspace",
    description:
      "Your goals, performance, skills, and growth — powered by personal AI briefings.",
  },
};