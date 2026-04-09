import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"

export function HeroSection({ onNavigate }) {
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
          className="h-[40rem] w-[40rem] rounded-full bg-white/5 blur-[160px]"
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
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl text-white">
              Phishing analysis<br className="hidden lg:block" /> for security teams
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Turn messy signals into a short verdict with link anomalies, sender mismatches, and body-level findings lined up clearly.
            </p>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="flex flex-col items-center lg:items-start justify-center lg:justify-start gap-4 sm:flex-row pb-12"
          >
            <Button size="lg" className="h-12 rounded-full px-8 bg-white text-black hover:bg-neutral-200 transition-colors" asChild>
              <a href={getPathForRoute("login")} onClick={(event) => handleNavigate(event, "login")}>
                Get Started
              </a>
            </Button>
            <Button variant="ghost" size="lg" className="h-12 rounded-full px-8 text-white hover:bg-white/10 hover:text-white transition-colors" asChild>
              <a href={getPathForRoute("signup")} onClick={(event) => handleNavigate(event, "signup")}>
                Documentation
              </a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto max-w-sm rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl ring-1 ring-white/5">
            <img
              src="/hero_demo.png"
              alt="Tribunal Platform Demo"
              className="w-full h-auto opacity-90 transition-opacity duration-700 hover:opacity-100"
            />
            {/* Subtle overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
