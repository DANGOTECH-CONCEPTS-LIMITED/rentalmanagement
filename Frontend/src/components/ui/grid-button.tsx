import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface GridButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default" | "lg" | "icon";
  asChild?: boolean;
}

const sizeClasses: Record<NonNullable<GridButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-xs rounded-lg gap-1.5",
  default: "h-10 px-4 py-2 text-sm rounded-xl gap-2",
  lg: "h-11 px-8 text-sm rounded-xl gap-2",
  icon: "h-10 w-10 rounded-xl",
};

const GridButton = React.forwardRef<HTMLButtonElement, GridButtonProps>(
  ({ className, size = "default", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "btn-grid inline-flex items-center justify-center whitespace-nowrap font-semibold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 focus-visible:ring-offset-2",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
GridButton.displayName = "GridButton";

export { GridButton };
