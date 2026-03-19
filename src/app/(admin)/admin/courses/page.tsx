import { requireTrainer } from "@/lib/auth-guard"
import { getCoursesTree } from "@/lib/actions/courses"
import { CoursesClient } from "./courses-client"

export default async function CoursesPage() {
  await requireTrainer()
  const tree = await getCoursesTree()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kurs-Editor</h1>
        <p className="text-muted-foreground mt-1">
          Lernpfade, Module und Lektionen erstellen und bearbeiten.
        </p>
      </div>

      <CoursesClient initialTree={tree} />
    </div>
  )
}
