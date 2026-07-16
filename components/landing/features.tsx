import {
  ShieldCheck,
  CheckCircle,
  BarChart3,
  Lock,
  Zap,
  FileCheck,
  type LucideIcon,
} from "lucide-react"
import { Reveal } from "@/components/motion/reveal"

type Feature = {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: FileCheck,
    title: "Structural validation",
    description:
      "Schema validation, type checking, and constraint enforcement ensure data integrity.",
  },
  {
    icon: CheckCircle,
    title: "Content analysis",
    description:
      "LLM-powered fact-checking, PII detection, bias and hallucination identification.",
  },
  {
    icon: BarChart3,
    title: "Anomaly detection",
    description:
      "Statistical outlier detection and consistency checks identify data anomalies.",
  },
  {
    icon: ShieldCheck,
    title: "Three-stage pipeline",
    description:
      "Comprehensive verification through structural, content, and anomaly stages.",
  },
  {
    icon: Zap,
    title: "Real-time verification",
    description:
      "Instant feedback with detailed reports and actionable recommendations.",
  },
  {
    icon: Lock,
    title: "Secure & private",
    description:
      "Enterprise-grade security with full data protection and privacy controls.",
  },
]

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Professional data verification
        </h2>
        <p className="mt-6 text-xl leading-relaxed text-muted-foreground text-pretty font-light">
          Three-stage validation pipeline for enterprise data quality assurance.
        </p>
      </Reveal>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }, i) => (
          <Reveal
            key={title}
            delay={0.08 * i}
            className="group p-8 hover:shadow-glow-sm transition-shadow duration-500"
          >
            <div className="bg-foreground mb-6 inline-flex size-14 items-center justify-center rounded-2xl text-background transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110">
              <Icon className="size-7" />
            </div>
            <h3 className="font-display text-xl font-semibold">{title}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground font-light">
              {description}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
