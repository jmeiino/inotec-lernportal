"use client"

import { useState, useTransition } from "react"
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
import { Badge } from "@/components/ui/badge"
import { listAuditLogs } from "@/lib/actions/audit"

type Row = Awaited<ReturnType<typeof listAuditLogs>>[number]

export function AuditClient({
  initialRows,
  options,
}: {
  initialRows: Row[]
  options: { actions: string[]; targetTypes: string[] }
}) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [action, setAction] = useState("ALL")
  const [targetType, setTargetType] = useState("ALL")
  const [isPending, startTransition] = useTransition()

  function reload(nextAction = action, nextTarget = targetType) {
    startTransition(async () => {
      const data = await listAuditLogs({
        action: nextAction === "ALL" ? undefined : nextAction,
        targetType: nextTarget === "ALL" ? undefined : nextTarget,
      })
      setRows(data)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v)
            reload(v, targetType)
          }}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Aktion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Aktionen</SelectItem>
            {options.actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={targetType}
          onValueChange={(v) => {
            setTargetType(v)
            reload(action, v)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Target-Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Typen</SelectItem>
            {options.targetTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {rows.length} Eintraege {isPending && "…"}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Vorher</TableHead>
              <TableHead>Nachher</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Keine Eintraege.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("de-DE")}
                  </TableCell>
                  <TableCell className="text-sm">{r.actorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{r.targetType}</div>
                    {r.targetId && (
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {r.targetId.slice(0, 8)}…
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] font-mono text-muted-foreground max-w-[200px] truncate">
                    {r.before ? JSON.stringify(r.before) : "—"}
                  </TableCell>
                  <TableCell className="text-[11px] font-mono text-muted-foreground max-w-[200px] truncate">
                    {r.after ? JSON.stringify(r.after) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
