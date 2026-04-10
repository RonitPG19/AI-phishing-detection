import * as React from "react"
import { Area, AreaChart, XAxis } from "recharts"
import { Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  kpis,
  threatDistribution,
  chartData
} from "@/lib/dashboard-data"

const chartConfig = {
  desktop: {
    label: "Cloud Scans",
    color: "hsl(var(--foreground))",
  },
  mobile: {
    label: "Node Scans",
    color: "hsl(var(--muted-foreground))",
  },
}

export function OverviewPage({ searchQuery = "" }) {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = (chartData || []).filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "7d") daysToSubtract = 7
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <div className="space-y-6">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-4">
        {kpis.map((item) => {
          return (
            <Card key={item.label} className="min-w-[220px] shrink-0 snap-start md:min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>{item.label}</CardDescription>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">{item.value}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.delta} vs last week</p>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detection Activity</CardTitle>
                <CardDescription>Weekly Scans</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="areaGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} className="text-foreground" />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-foreground" />
                  </linearGradient>
                  <linearGradient id="areaGradientMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.2} className="text-muted-foreground" />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-muted-foreground" />
                  </linearGradient>
                </defs>
                <XAxis hide dataKey="date" />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 0.5 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                  }
                />
                <Area
                    dataKey="mobile"
                    type="natural"
                    fill="url(#areaGradientMobile)"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    stackId="a"
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    className="text-muted-foreground"
                />
                <Area
                    dataKey="desktop"
                    type="natural"
                    fill="url(#areaGradientDesktop)"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    stackId="a"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    className="text-foreground"
                />
              </AreaChart>
            </ChartContainer>

            <Tabs value={timeRange} onValueChange={setTimeRange} className="flex flex-col gap-3">
              <TabsList variant="line" className="self-start sm:self-end">
                <TabsTrigger value="90d">Last 3 months</TabsTrigger>
                <TabsTrigger value="30d">Last 30 days</TabsTrigger>
                <TabsTrigger value="7d">Last 7 days</TabsTrigger>
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
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Threat Distribution</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {threatDistribution.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-muted-foreground">{item.label}</div>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-foreground" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                  <Badge variant={item.variant} className="w-14 justify-center text-[10px] py-0 px-1">
                    {item.value}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
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
