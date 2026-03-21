import { Moon, ShieldCheck, Sun } from "lucide-react"

import { LoginForm } from "@/components/LoginForm"
import { Button } from "@/components/ui/button"

export function LoginPage({ theme, onThemeToggle }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-6 sm:p-8 lg:min-h-[720px]">
          <div className="flex items-center justify-between gap-4">
            <a href="#overview" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
                <img src="/tribunal-logo.png" alt="Tribunal logo" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tribunal</p>
                <p className="text-xs text-muted-foreground">Admin access</p>
              </div>
            </a>
            <Button variant="ghost" size="icon" type="button" onClick={onThemeToggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-5 py-10 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Placeholder authentication flow
            </div>
            <div className="space-y-3">
              <h1 className="max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">Secure access for the phishing operations console.</h1>
              <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                This is a front-end placeholder for login. It is ready for real auth wiring later without changing the page structure.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Role-based access</p>
              <p className="mt-1 text-xs">Admin, analyst, and reviewer flows can plug in later.</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Session controls</p>
              <p className="mt-1 text-xs">Ready for token, OTP, and inactivity handling.</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Audit ready</p>
              <p className="mt-1 text-xs">Good place for compliance and sign-in activity later.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-md items-center justify-center">
          <LoginForm className="w-full" />
        </section>
      </div>
    </main>
  )
}
