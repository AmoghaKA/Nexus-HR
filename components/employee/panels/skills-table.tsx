import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";

export interface SkillRow {
  name: string;
  proficiency: string | null;
  years: number | null;
  verified: boolean;
  target?: number | null;
}

function proficiencyPct(proficiency: string | null, years: number | null): number {
  if (proficiency) {
    const numeric = Number(proficiency);
    if (Number.isFinite(numeric)) return Math.min(100, Math.max(0, Math.round(numeric * 20)));
    const level = proficiency.toLowerCase();
    if (level.includes("expert") || level.includes("advanced")) return 85;
    if (level.includes("intermediate")) return 60;
    if (level.includes("beginner") || level.includes("basic")) return 30;
  }
  if (years != null && years > 0) return Math.min(100, Math.round(years * 15));
  return 50;
}

export function SkillsTable({ skills }: { skills: SkillRow[] }) {
  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground">No skills on your profile yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {skills.map((skill) => {
        const value = proficiencyPct(skill.proficiency, skill.years);
        return (
          <div key={skill.name} className="rounded-lg border p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{skill.name}</p>
                {skill.verified && (
                  <Badge variant="success" className="px-2 py-0 text-[10px]">
                    verified
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {skill.proficiency ?? `${skill.years ?? 0}y`}
                {typeof skill.target === "number" ? ` → target ${skill.target}` : ""}
              </span>
            </div>
            <ProgressBar value={value} size="sm" tone="primary" />
          </div>
        );
      })}
    </div>
  );
}