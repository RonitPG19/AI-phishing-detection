import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Controls</CardTitle>
          <CardDescription>Operational defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Auto-export weekly report",
            "Notify on critical spikes",
            "Archive scans after 90 days"
          ].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">{item}</span>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Access and audit settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground">Session timeout</p>
            <p className="text-lg font-semibold">30 minutes</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground">Last audit run</p>
            <p className="text-lg font-semibold">2 days ago</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
