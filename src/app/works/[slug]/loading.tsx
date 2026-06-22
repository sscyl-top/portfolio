import { WorkDetailSkeleton } from "@/components/ui/Skeleton";

export default function WorkDetailLoading() {
  return (
    <main className="px-5 pb-24 pt-32 md:px-8">
      <WorkDetailSkeleton />
    </main>
  );
}
