import { useState, useRef, useEffect } from "react"
import { Download, LogOut, Moon, Search, SlidersHorizontal, Sun, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

export function AdminHeader({ theme, onThemeToggle, authSession, onLogout, searchQuery, onSearchChange }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isDark = theme === "dark"
  const user = authSession?.user
  const avatarUrl = user?.photoURL || user?.photoUrl || user?.picture || user?.avatarUrl || user?.avatar_url || ""
  const displayName = user?.displayName || user?.name || "Admin User"
  const email = user?.email || "admin@tribunal.io"

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <InputGroup className="w-full md:w-72">
            <InputGroupAddon>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search.."
              className={`bg-muted/30 border border-transparent transition-all focus:border-white/20 focus:bg-muted/50 focus:ring-0 ${!isDark ? "focus:border-black/10" : ""
                }`}
            />
          </InputGroup>

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                aria-label="Toggle theme"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 p-0 rounded-full bg-muted/30 border border-border/70 overflow-hidden shadow-[0_0_0_4px_rgba(255,255,255,0.03)] hover:border-foreground/25 hover:bg-muted/50 transition-all"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  {avatarUrl ? (
                    <img referrerPolicy="no-referrer" src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </Button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className={`absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-[22px] border border-border/60 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl ring-1 ring-white/[0.04] ${isDark ? "bg-neutral-950/95" : "bg-white/95"
                        }`}
                    >
                      <div className="flex items-center gap-3 border-b border-border/50 px-1.5 pb-3 pt-1">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-border/70 bg-muted/50">
                          {avatarUrl ? (
                            <img referrerPolicy="no-referrer" src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start rounded-2xl text-foreground hover:text-foreground hover:bg-white/5 transition-all h-10"
                          onClick={onLogout}
                        >
                          <LogOut className="h-4 w-4 mr-2.5" />
                          <span className="font-medium text-sm">Logout</span>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
