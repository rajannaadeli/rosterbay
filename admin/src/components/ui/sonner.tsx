import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

import { useTheme } from "@/components/theme-provider"

// Reads the app's own ThemeProvider. The shadcn default wires this to
// next-themes, which this app doesn't drive — so toasts stayed light in dark
// mode until the source was switched.
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <WarningIcon className="size-4" />
        ),
        error: (
          <XCircleIcon className="size-4" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface-3)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-default)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // E3 material with an accent left-bar; the bar recolours per tone
          // via the semantic variants below.
          toast:
            "cn-toast e3 relative overflow-hidden !rounded-lg " +
            "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary",
          success: "before:!bg-success [&_[data-icon]]:text-success",
          warning: "before:!bg-warning [&_[data-icon]]:text-warning",
          error: "before:!bg-danger [&_[data-icon]]:text-danger",
          title: "text-body font-medium",
          description: "text-small text-text-secondary [&_time]:num",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
