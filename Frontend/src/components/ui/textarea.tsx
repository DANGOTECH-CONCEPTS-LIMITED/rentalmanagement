import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] shadow-sm transition-all duration-150",
          "placeholder:text-[#94A3B8]",
          "focus-visible:outline-none focus-visible:border-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/10",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
