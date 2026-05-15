import { Radar, ShieldCheck } from "lucide-react"

import { getStoredAuthSession, requestFlaskWithAuth } from "@/lib/auth"

const iconMap = {
  Radar,
  ShieldCheck,
}

export async function fetchAdminUsers(accessToken) {
  const session = accessToken ? { ...getStoredAuthSession(), accessToken } : undefined
  const data = await requestFlaskWithAuth("/api/admin/users", {
    method: "GET",
  }, session)

  return Array.isArray(data?.users) ? data.users : []
}

export async function updateAdminUser(userId, updates, accessToken) {
  const session = accessToken ? { ...getStoredAuthSession(), accessToken } : undefined
  const data = await requestFlaskWithAuth(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }, session)

  return data?.user || null
}

export async function removeAdminUser(userId, accessToken) {
  const session = accessToken ? { ...getStoredAuthSession(), accessToken } : undefined
  await requestFlaskWithAuth(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  }, session)
}

export async function fetchDashboardSummary(accessToken) {
  const session = accessToken ? { ...getStoredAuthSession(), accessToken } : undefined
  const data = await requestFlaskWithAuth("/api/admin/dashboard/summary", {
    method: "GET",
  }, session)

  return {
    kpis: Array.isArray(data?.kpis)
      ? data.kpis.map((item) => ({
          ...item,
          icon: iconMap[item.icon] || Radar,
        }))
      : [],
    chartData: Array.isArray(data?.chartData) ? data.chartData : [],
    threatDistribution: Array.isArray(data?.threatDistribution) ? data.threatDistribution : [],
  }
}
