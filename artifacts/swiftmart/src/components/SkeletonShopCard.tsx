import { Skeleton } from "@/components/ui/skeleton";

/** Horizontal snap card — matches Popular Shops on Home */
export function SkeletonShopCardHorizontal() {
  return (
    <div className="snap-start shrink-0 w-[calc(75vw)] max-w-[260px] min-w-[200px]">
      <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full">
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Grid card — matches Shops page layout */
export function SkeletonShopCardGrid() {
  return (
    <div className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center">
      <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
