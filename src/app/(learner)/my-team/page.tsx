import { requireAuth } from "@/lib/auth-guard"
import { getMyTeamOverview } from "@/lib/actions/team"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBusinessRole } from "@/lib/utils"
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react"

export default async function MyTeamPage() {
  await requireAuth()
  const team = await getMyTeamOverview()

  const openWP = team.reduce((s, m) => s + m.openSubmissions, 0)
  const l1Missing = team.filter((m) => !m.hasL1Done).length
  const avgProgress =
    team.length > 0
      ? Math.round(team.reduce((s, m) => s + m.progressPct, 0) / team.length)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mein Team</h1>
        <p className="text-muted-foreground mt-1">
          Lernfortschritt und offene Punkte Ihrer direkt unterstellten
          Mitarbeitenden.
        </p>
      </div>

      {team.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Keine direkt unterstellten Mitarbeitenden zugeordnet.
            </p>
            <p className="text-xs text-muted-foreground">
              Die Zuordnung erfolgt durch einen Admin im Nutzerbereich.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Team-Groesse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Ø Fortschritt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgProgress}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Offene Arbeitsprodukte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openWP}</div>
              </CardContent>
            </Card>
          </div>

          {l1Missing > 0 && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {l1Missing} Mitarbeitende ohne L1-Abschluss
                  </p>
                  <p className="text-sm text-muted-foreground">
                    L1 ist Pflicht fuer alle Mitarbeitenden — bitte im
                    Jahresgespraech adressieren.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mitarbeitende</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Fortschritt</TableHead>
                    <TableHead className="text-center">L1</TableHead>
                    <TableHead className="text-center">F1</TableHead>
                    <TableHead className="text-center">Offene WPs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.department ?? "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatBusinessRole(m.businessRole as never)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={m.progressPct} className="h-2 w-24" />
                          <span className="text-xs text-muted-foreground">
                            {m.completedModules}/{m.totalModules}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {m.hasL1Done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            offen
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.hasF1Done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.openSubmissions > 0 ? (
                          <Badge variant="secondary">{m.openSubmissions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
