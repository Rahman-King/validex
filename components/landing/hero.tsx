import Link from "next/link"
import { ArrowRight, ShieldCheck, CheckCircle, BarChart3, Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Simple gradient overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--foreground) 0%, transparent 50%)",
        }}
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-32 pb-24 text-center sm:pt-40 sm:pb-32">
        <div className="anim-slide-up mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 px-4 py-1.5 text-sm font-medium [--delay:0.05s]">
          <ShieldCheck className="size-4 text-foreground" aria-hidden="true" />
          <span className="text-foreground">Intelligent Data Verification</span>
        </div>

        <h1 id="hero-heading" className="anim-scale-in font-display text-6xl font-bold tracking-tight text-balance sm:text-7xl lg:text-9xl [--delay:0.15s] leading-[1.1]">
          Verify with
          <br />
          <span className="text-gradient-brand">confidence.</span>
        </h1>

        <p className="anim-slide-up mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground text-pretty [--delay:0.3s] font-light">
          Professional data quality assurance through structural validation, 
          content analysis, and anomaly detection.
        </p>

        {/* Feature pills */}
        <div className="anim-slide-up mt-10 flex flex-wrap items-center justify-center gap-4 [--delay:0.4s]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-foreground" />
            <span>Structural</span>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="size-4 text-foreground" />
            <span>Content</span>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="size-4 text-foreground" />
            <span>Anomaly</span>
          </div>
        </div>

        <div className="anim-slide-up mt-12 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row [--delay:0.5s]">
          <Button
            variant="hero"
            nativeButton={false}
            className="press group h-14 w-full rounded-full px-10 text-base transition-all hover:scale-105 hover:shadow-glow sm:w-auto"
            render={<Link href="/verify" />}
          >
            Start Verifying
            <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Button>
          <Button
            variant="glass"
            nativeButton={false}
            className="press h-14 w-full rounded-full px-10 text-base sm:w-auto hover:shadow-glow-sm transition-all duration-300 hover:scale-105"
            render={<Link href="/chat" />}
          >
            View Demo
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="anim-slide-up mt-16 flex items-center gap-8 text-sm text-muted-foreground [--delay:0.6s]">
          <div className="flex items-center gap-2">
            <div className="flex size-1.5 rounded-full bg-foreground" />
            <span>Enterprise ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex size-1.5 rounded-full bg-foreground" />
            <span>API available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex size-1.5 rounded-full bg-foreground" />
            <span>Secure by default</span>
          </div>
        </div>
      </div>
    </section>
  )
}
