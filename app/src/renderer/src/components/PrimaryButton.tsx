import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '../lib/utils'

export interface PrimaryButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
    
    const variantClasses = {
      primary: "bg-accent text-white hover:bg-accent-hover",
      secondary: "bg-secondary text-foreground hover:bg-elevated border border-border",
      danger: "bg-danger text-white hover:bg-danger/90",
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
PrimaryButton.displayName = 'PrimaryButton'
