import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        safe: "border-border bg-muted text-muted-foreground",
        low: "border-border bg-muted text-muted-foreground",
        medium: "border-border bg-background text-foreground",
        high: "border-transparent bg-foreground text-background",
        critical: "border-transparent bg-foreground text-background",
        neutral: "border-border bg-background text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
))

Badge.displayName = "Badge"

export { Badge, badgeVariants }
