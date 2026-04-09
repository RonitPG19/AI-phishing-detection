import { motion } from "framer-motion"
import { ScanSearch, Fingerprint, LayoutDashboard } from "lucide-react"

const workflows = [
  {
    title: "Instant Triage",
    copy: "Capture the exact message context and evaluate threats directly where they live.",
    icon: ScanSearch,
    delay: 0.1,
  },
  {
    title: "Clear Verdicts",
    copy: "Bypass messy headers. Distill anomalies and body-level warnings into a focused summary.",
    icon: Fingerprint,
    delay: 0.2,
  },
  {
    title: "Command Center",
    copy: "Keep remediation, follow-ups, and accountability beautifully organized in one space.",
    icon: LayoutDashboard,
    delay: 0.3,
  },
]

export function WorkflowCards() {
  return (
    <section className="py-24 md:py-32 relative border-t border-white/5">
      <div className="flex flex-col items-center justify-center text-center mb-20 space-y-6">
        <video 
          src="/3d-control.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          onContextMenu={(e) => e.preventDefault()}
          className="h-20 w-20 md:h-32 md:w-32 object-cover mix-blend-screen pointer-events-none select-none grayscale opacity-80"
        />
        <div className="space-y-4">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
            Built for security teams.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every step of your workflow, refined into a seamless experience.
          </p>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-16 md:grid-cols-3 max-w-5xl mx-auto px-4">
        {workflows.map((card) => {
          const Icon = card.icon
          return (
            <motion.div 
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: card.delay }}
              className="flex flex-col items-center text-center relative"
            >
              <div className="h-14 w-14 flex items-center justify-center mb-6">
                <Icon className="h-6 w-6 text-white/80" />
              </div>

              <h3 className="text-xl font-medium text-white mb-3">{card.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{card.copy}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
