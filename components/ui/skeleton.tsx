import { cn } from "@/lib/utils";

// Pulse only when the user allows motion.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg bg-muted motion-safe:animate-pulse", className)} {...props} />;
}
