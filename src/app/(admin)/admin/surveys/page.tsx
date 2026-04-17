import { requireAdmin } from "@/lib/auth-guard"
import { listSurveysAdmin } from "@/lib/actions/surveys"
import { SurveysAdminClient } from "./surveys-admin-client"

export default async function AdminSurveysPage() {
  await requireAdmin()
  const surveys = await listSurveysAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Umfragen</h1>
        <p className="text-muted-foreground mt-1">
          Baseline, Puls, Selbsteinschaetzung und Jahresumfrage verwalten.
        </p>
      </div>
      <SurveysAdminClient initial={surveys} />
    </div>
  )
}
