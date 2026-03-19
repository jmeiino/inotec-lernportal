"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markLessonComplete } from "@/lib/actions/modules"
import { toast } from "@/hooks/use-toast"

interface LessonCompleteButtonProps {
  userId: string
  lessonId: string
  moduleId: string
  completed: boolean
  nextLessonId: string | null
}

export function LessonCompleteButton({
  userId,
  lessonId,
  moduleId,
  completed,
  nextLessonId,
}: LessonCompleteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (completed) {
    return (
      <Button variant="secondary" disabled className="gap-2">
        <Check className="h-4 w-4" />
        Bereits gelesen
      </Button>
    )
  }

  function handleMarkComplete() {
    startTransition(async () => {
      const result = await markLessonComplete(userId, lessonId)
      if (result.success) {
        toast({ title: "Lektion als gelesen markiert!" })
        if (nextLessonId) {
          router.push(`/modules/${moduleId}/lesson/${nextLessonId}`)
        } else {
          router.push(`/modules/${moduleId}`)
        }
        router.refresh()
      } else {
        toast({
          title: "Fehler",
          description: result.error,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Button onClick={handleMarkComplete} disabled={isPending} className="gap-2">
      <BookOpen className="h-4 w-4" />
      {isPending ? "Wird gespeichert..." : "Als gelesen markieren"}
    </Button>
  )
}
