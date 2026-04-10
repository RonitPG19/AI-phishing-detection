import { motion } from "framer-motion"

export function FeatureShowcase({ theme = "dark" }) {
  const isDark = theme === "dark"

  return (
    <section className="pt-24 pb-0 relative border-t border-border/40 flex items-center justify-center">
      <div className="max-w-4xl text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="h-20 w-20 md:h-32 md:w-32 rounded-3xl bg-neutral-950 flex items-center justify-center overflow-hidden shadow-soft">
            <video
              src="/3d-integrate-afternoon.mp4"
              autoPlay
              muted
              loop
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full object-cover mix-blend-screen brightness-110"
            />
          </div>
          <p className={`mt-8 text-2xl md:text-3xl font-medium tracking-tight ${isDark ? "text-white/90" : "text-stone-900"}`}>
            Deep-dive into every detail.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
