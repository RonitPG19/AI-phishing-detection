import { Moon, Sun } from "lucide-react"

import { LoginForm } from "@/components/LoginForm"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"

export function LoginPage({ theme, onNavigate, onThemeToggle, onAuthSuccess }) {
  const handleNavigate = (event, route) => {
    if (!onNavigate) return

    event.preventDefault()
    onNavigate(route)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.04),_transparent_32%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/6 px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <a
              href={getPathForRoute("overview")}
              className="flex items-center gap-3"
              onClick={(event) => handleNavigate(event, "overview")}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40">
                <img src="/tribunal-logo.png" alt="Tribunal logo" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tribunal</p>
              </div>
            </a>

            <Button variant="ghost" size="icon" type="button" onClick={onThemeToggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 py-10">
          <section className="mx-auto flex w-full max-w-md items-center justify-center">
            <LoginForm className="w-full" onNavigate={onNavigate} onAuthSuccess={onAuthSuccess} />
          </section>
        </div>
      </div>
    </main>
  )
}
