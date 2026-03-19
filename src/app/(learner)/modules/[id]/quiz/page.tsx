import { requireAuth } from "@/lib/auth-guard"
import { QuizClient } from "@/components/quiz/quiz-client"

export default async function QuizPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAuth()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <QuizClient moduleId={params.id} />
    </div>
  )
}
