"use client"

import { useState, useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserDetailDialog } from "@/components/admin/user-detail-dialog"
import { getAdminUsers, exportUsersCSV, type UserFilters } from "@/lib/actions/admin"
import { Download, Search } from "lucide-react"

type UserRow = Awaited<ReturnType<typeof getAdminUsers>>[number]

interface UsersClientProps {
  initialUsers: UserRow[]
  departments: string[]
  tracks: { id: string; name: string }[]
}

const roleLabels: Record<string, string> = {
  LEARNER: "Lernende/r",
  TRAINER: "Trainer/in",
  ADMIN: "Admin",
}

export function UsersClient({ initialUsers, departments, tracks }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const [trackId, setTrackId] = useState("")
  const [role, setRole] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentFilters = useCallback((): UserFilters => {
    const filters: UserFilters = {}
    if (search) filters.search = search
    if (department) filters.department = department
    if (trackId) filters.trackId = trackId
    if (role) filters.role = role
    return filters
  }, [search, department, trackId, role])

  function refreshUsers() {
    startTransition(async () => {
      const data = await getAdminUsers(currentFilters())
      setUsers(data)
    })
  }

  function handleSearch() {
    refreshUsers()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch()
  }

  async function handleExport() {
    const csv = await exportUsersCSV(currentFilters())
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "nutzer-export.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function openDetail(userId: string) {
    setSelectedUserId(userId)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Name oder Email suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Select value={department} onValueChange={(v) => { setDepartment(v === "__all__" ? "" : v) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Abteilung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Abteilungen</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={trackId} onValueChange={(v) => { setTrackId(v === "__all__" ? "" : v) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Lernpfad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Lernpfade</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={(v) => { setRole(v === "__all__" ? "" : v) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rolle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Rollen</SelectItem>
            <SelectItem value="LEARNER">Lernende/r</SelectItem>
            <SelectItem value="TRAINER">Trainer/in</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Suchen
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          CSV Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="text-center">Eingeschrieben</TableHead>
              <TableHead>Fortschritt</TableHead>
              <TableHead>Letzte Aktivität</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Nutzer gefunden.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(u.id)}
                >
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : u.role === "TRAINER" ? "secondary" : "outline"}>
                      {roleLabels[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{u.enrollmentCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{u.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.lastActivity
                      ? new Date(u.lastActivity).toLocaleDateString("de-DE")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <UserDetailDialog
        userId={selectedUserId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tracks={tracks}
        onUpdated={refreshUsers}
      />
    </div>
  )
}
