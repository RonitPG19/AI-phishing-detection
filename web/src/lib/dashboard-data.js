import {
  Activity,
  AlertTriangle,
  FileText,
  LayoutDashboard,
  Link2,
  Mail,
  ShieldAlert,
  Users
} from "lucide-react"

export const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  // { id: "scans", label: "Scans", icon: ShieldAlert },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "users", label: "User Management", icon: Users }
]

export const pageMeta = {
  overview: { title: "Admin Dashboard", description: "Operational summary of recent scans." },
  // scans: { title: "Scans", description: "Review scans and risk signals." },
  reports: { title: "Reports", description: "Scheduled and on-demand summaries." },
  users: { title: "User Management", description: "Manage platform users directly from the database." },
  settings: { title: "Settings", description: "Preferences and system controls." }
}

export const kpis = [
  { label: "Total Scans", value: "12,840", delta: "+8.2%", icon: Activity },
  { label: "Flagged Emails", value: "1,284", delta: "+2.1%", icon: ShieldAlert },
  { label: "False Positives", value: "2.4%", delta: "-0.8%", icon: ShieldAlert },
  { label: "Avg. Response", value: "3.8s", delta: "-0.2s", icon: Mail }
]

export const activityBars = [18, 26, 20, 36, 28, 44, 40]

export const threatDistribution = [
  { label: "Safe", value: 58, variant: "safe" },
  { label: "Low", value: 18, variant: "low" },
  { label: "Medium", value: 14, variant: "medium" },
  { label: "High", value: 7, variant: "high" },
  { label: "Critical", value: 3, variant: "critical" }
]

export const alerts = [
  { title: "Increase in critical threats", detail: "Critical detections up 18% today", icon: AlertTriangle },
  { title: "New domain pattern", detail: "12 scans flagged paypa1-secure.xyz", icon: Link2 },
  { title: "Rule update pending", detail: "Header anomaly rule awaiting review", icon: FileText }
]

export const reportCards = [
  { title: "Weekly Summary", detail: "Generated 4 hours ago", status: "Ready" },
  { title: "Top Domains", detail: "Updated yesterday", status: "Scheduled" },
  { title: "False Positive Review", detail: "Draft from last week", status: "Draft" }
]

export const users = [
  { name: "Ariana Patel", role: "Admin", scans: 182, status: "Active" },
  { name: "Jordan Kim", role: "Analyst", scans: 94, status: "Active" },
  { name: "Luis Ortega", role: "Viewer", scans: 41, status: "Idle" },
  { name: "Sara Cohen", role: "Analyst", scans: 127, status: "Active" }
]
