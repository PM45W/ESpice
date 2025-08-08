import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'info'
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const icons = {
      default: Info,
      destructive: XCircle,
      success: CheckCircle,
      info: Info,
    }
    
    const Icon = icons[variant]
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-gray-900 dark:text-white",
          {
            'border-red-500/50 text-red-700 dark:text-red-400 [&>svg]:text-red-600': variant === 'destructive',
            'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600': variant === 'success',
            'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-600': variant === 'info',
          },
          className
        )}
        {...props}
      >
        <Icon className="h-4 w-4" />
        <div>{children}</div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription } 