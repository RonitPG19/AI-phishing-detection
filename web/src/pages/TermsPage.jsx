import { PublicNavbar } from "@/components/PublicNavbar"
import { getPathForRoute } from "@/lib/routing"
import { motion } from "framer-motion"

export function TermsPage({ theme, onNavigate, onThemeToggle }) {
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
            <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground text-lg">Last updated: April 10, 2026</p>
          </section>

          <div className="space-y-8 prose prose-neutral dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-medium">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using Tribunal, you agree to be bound by these Terms of Service. If you don't agree with any part of these terms, you shouldn't use the service. We try to keep things simple, but security is a shared responsibility.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">2. The Service</h2>
              <p className="leading-relaxed">
                Tribunal provides AI-assisted phishing analysis. While we strive for high accuracy, our verdicts are intended as decision-support tools. No security tool is 100% foolproof, and you are responsible for the final security decisions you make based on our reports.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">3. Your Data</h2>
              <p className="leading-relaxed">
                When you scan an email, we process its metadata and content to provide an analysis. You retain ownership of your data, but you grant us the right to process it specifically for the purpose of providing and improving the security analysis.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium">4. Proper Use</h2>
              <p className="leading-relaxed">
                Please don't try to break Tribunal, scrape our data, or use the service for anything illegal. We reserve the right to suspend accounts that engage in suspicious or abusive behavior.
              </p>
            </section>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-medium">5. Limitation of Liability</h2>
              <p className="leading-relaxed text-muted-foreground text-sm italic">
                Tribunal is provided "as is." We aren't liable for any security breaches or data loss that occur, even if you were using our tool at the time. Always use your best judgment.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
