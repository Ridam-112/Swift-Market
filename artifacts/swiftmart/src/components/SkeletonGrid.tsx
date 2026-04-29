import { Skeleton } from "./ui/skeleton";

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl p-3 flex flex-col gap-3 neu-card">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-full" />
          <div className="flex justify-between mt-auto pt-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
