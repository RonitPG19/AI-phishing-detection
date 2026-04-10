import { Moon, Sun } from "lucide-react"

import { getPathForRoute } from "@/lib/routing"
import { LoginForm } from "@/components/LoginForm"
import { PublicNavbar } from "@/components/PublicNavbar"
import { Button } from "@/components/ui/button"

export function LoginPage({ theme, onNavigate, onThemeToggle, onAuthSuccess }) {
  return (
    <main className={`min-h-screen px-4 py-4 sm:px-6 lg:px-8 ${
      theme === "dark"
        ? "bg-background"
        : "bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#ffffff_0%,#ffffff_32%,#f8fafc_100%)]"
    }`}>
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col">

        <div className="pt-5">
          <PublicNavbar onNavigate={onNavigate} theme={theme} onThemeToggle={onThemeToggle} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6">
          <LoginForm className="w-full shadow-sm" onNavigate={onNavigate} onAuthSuccess={onAuthSuccess} />
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
