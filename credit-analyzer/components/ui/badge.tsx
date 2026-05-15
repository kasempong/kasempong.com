"use client"

import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "secondary"

const variants: Record<Variant, string> = {
  default: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  secondary: "bg-gray-100 text-gray-700",
}

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
