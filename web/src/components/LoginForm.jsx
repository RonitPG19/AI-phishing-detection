import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
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
import { loginWithFirebaseAndFlask } from "@/lib/auth"

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
      const session = await loginWithFirebaseAndFlask({
        email: email.trim(),
        password,
      })
      onAuthSuccess?.(session)
    } catch (submitError) {
      setError(submitError.message || "Unable to log in right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href={getPathForRoute("forgotPassword")}
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                    onClick={(event) => handleRouteLink(event, "forgotPassword")}
                  >
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
              {notice ? <FieldDescription className="text-emerald-600 dark:text-emerald-400">{notice}</FieldDescription> : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Login"}</Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <a href={getPathForRoute("signup")} onClick={(event) => handleRouteLink(event, "signup")}>Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href={getPathForRoute("login")} onClick={(event) => handleRouteLink(event, "login")}>Terms of Service</a> and{" "}
        <a href={getPathForRoute("login")} onClick={(event) => handleRouteLink(event, "login")}>Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
