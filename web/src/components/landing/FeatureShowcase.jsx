import { motion } from "framer-motion"
import { MailIcon } from "@/components/landing/MailIcon"

export function FeatureShowcase({ theme = "dark" }) {
  const isDark = theme === "dark"

  return (
    <section className="py-24 md:py-40 relative border-t border-border/40 flex items-center justify-center">
      <div className="max-w-4xl text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="space-y-6 flex flex-col items-center"
        >
          <div className={`relative w-full max-w-[200px] -mb-4 ${
            isDark ? "" : "rounded-[28px] bg-neutral-950/96 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)]"
          }`}>
            <video
              src="/3d-integrate-afternoon.mp4"
              autoPlay
              muted
              loop
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              className={`w-full h-auto select-none touch-none pointer-events-none ${isDark ? "mix-blend-screen grayscale contrast-125" : "rounded-[20px] contrast-110 brightness-110"}`}
            />
          </div>
          <br />
          <h2 className={`text-4xl md:text-5xl font-semibold tracking-tight leading-tight ${isDark ? "text-white" : "text-stone-950"}`}>
            See the signal, not the clutter.
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Tribunal pulls the important evidence forward: suspicious sender details, risky links, and concise findings that make email review less noisy and more understandable.
          </p>
        </motion.div>

      </div>
    </section>
  )
}
