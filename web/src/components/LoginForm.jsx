import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { getPathForRoute } from "@/lib/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginWithFirebaseAndFlask, loginWithGoogleAndFlask } from "@/lib/auth"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 3.1-4.2 3.1-7.3Z" fill="currentColor" />
      <path d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3.1-2.5c-.9.6-2 .9-3.5.9-2.7 0-4.9-1.8-5.7-4.2H3.1v2.6A10 10 0 0 0 12 22Z" fill="currentColor" />
      <path d="M6.3 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.7H3.1A10 10 0 0 0 2 12c0 1.6.4 3 1.1 4.3l3.2-2.6Z" fill="currentColor" />
      <path d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3.1 7.7l3.2 2.6c.8-2.4 3-4.2 5.7-4.2Z" fill="currentColor" />
    </svg>
  )
}

export function LoginForm({ className, onNavigate, onAuthSuccess, ...props }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRouteLink = (event, route) => {
    if (!onNavigate) return
    event.preventDefault()
    onNavigate(route)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setNotice("")

    if (!email.trim() || !password) {
      setError("Email and password are both required.")
      return
    }

    setIsSubmitting(true)

    try {
      const session = await loginWithFirebaseAndFlask({ email: email.trim(), password })
      onAuthSuccess?.(session)
    } catch (submitError) {
      setError(submitError.message || "Unable to log in right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    setNotice("")
    setIsSubmitting(true)

    try {
      const session = await loginWithGoogleAndFlask()
      onAuthSuccess?.(session)
    } catch (submitError) {
      setError(submitError.message || "Unable to continue with Google right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn("border-border/80 bg-card/95 shadow-sm", className)} {...props}>
      <CardHeader className="space-y-1 pb-3 pt-5 text-center">
        <CardTitle className="text-[2rem] font-semibold tracking-tight">Welcome back</CardTitle>
        <p className="text-sm text-muted-foreground">Login to your Tribunal account</p>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        <form onSubmit={handleSubmit}>
          <FieldGroup className="space-y-3.5">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-lg" required />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a href={getPathForRoute("forgotPassword")} className="ml-auto text-sm underline-offset-4 hover:underline" onClick={(event) => handleRouteLink(event, "forgotPassword")}>Forgot your password?</a>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-lg pr-11" required />
                <button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
            {notice ? <FieldDescription className="text-emerald-600 dark:text-emerald-400">{notice}</FieldDescription> : null}
            <Field>
              <Button type="submit" disabled={isSubmitting} className="h-10 rounded-lg text-sm">{isSubmitting ? "Logging in..." : "Login"}</Button>
            </Field>
            <div className="relative py-0.5 text-center text-sm text-muted-foreground">
              <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              <span className="relative bg-card px-3">Or continue with</span>
            </div>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleGoogleLogin} className="h-10 rounded-lg border-border/80 text-sm font-medium">
              <GoogleIcon />
              {isSubmitting ? "Continuing..." : "Continue with Google"}
            </Button>
            <FieldDescription className="pt-0.5 text-center text-sm text-muted-foreground">
              Don&apos;t have an account? <a href={getPathForRoute("signup")} onClick={(event) => handleRouteLink(event, "signup")} className="text-foreground underline underline-offset-4">Sign up</a>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
