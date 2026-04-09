import { Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  activityBars,
  alerts,
  kpis,
  threatDistribution
} from "@/lib/dashboard-data"

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-4">
        {kpis.map((item) => {
          const isTotalScans = item.label === "Total Scans"

          return (
            <Card key={item.label} className="min-w-[220px] shrink-0 snap-start md:min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>{item.label}</CardDescription>
                  {isTotalScans ? (
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkcfTTj0KexcYOXfiw7ceFghwR7Ml3XPPspuhmTvBa2Q&s"
                      alt="Total scans visual"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-2xl">{item.value}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.delta} vs last week</p>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detection Activity</CardTitle>
                <CardDescription>Weekly scan velocity</CardDescription>
              </div>
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-16 items-end gap-2">
              {activityBars.map((value, index) => (
                <div
                  key={`bar-${index}`}
                  className="flex-1 rounded-full bg-muted"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>

            <Tabs defaultValue="last-30" className="flex flex-col gap-3">
              <TabsList variant="line" className="self-start sm:self-end">
                <TabsTrigger value="last-90">Last 3 months</TabsTrigger>
                <TabsTrigger value="last-30">Last 30 days</TabsTrigger>
                <TabsTrigger value="last-7">Last 7 days</TabsTrigger>
              </TabsList>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Suspicious Links</p>
                  <p className="mt-2 text-xl font-semibold">428</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Reply-to Mismatch</p>
                  <p className="mt-2 text-xl font-semibold">312</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Urgency Language</p>
                  <p className="mt-2 text-xl font-semibold">295</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Attachment Risk</p>
                  <p className="mt-2 text-xl font-semibold">207</p>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Threat Distribution</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {threatDistribution.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-16 text-sm text-muted-foreground">{item.label}</div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-foreground" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
                <Badge variant={item.variant} className="w-14 justify-center">
                  {item.value}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="space-y-4 lg:col-span-3 lg:col-start-5">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Items that need review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="mt-1 rounded-full border border-border p-2">
                    <alert.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Providers</CardTitle>
              <CardDescription>Coverage by provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Gmail", "Outlook"].map((provider) => (
                <div key={provider} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{provider}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider === "Gmail" ? "7,430 scans" : "5,410 scans"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
