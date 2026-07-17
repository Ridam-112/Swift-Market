import { Skeleton } from "@/components/ui/skeleton";

/** Matches ProductCard's exact visual structure */
export function SkeletonProductCard() {
  return (
    <div className="bg-card rounded-2xl p-2.5 flex flex-col gap-2 neu-card relative overflow-hidden w-full min-w-0">
      {/* image */}
      <Skeleton className="aspect-square w-full rounded-xl" />
      {/* unit badge */}
      <Skeleton className="h-4 w-12 rounded-md" />
      {/* product name */}
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      {/* shop name */}
      <Skeleton className="h-3 w-1/2 rounded mt-0.5" />
      {/* price + button */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <Skeleton className="h-5 w-14 rounded" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}
