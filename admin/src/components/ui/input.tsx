import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-sm border border-border-default bg-surface-2 px-3 py-1 text-body transition-[border-color,box-shadow] duration-[var(--duration-micro)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-foreground placeholder:text-text-tertiary hover:border-border-strong focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
