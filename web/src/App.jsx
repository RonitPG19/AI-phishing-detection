import { useEffect, useState } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { pageMeta } from "@/lib/dashboard-data"
import { LoginPage } from "@/pages/LoginPage"
import { OverviewPage } from "@/pages/OverviewPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { ScansPage } from "@/pages/ScansPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { SignupPage } from "@/pages/SignupPage"
import { UsersPage } from "@/pages/UsersPage"

const pageComponents = {
  overview: OverviewPage,
  scans: ScansPage,
  reports: ReportsPage,
  users: UsersPage,
  settings: SettingsPage,
}

const authComponents = {
  login: LoginPage,
  signup: SignupPage,
}

function getRouteFromHash() {
  if (typeof window === "undefined") return "overview"

  const route = window.location.hash.replace("#", "")
  if (pageComponents[route] || authComponents[route]) return route

  return "overview"
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash)
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light"
    return localStorage.getItem("tribunal_admin_theme") || "light"
  })

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())

    window.addEventListener("hashchange", handleHashChange)
    handleHashChange()

    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    localStorage.setItem("tribunal_admin_theme", theme)
  }, [theme])

  const navigateTo = (nextRoute) => {
    window.location.hash = nextRoute
  }

  if (authComponents[route]) {
    const AuthPage = authComponents[route]

    return <AuthPage theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
  }

  const ActivePage = pageComponents[route]

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebar activePage={route} onPageChange={navigateTo} />

      <SidebarInset>
        <AdminHeader theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

        <main className="flex-1 space-y-6 px-4 pb-28 pt-12 md:px-6 md:pb-10 md:pt-14">
          <div>
            <h1 className="text-3xl font-semibold">{pageMeta[route].title}</h1>
            <p className="text-sm text-muted-foreground">{pageMeta[route].description}</p>
          </div>

          <ActivePage />
        </main>
      </SidebarInset>

      <BottomNav activePage={route} onChange={navigateTo} />
    </SidebarProvider>
  )
}
