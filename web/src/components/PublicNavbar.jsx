import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"
import { ChevronDown, Mail, Shield, Zap, Terminal, Globe, Github, Twitter, BookOpen, HelpCircle, Menu, X } from "lucide-react"

const NAV_ITEMS = [
  {
    label: "Features",
    dropdown: {
      type: "mega",
      links: [
        { title: "Email API", desc: "Reliable delivery for your apps", icon: Mail },
        { title: "SMTP", desc: "Traditional mail infrastructure", icon: Terminal },
        { title: "Inbound", desc: "Receive and process emails", icon: Globe },
        { title: "Audiences", desc: "Manage your contact lists", icon: Shield },
        { title: "Broadcasts", desc: "Scale your reach instantly", icon: Zap },
      ],
      featured: [
        {
          title: "Transactional Emails",
          desc: "Engineered for speed and reliability.",
          bg: "bg-white/[0.03]",
        },
        {
          title: "Marketing Emails",
          desc: "Deliver beautifully crafted content.",
          bg: "bg-white/[0.03]",
        }
      ]
    }
  }
]

export function PublicNavbar({ onNavigate }) {
  const [activeItem, setActiveItem] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const containerRef = useRef(null)

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
      <nav className="relative flex items-center justify-between md:justify-center w-full md:w-auto rounded-full border border-white/10 bg-black/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-3xl px-2 py-1.5 ring-1 ring-white/[0.05]">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full px-4 text-sm font-bold text-white hover:bg-white/5 transition-colors"
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
                <button className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-neutral-400 hover:text-white transition-colors">
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
                      <div className={`relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-[60px] backdrop-saturate-[180%] ring-1 ring-white/[0.05] ${item.dropdown.type === "mega" ? "w-[600px]" : "w-48"}`}>
                        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] opacity-[0.05] mix-blend-overlay pointer-events-none" />
                        
                        {item.dropdown.type === "mega" ? (
                          <div className="grid grid-cols-[1fr_240px] p-6">
                            <div className="space-y-6">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 px-3">Products</p>
                              <div className="grid grid-cols-1 gap-2">
                                {item.dropdown.links.map((link) => (
                                  <a
                                    key={link.title}
                                    href="#"
                                    className="group flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-white/5"
                                  >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-neutral-400 transition-colors group-hover:text-white group-hover:border-white/10">
                                      {link.icon && <link.icon className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <p className="text-[13px] font-medium text-white">{link.title}</p>
                                      <p className="text-[12px] text-neutral-500 leading-normal">{link.desc}</p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                            <div className="border-l border-white/5 pl-6 space-y-4">
                              {item.dropdown.featured.map((fBox) => (
                                <div key={fBox.title} className={`rounded-2xl p-4 ${fBox.bg} border border-white/5 group cursor-pointer hover:border-white/10 transition-colors`}>
                                  <div className="h-24 w-full rounded-lg bg-black/40 mb-3 relative overflow-hidden">
                                     <div className="absolute inset-x-2 top-4 h-px bg-white/10" />
                                     <div className="absolute inset-x-2 top-8 h-px bg-white/5" />
                                     <div className="absolute left-4 bottom-4 h-6 w-1/2 rounded bg-white/5" />
                                  </div>
                                  <p className="text-[13px] font-medium text-white">{fBox.title}</p>
                                  <p className="text-[12px] text-neutral-500 leading-normal mt-1">{fBox.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2">
                            {item.dropdown.links.map((link) => (
                              <a
                                key={link.title}
                                href="#"
                                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
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
              className="rounded-full px-4 text-[13px] text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              onClick={(e) => handleNavigate(e, "login")}
            >
              Log in
            </Button>
            <Button 
              size="sm" 
              className="rounded-full px-4 text-[13px] bg-white text-black hover:bg-neutral-200 transition-colors"
              onClick={(e) => handleNavigate(e, "signup")}
            >
              Sign up
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-neutral-400 hover:text-white transition-colors"
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
            className="fixed inset-0 z-[110] bg-black p-4 flex flex-col pt-24"
          >
            <div className="space-y-4">
              {NAV_ITEMS.map((item) => (
                <div key={item.label} className="space-y-4">
                  <p className="text-2xl font-bold text-white px-2">{item.label}</p>
                  <div className="grid grid-cols-1 gap-2 pl-4">
                    {item.dropdown?.links.map((link) => (
                      <a key={link.title} href="#" className="py-2 text-lg text-neutral-400 hover:text-white flex items-center gap-3">
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
                className="w-full rounded-2xl h-14 text-lg border-white/10 hover:bg-white/5"
                onClick={(e) => handleNavigate(e, "login")}
              >
                Log in
              </Button>
              <Button 
                className="w-full rounded-2xl h-14 text-lg bg-white text-black hover:bg-neutral-200"
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
