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
      <div className="relative shrink-0 overflow-hidden rounded-full">
        <Image 
          src="/apple-icon.png" 
          alt="Validex Logo" 
          width={icon} 
          height={icon}
          className="object-cover"
        />
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
