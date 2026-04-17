import { requireReviewer } from "@/lib/auth-guard"
import { getHeatmapData } from "@/lib/actions/surveys"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  formatBusinessRole,
  formatCompetenceLevel,
} from "@/lib/utils"
import { Info, EyeOff } from "lucide-react"
import type { CompetenceLevel } from "@prisma/client"

const LEVELS: CompetenceLevel[] = ["L1", "L2", "L3", "L4", "F1", "F2", "F3"]

function cellTone(value: number) {
  if (value === 0) return "bg-muted/40 text-muted-foreground"
  if (value < 2) return "bg-red-500/10"
  if (value < 3) return "bg-amber-500/10"
  if (value < 4) return "bg-blue-500/10"
  return "bg-emerald-500/15"
}

export default async function HeatmapPage() {
  await requireReviewer()
  const data = await getHeatmapData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kompetenz-Heatmap</h1>
        <p className="text-muted-foreground mt-1">
          Aggregierte Selbsteinschaetzung auf Abteilungs- und Rollenebene.
          Zellen mit weniger als {data.threshold} Antworten werden aus
          Anonymitaetsgruenden unterdrueckt.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Gesamt: {data.totalResponses} Antworten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.cells.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Noch keine Selbsteinschaetzungen eingegangen.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abteilung</TableHead>
                  <TableHead>Business-Rolle</TableHead>
                  <TableHead className="text-center">N</TableHead>
                  <TableHead className="text-center">Ø Likert</TableHead>
                  {LEVELS.map((l) => (
                    <TableHead key={l} className="text-center">
                      {l}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cells.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">
                      {c.department ?? "—"}
                    </TableCell>
                    <TableCell>{formatBusinessRole(c.businessRole)}</TableCell>
                    <TableCell className="text-center">{c.n}</TableCell>
                    <TableCell className="text-center">
                      {c.belowThreshold ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <EyeOff className="h-3 w-3" />
                          unter Schwelle
                        </span>
                      ) : c.avgLikert !== null ? (
                        <Badge
                          variant="outline"
                          className={cellTone(c.avgLikert)}
                        >
                          {c.avgLikert.toFixed(2)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {LEVELS.map((l) => {
                      const count = c.levelCounts[l] ?? 0
                      return (
                        <TableCell key={l} className="text-center">
                          {c.belowThreshold ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : count === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <span className="font-medium">{count}</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Legende</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>N</strong>: Anzahl Antworten in dieser Kombination aus
            Abteilung und Rolle.
          </p>
          <p>
            <strong>Ø Likert</strong>: Durchschnitt der Likert-Antworten (Skala
            1–5).
          </p>
          <p>
            <strong>{LEVELS.join(", ")}</strong>: Anzahl Selbsteinstufungen pro
            Kompetenzstufe (
            {LEVELS.map(formatCompetenceLevel).slice(0, 4).join(", ")} fuer
            Fach-Track, F1–F3 fuer Fuehrungs-Track).
          </p>
          <p>
            Zellen werden bei &lt; {data.threshold} Antworten unterdrueckt, um
            Rueckschluesse auf Einzelpersonen zu vermeiden.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
