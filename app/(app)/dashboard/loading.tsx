import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// Matches the real dashboard layout so nothing jumps when data arrives.
export default function Loading() {
  return (
    <div className="max-w-6xl space-y-8">
      <p role="status" className="sr-only">Loading dashboard…</p>
      <div aria-hidden="true" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-11 w-72 max-w-full" />
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-36 !rounded-xl" />
            <Skeleton className="h-11 w-28 !rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card
              key={i}
              className={`space-y-3 p-4 sm:p-5 ${i === 0 || i === 5 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <Skeleton className="h-4 w-32 max-w-[70%]" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Card className="divide-y divide-border/70 overflow-hidden">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                    <Skeleton className="size-9 shrink-0 !rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48 max-w-[80%]" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
