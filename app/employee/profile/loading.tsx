import { PageHeaderSkeleton, ProfileSkeleton } from "@/components/shared/loading-skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <ProfileSkeleton />
    </div>
  );
}
