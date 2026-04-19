"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  previewUserImport,
  applyUserImport,
} from "@/lib/actions/import-export"
import { toast } from "@/hooks/use-toast"
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react"

type Row = Awaited<ReturnType<typeof previewUserImport>>["rows"][number]

const SAMPLE = `name,email,abteilung,businessrole,rolle
Max Mustermann,max@inotec.local,Vertrieb,VERTRIEB,LEARNER
Erika Test,erika@inotec.local,IT,IT,MULTIPLICATOR`

export function ImportClient() {
  const [csv, setCsv] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [errorCount, setErrorCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  function handlePreview() {
    startTransition(async () => {
      const data = await previewUserImport(csv)
      setRows(data.rows)
      setErrorCount(data.errorCount)
    })
  }

  function handleApply() {
    if (rows.length === 0) return
    if (
      !confirm(
        `Import ausfuehren? ${rows.length - errorCount} Zeilen werden uebernommen, ${errorCount} mit Fehlern uebersprungen.`
      )
    )
      return
    startTransition(async () => {
      const res = await applyUserImport(rows)
      toast({
        title: "Import abgeschlossen",
        description: `${res.created} angelegt, ${res.updated} aktualisiert, ${res.skipped} uebersprungen`,
      })
      setCsv("")
      setRows([])
      setErrorCount(0)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CSV einfuegen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={SAMPLE}
            className="min-h-[180px] font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Komma-getrennt mit Header-Zeile.
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsv(SAMPLE)}
                disabled={isPending}
              >
                Beispiel laden
              </Button>
              <Button
                size="sm"
                onClick={handlePreview}
                disabled={isPending || csv.trim().length === 0}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Vorschau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Vorschau ({rows.length} Zeilen)
              </CardTitle>
              <div className="flex items-center gap-2">
                {errorCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errorCount} Fehler
                  </Badge>
                ) : (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Alles ok
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={isPending || rows.length === errorCount}
                >
                  Import ausfuehren
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Abteilung</TableHead>
                  <TableHead>BusinessRole</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.line}>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.line}
                    </TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.department ?? "-"}</TableCell>
                    <TableCell>{r.businessRole ?? "-"}</TableCell>
                    <TableCell>{r.role}</TableCell>
                    <TableCell>
                      {r.errors.length === 0 ? (
                        <Badge variant="success" className="text-[10px]">
                          ok
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          {r.errors.join(", ")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
