import { requireAuth } from "@/lib/auth-guard"
import { getModuleDetail } from "@/lib/actions/modules"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  Clock,
  ChevronRight,
  Check,
  Lock,
  Play,
  FileDown,
  AlertTriangle,
  Monitor,
  MapPin,
  Users,
  MessageSquare,
  ClipboardCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CommentSection } from "@/components/comments/comment-section"
import { ScheduleList } from "@/components/schedule/schedule-list"
import { SubmissionSection } from "@/components/submissions/submission-section"
import { getMySubmissionsForModule } from "@/lib/actions/submissions"
import { ModuleFeedback } from "@/components/feedback/module-feedback"
import { getMyModuleFeedback } from "@/lib/actions/feedback"
import { formatCompetenceLevel, requiresWorkProduct } from "@/lib/utils"

const formatLabels: Record<string, { label: string; icon: typeof Monitor }> = {
  ONLINE: { label: "Online", icon: Monitor },
  PRESENCE: { label: "Präsenz", icon: MapPin },
  HYBRID: { label: "Hybrid", icon: Users },
}

const materialTypeLabels: Record<string, string> = {
  HANDOUT: "Handout",
  PRESENTATION: "Präsentation",
  CHEATSHEET: "Cheatsheet",
  OTHER: "Sonstiges",
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ModuleDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await requireAuth()
  const mod = await getModuleDetail(params.id, session.user.id)

  if (!mod) notFound()

  const formatInfo = formatLabels[mod.format] || formatLabels.ONLINE
  const FormatIcon = formatInfo.icon

  const workProductRequired = requiresWorkProduct(mod.track.competenceLevel)
  const mySubmissions = await getMySubmissionsForModule(mod.id)
  const myFeedback = await getMyModuleFeedback(mod.id)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          Kurskatalog
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          {mod.track.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{mod.title}</span>
      </nav>

      {/* Module Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{mod.code}</Badge>
              <Badge variant="secondary">{formatCompetenceLevel(mod.track.competenceLevel)}</Badge>
              <Badge variant="secondary" className="gap-1">
                <FormatIcon className="h-3 w-3" />
                {formatInfo.label}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {mod.durationHours} Stunden
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{mod.title}</h1>
            {mod.description && (
              <p className="text-muted-foreground max-w-2xl">{mod.description}</p>
            )}
          </div>

          {/* Progress info */}
          <div className="shrink-0 text-right space-y-1">
            <div className="flex items-center gap-2">
              <Progress value={mod.progressPct} className="h-2 w-32" />
              <span className="text-sm font-medium">{mod.progressPct}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {mod.completedLessons}/{mod.totalLessons} Lektionen
            </p>
          </div>
        </div>
      </div>

      {/* Arbeitsprodukt ausstehend */}
      {mod.workProductPending && (
        <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Arbeitsprodukt noch ausstehend
                </p>
                <p className="text-sm text-muted-foreground">
                  Alle Lektionen sind abgeschlossen. Das Modul gilt als
                  beendet, sobald ein Multiplikator Ihr eingereichtes
                  Arbeitsprodukt freigegeben hat.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prerequisites Warning */}
      {!mod.prerequisitesMet && mod.prerequisiteModules.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  Voraussetzungen nicht erfüllt
                </p>
                <p className="text-sm text-muted-foreground">
                  Bitte schliessen Sie zuerst die folgenden Module ab:
                </p>
                <div className="space-y-1">
                  {mod.prerequisiteModules.map((prereq) => (
                    <Link
                      key={prereq.id}
                      href={`/modules/${prereq.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      {prereq.completed ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {prereq.code}
                      </Badge>
                      <span>{prereq.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Lesson List (Main Area) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lektionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mod.lessons.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Noch keine Lektionen verfügbar.
                </p>
              ) : (
                <div className="space-y-1">
                  {mod.lessons.map((lesson, index) => (
                    <Link
                      key={lesson.id}
                      href={`/modules/${mod.id}/lesson/${lesson.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="shrink-0">
                        {lesson.completed ? (
                          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {lesson.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Lektion {index + 1} von {mod.totalLessons}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz button */}
          {mod.hasQuiz && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Wissenstest</p>
                      <p className="text-xs text-muted-foreground">
                        {mod.allLessonsCompleted
                          ? "Alle Lektionen abgeschlossen. Jetzt testen!"
                          : "Schliessen Sie alle Lektionen ab, um den Test freizuschalten."}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild={mod.allLessonsCompleted}
                    disabled={!mod.allLessonsCompleted}
                    size="sm"
                  >
                    {mod.allLessonsCompleted ? (
                      <Link href={`/modules/${mod.id}/quiz`}>
                        Zum Wissenstest
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    ) : (
                      <span>
                        <Lock className="mr-1 h-4 w-4" />
                        Gesperrt
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule List (for PRESENCE/HYBRID modules) */}
          {(mod.format === "PRESENCE" || mod.format === "HYBRID") && (
            <ScheduleList moduleId={mod.id} />
          )}

          {/* Arbeitsprodukt-Einreichung */}
          {(workProductRequired || mySubmissions.length > 0) && (
            <SubmissionSection
              moduleId={mod.id}
              required={workProductRequired}
              initialSubmissions={mySubmissions}
            />
          )}

          {/* Puls-Feedback nach Abschluss */}
          {(mod.status === "COMPLETED" || myFeedback) && (
            <ModuleFeedback moduleId={mod.id} existing={myFeedback} />
          )}

          {/* Comments */}
          <CommentSection
            moduleId={mod.id}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Materials */}
          {mod.materials.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Materialien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mod.materials.map((material) => (
                    <a
                      key={material.id}
                      href={material.filePath}
                      download
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{material.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {materialTypeLabels[material.type] || material.type}
                          {material.fileSize
                            ? ` · ${formatFileSize(material.fileSize)}`
                            : ""}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick nav: first unread lesson */}
          {mod.lessons.length > 0 && (
            <Card>
              <CardContent className="p-4">
                {(() => {
                  const nextLesson = mod.lessons.find((l) => !l.completed)
                  if (!nextLesson) {
                    return (
                      <div className="text-center space-y-2">
                        <Check className="h-8 w-8 text-green-500 mx-auto" />
                        <p className="text-sm font-medium">
                          Alle Lektionen abgeschlossen!
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Nächste Lektion</p>
                      <p className="text-xs text-muted-foreground">
                        {nextLesson.title}
                      </p>
                      <Button asChild size="sm" className="w-full">
                        <Link
                          href={`/modules/${mod.id}/lesson/${nextLesson.id}`}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Starten
                        </Link>
                      </Button>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
