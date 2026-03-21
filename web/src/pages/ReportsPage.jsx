import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { reportCards } from "@/lib/dashboard-data"

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{report.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Downloadable reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:hidden">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Weekly Summary</p>
                <Badge variant="secondary">Ready</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Operations · Today</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Threat Domains</p>
                <Badge variant="neutral">Scheduled</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Security · Yesterday</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">False Positive Review</p>
                <Badge variant="neutral">Draft</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Analyst Team · 2 days ago</p>
            </div>
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Weekly Summary</TableCell>
                  <TableCell>Operations</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Ready</Badge>
                  </TableCell>
                  <TableCell>Today</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Threat Domains</TableCell>
                  <TableCell>Security</TableCell>
                  <TableCell>
                    <Badge variant="neutral">Scheduled</Badge>
                  </TableCell>
                  <TableCell>Yesterday</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">False Positive Review</TableCell>
                  <TableCell>Analyst Team</TableCell>
                  <TableCell>
                    <Badge variant="neutral">Draft</Badge>
                  </TableCell>
                  <TableCell>2 days ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
