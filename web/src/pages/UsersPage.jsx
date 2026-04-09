import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { users } from "@/lib/dashboard-data"

const roleOrder = ["Viewer", "Analyst", "Admin"]

export function UsersPage() {
  const [userRows, setUserRows] = useState(users)

  const cycleRole = (name) => {
    setUserRows((current) =>
      current.map((user) => {
        if (user.name !== name) return user
        const nextIndex = (roleOrder.indexOf(user.role) + 1) % roleOrder.length
        return { ...user, role: roleOrder[nextIndex] }
      })
    )
  }

  const toggleStatus = (name) => {
    setUserRows((current) =>
      current.map((user) => {
        if (user.name !== name) return user
        return { ...user, status: user.status === "Active" ? "Suspended" : "Active" }
      })
    )
  }

  const removeUser = (name) => {
    setUserRows((current) => current.filter((user) => user.name !== name))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>User records synced from the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:hidden">
            {userRows.map((user) => (
              <div key={user.name} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{user.name}</p>
                  <Badge variant={user.status === "Active" ? "secondary" : "neutral"}>{user.status}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {user.role} - {user.scans} scans
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => cycleRole(user.name)}>
                    Role
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(user.name)}>
                    {user.status === "Active" ? "Suspend" : "Activate"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => removeUser(user.name)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRows.map((user) => (
                  <TableRow key={user.name}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.scans}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "Active" ? "secondary" : "neutral"}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => cycleRole(user.name)}>
                          Change Role
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(user.name)}>
                          {user.status === "Active" ? "Suspend" : "Activate"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => removeUser(user.name)}>
                          Remove
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
