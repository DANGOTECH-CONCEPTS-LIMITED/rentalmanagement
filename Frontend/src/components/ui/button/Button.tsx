import React from "react";
import { cn } from "../../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl border-0",
      secondary:
        "bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm",
      outline:
        "border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
      ghost: "text-white hover:bg-white/10 hover:text-white",
      link: "text-blue-300 hover:text-blue-200 underline-offset-4 hover:underline",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-12 px-4 py-3",
      lg: "h-12 px-8",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "btn",
          variants[variant],
          sizes[size],
          isLoading && "opacity-70 pointer-events-none",
          className,
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
