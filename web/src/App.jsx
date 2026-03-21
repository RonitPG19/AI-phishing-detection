import { useEffect, useState } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { pageMeta } from "@/lib/dashboard-data"
import { OverviewPage } from "@/pages/OverviewPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { ScansPage } from "@/pages/ScansPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { UsersPage } from "@/pages/UsersPage"

const pageComponents = {
  overview: OverviewPage,
  scans: ScansPage,
  reports: ReportsPage,
  users: UsersPage,
  settings: SettingsPage,
}

export default function App() {
  const [activePage, setActivePage] = useState("overview")
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light"
    return localStorage.getItem("tribunal_admin_theme") || "light"
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    localStorage.setItem("tribunal_admin_theme", theme)
  }, [theme])

  const ActivePage = pageComponents[activePage]

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebar activePage={activePage} onPageChange={setActivePage} />

      <SidebarInset>
        <AdminHeader theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

        <main className="flex-1 space-y-6 px-4 pb-28 pt-12 md:px-6 md:pb-10 md:pt-14">
          <div>
            <h1 className="text-3xl font-semibold">{pageMeta[activePage].title}</h1>
            <p className="text-sm text-muted-foreground">{pageMeta[activePage].description}</p>
          </div>

          <ActivePage />
        </main>
      </SidebarInset>

      <BottomNav activePage={activePage} onChange={setActivePage} />
    </SidebarProvider>
  )
}
