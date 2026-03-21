import { Moon, Sparkles, Sun } from "lucide-react"

import { SignupForm } from "@/components/SignupForm"
import { Button } from "@/components/ui/button"

export function SignupPage({ theme, onThemeToggle }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="mx-auto flex w-full max-w-md items-center justify-center lg:order-2">
          <SignupForm className="w-full" />
        </section>

        <section className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-6 sm:p-8 lg:order-1 lg:min-h-[720px]">
          <div className="flex items-center justify-between gap-4">
            <a href="#overview" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
                <img src="/tribunal-logo.png" alt="Tribunal logo" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tribunal</p>
                <p className="text-xs text-muted-foreground">Create workspace access</p>
              </div>
            </a>
            <Button variant="ghost" size="icon" type="button" onClick={onThemeToggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-5 py-10 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Placeholder onboarding flow
            </div>
            <div className="space-y-3">
              <h1 className="max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">Set up a clean onboarding surface for future team access.</h1>
              <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                This page is intentionally front-end only for now. Later you can attach invite-based signup, workspace creation, or approval flows.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Invite support</p>
              <p className="mt-1 text-xs">Easy place to add organization invites later.</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Approval flow</p>
              <p className="mt-1 text-xs">Can support admin review before granting access.</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="font-medium text-foreground">Provisioning</p>
              <p className="mt-1 text-xs">Good entry point for roles and workspace defaults.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
