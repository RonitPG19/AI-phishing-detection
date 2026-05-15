import * as React from "react"
import { Area, AreaChart, XAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { fetchDashboardSummary } from "@/lib/admin-api"

const chartConfig = {
  scans: {
    label: "Scans",
    color: "hsl(var(--foreground))",
  },
}

const timeRangeLabels = {
  "90d": "Scans in last 3 months",
  "30d": "Scans in last 30 days",
  "7d": "Scans in last 7 days",
}

const daysByRange = {
  "90d": 90,
  "30d": 30,
  "7d": 7,
}

const emptySummary = {
  kpis: [],
  chartData: [],
  threatDistribution: [],
}

function filterChartData(data, timeRange) {
  const rows = data || []
  if (!rows.length) return []

  const days = daysByRange[timeRange] || 90
  const latestDate = rows.reduce((latest, item) => {
    const date = new Date(item.date)
    return Number.isNaN(date.getTime()) || date <= latest ? latest : date
  }, new Date(rows[0].date))

  const startDate = new Date(latestDate)
  startDate.setDate(startDate.getDate() - days + 1)

  return rows
    .filter((item) => {
      const date = new Date(item.date)
      return !Number.isNaN(date.getTime()) && date >= startDate
    })
    .map((item) => ({
      date: item.date,
      scans: Number(item.scans || 0),
    }))
}

function LoadingCard() {
  return (
    <Card className="min-w-[220px] shrink-0 snap-start md:min-w-0">
      <CardHeader>
        <div className="h-4 w-28 rounded bg-muted/50" />
        <div className="h-8 w-20 rounded bg-muted/40" />
        <div className="h-3 w-24 rounded bg-muted/30" />
      </CardHeader>
    </Card>
  )
}

export function OverviewPage({ authSession }) {
  const [timeRange, setTimeRange] = React.useState("90d")
  const [summary, setSummary] = React.useState(emptySummary)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let isMounted = true

    async function loadSummary() {
      if (!authSession?.accessToken) {
        setSummary(emptySummary)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const data = await fetchDashboardSummary(authSession?.accessToken)
        if (!isMounted) return
        setSummary({
          kpis: data.kpis,
          chartData: data.chartData,
          threatDistribution: data.threatDistribution,
        })
      } catch (summaryError) {
        if (!isMounted) return
        setSummary(emptySummary)
        setError(summaryError.message || "Could not load live dashboard stats.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [authSession?.accessToken])

  const filteredData = filterChartData(summary.chartData, timeRange)

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible">
        {isLoading ? (
          <>
            <LoadingCard />
            <LoadingCard />
          </>
        ) : summary.kpis.length ? summary.kpis.map((item) => {
          return (
            <Card key={item.label} className="min-w-[220px] shrink-0 snap-start md:min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>{item.label}</CardDescription>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">{item.value}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.delta}</p>
              </CardHeader>
            </Card>
          )
        }) : (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardDescription>No dashboard statistics available yet.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detection Activity</CardTitle>
                <CardDescription>{timeRangeLabels[timeRange]}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
                Loading live scan activity...
              </div>
            ) : filteredData.length ? (
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                <AreaChart data={filteredData}>
                  <defs>
                    <linearGradient id="areaGradientScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} className="text-foreground" />
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-foreground" />
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
                    dataKey="scans"
                    type="natural"
                    fill="url(#areaGradientScans)"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    className="text-foreground"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
                No scan activity found for this range.
              </div>
            )}

            <Tabs value={timeRange} onValueChange={setTimeRange} className="flex flex-col gap-3">
              <TabsList variant="line" className="self-start sm:self-end">
                <TabsTrigger value="90d">Last 3 months</TabsTrigger>
                <TabsTrigger value="30d">Last 30 days</TabsTrigger>
                <TabsTrigger value="7d">Last 7 days</TabsTrigger>
              </TabsList>
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
              {isLoading ? (
                <div className="py-8 text-sm text-muted-foreground">Loading threat distribution...</div>
              ) : summary.threatDistribution.length ? summary.threatDistribution.map((item) => (
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
              )) : (
                <div className="py-8 text-sm text-muted-foreground">No threat data available yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
