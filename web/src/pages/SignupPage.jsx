import { Moon, Sun } from "lucide-react"

import { SignupForm } from "@/components/SignupForm"
import { PublicNavbar } from "@/components/PublicNavbar"
import { Button } from "@/components/ui/button"

export function SignupPage({ theme, onNavigate, onThemeToggle }) {
  return (
    <main className="min-h-screen bg-background px-4 py-4 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col">
        <div className="absolute right-0 top-0 z-20">
          <Button variant="ghost" size="icon" type="button" className="rounded-full" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="pt-5">
          <PublicNavbar onNavigate={onNavigate} theme={theme} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6">
          <SignupForm className="w-full shadow-sm" onNavigate={onNavigate} />
          <p className="mt-5 max-w-sm text-center text-sm leading-6 text-muted-foreground">
            By clicking continue, you agree to our <a href="#" className="underline underline-offset-4">Terms of Service</a> and <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
