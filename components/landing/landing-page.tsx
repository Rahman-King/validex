"use client"

import * as React from "react"
import { SiteHeader } from "@/components/landing/site-header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { CtaBanner } from "@/components/landing/cta-banner"
import { SiteFooter } from "@/components/landing/site-footer"

export function LandingPage() {
  return (
    <div className="bg-mesh flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <CtaBanner />
      </main>
      <SiteFooter />
    </div>
  )
}
