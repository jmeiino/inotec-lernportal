"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getUserDetail,
  updateUserRole,
  updateUserBusinessRole,
  enrollUserInTrack,
  removeUserFromTrack,
} from "@/lib/actions/admin"
import {
  getEffectiveToolAccess,
  setToolAccess,
} from "@/lib/actions/tools"
import {
  listPossibleManagers,
  setUserManager,
} from "@/lib/actions/team"
import { TOOL_LIST } from "@/lib/tool-constants"
import type { Role, BusinessRole, Tool } from "@prisma/client"
import { formatBusinessRole, formatTool } from "@/lib/utils"

interface UserDetailDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  tracks: { id: string; name: string }[]
  onUpdated: () => void
}

type UserDetail = Awaited<ReturnType<typeof getUserDetail>>

const roleLabels: Record<string, string> = {
  LEARNER: "Lernende/r",
  TRAINER: "Trainer/in",
  ADMIN: "Administrator/in",
  MULTIPLICATOR: "Multiplikator/in",
  CHAMPION: "Champion",
}

const BUSINESS_ROLES: BusinessRole[] = [
  "VERTRIEB",
  "PRODUKTION",
  "VERWALTUNG",
  "IT",
  "HR",
  "FUEHRUNG",
]

export function UserDetailDialog({
  userId,
  open,
  onOpenChange,
  tracks,
  onUpdated,
}: UserDetailDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toolAccess, setToolAccessState] = useState<Record<Tool, boolean> | null>(
    null
  )
  const [managers, setManagers] = useState<{ id: string; name: string; email: string }[]>([])

  useEffect(() => {
    if (userId && open) {
      setLoading(true)
      Promise.all([
        getUserDetail(userId),
        getEffectiveToolAccess(userId),
        listPossibleManagers(),
      ])
        .then(([u, access, mgrs]) => {
          setUser(u)
          setToolAccessState(access)
          setManagers(mgrs.filter((m) => m.id !== userId))
        })
        .finally(() => setLoading(false))
    } else {
      setUser(null)
      setToolAccessState(null)
      setManagers([])
    }
  }, [userId, open])

  async function handleManagerChange(value: string) {
    if (!userId) return
    setActionLoading(true)
    try {
      await setUserManager(userId, value === "__none__" ? null : value)
      const updated = await getUserDetail(userId)
      setUser(updated)
      onUpdated()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToolToggle(tool: Tool, enabled: boolean) {
    if (!userId) return
    setActionLoading(true)
    try {
      await setToolAccess(userId, tool, enabled)
      setToolAccessState((prev) => (prev ? { ...prev, [tool]: enabled } : prev))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRoleChange(role: string) {
    if (!userId) return
    setActionLoading(true)
    try {
      await updateUserRole(userId, role as Role)
      const updated = await getUserDetail(userId)
      setUser(updated)
      onUpdated()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBusinessRoleChange(value: string) {
    if (!userId) return
    setActionLoading(true)
    try {
      const next = value === "__none__" ? null : (value as BusinessRole)
      await updateUserBusinessRole(userId, next)
      const updated = await getUserDetail(userId)
      setUser(updated)
      onUpdated()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEnroll(trackId: string) {
    if (!userId) return
    setActionLoading(true)
    try {
      await enrollUserInTrack(userId, trackId)
      const updated = await getUserDetail(userId)
      setUser(updated)
      onUpdated()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveTrack(trackId: string) {
    if (!userId) return
    setActionLoading(true)
    try {
      await removeUserFromTrack(userId, trackId)
      const updated = await getUserDetail(userId)
      setUser(updated)
      onUpdated()
    } finally {
      setActionLoading(false)
    }
  }

  const enrolledTrackIds = user?.enrollments.map((e) => e.trackId) ?? []
  const availableTracks = tracks.filter((t) => !enrolledTrackIds.includes(t.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {loading ? "Laden..." : user?.name ?? "Nutzerdetails"}
          </DialogTitle>
          <DialogDescription>
            {user ? user.email : "Nutzerinformationen werden geladen..."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-muted-foreground">Laden...</div>
        )}

        {user && !loading && (
          <div className="space-y-4">
            {/* Profile info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Abteilung:</span>{" "}
                <span className="font-medium">{user.department || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Registriert:</span>{" "}
                <span className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString("de-DE")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rolle:</span>
                <Select
                  value={user.role}
                  onValueChange={handleRoleChange}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEARNER">Lernende/r</SelectItem>
                    <SelectItem value="TRAINER">Trainer/in</SelectItem>
                    <SelectItem value="ADMIN">Administrator/in</SelectItem>
                    <SelectItem value="MULTIPLICATOR">Multiplikator/in</SelectItem>
                    <SelectItem value="CHAMPION">Champion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">BusinessRole:</span>
                <Select
                  value={user.businessRole ?? "__none__"}
                  onValueChange={handleBusinessRoleChange}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="w-48 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— nicht gesetzt —</SelectItem>
                    {BUSINESS_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {formatBusinessRole(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-muted-foreground">Fuehrungskraft:</span>
                <Select
                  value={user.managerId ?? "__none__"}
                  onValueChange={handleManagerChange}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="w-60 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— keine —</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="enrollments">
              <TabsList>
                <TabsTrigger value="enrollments">Einschreibungen</TabsTrigger>
                <TabsTrigger value="progress">Fortschritt</TabsTrigger>
                <TabsTrigger value="attempts">Quiz-Versuche</TabsTrigger>
                <TabsTrigger value="tools">Tool-Zugang</TabsTrigger>
              </TabsList>

              <TabsContent value="enrollments" className="space-y-3">
                {user.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Keine Einschreibungen vorhanden.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lernpfad</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.enrollments.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.trackName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.status === "COMPLETED"
                                  ? "success"
                                  : e.status === "PAUSED"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {e.status === "ACTIVE"
                                ? "Aktiv"
                                : e.status === "COMPLETED"
                                ? "Abgeschlossen"
                                : "Pausiert"}
                            </Badge>
                          </TableCell>
                          <TableCell>{e.moduleCount}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleRemoveTrack(e.trackId)}
                            >
                              Entfernen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {availableTracks.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Einschreiben in:</span>
                    <Select
                      onValueChange={handleEnroll}
                      disabled={actionLoading}
                    >
                      <SelectTrigger className="w-48 h-8">
                        <SelectValue placeholder="Lernpfad wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTracks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="progress">
                {user.progress.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Kein Fortschritt vorhanden.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modul</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fortschritt</TableHead>
                        <TableHead>Abgeschlossen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.progress.map((p) => (
                        <TableRow key={p.moduleId}>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{p.moduleCode}</span>{" "}
                            {p.moduleTitle}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === "COMPLETED"
                                  ? "success"
                                  : p.status === "IN_PROGRESS"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {p.status === "COMPLETED"
                                ? "Abgeschlossen"
                                : p.status === "IN_PROGRESS"
                                ? "In Bearbeitung"
                                : "Nicht begonnen"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${p.progressPct}%` }}
                                />
                              </div>
                              <span className="text-xs">{p.progressPct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.completedAt
                              ? new Date(p.completedAt).toLocaleDateString("de-DE")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="tools" className="space-y-3">
                {toolAccess === null ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Laden...
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Standard: ChatGPT aktiv fuer alle, Claude und OpenWebUI
                      nur nach manueller Freigabe.
                    </p>
                    {TOOL_LIST.map((t) => (
                      <div
                        key={t}
                        className="flex items-center justify-between border rounded-lg px-3 py-2"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {formatTool(t)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {toolAccess[t] ? "Freigegeben" : "Gesperrt"}
                          </div>
                        </div>
                        <Button
                          variant={toolAccess[t] ? "outline" : "default"}
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleToolToggle(t, !toolAccess[t])}
                        >
                          {toolAccess[t] ? "Sperren" : "Freigeben"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attempts">
                {user.attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Keine Quiz-Versuche vorhanden.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modul</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Ergebnis</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.attempts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{a.moduleCode}</span>{" "}
                            {a.moduleTitle}
                          </TableCell>
                          <TableCell className="font-medium">{a.score}%</TableCell>
                          <TableCell>
                            <Badge variant={a.passed ? "success" : "destructive"}>
                              {a.passed ? "Bestanden" : "Nicht bestanden"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(a.takenAt).toLocaleDateString("de-DE")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
