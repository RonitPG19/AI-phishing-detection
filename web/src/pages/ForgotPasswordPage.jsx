import { useState } from "react"
import { ArrowLeft, Moon, Sun } from "lucide-react"

import { sendFirebasePasswordReset } from "@/lib/auth"
import { getPathForRoute } from "@/lib/routing"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ForgotPasswordPage({ theme, onNavigate, onThemeToggle }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNavigate = (event, route) => {
    if (!onNavigate) return

    event.preventDefault()
    onNavigate(route)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setNotice("")

    if (!email.trim()) {
      setError("Enter your email first.")
      return
    }

    setIsSubmitting(true)

    try {
      await sendFirebasePasswordReset(email.trim())
      setNotice("Password reset email sent. Check your inbox.")
    } catch (submitError) {
      setError(submitError.message || "Could not send reset email.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.04),_transparent_32%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/6 px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <a
              href={getPathForRoute("login")}
              className="flex items-center gap-3"
              onClick={(event) => handleNavigate(event, "login")}
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
          <div className="max-w-xl space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Reset your password.</h1>
            <p className="mx-auto text-sm leading-6 text-muted-foreground sm:text-base">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <section className="mx-auto flex w-full max-w-md items-center justify-center">
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Forgot password</CardTitle>
                <CardDescription>Get back into your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </Field>
                    {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
                    {notice ? <FieldDescription className="text-emerald-600 dark:text-emerald-400">{notice}</FieldDescription> : null}
                    <Field>
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send reset link"}</Button>
                    </Field>
                    <Field>
                      <Button variant="ghost" type="button" onClick={(event) => handleNavigate(event, "login")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}
