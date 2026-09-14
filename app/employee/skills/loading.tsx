import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";

export default function SkillsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <TableSkeleton rows={5} />
      </section>
      <section className="space-y-4">
        <div className="h-4 w-40" />
        <div className="h-[200px] rounded-lg bg-muted animate-pulse" />
      </section>
    </div>
  );
}
