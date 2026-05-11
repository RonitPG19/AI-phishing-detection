import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LogOut, MoreVertical, Settings } from "lucide-react"
import { navItems } from "@/lib/dashboard-data"

export function AdminSidebar({ activePage, onPageChange, authSession, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const email = authSession?.user?.email || "m@example.com"
  const displayName = authSession?.user?.displayName?.trim()
  const accountName = useMemo(() => {
    if (displayName) return displayName
    return "Tribunal User"
  }, [displayName])

  const initial = accountName.charAt(0).toUpperCase()

  useEffect(() => {
    if (!menuOpen) return

    const handleClickAway = (event) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handleClickAway)
    return () => window.removeEventListener("mousedown", handleClickAway)
  }, [menuOpen])

  const openSettings = () => {
    setMenuOpen(false)
    onPageChange("settings")
  }

  const handleLogoutClick = async () => {
    setMenuOpen(false)
    await onLogout?.()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
            <img src="/tribunal-logo.png" alt="Tribunal logo" className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Tribunal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => onPageChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-1">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background text-sm font-semibold text-foreground">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold leading-tight">{accountName}</div>
                  <div className="truncate text-xs leading-tight text-muted-foreground">{email}</div>
                </div>
              </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {menuOpen && (
              <div className="absolute bottom-12 left-0 z-50 w-[300px] rounded-xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-3 border-b border-border/70 px-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-sm font-semibold text-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{accountName}</div>
                    <div className="truncate text-xs text-muted-foreground">{email}</div>
                  </div>
                </div>

                <div className="px-2 py-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md bg-muted/70 px-2 py-2 text-left text-sm"
                    onClick={openSettings}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-border/70 px-2 py-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60"
                    onClick={handleLogoutClick}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
