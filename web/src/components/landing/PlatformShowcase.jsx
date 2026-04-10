import { motion } from "framer-motion"

export function PlatformShowcase({ theme = "dark" }) {
  const isDark = theme === "dark"

  return (
    <section className="pt-0 pb-32 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Settings / Configuration Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8 flex flex-col items-center text-center"
          >
            <div className={`p-1 w-full rounded-[32px] ${isDark ? "bg-white/5" : "bg-stone-200/50"}`}>
              <div className="rounded-[28px] bg-neutral-950 overflow-hidden shadow-2xl relative aspect-[4/5] md:aspect-square flex items-center justify-center">
                <img 
                  src="/scanchoose-demo.png" 
                  alt="Scan Configuration Demo" 
                  className="w-full h-full object-contain brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className={`text-3xl md:text-5xl font-semibold tracking-tight ${isDark ? "text-white" : "text-stone-900"}`}>
                Scan exactly what you need.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Choose precisely what Tribunal analyzes, from hidden headers to specific links and attachments.
              </p>
            </div>
          </motion.div>

          {/* History / Audit Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8 flex flex-col items-center text-center"
          >
            <div className={`p-1 w-full rounded-[32px] ${isDark ? "bg-white/5" : "bg-stone-200/50"}`}>
              <div className="rounded-[28px] bg-neutral-950 overflow-hidden shadow-2xl relative aspect-[4/5] md:aspect-square flex items-center justify-center">
                <img 
                  src="/history-demo.png" 
                  alt="Scan History Demo" 
                  className="w-full h-full object-contain brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className={`text-3xl md:text-5xl font-semibold tracking-tight ${isDark ? "text-white" : "text-stone-900"}`}>
                Check back on past results.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Every scan is recorded automatically, giving you a clear timeline of your inbox safety and past alerts.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
