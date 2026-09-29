import { cn } from "@/lib/utils";

// Uses transform, not width, so the fill animates on the compositor.
export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-primary motion-safe:transition-transform motion-safe:duration-300"
        style={{ transform: `scaleX(${v / 100})` }}
      />
    </div>
  );
}
