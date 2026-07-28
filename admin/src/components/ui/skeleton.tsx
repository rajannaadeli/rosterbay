import { cn } from "@/lib/utils"

/**
 * Shimmer over surface-2 — a sweep, not a pulsing block. `.shimmer` drops the
 * sweep and keeps the surface under prefers-reduced-motion, so the loading
 * state stays legible without moving.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-sm", className)}
      {...props}
    />
  )
}

export { Skeleton }
