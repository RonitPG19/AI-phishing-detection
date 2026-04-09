import { ArrowRight, Moon, PanelsTopLeft, Sun } from "lucide-react"

import { PublicNavbar } from "@/components/PublicNavbar"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"

const workflowCards = [
  {
    title: "Scan in the inbox",
    copy: "Open a live Gmail or Outlook thread, run the extension, and capture the exact message someone is about to act on.",
  },
  {
    title: "Review what matters",
    copy: "Turn messy signals into a short verdict with link anomalies, sender mismatches, and body-level findings lined up clearly.",
  },
  {
    title: "Track the report",
    copy: "Push the verdict into the dashboard so triage, follow-up, and accountability stay in one review flow.",
  },
]

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

export function LandingPage({ theme, onNavigate, onThemeToggle }) {
  const handleNavigate = (event, route) => {
    if (!onNavigate) return

    event.preventDefault()
    onNavigate(route)
  }

  return (
    <main className="min-h-screen bg-white text-foreground dark:bg-background">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)]" />
          <div className="absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_bottom,rgba(0,0,0,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute left-[12%] top-[18%] h-72 w-72 rounded-full bg-black/[0.05] blur-[140px] dark:bg-white/[0.06]" />
          <div className="absolute right-[8%] top-[28%] h-96 w-96 rounded-full bg-black/[0.04] blur-[180px] dark:bg-white/[0.04]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative pt-5">
            <PublicNavbar onNavigate={onNavigate} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="rounded-full text-foreground hover:bg-accent/40 hover:text-foreground"
                onClick={onThemeToggle}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <section className="grid gap-12 pb-14 pt-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center lg:gap-10 lg:pt-20">
            <div className="space-y-8">
              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-6xl xl:text-[5.35rem]">
                  Review the suspicious parts, not just the score.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Tribunal pairs an inbox-side extension with a sharper review dashboard so phishing analysis feels like a product workflow instead of a pile of warnings.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 gap-2 rounded-2xl px-6" asChild>
                  <a href={getPathForRoute("login")} onClick={(event) => handleNavigate(event, "login")}>
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="h-12 rounded-2xl px-6" asChild>
                  <a href={getPathForRoute("signup")} onClick={(event) => handleNavigate(event, "signup")}>
                    Create Account
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-background/55 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div className="overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/85">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <PanelsTopLeft className="h-4 w-4 text-muted-foreground" />
                    Review workspace
                  </div>
                </div>

                <div className="grid min-h-[34rem] gap-0 md:grid-cols-[0.92fr_1.08fr]">
                  <div className="border-b border-border/60 p-4 md:border-b-0 md:border-r">
                    <div className="h-full rounded-[1.4rem] border border-dashed border-border/70 bg-background/30" />
                  </div>

                  <div className="p-4">
                    <div className="grid h-full gap-4 [grid-template-rows:1.2fr_1fr_auto]">
                      <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/30" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/30" />
                        <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/30" />
                      </div>
                      <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 pb-14 md:grid-cols-3">
            {workflowCards.map((card) => (
              <article key={card.title} className="rounded-[1.75rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.copy}</p>
              </article>
            ))}
          </section>

          <footer className="border-t border-border/70 pb-10 pt-8">
            <div className="grid gap-8 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
              <div className="max-w-sm">
                <div className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Tribunal</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  An inbox-first phishing review workflow for teams who want clearer judgment, cleaner reports, and less noise.
                </p>
              </div>

              {footerColumns.map((column) => (
                <div key={column.title}>
                  <div className="text-sm font-medium text-foreground">{column.title}</div>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {column.links.map((link) => (
                      <div key={link}>{link}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}

