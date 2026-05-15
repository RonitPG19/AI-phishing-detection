import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchAdminUsers, removeAdminUser, updateAdminUser } from "@/lib/admin-api"

const roles = ["Viewer", "Analyst", "Admin"]
const statuses = ["Active", "Suspended"]

function normalizeUser(user) {
  return {
    ...user,
    id: user.id || user.uid || user.email || user.name,
    role: roles.includes(user.role) ? user.role : "Viewer",
    status: user.status === "Suspended" ? "Suspended" : "Active",
  }
}

export function UsersPage({ authSession }) {
  const [userRows, setUserRows] = useState([])
  const [editingRows, setEditingRows] = useState({})
  const [savingId, setSavingId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const accessToken = authSession?.accessToken || ""

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      if (!accessToken) {
        setUserRows([])
        setEditingRows({})
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const users = await fetchAdminUsers(accessToken)
        if (!isMounted) return
        setUserRows(users.map(normalizeUser))
        setEditingRows({})
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError.message || "Could not load admin users.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [accessToken])

  const startEditing = (user) => {
    setError("")
    setEditingRows((current) => ({
      ...current,
      [user.id]: { role: user.role, status: user.status },
    }))
  }

  const cancelEditing = (userId) => {
    setEditingRows((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })
  }

  const updateDraft = (userId, updates) => {
    setEditingRows((current) => ({
      ...current,
      [userId]: { ...(current[userId] || {}), ...updates },
    }))
  }

  const saveUser = async (user) => {
    const draft = editingRows[user.id]
    if (!draft) return

    const updates = {}
    if (draft.role !== user.role) updates.role = draft.role
    if (draft.status !== user.status) updates.status = draft.status

    if (!Object.keys(updates).length) {
      cancelEditing(user.id)
      return
    }

    setSavingId(user.id)
    setError("")

    try {
      const updated = await updateAdminUser(user.id, updates, accessToken)
      if (updated) {
        setUserRows((current) =>
          current.map((row) => (row.id === user.id ? normalizeUser(updated) : row))
        )
      }
      cancelEditing(user.id)
    } catch (updateError) {
      setError(updateError.message || "Could not update user.")
    } finally {
      setSavingId("")
    }
  }

  const removeUser = async (user) => {
    const previousRows = userRows
    setError("")
    setUserRows((current) => current.filter((row) => row.id !== user.id))
    cancelEditing(user.id)

    try {
      await removeAdminUser(user.id, accessToken)
    } catch (removeError) {
      setError(removeError.message || "Could not remove user.")
      setUserRows(previousRows)
    }
  }

  const adminRows = useMemo(() => userRows.filter((user) => user.role === "Admin"), [userRows])
  const memberRows = useMemo(() => userRows.filter((user) => user.role !== "Admin"), [userRows])

  const renderRoleControl = (user, compact = false) => {
    const draft = editingRows[user.id]
    if (!draft) {
      return <span className="text-sm text-foreground">{user.role}</span>
    }

    return (
      <Select value={draft.role} onValueChange={(value) => updateDraft(user.id, { role: value })}>
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
  }

  const renderStatusControl = (user, compact = false) => {
    const draft = editingRows[user.id]
    if (!draft) {
      return <span className="text-sm text-foreground">{user.status}</span>
    }

    return (
      <Select value={draft.status} onValueChange={(value) => updateDraft(user.id, { status: value })}>
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
  }

  const renderActions = (user, compact = false) => {
    const isEditing = Boolean(editingRows[user.id])
    const isSaving = savingId === user.id

    if (isEditing) {
      return (
        <div className={`flex ${compact ? "w-full flex-col" : "justify-end"} gap-2`}>
          <Button size="sm" onClick={() => saveUser(user)} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => cancelEditing(user.id)} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      )
    }

    return (
      <div className={`flex ${compact ? "w-full flex-col" : "justify-end"} gap-2`}>
        <Button variant="outline" size="sm" onClick={() => startEditing(user)}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => removeUser(user)}>
          Remove
        </Button>
      </div>
    )
  }

  const renderEmptyState = (title) => (
    <div className="px-5 py-5 text-sm text-muted-foreground">
      No {title.toLowerCase()} found.
    </div>
  )

  const renderSection = (title, rows) => (
    <Card className="overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <CardContent className="p-0">
        {!rows.length ? renderEmptyState(title) : (
          <>
            <div className="space-y-3 p-4 sm:hidden">
              {rows.map((user) => (
                <div key={user.id} className="rounded-xl border border-border bg-muted/10 p-3">
                  <div>
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Role</p>
                      {renderRoleControl(user, true)}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                      {renderStatusControl(user, true)}
                    </div>
                  </div>

                  <div className="mt-3">{renderActions(user, true)}</div>
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
                    <TableRow key={user.id} className="border-border/60 hover:bg-muted/20">
                      <TableCell className="pl-5">
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{renderRoleControl(user)}</TableCell>
                      <TableCell>{renderStatusControl(user)}</TableCell>
                      <TableCell className="pr-5 text-right align-middle">
                        {renderActions(user)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          Loading users from Flask...
        </div>
      ) : null}
      {renderSection("Admin Management", adminRows)}
      {renderSection("User Management", memberRows)}
    </div>
  )
}
