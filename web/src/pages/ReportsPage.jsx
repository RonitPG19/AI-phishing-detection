import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Download, Trash2, FileText, FileSpreadsheet, FileJson, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart"
import { reportingKpis, reportCards } from "@/lib/dashboard-data"

const volumeData = [
  { month: "Jan", total: 450 },
  { month: "Feb", total: 620 },
  { month: "Mar", total: 580 },
  { month: "Apr", total: 840 },
  { month: "May", total: 1100 },
  { month: "Jun", total: 1240 },
]

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportingKpis.map((item) => (
          <Card key={item.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">{item.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Report Generation Volume</CardTitle>
            <CardDescription>Monthly distribution of forensic summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[240px] w-full">
              <BarChart data={volumeData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar 
                  dataKey="total" 
                  fill="currentColor" 
                  radius={[4, 4, 0, 0]} 
                  className="fill-foreground/10 hover:fill-foreground transition-colors"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Scheduled Tasks</CardTitle>
            <CardDescription>Automated reporting pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Daily Threat Sweep", time: "00:00 UTC", next: "In 4h" },
              { name: "Weekly Compliance", time: "Mon 08:00", next: "In 2d" },
              { name: "Monthly Audit", time: "1st 09:00", next: "In 12d" },
            ].map((task) => (
              <div key={task.name} className="flex items-center justify-between rounded-lg border border-border p-3 group hover:border-foreground/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.time}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-transparent border-muted text-[10px] uppercase font-bold tracking-wider">
                  {task.next}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Export History</CardTitle>
            <CardDescription>Forensic summaries and data exports</CardDescription>
          </div>
          <Button variant="outline" size="sm">Manage Templates</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Report</TableHead>
                  <TableHead>Format/Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportCards.map((report) => (
                  <TableRow key={report.id} className="group cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                          <report.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{report.title}</p>
                          <p className="text-xs text-muted-foreground">{report.date}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {report.detail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.status === "Ready" ? "secondary" : "neutral"} className="text-[10px] uppercase font-bold tracking-widest">
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{report.owner}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
