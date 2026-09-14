import { cn } from "@/lib/utils";

interface LogoProps {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { mark: "h-7 w-7", ring: "h-3.5 w-3.5", wordmark: "text-base" },
  md: { mark: "h-8 w-8", ring: "h-4 w-4", wordmark: "text-lg" },
  lg: { mark: "h-11 w-11", ring: "h-5 w-5", wordmark: "text-2xl" },
};

export function Logo({
  showWordmark = true,
  size = "md",
  className,
}: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          s.mark,
          "relative grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary via-cyan-700 to-slate-900 text-primary-foreground shadow-lg shadow-primary/20"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[58%] w-[58%]"
          aria-hidden="true"
        >
          <path
            d="M4 16.5 9 11l3 3 8-8"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 6h3v3"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className={cn(
            s.ring,
            "pointer-events-none absolute -right-1 -top-1 rounded-full border-2 border-background bg-warning"
          )}
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              s.wordmark,
              "font-semibold tracking-tight text-foreground"
            )}
          >
            Nexus<span className="text-primary">HR</span>
          </span>
          <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
            People intelligence
          </span>
        </div>
      )}
    </div>
  );
}