import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"

export function HeroSection({ onNavigate, theme = "dark" }) {
  const isDark = theme === "dark"

  const handleNavigate = (event, route) => {
    if (!onNavigate) return
    event.preventDefault()
    onNavigate(route)
  }

  return (
    <section className="relative pt-24 lg:pt-36 pb-20 overflow-hidden">
      {/* Background Central Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{ opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className={`h-[40rem] w-[40rem] rounded-full blur-[160px] ${isDark ? "bg-white/5" : "bg-transparent"}`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto px-4 relative z-10">
        <motion.div
          className="space-y-10 text-center lg:text-left"
          initial="hidden"
          animate="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <h1 className={`text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl ${isDark ? "text-white" : "text-stone-950"}`}>
              Trust your<br className="hidden lg:block" /> inbox again!
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Tribunal decodes suspicious emails directly in your inbox.  It highlights exactly what to watch out for and gives you the confidence to manage your inbox safely.
            </p>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="flex flex-col items-center lg:items-start justify-center lg:justify-start gap-4 sm:flex-row pb-12"
          >
            <Button size="lg" className={`h-12 rounded-full px-8 transition-colors ${isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-stone-950 text-white hover:bg-stone-800"}`} asChild>
              <a href={getPathForRoute("login")} onClick={(event) => handleNavigate(event, "login")}>
                Get Started
              </a>
            </Button>
            <Button variant="ghost" size="lg" className={`h-12 rounded-full px-8 transition-colors ${isDark ? "text-white hover:bg-white/10 hover:text-white" : "text-stone-700 hover:bg-stone-900/5 hover:text-stone-950"}`} asChild>
              <a href={getPathForRoute("signup")} onClick={(event) => handleNavigate(event, "signup")}>
                Explore product
              </a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className={`relative mx-auto max-w-sm rounded-2xl overflow-hidden shadow-2xl ${isDark
            ? "border border-white/10 bg-black ring-1 ring-white/5"
            : "border border-stone-200 bg-white ring-1 ring-stone-200/80 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.28)]"
            }`}>
            <img
              src="/hero_demo.png"
              alt="Tribunal Platform Demo"
              className="w-full h-auto opacity-100"
            />
            {/* Subtle overlay glow */}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
