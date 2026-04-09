import { motion } from "framer-motion"
import { ScanSearch, Fingerprint, LayoutDashboard } from "lucide-react"

const workflows = [
  {
    title: "Instant Triage",
    copy: "Scan the email in the inbox itself and review the key signals without switching tools.",
    icon: ScanSearch,
    delay: 0.1,
  },
  {
    title: "Clear Verdicts",
    copy: "Turn sender mismatches, suspicious links, and body-level warnings into a readable outcome.",
    icon: Fingerprint,
    delay: 0.2,
  },
  {
    title: "Command Center",
    copy: "Track findings, review reports, and keep follow-up decisions organized in one dashboard.",
    icon: LayoutDashboard,
    delay: 0.3,
  },
]

export function WorkflowCards({ theme = "dark" }) {
  const isDark = theme === "dark"

  return (
    <section className="py-24 md:py-32 relative border-t border-border/40">
      <div className="flex flex-col items-center justify-center text-center mb-20 space-y-6">
        <video 
          src="/3d-control.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          onContextMenu={(e) => e.preventDefault()}
          className={`h-20 w-20 md:h-32 md:w-32 object-cover pointer-events-none select-none ${isDark ? "mix-blend-screen grayscale opacity-80" : "mix-blend-screen contrast-110 brightness-110"}`}
        />
        <div className="space-y-4">
          <h2 className={`text-3xl md:text-5xl font-semibold tracking-tight ${isDark ? "text-white" : "text-stone-950"}`}>
            Built for clearer review.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From inbox triage to report review, each step stays focused on clarity instead of clutter.
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
                <Icon className={`h-6 w-6 ${isDark ? "text-white/80" : "text-stone-700"}`} />
              </div>

              <h3 className={`text-xl font-medium mb-3 ${isDark ? "text-white" : "text-stone-900"}`}>{card.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{card.copy}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
