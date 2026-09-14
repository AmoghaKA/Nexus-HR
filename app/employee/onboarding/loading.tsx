import { PageHeaderSkeleton } from "@/components/shared/loading-skeleton";

export default function OnboardingLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="h-[100px] rounded-lg bg-muted animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
            </div>
            <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
