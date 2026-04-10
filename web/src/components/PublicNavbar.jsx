import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"
import { ChevronDown, Mail, ShieldCheck, Zap, Terminal, GlobeLock, Menu, X, Sun, Moon, Radar, Fingerprint, Activity, Target } from "lucide-react"

const NAV_ITEMS = [
  {
    label: "Features",
    dropdown: {
      type: "mega",
      links: [
        { title: "Inbox Scanning", desc: "Scan emails as they arrive, directly in your inbox.", icon: Radar },
        { title: "Sender Insights", desc: "Know exactly who sent it and if they're spoofing.", icon: Fingerprint },
        { title: "Link Safety Check", desc: "We scan every link so you don't have to worry.", icon: GlobeLock },
        { title: "Activity History", desc: "Keep track of all your past scans and reports.", icon: Terminal },
        { title: "Risk Analysis", desc: "Simple scores that tell you exactly what's wrong.", icon: Target },
      ],
      featured: [
        {
          title: "Native Extension",
          desc: "Analyze emails directly in your inbox without context switching.",
          bg: "bg-white/[0.03]",
        },
        {
          title: "Management Portal",
          desc: "Oversee security reports, audit logs, and system performance.",
          bg: "bg-white/[0.03]",
        }
      ]
    }
  }
]

export function PublicNavbar({ onNavigate, theme = "dark", onThemeToggle }) {
  const [activeItem, setActiveItem] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const containerRef = useRef(null)
  const isDark = theme === "dark"

  const handleNavigate = (event, route) => {
    if (!onNavigate) return
    event.preventDefault()
    setIsMobileMenuOpen(false)
    onNavigate(route)
  }

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isMobileMenuOpen])

  return (
    <div className="relative z-[100] flex justify-center w-full max-w-5xl mx-auto" ref={containerRef}>
      <nav className={`relative flex items-center justify-between md:justify-center w-full md:w-auto rounded-full px-2 py-1.5 backdrop-blur-3xl ${
        isDark
          ? "border border-white/10 bg-black/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]"
          : "border border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-stone-200/60"
      }`}>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full px-4 text-sm font-bold transition-colors ${
              isDark ? "text-white hover:bg-white/5" : "text-stone-900 hover:bg-stone-900/5"
            }`}
            onClick={(e) => handleNavigate(e, "landing")}
          >
            Tribunal
          </Button>

          <div className="hidden md:flex items-center ml-2 mr-1">
            {NAV_ITEMS.map((item) => (
              <div 
                key={item.label}
                onMouseEnter={() => setActiveItem(item)}
                onMouseLeave={() => setActiveItem(null)}
                className="relative"
              >
                <button className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  isDark ? "text-neutral-400 hover:text-white" : "text-stone-500 hover:text-stone-900"
                }`}>
                  {item.label}
                  {item.dropdown && <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${activeItem === item ? "rotate-180" : ""}`} />}
                </button>

                <AnimatePresence>
                  {activeItem === item && item.dropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-1/2 -translate-x-1/2 top-full pt-4"
                    >
                      <div className={`relative overflow-hidden rounded-[32px] backdrop-blur-[60px] backdrop-saturate-[180%] ${item.dropdown.type === "mega" ? "w-[380px]" : "w-48"} ${
                        isDark
                          ? "border border-white/[0.08] bg-black/95 shadow-[0_32px_64px_-16px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-white/[0.05]"
                          : "border border-stone-200/80 bg-white/95 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-stone-200/60"
                      }`}>
                        <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] opacity-[0.05] mix-blend-overlay" : "bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.05),transparent_35%)]"}`} />
                        
                        {item.dropdown.type === "mega" ? (
                          <div className="p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-1">
                                {item.dropdown.links.map((link) => (
                                  <a
                                    key={link.title}
                                    href="#"
                                    className={`group flex items-start gap-3 rounded-2xl p-3 transition-colors ${
                                      isDark ? "hover:bg-white/5" : "hover:bg-stone-900/5"
                                    }`}
                                  >
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                                      isDark
                                        ? "border border-white/5 bg-white/5 text-neutral-400 group-hover:text-white group-hover:border-white/10"
                                        : "border border-stone-200 bg-stone-100 text-stone-500 group-hover:text-stone-900 group-hover:border-stone-300"
                                    }`}>
                                      {link.icon && <link.icon className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <p className={`text-[13px] font-medium ${isDark ? "text-white" : "text-stone-900"}`}>{link.title}</p>
                                      <p className={`text-[12px] leading-normal ${isDark ? "text-neutral-500" : "text-stone-500"}`}>{link.desc}</p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2">
                            {item.dropdown.links.map((link) => (
                              <a
                                key={link.title}
                                href="#"
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors ${
                                  isDark
                                    ? "text-neutral-400 hover:bg-white/5 hover:text-white"
                                    : "text-stone-500 hover:bg-stone-900/5 hover:text-stone-900"
                                }`}
                              >
                                {link.icon && <link.icon className="h-3.5 w-3.5" />}
                                {link.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 text-[13px] transition-colors ${
                isDark ? "text-neutral-400 hover:text-white hover:bg-white/5" : "text-stone-600 hover:text-stone-900 hover:bg-stone-900/5"
              }`}
              onClick={(e) => handleNavigate(e, "login")}
            >
              Log in
            </Button>
            <Button 
              size="sm" 
              className={`rounded-full px-4 text-[13px] transition-colors ${
                isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-stone-900 text-white hover:bg-stone-800"
              }`}
              onClick={(e) => handleNavigate(e, "signup")}
            >
              Sign up
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full transition-colors ${
                isDark ? "text-neutral-400 hover:text-white" : "text-stone-500 hover:text-stone-900"
              }`}
              onClick={onThemeToggle}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center mr-1">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full transition-colors ${
                isDark ? "text-neutral-400 hover:text-white" : "text-stone-500 hover:text-stone-900"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed inset-0 z-[110] p-4 flex flex-col pt-24 ${isDark ? "bg-black" : "bg-stone-50"}`}
          >
            <div className="space-y-4">
              {NAV_ITEMS.map((item) => (
                <div key={item.label} className="space-y-4">
                  <p className={`text-2xl font-bold px-2 ${isDark ? "text-white" : "text-stone-900"}`}>{item.label}</p>
                  <div className="grid grid-cols-1 gap-2 pl-4">
                    {item.dropdown?.links.map((link) => (
                      <a key={link.title} href="#" className={`py-2 text-lg flex items-center gap-3 ${isDark ? "text-neutral-400 hover:text-white" : "text-stone-500 hover:text-stone-900"}`}>
                         {link.icon && <link.icon className="h-5 w-5" />}
                         {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto space-y-4 pb-12">
              <Button 
                variant="outline" 
                className={`w-full rounded-2xl h-14 text-lg ${isDark ? "border-white/10 hover:bg-white/5" : "border-stone-200 bg-white hover:bg-stone-100"}`}
                onClick={(e) => handleNavigate(e, "login")}
              >
                Log in
              </Button>
              <Button 
                className={`w-full rounded-2xl h-14 text-lg ${isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-stone-900 text-white hover:bg-stone-800"}`}
                onClick={(e) => handleNavigate(e, "signup")}
              >
                Sign up
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


function ActivitySquare(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 5 7 19" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m8 14 2-2 2 2" />
      <path d="m12 10 2 2 2-2" />
    </svg>
  )
}
