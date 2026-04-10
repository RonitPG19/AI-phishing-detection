import { useEffect, useState } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { pageMeta } from "@/lib/dashboard-data"
import { getStoredAuthSession, logoutFromFirebaseAndFlask } from "@/lib/auth"
import { getPathForRoute, getRouteFromPath } from "@/lib/routing"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { OverviewPage } from "@/pages/OverviewPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { SignupPage } from "@/pages/SignupPage"
import { UsersPage } from "@/pages/UsersPage"
import { TermsPage } from "@/pages/TermsPage"
import { PrivacyPage } from "@/pages/PrivacyPage"

const pageComponents = {
  overview: OverviewPage,
  reports: ReportsPage,
  users: UsersPage,
  settings: SettingsPage,
}

const authComponents = {
  landing: LandingPage,
  login: LoginPage,
  signup: SignupPage,
  forgotPassword: ForgotPasswordPage,
  terms: TermsPage,
  privacy: PrivacyPage,
}

function getCurrentRoute() {
  if (typeof window === "undefined") return "overview"
  return getRouteFromPath(window.location.pathname)
}

function isProtectedRoute(route) {
  return !authComponents[route]
}

export default function App() {
  const [route, setRoute] = useState(getCurrentRoute)
  const [authSession, setAuthSession] = useState(() => getStoredAuthSession())
  const [theme, setTheme] = useState("dark")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!authSession?.accessToken && isProtectedRoute(route)) {
      const loginPath = getPathForRoute("login")
      if (window.location.pathname !== loginPath) {
        window.history.replaceState({}, "", loginPath)
      }
      setRoute("login")
      return
    }

    if (authSession?.accessToken && authComponents[route]) {
      const overviewPath = getPathForRoute("overview")
      if (window.location.pathname !== overviewPath) {
        window.history.replaceState({}, "", overviewPath)
      }
      setRoute("overview")
    }
  }, [authSession, route])

  const navigateTo = (nextRoute) => {
    const nextPath = getPathForRoute(nextRoute)
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath)
    }
    setRoute(nextRoute)
  }

  const handleAuthSuccess = (session) => {
    setAuthSession(session)
    navigateTo("overview")
  }

  const handleLogout = async () => {
    await logoutFromFirebaseAndFlask()
    setAuthSession(null)
    navigateTo("login")
  }

  if (authComponents[route]) {
    const AuthPage = authComponents[route]
    return (
      <AuthPage
        theme={theme}
        onNavigate={navigateTo}
        onAuthSuccess={handleAuthSuccess}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    )
  }

  const safeRoute = pageComponents[route] ? route : "overview"
  const ActivePage = pageComponents[safeRoute]

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebar
        activePage={route}
        onPageChange={navigateTo}
        authSession={authSession}
        onLogout={handleLogout}
      />

      <SidebarInset>
        <AdminHeader
          theme={theme}
          onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          authSession={authSession}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 space-y-6 px-4 pb-28 pt-6 md:px-6 md:pb-4 md:pt-2">
          <div>
            <h1 className="text-3xl font-semibold">{pageMeta[safeRoute].title}</h1>
            <p className="text-sm text-muted-foreground">{pageMeta[safeRoute].description}</p>
          </div>

          <ActivePage searchQuery={searchQuery} />
        </main>
      </SidebarInset>

      <BottomNav activePage={route} onChange={navigateTo} />
    </SidebarProvider>
  )
}
