import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun } from "lucide-react"

import { PublicNavbar } from "@/components/PublicNavbar"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/landing/HeroSection"
import { WorkflowCards } from "@/components/landing/WorkflowCards"
import { FeatureShowcase } from "@/components/landing/FeatureShowcase"

const footerColumns = [
  {
    title: "Platform",
    links: ["Extension workflow", "Review dashboard", "Report history"],
  },
  {
    title: "Coverage",
    links: ["Gmail", "Outlook", "Link analysis"],
  },
  {
    title: "Use Cases",
    links: ["Phishing triage", "Security review", "Inbox auditing"],
  },
]

function GlowCard({ children, className }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Calculate angle
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) + 90
    cardRef.current.style.setProperty("--cursor-angle", `${angle}deg`)

    // Calculate proximity
    cardRef.current.style.setProperty("--edge-proximity", "100")
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (cardRef.current) cardRef.current.style.setProperty("--edge-proximity", "0")
      }}
      className={`border-glow-card ${className}`}
    >
      <div className="edge-light" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  )
}

export function LandingPage({ theme, onNavigate, onThemeToggle }) {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Dynamic Background Noise/Gradient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="fixed top-4 inset-x-0 z-50 px-4 flex justify-center">
          <div className="relative w-full max-w-5xl flex items-center justify-center">
            <PublicNavbar onNavigate={onNavigate} />
          </div>
        </header>

        <div className="space-y-32 pb-32">
          <HeroSection onNavigate={onNavigate} />

          <FeatureShowcase />

          <WorkflowCards />
        </div>

        <footer className="mt-12 border-t border-border/40 pb-12 pt-10">
          <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
            <div className="max-w-sm">
              <div className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">T</div>
                Tribunal
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                An inbox-first phishing review workflow for teams who want clearer judgment, cleaner reports, and less noise.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground tracking-wide">{column.title}</h3>
                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Large Branding Text with Border Glow Effect */}
          <div className="mt-20 pt-10 flex justify-center overflow-hidden">
            <GlowCard className="bg-transparent border-none !shadow-none !rounded-none">
              <div className="flex select-none cursor-default py-10 px-20">
                {"Tribunal".split("").map((letter, i) => (
                  <span
                    key={i}
                    className="text-[14vw] font-bold tracking-tighter text-white/5 opacity-80 leading-none transition-all duration-300 relative"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </GlowCard>
          </div>
        </footer>
      </div>
    </main>
  )
}

