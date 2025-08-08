import * as React from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "../../utils/cn"

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("w-full", className)}
      {...props}
    />
  )
)
Tree.displayName = "Tree"

interface TreeItemProps extends React.HTMLAttributes<HTMLLIElement> {
  defaultExpanded?: boolean
}

const TreeItem = React.forwardRef<HTMLLIElement, TreeItemProps>(
  ({ className, defaultExpanded = false, children, ...props }, ref) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded)
    const hasChildren = React.Children.count(children) > 0

    return (
      <li
        ref={ref}
        className={cn("list-none", className)}
        {...props}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        <div className={cn(hasChildren && "ml-4", !expanded && hasChildren && "hidden")}>
          {children}
        </div>
      </li>
    )
  }
)
TreeItem.displayName = "TreeItem"

interface TreeItemContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const TreeItemContent = React.forwardRef<HTMLDivElement, TreeItemContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors", className)}
      {...props}
    />
  )
)
TreeItemContent.displayName = "TreeItemContent"

interface TreeItemTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const TreeItemTrigger = React.forwardRef<HTMLButtonElement, TreeItemTriggerProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn("flex items-center gap-2 p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors", className)}
      {...props}
    />
  )
)
TreeItemTrigger.displayName = "TreeItemTrigger"

export {
  Tree,
  TreeItem,
  TreeItemContent,
  TreeItemTrigger,
} 