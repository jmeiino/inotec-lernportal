import { requireTrainer } from "@/lib/auth-guard"
import { getModulesWithQuizzes } from "@/lib/actions/quizzes"
import { QuizzesClient } from "./quizzes-client"

export default async function QuizzesPage() {
  await requireTrainer()
  const modules = await getModulesWithQuizzes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quiz-Editor</h1>
        <p className="text-muted-foreground mt-1">
          Wissenstests erstellen und Fragen verwalten.
        </p>
      </div>

      <QuizzesClient modules={modules} />
    </div>
  )
}
