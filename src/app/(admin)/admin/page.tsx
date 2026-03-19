import { requireTrainer } from "@/lib/auth-guard"
import { getAdminDashboard } from "@/lib/actions/admin"
import { KpiCard } from "@/components/admin/kpi-card"
import { SimpleBarChart } from "@/components/admin/simple-bar-chart"
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
  Users,
  UserCheck,
  TrendingUp,
  Target,
} from "lucide-react"

export default async function AdminDashboardPage() {
  await requireTrainer()
  const data = await getAdminDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Verwaltungsübersicht des Lernportals.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Gesamteinschreibungen"
          value={data.kpis.totalEnrollments}
          icon={Users}
        />
        <KpiCard
          title="Aktive Lernende"
          value={data.kpis.activeLearners}
          subtitle="Letzte 30 Tage"
          icon={UserCheck}
        />
        <KpiCard
          title="Abschlussquote"
          value={`${data.kpis.completionRate}%`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Durchschn. Quiz-Score"
          value={`${data.kpis.avgQuizScore}%`}
          icon={Target}
        />
      </div>

      {/* Charts section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abschlussraten nach Lernpfad</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              title=""
              items={data.trackRates.map((t) => ({
                label: t.name,
                value: t.rate,
                maxValue: 100,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module mit niedrigsten Quiz-Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              title=""
              items={data.moduleScores.map((m) => ({
                label: `${m.code} - ${m.title}`,
                value: m.avgScore,
                maxValue: 100,
                color: m.avgScore < 50 ? "hsl(0 84% 60%)" : m.avgScore < 70 ? "hsl(38 92% 50%)" : undefined,
              }))}
              valueLabel="%"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letzte Quiz-Versuche</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Versuche vorhanden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nutzer</TableHead>
                  <TableHead>Modul</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Ergebnis</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAttempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{a.userName}</div>
                        <div className="text-xs text-muted-foreground">{a.userEmail}</div>
                      </div>
                    </TableCell>
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
        </CardContent>
      </Card>

      {/* Top performers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-Lernende</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Daten vorhanden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Abteilung</TableHead>
                  <TableHead className="text-right">Abgeschlossene Module</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPerformers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.department || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{u.completedModules}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
