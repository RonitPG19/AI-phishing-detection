import { motion } from "framer-motion"
import { MailIcon } from "@/components/landing/MailIcon"

export function FeatureShowcase() {
  return (
    <section className="py-24 md:py-40 relative border-t border-white/5 flex items-center justify-center">
      <div className="max-w-4xl text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="space-y-6 flex flex-col items-center"
        >
          <div className="relative w-full max-w-[200px] -mb-4">
            <video
              src="/3d-integrate-afternoon.mp4"
              autoPlay
              muted
              loop
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-auto mix-blend-screen grayscale contrast-125 select-none touch-none pointer-events-none"
            />
          </div>
          <br />
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
            stop guessing, start knowing.
          </h2>
        </motion.div>

      </div>
    </section>
  )
}
