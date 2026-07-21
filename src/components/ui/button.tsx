"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-white shadow-sm [a]:hover:opacity-90",
        outline:
          "hover:text-foreground aria-expanded:text-foreground",
        secondary:
          "hover:opacity-80 aria-expanded:opacity-80",
        ghost:
          "hover:text-foreground aria-expanded:text-foreground",
        destructive:
          "focus-visible:ring-destructive/20",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[42px] gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs",
        sm: "h-8 gap-1 rounded-lg px-3 text-[0.8rem]",
        lg: "h-10 gap-2 px-5",
        icon: "size-[42px]",
        "icon-xs": "size-7 rounded-lg",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Dynamic styles per variant
const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    background: "var(--gradient-brand)",
    color: "white",
  },
  outline: {
    background: "transparent",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  },
  secondary: {
    background: "var(--surface-3)",
    color: "var(--text-primary)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
  },
  destructive: {
    background: "var(--danger-soft)",
    color: "var(--red-500)",
  },
  link: {
    background: "transparent",
    color: "var(--blue-600)",
  },
}

// Detects a caller-supplied background/text-color utility in className so it isn't
// silently overridden by the inline variantStyles below — inline `style` always wins
// over Tailwind classes in the cascade, so e.g. a caller's `bg-white` had no effect
// until now, no matter what the className said.
function hasBgClass(className: unknown): boolean {
  if (typeof className !== "string") return false
  return /(^|\s)bg-(?!clip-)\S/.test(className)
}
function hasTextColorClass(className: unknown): boolean {
  if (typeof className !== "string") return false
  return /(^|\s)text-(white|black|current|inherit|transparent|[a-z]+-\d{2,3})(\s|$)/.test(className)
}

function Button({
  className,
  variant = "default",
  size = "default",
  style,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const resolvedVariant = variantStyles[variant || "default"]
  const variantStyle = { ...resolvedVariant }
  if (hasBgClass(className)) delete variantStyle.background
  if (hasTextColorClass(className)) delete variantStyle.color

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      style={{
        ...variantStyle,
        ...style,
      }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
