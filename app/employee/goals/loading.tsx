import { PageHeaderSkeleton, ChartCardSkeleton } from "@/components/shared/loading-skeleton";

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <div className="h-4 w-32" />
        <ChartCardSkeleton rows={4} />
      </div>
    </div>
  );
}
