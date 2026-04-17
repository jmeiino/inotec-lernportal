import { requireAuth } from "@/lib/auth-guard"
import { getDashboardData } from "@/lib/actions/learner"
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  ChevronRight,
  Check,
  Lock,
  Play,
  Calendar,
  FileDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCompetenceLevel } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await requireAuth()
  const data = await getDashboardData(session.user.id)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Willkommen zurück, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Hier ist Ihr aktueller Lernfortschritt.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktive Kurse</p>
                <p className="text-2xl font-bold">{data.stats.activeCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <GraduationCap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abgeschlossen</p>
                <p className="text-2xl font-bold">{data.stats.completedCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zertifikate</p>
                <p className="text-2xl font-bold">{data.stats.certificateCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Learning */}
      {data.continueModule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Weiter lernen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{data.continueModule.moduleCode}</Badge>
                  <span className="font-medium">{data.continueModule.moduleTitle}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.continueModule.trackName}
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.continueModule.progressPct}
                    className="h-2 w-40"
                  />
                  <span className="text-xs text-muted-foreground">
                    {data.continueModule.progressPct}%
                  </span>
                </div>
              </div>
              <Button asChild>
                <Link href={`/modules/${data.continueModule.moduleId}`}>
                  Fortfahren
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track Progress */}
      {data.trackProgress.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ihre Lernpfade</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.trackProgress.map((track) => (
              <Card key={track.trackId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{track.trackName}</CardTitle>
                    <Badge
                      variant={
                        track.status === "COMPLETED" ? "success" : "secondary"
                      }
                    >
                      {formatCompetenceLevel(track.competenceLevel)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fortschritt</span>
                      <span className="font-medium">
                        {track.completedModules}/{track.totalModules} Module
                      </span>
                    </div>
                    <Progress value={track.overallPct} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    {track.modules.map((mod) => (
                      <Link
                        key={mod.id}
                        href={`/modules/${mod.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        {mod.status === "COMPLETED" ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : mod.status === "IN_PROGRESS" ? (
                          <Play className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{mod.title}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                          {mod.code}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Schedules */}
      {data.upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Kommende Präsenztermine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{schedule.moduleCode}</Badge>
                      <span className="font-medium text-sm">
                        {schedule.moduleTitle}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {schedule.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(schedule.startTime), "dd. MMM yyyy, HH:mm", {
                        locale: de,
                      })}{" "}
                      -{" "}
                      {format(new Date(schedule.endTime), "HH:mm", { locale: de })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Certificates */}
      {data.recentCertificates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Neueste Zertifikate
              </CardTitle>
              <Button variant="link" asChild size="sm">
                <Link href="/certificates">Alle anzeigen</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {cert.trackName}
                      </span>
                      <Badge variant="secondary">{formatCompetenceLevel(cert.competenceLevel)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cert.certNumber} &middot;{" "}
                      {format(new Date(cert.issuedAt), "dd. MMMM yyyy", {
                        locale: de,
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/certificates/${cert.id}/pdf`}>
                      <FileDown className="h-4 w-4 mr-1" />
                      PDF
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data.trackProgress.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">
              Noch keine Kurse gestartet
            </h3>
            <p className="text-muted-foreground mb-4">
              Entdecken Sie unseren Kurskatalog und schreiben Sie sich in einen
              Lernpfad ein.
            </p>
            <Button asChild>
              <Link href="/catalog">Zum Kurskatalog</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
