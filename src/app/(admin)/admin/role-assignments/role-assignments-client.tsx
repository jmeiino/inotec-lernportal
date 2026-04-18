"use client"

import { useState, useTransition } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  renewAssignment,
  revokeAssignment,
  listRoleAssignments,
} from "@/lib/actions/role-assignments"
import { toast } from "@/hooks/use-toast"
import { formatBusinessRole } from "@/lib/utils"
import { RefreshCw, XCircle } from "lucide-react"

type Row = Awaited<ReturnType<typeof listRoleAssignments>>[number]

export function RoleAssignmentsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [isPending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const data = await listRoleAssignments()
      setRows(data)
    })
  }

  function handleRenew(id: string) {
    startTransition(async () => {
      const res = await renewAssignment(id, 12)
      if (res.success) toast({ title: "Um 12 Monate verlaengert" })
      refresh()
    })
  }

  function handleRevoke(id: string) {
    if (!confirm("Zuweisung wirklich widerrufen?")) return
    startTransition(async () => {
      const res = await revokeAssignment(id)
      if (res.success) toast({ title: "Widerrufen" })
      refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Keine befristeten Rollen-Zuweisungen vorhanden.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nutzer</TableHead>
            <TableHead>Abteilung</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Business-Rolle</TableHead>
            <TableHead>Gueltig bis</TableHead>
            <TableHead className="text-center">Rest (Tage)</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.userName}</TableCell>
              <TableCell>{r.department ?? "-"}</TableCell>
              <TableCell>
                <Badge variant="outline">{r.role}</Badge>
              </TableCell>
              <TableCell>{formatBusinessRole(r.businessRole)}</TableCell>
              <TableCell>
                {new Date(r.validUntil).toLocaleDateString("de-DE")}
              </TableCell>
              <TableCell className="text-center">
                {r.expired ? (
                  <Badge variant="destructive">abgelaufen</Badge>
                ) : r.dueSoon ? (
                  <Badge variant="default">{r.daysLeft}</Badge>
                ) : (
                  <span className="text-muted-foreground">{r.daysLeft}</span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRenew(r.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  +12 Monate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevoke(r.id)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Widerrufen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
