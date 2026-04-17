"use client"

import { useState, useTransition } from "react"
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
import {
  listUsersWithToolAccess,
  setToolAccess,
} from "@/lib/actions/tools"
import { TOOL_LIST } from "@/lib/tool-constants"
import { formatBusinessRole, formatTool } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Check, Lock } from "lucide-react"
import type { Tool } from "@prisma/client"

type Row = Awaited<ReturnType<typeof listUsersWithToolAccess>>[number]

export function ToolsAdminClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [filter, setFilter] = useState<"ALL" | `${Tool}:enabled` | `${Tool}:disabled`>("ALL")
  const [isPending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const data = await listUsersWithToolAccess()
      setRows(data)
    })
  }

  function handleToggle(userId: string, tool: Tool, enabled: boolean) {
    startTransition(async () => {
      await setToolAccess(userId, tool, enabled)
      toast({
        title: `${formatTool(tool)} ${enabled ? "freigegeben" : "gesperrt"}`,
      })
      refresh()
    })
  }

  const filtered = rows.filter((r) => {
    if (filter === "ALL") return true
    const [tool, state] = filter.split(":") as [Tool, "enabled" | "disabled"]
    const enabled = r.access[tool]
    return state === "enabled" ? enabled : !enabled
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Nutzer</SelectItem>
            {TOOL_LIST.map((t) => (
              <SelectItem key={`${t}-en`} value={`${t}:enabled`}>
                {formatTool(t)}: freigegeben
              </SelectItem>
            ))}
            {TOOL_LIST.map((t) => (
              <SelectItem key={`${t}-dis`} value={`${t}:disabled`}>
                {formatTool(t)}: gesperrt
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} Nutzer
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Business-Rolle</TableHead>
              {TOOL_LIST.map((t) => (
                <TableHead key={t} className="text-center">
                  {formatTool(t)}
                </TableHead>
              ))}
              <TableHead className="text-center">Usage 30d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + TOOL_LIST.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  Keine Nutzer gefunden.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const totalUsage =
                  u.usage30d.CHATGPT + u.usage30d.CLAUDE + u.usage30d.OPENWEBUI
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>{u.department ?? "-"}</TableCell>
                    <TableCell>{formatBusinessRole(u.businessRole)}</TableCell>
                    {TOOL_LIST.map((t) => {
                      const enabled = u.access[t]
                      const usage = u.usage30d[t]
                      return (
                        <TableCell key={t} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant={enabled ? "outline" : "secondary"}
                              size="sm"
                              className="h-7 px-2 gap-1"
                              disabled={isPending}
                              onClick={() => handleToggle(u.id, t, !enabled)}
                            >
                              {enabled ? (
                                <>
                                  <Check className="h-3 w-3 text-green-500" />
                                  frei
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" />
                                  gesperrt
                                </>
                              )}
                            </Button>
                            {usage > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {usage}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-medium">
                      {totalUsage}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
