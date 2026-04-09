import { useState } from "react"
import { ArrowLeft, Moon, Sun } from "lucide-react"

import { sendFirebasePasswordReset } from "@/lib/auth"
import { PublicNavbar } from "@/components/PublicNavbar"
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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col">
        <div className="absolute right-0 top-0 z-20">
          <Button variant="ghost" size="icon" type="button" className="rounded-full" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="pt-8">
          <PublicNavbar onNavigate={onNavigate} theme={theme} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center py-10">
          <Card className="w-full border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="space-y-1 pb-4 pt-6 text-center">
              <CardTitle className="text-3xl font-semibold tracking-tight">Forgot password</CardTitle>
              <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit}>
                <FieldGroup className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 rounded-lg"
                      required
                    />
                  </Field>
                  {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
                  {notice ? <FieldDescription className="text-emerald-600 dark:text-emerald-400">{notice}</FieldDescription> : null}
                  <Field>
                    <Button type="submit" disabled={isSubmitting} className="h-11 rounded-lg text-sm">
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </Button>
                  </Field>
                  <Field>
                    <Button variant="ghost" type="button" className="h-10 rounded-lg" onClick={(event) => handleNavigate(event, "login")}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
