import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { users } from "@/lib/dashboard-data"

const roles = ["Viewer", "Analyst", "Admin"]
const statuses = ["Active", "Suspended"]

export function UsersPage() {
  const [userRows, setUserRows] = useState(() =>
    users.map((user) => ({
      ...user,
      status: user.status === "Suspended" ? "Suspended" : "Active",
    }))
  )

  const updateRole = (name, role) => {
    setUserRows((current) =>
      current.map((user) => (user.name === name ? { ...user, role } : user))
    )
  }

  const updateStatus = (name, status) => {
    setUserRows((current) =>
      current.map((user) => (user.name === name ? { ...user, status } : user))
    )
  }

  const removeUser = (name) => {
    setUserRows((current) => current.filter((user) => user.name !== name))
  }

  const adminRows = userRows.filter((user) => user.role === "Admin")
  const memberRows = userRows.filter((user) => user.role !== "Admin")

  const renderRoleSelect = (user, compact = false) => (
    <Select value={user.role} onValueChange={(value) => updateRole(user.name, value)}>
      <SelectTrigger className={`${compact ? "w-full" : "w-36"} bg-background/60`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>{role}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const renderStatusSelect = (user, compact = false) => (
    <Select value={user.status} onValueChange={(value) => updateStatus(user.name, value)}>
      <SelectTrigger className={`${compact ? "w-full" : "w-40"} bg-background/60`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>{status}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const renderSection = (title, rows) => (
    <Card className="overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <CardContent className="p-0">
        <div className="space-y-3 p-4 sm:hidden">
          {rows.map((user) => (
            <div key={user.name} className="rounded-xl border border-border bg-muted/10 p-3">
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {renderRoleSelect(user, true)}
                {renderStatusSelect(user, true)}
              </div>

              <Button className="mt-3 w-full" variant="destructive" size="sm" onClick={() => removeUser(user.name)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-5">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.name} className="border-border/60 hover:bg-muted/20">
                  <TableCell className="pl-5">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{renderRoleSelect(user)}</TableCell>
                  <TableCell>{renderStatusSelect(user)}</TableCell>
                  <TableCell className="pr-5 text-right align-middle">
                    <Button variant="destructive" size="sm" onClick={() => removeUser(user.name)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-5">
      {renderSection("Admin Management", adminRows)}
      {renderSection("User Management", memberRows)}
    </div>
  )
}
