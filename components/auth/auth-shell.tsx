import { BrainCircuit, LineChart, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { tagline } from "@/lib/navigation";

const highlights = [
  {
    icon: LineChart,
    title: "Workforce intelligence",
    description:
      "Predictive attrition, skill coverage, and performance trends in one place.",
  },
  {
    icon: BrainCircuit,
    title: "Gemini-powered briefings",
    description:
      "Every stage of the employee lifecycle narrated by an AI briefing.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise grade",
    description:
      "Role-based HR and employee workspaces with Supabase security.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at -10% -20%, rgba(79,70,229,0.55), transparent), radial-gradient(50rem 30rem at 110% 110%, rgba(139,92,246,0.4), transparent)",
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="[&_span]:text-white [&_div]:bg-white/10">
            <Logo showWordmark={false} />
            <span className="mt-3 block text-lg font-semibold tracking-tight">
              WorkforceIQ
            </span>
          </div>
        </div>
        <div className="relative space-y-8">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            {tagline}
          </h1>
          <ul className="space-y-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-indigo-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} WorkforceIQ. Hackathon build.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 lg:hidden">
          <Logo size="lg" />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}