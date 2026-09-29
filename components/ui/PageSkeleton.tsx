import { PageTitle } from "./kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

function Placeholder({ className }: { className: string }) {
  return <Skeleton className={className} />;
}

function Rows({ metrics = false }: { metrics?: boolean }) {
  return (
    <Card className="divide-y divide-border/70 overflow-hidden">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2 px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <Placeholder className="h-5 w-40 max-w-[65%]" />
            <Placeholder className="h-5 w-16" />
          </div>
          <Placeholder className={metrics ? "h-1.5 w-full" : "h-4 w-56 max-w-[80%]"} />
          {metrics && <Placeholder className="h-3 w-48 max-w-full" />}
        </div>
      ))}
    </Card>
  );
}

function FormPlaceholder() {
  return (
    <div className="space-y-4">
      <Placeholder className="h-5 w-32" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Placeholder className="h-11 w-full" />
        <Placeholder className="h-11 w-full" />
      </div>
      <Placeholder className="h-24 w-full" />
      <Placeholder className="h-10 w-28" />
    </div>
  );
}

export function PageSkeleton({
  title,
  sub,
  variant = "list",
}: {
  title: string;
  sub?: string;
  variant?: "list" | "leads" | "dashboard" | "compose" | "insights" | "detail";
}) {
  return (
    <div className="max-w-3xl">
      <p role="status" className="sr-only">Loading {title.toLowerCase()}…</p>
      <div aria-hidden="true">
        {variant === "detail" ? (
          <div className="mb-8 space-y-3">
            <Placeholder className="h-4 w-20" />
            <Placeholder className="h-10 w-64 max-w-full" />
            <Placeholder className="h-5 w-48" />
          </div>
        ) : <PageTitle title={title} sub={sub} />}
        {variant === "leads" && (
          <div className="mb-5 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => <Placeholder key={i} className="h-8 w-16 !rounded-full" />)}
          </div>
        )}
        {variant === "compose" ? <FormPlaceholder /> : <Rows metrics={variant === "insights"} />}
        <div className="mt-10">
          {variant === "dashboard" ? <Placeholder className="h-6 w-80 max-w-full" />
            : variant === "insights" || variant === "compose" ? <Rows metrics={variant === "insights"} />
            : <FormPlaceholder />}
        </div>
      </div>
    </div>
  );
}
