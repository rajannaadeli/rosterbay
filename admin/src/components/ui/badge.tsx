import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * One badge, three semantic tones plus neutrals. Every tone is the same
 * recipe — `*-muted` fill, solid text in the same hue, 1px border of that hue
 * at 24% — so a pill's meaning is carried by hue alone and never by a
 * different treatment.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs border border-transparent px-2 py-0.5 text-micro font-semibold tracking-normal whitespace-nowrap transition-colors duration-[var(--duration-micro)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "border-border-subtle bg-surface-2 text-text-secondary [a]:hover:bg-surface-3",
        success: "border-success/24 bg-success-muted text-success",
        warning: "border-warning/24 bg-warning-muted text-warning",
        destructive: "border-danger/24 bg-danger-muted text-danger",
        outline:
          "border-border-default bg-transparent text-text-secondary [a]:hover:bg-surface-2 [a]:hover:text-foreground",
        ghost: "text-text-secondary hover:bg-surface-2 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
