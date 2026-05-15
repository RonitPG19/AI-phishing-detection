import { LayoutDashboard, Users } from "lucide-react"

export const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
]

export const pageMeta = {
  overview: { title: "Admin Dashboard", description: "Operational summary of recent scans." },
  users: { title: "User Management", description: "" },
}
