import { PageHeaderSkeleton, ChartCardSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton rows={2} />
        </div>
      </section>
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCardSkeleton rows={3} />
          <ChartCardSkeleton rows={2} />
        </div>
      </section>
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCardSkeleton rows={3} />
          <ChartCardSkeleton rows={2} />
          <ChartCardSkeleton rows={1} />
        </div>
      </section>
    </div>
  );
}
