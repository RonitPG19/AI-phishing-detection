import { PublicNavbar } from "@/components/PublicNavbar"
import { HeroSection } from "@/components/landing/HeroSection"
import { WorkflowCards } from "@/components/landing/WorkflowCards"
import { FeatureShowcase } from "@/components/landing/FeatureShowcase"

const footerColumns = [
  {
    title: "Core Product",
    links: ["Browser extension", "Review dashboard", "Scan history"],
  },
  {
    title: "Coverage",
    links: ["Gmail", "Outlook", "Sender and link checks"],
  },
  {
    title: "What You Get",
    links: ["Fast verdicts", "Clear findings", "Analyst-friendly reports"],
  },
]

export function LandingPage({ theme, onNavigate, onThemeToggle }) {
  const isDark = theme === "dark"

  return (
    <main className={`min-h-screen text-foreground selection:bg-primary/30 ${
      isDark
        ? "bg-background"
        : "bg-white"
    }`}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className={`absolute inset-0 ${isDark ? "bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] opacity-20 mix-blend-overlay" : "bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] opacity-[0.03] mix-blend-multiply"}`} />
        <div className={`absolute inset-x-0 top-0 h-[500px] ${
          isDark
            ? "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
            : ""
        }`} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="fixed top-4 inset-x-0 z-50 px-4 flex justify-center">
          <div className="relative w-full max-w-5xl flex items-center justify-center">
            <PublicNavbar onNavigate={onNavigate} theme={theme} />
          </div>
        </header>

        <div className="space-y-32 pb-32">
          <HeroSection onNavigate={onNavigate} theme={theme} />

          <FeatureShowcase theme={theme} />

          <WorkflowCards theme={theme} />
        </div>

        <footer className="mt-12 border-t border-border/40 pb-16 pt-12">
          <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">
            <div className="max-w-md">
              <div className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">T</div>
                Tribunal
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Tribunal helps people review suspicious emails inside Gmail and Outlook, surface risky links and sender anomalies, and keep the final verdict readable.
              </p>
              <p className="mt-5 text-sm font-medium text-foreground/80">
                Built for anyone who wants a cleaner review flow, not more noise.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground tracking-wide">{column.title}</h3>
                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={link} className="text-sm text-muted-foreground">
                      {link}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-border/40 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>Tribunal</p>
            <p>Inbox-first phishing review with clearer verdicts.</p>
          </div>
        </footer>
      </div>
    </main>
  )
}

