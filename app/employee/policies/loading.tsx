import { PageHeaderSkeleton } from "@/components/shared/loading-skeleton";

export default function PoliciesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <div className="h-[60px] rounded-lg bg-muted animate-pulse" />
        <div className="h-[300px] rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}
