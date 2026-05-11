import { PublicNavbar } from "@/components/PublicNavbar"
import { getPathForRoute } from "@/lib/routing"
import { motion } from "framer-motion"

export function PrivacyPage({ theme, onNavigate, onThemeToggle }) {
  const isDark = theme === "dark"

  return (
    <main className={`min-h-screen ${isDark ? "bg-background text-white" : "bg-white text-stone-900"}`}>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20">
        <div className={`absolute inset-0 ${isDark ? "bg-[url('https://res.cloudinary.com/djpkwtowz/image/upload/v1715478440/noise_uvw6h0.png')] mix-blend-overlay" : ""}`} />
      </div>

      <header className="fixed top-4 inset-x-0 z-50 px-4 flex justify-center">
        <div className="relative w-full max-w-5xl">
          <PublicNavbar onNavigate={onNavigate} theme={theme} onThemeToggle={onThemeToggle} />
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          <section className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg">Your security is our priority, but your privacy is our foundation.</p>
          </section>

          <div className="space-y-8 prose prose-neutral dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-medium">1. Data Collection</h2>
              <p className="leading-relaxed">
                We only collect information that is necessary to provide the service. This includes your email address when you create an account and the specific email data (metadata, links, and headers) you submit for scanning.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">2. How We Use Data</h2>
              <p className="leading-relaxed">
                Your data is used to generate security verdicts and maintain your scan history. We may use anonymized, aggregated signals to improve our detection algorithms, but we never sell your personal information or the content of your emails to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">3. Security</h2>
              <p className="leading-relaxed">
                We use industry-standard encryption to protect your data both at rest and in transit. Access to backend systems is strictly controlled and audited.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">4. Transparency</h2>
              <p className="leading-relaxed">
                You have full control over your data. You can view your entire scan history at any time and permanently delete specific records or your entire account if you choose to leave the platform.
              </p>
            </section>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-medium">5. Contact</h2>
              <p className="leading-relaxed">
                If you have questions about how we handle your data, we're here to help. Privacy shouldn't be complicated.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
