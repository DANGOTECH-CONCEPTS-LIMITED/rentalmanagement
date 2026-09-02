import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "dark";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const variantClasses =
      variant === "dark"
        ? "bg-white/10 border-white/20 text-white placeholder:text-blue-200/50 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/30"
        : "bg-white/95 border-input/90 text-foreground placeholder:text-muted-foreground/90 focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10";

    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border px-4 py-3 text-sm shadow-sm ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
