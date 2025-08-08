"use client"

import * as React from "react"
import { cn } from "../../utils/cn"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    // Determine colors based on ID
    const getColors = () => {
      // SPICE generation switches (green/red theme)
      if (id === "include-comments" || id === "include-subckt") {
        return {
          checked: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 border-green-400 dark:border-green-500 shadow-green-200 dark:shadow-green-900",
          unchecked: "bg-red-400 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 border-red-300 dark:border-red-400 shadow-red-200 dark:shadow-red-900"
        }
      }
      // Service status switches (red/green theme)
      if (id?.includes("service") || id?.includes("status")) {
        return {
          checked: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 border-green-400 dark:border-green-500 shadow-green-200 dark:shadow-green-900",
          unchecked: "bg-red-400 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 border-red-300 dark:border-red-400 shadow-red-200 dark:shadow-red-900"
        }
      }
      // Default switches (emerald/slate theme)
      return {
        checked: "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-emerald-400 dark:border-emerald-500 shadow-emerald-200 dark:shadow-emerald-900",
        unchecked: "bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-200 dark:border-slate-500 shadow-slate-200 dark:shadow-slate-900"
      }
    }

    const colors = getColors()

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          // Base switch styles
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Enhanced shadow and glow effects
          "shadow-lg hover:shadow-xl",
          // Color states with borders and highlights
          checked ? colors.checked : colors.unchecked,
          className
        )}
        {...props}
      >
        {/* Thumb */}
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ease-in-out",
            "hover:shadow-xl",
            // Enhanced thumb styling with colored glow
            checked ? "shadow-green-300 dark:shadow-green-700" : "shadow-red-300 dark:shadow-red-700",
            // Position based on checked state
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch } 