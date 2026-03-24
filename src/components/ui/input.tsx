import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full min-w-0 rounded-xl px-3 py-1.5 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-default)",
        color: "var(--text-primary)",
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = "var(--blue-600)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft), 0 0 16px rgba(37, 99, 235, 0.08)";
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.boxShadow = "none";
      }}
      {...props}
    />
  )
}

export { Input }
