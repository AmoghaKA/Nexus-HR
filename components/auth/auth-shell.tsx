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
    title: "Qwen-powered briefings",
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
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(52rem 32rem at -10% -15%, rgba(20,184,166,0.42), transparent), radial-gradient(42rem 28rem at 110% 110%, rgba(245,158,11,0.24), transparent)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <div className="[&_span]:text-white [&_div]:bg-white/10">
            <Logo showWordmark={false} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Nexus HR</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">People intelligence</p>
          </div>
        </div>
        <div className="relative max-w-lg space-y-10">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/80">A calmer way to work with people data</p>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.08] tracking-[-0.04em]">
            {tagline}
            </h1>
          </div>
          <ul className="space-y-5">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-teal-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-300">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Nexus HR. 
        </p>
      </aside>

      <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="mb-10 lg:hidden">
          <Logo size="lg" />
        </div>
        <div className="w-full max-w-[430px]">{children}</div>
      </main>
    </div>
  );
}