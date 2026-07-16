import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

const sizeMap = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
}

export function Logo({
  size = "md",
  href,
  iconOnly = false,
  className,
}: {
  size?: "sm" | "md" | "lg"
  href?: string
  iconOnly?: boolean
  className?: string
}) {
  const { icon, text } = sizeMap[size]

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <div className="relative shrink-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      {!iconOnly && (
        <span className={cn("font-display font-bold tracking-tight", text)}>
          <span className="text-foreground">Valid</span>
          <span className="text-foreground/70">ex</span>
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex" aria-label="Validex home">
        {content}
      </Link>
    )
  }

  return content
}
