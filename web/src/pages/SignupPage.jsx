import { Moon, Sun } from "lucide-react"

import { getPathForRoute } from "@/lib/routing"
import { SignupForm } from "@/components/SignupForm"
import { PublicNavbar } from "@/components/PublicNavbar"
import { Button } from "@/components/ui/button"

export function SignupPage({ theme, onNavigate, onThemeToggle }) {
  return (
    <main className="min-h-screen bg-background px-4 py-4 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col">

        <div className="pt-5">
          <PublicNavbar onNavigate={onNavigate} theme={theme} onThemeToggle={onThemeToggle} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6">
          <SignupForm className="w-full shadow-sm" onNavigate={onNavigate} />
          <p className="mt-5 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a 
              href={getPathForRoute("terms")} 
              className="underline underline-offset-4 hover:text-foreground transition-colors"
              onClick={(e) => { e.preventDefault(); onNavigate("terms"); }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a 
              href={getPathForRoute("privacy")} 
              className="underline underline-offset-4 hover:text-foreground transition-colors"
              onClick={(e) => { e.preventDefault(); onNavigate("privacy"); }}
            >
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </main>
  )
}
