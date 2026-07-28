import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Controls are 8px-radius (`rounded-sm`), not pills. 36px default / 32px sm.
 * Transitions run at --duration-micro; the focus ring is the accent in both
 * themes so keyboard traversal is legible on near-black.
 *
 * `default` is the only variant that carries the accent glow, and only in
 * dark — glow is reserved for primary actions, live indicators and active
 * nav. Spread it further and it stops signalling anything.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-body font-medium whitespace-nowrap outline-none select-none transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-micro)] ease-[var(--ease-out)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 dark:shadow-[var(--accent-glow)] dark:hover:shadow-[0_0_28px_rgb(45_212_191_/_0.26)]",
        outline:
          "border-border-default bg-surface-2 hover:border-border-strong hover:bg-surface-3 aria-expanded:border-border-strong aria-expanded:bg-surface-3",
        secondary:
          "bg-surface-2 text-foreground hover:bg-surface-3 aria-expanded:bg-surface-3",
        ghost:
          "text-text-secondary hover:bg-surface-2 hover:text-foreground aria-expanded:bg-surface-2 aria-expanded:text-foreground",
        destructive:
          "bg-danger-muted text-danger hover:bg-danger/20 focus-visible:ring-danger/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[6px] px-2.5 text-small has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-small has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
