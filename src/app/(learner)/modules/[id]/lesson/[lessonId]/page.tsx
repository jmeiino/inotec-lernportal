import { requireAuth } from "@/lib/auth-guard"
import { getLesson } from "@/lib/actions/modules"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MarkdownRenderer } from "@/components/lesson/markdown-renderer"
import { LessonCompleteButton } from "./lesson-complete-button"

export default async function LessonPage({
  params,
}: {
  params: { id: string; lessonId: string }
}) {
  const session = await requireAuth()
  const lesson = await getLesson(params.lessonId, session.user.id)

  if (!lesson) notFound()

  const progressPct =
    lesson.totalLessons > 0
      ? Math.round((lesson.currentIndex / lesson.totalLessons) * 100)
      : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          Kurskatalog
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <Link
          href="/catalog"
          className="hover:text-foreground transition-colors"
        >
          {lesson.module.track.name}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <Link
          href={`/modules/${lesson.module.id}`}
          className="hover:text-foreground transition-colors"
        >
          {lesson.module.title}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="text-foreground font-medium">{lesson.title}</span>
      </nav>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">
          Lektion {lesson.currentIndex} von {lesson.totalLessons}
        </span>
      </div>

      {/* Lesson header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{lesson.module.code}</Badge>
          <span className="text-xs text-muted-foreground">
            Lektion {lesson.currentIndex}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>

      {/* Lesson content */}
      <Card>
        <CardContent className="p-6 md:p-8">
          <MarkdownRenderer content={lesson.contentMd} />
        </CardContent>
      </Card>

      {/* Mark as complete + Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {lesson.prevLesson ? (
            <Button variant="outline" asChild>
              <Link
                href={`/modules/${params.id}/lesson/${lesson.prevLesson.id}`}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Vorherige Lektion
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/modules/${params.id}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Zurück zum Modul
              </Link>
            </Button>
          )}
        </div>

        <LessonCompleteButton
          userId={session.user.id}
          lessonId={params.lessonId}
          moduleId={params.id}
          completed={lesson.completed}
          nextLessonId={lesson.nextLesson?.id ?? null}
        />

        <div>
          {lesson.nextLesson ? (
            <Button variant="outline" asChild>
              <Link
                href={`/modules/${params.id}/lesson/${lesson.nextLesson.id}`}
              >
                Nächste Lektion
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/modules/${params.id}`}>
                Zum Modul
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
